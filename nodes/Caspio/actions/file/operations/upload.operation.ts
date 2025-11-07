import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getFolderKey } from '../../../helpers/utils';
import { caspioApiRequest } from '../../../helpers/api';
import { getFolderIdentifierProperty } from '../../../helpers/ui/file.properties';
import type { FormDataValue } from '../../../helpers/interfaces';

export const description: INodeProperties[] = [
	{
		displayName: 'Input Data Field Name',
		name: 'inputDataFieldName',
		type: 'string',
		default: 'data',
		required: true,
		description:
			'Name of the input binary field to upload (single file only; exactly one input item supported)',
		displayOptions: { show: { operation: ['upload'], resource: ['file'] } },
	},
	getFolderIdentifierProperty({
		resource: 'file',
		operation: 'upload',
		description: 'Choose the destination folder by External Key or Path.',
	}),
	{
		displayName: 'On Conflict',
		name: 'conflictBehavior',
		type: 'options',
		options: [
			{ name: 'Make a Copy', value: 'makeCopy' },
			{ name: 'Overwrite Existing', value: 'overwrite' },
		],
		default: 'makeCopy',
		description: 'How to behave if a file with the same name exists',
		displayOptions: { show: { operation: ['upload'], resource: ['file'] } },
	},
];

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	if (items.length !== 1) {
		throw new NodeOperationError(
			this.getNode(),
			`This operation supports exactly one input item (one file). Received ${items.length}.`,
		);
	}

	const inputDataFieldName = this.getNodeParameter('inputDataFieldName', 0) as string;
	const conflictBehavior = this.getNodeParameter('conflictBehavior', 0) as 'makeCopy' | 'overwrite';
	const folder = this.getNodeParameter('folder', 0) as IDataObject;

	const item = items[0];
	if (!item.binary || !item.binary[inputDataFieldName]) {
		throw new NodeOperationError(
			this.getNode(),
			`No binary data found in property "${inputDataFieldName}" on the input item`,
		);
	}

	const binary = item.binary[inputDataFieldName]!;
	const buffer = await this.helpers.getBinaryDataBuffer(0, inputDataFieldName);
	const filename = binary.fileName || 'file';

	const qs: IDataObject = {};
	const { folderKey, folderPath } = await getFolderKey.call(this, folder);
	if (folderKey) qs.externalKey = folderKey;

	const isOverwrite = conflictBehavior === 'overwrite';

	const splitName = (name: string) => {
		const lastDot = name.lastIndexOf('.');
		if (lastDot > 0) {
			return { base: name.slice(0, lastDot), ext: name.slice(lastDot) };
		}
		return { base: name, ext: '' };
	};

	const buildFormData = (name: string) => {
		return isOverwrite
			? {
					File: {
						value: buffer,
						options: {
							filename: name,
						},
					},
				}
			: {
					Files: [
						{
							value: buffer,
							options: {
								filename: name,
							},
						},
					],
				};
	};

	const attemptUpload = async (name: string): Promise<IDataObject | undefined> => {
		return (await caspioApiRequest.call(this, {
			method: isOverwrite ? 'PUT' : 'POST',
			path: '/v3/files',
			qs,
			formData: buildFormData(name) as unknown as Record<string, FormDataValue>,
		})) as IDataObject | undefined;
	};

	let response: IDataObject | undefined;

	if (isOverwrite) {
		response = await attemptUpload(filename);
	} else {
		const { base, ext } = splitName(filename);
		const match = base.match(/^(.*)_(\d+)$/);
		const baseNoSuffix = match ? match[1] : base;
		let counter = match ? parseInt(match[2], 10) + 1 : 1;

		let currentName = filename;
		let attempts = 0;
		const maxAttempts = 100;

		while (attempts < maxAttempts) {
			try {
				response = await attemptUpload(currentName);
				break;
			} catch (e) {
				const error = e as {
					statusCode?: number;
					response?: { statusCode?: number };
					httpCode?: string;
				};
				const status = error.statusCode ?? error.response?.statusCode ?? Number(error.httpCode);
				if (status === 409) {
					currentName = `${baseNoSuffix}_${counter}${ext}`;
					counter++;
					attempts++;
					continue;
				}
				throw e;
			}
		}

		if (!response) {
			throw new NodeOperationError(
				this.getNode(),
				`Could not resolve a non-conflicting file name after ${maxAttempts} attempts`,
			);
		}
	}

	let result: IDataObject | undefined;
	if (Array.isArray(response?.Result)) {
		result = (response.Result as IDataObject[])[0];
	} else if (response && typeof response === 'object') {
		result = (response.Result as IDataObject) ?? (response as IDataObject);
	}

	if (result) {
		const uploadedFileName = result.Name as string;
		if (folderPath) {
			const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
			result.Path = `${normalizedPath}/${uploadedFileName}`;
		} else {
			result.Path = `/${uploadedFileName}`;
		}
	}

	return [{ json: (result || {}) as IDataObject }];
}
