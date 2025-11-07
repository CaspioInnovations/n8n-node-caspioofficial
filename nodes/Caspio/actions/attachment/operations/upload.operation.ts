import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../helpers/utils';
import { caspioApiRequest } from '../../../helpers/api';

const properties: INodeProperties[] = [
	{
		displayName: 'Attachment Field Name or ID',
		name: 'attachmentFieldName',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['table.value'],
			loadOptionsMethod: 'getTableAttachmentFields',
		},
		required: true,
		default: '',
		description:
			'The attachment field to upload to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Record PK ID',
		name: 'recordPkId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. ABC123 or {{$json.recordId}}',
		description: 'Primary key ID of the record to attach the file to',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Name of the binary property containing the file to upload',
	},
];

const displayOptions = {
	show: {
		resource: ['attachment'],
		operation: ['upload'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const tableName = encodeURIComponent(
				this.getNodeParameter('table', i, undefined, { extractValue: true }) as string,
			);
			const fieldName = this.getNodeParameter('attachmentFieldName', i) as string;
			const recordId = this.getNodeParameter('recordPkId', i) as string;
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

			const item = items[i];
			if (!item.binary || !item.binary[binaryPropertyName]) {
				throw new NodeOperationError(
					this.getNode(),
					`No binary data found in property "${binaryPropertyName}" on item ${i}`,
					{ itemIndex: i },
				);
			}

			const binary = item.binary[binaryPropertyName];
			const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

			const path = `/v3/tables/${tableName}/attachments/${encodeURIComponent(fieldName)}/${encodeURIComponent(recordId)}`;

			const formData = {
				File: {
					value: buffer,
					options: {
						filename: binary.fileName || 'file',
						contentType: binary.mimeType || 'application/octet-stream',
					},
				},
			};

			await caspioApiRequest.call(this, {
				method: 'PUT',
				path,
				formData,
			});

			const successResponse: IDataObject = {
				success: true,
				table: this.getNodeParameter('table', i, undefined, { extractValue: true }) as string,
				field: fieldName,
				recordId: recordId,
				fileName: binary.fileName || 'file',
				uploadedAt: new Date().toISOString(),
			};

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray([successResponse]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(
				this.getNode(),
				`Failed to upload attachment: ${(error as Error).message}`,
				{ itemIndex: i },
			);
		}
	}

	return returnData;
}
