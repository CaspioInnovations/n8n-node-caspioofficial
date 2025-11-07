import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import { NodeOperationError, NodeApiError } from 'n8n-workflow';
import { caspioApiRequest } from '../../../helpers/api';
import { updateDisplayOptions, getFolderKey, getAllWithPagination } from '../../../helpers/utils';
import { getModeProperty } from '../../../helpers/ui/mode.properties';
import type { CaspioFilesResponse } from '../../../helpers/interfaces';

const properties: INodeProperties[] = [
	// Mode selection
	getModeProperty({
		defaultMode: 'basic',
		basicDescription: 'Visual interface with folder selection and sorting',
		advancedDescription: 'Direct API parameter input for complex queries',
		description: 'Choose the interface complexity level.',
	}),

	// Basic mode
	{
		displayName: 'Folder',
		name: 'folder',
		type: 'resourceLocator',
		default: { mode: 'path', value: '' },
		displayOptions: {
			show: {
				mode: ['basic'],
			},
		},
		modes: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				placeholder: 'e.g. Documents/2024/Reports',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[^/].*[^/]$|^$',
							errorMessage: 'Path should not start or end with /',
						},
					},
				],
			},
			{
				displayName: 'External Key',
				name: 'externalKey',
				type: 'string',
				placeholder: 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6',
			},
		],
		description: 'Select the folder to get files from (leave empty for root)',
	},

	{
		displayName: 'Include Subfolders',
		name: 'includeSubfolders',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				mode: ['basic'],
			},
		},
		description:
			'Whether to also get files from all subfolders (requires multiple API calls). Note: Sorting is disabled when including subfolders.',
	},

	{
		displayName: 'Sort By',
		name: 'sortField',
		type: 'options',
		options: [
			{ name: 'Content Type', value: 'ContentType' },
			{ name: 'Date Created', value: 'DateCreated' },
			{ name: 'Last Modified', value: 'LastModified' },
			{ name: 'Name', value: 'Name' },
			{ name: 'Size', value: 'Size' },
		],
		default: 'Name',
		displayOptions: {
			show: {
				mode: ['basic'],
				includeSubfolders: [false],
			},
		},
		description: 'Field to sort files by',
	},

	{
		displayName: 'Sort Order',
		name: 'sortDescending',
		type: 'options',
		options: [
			{ name: 'Ascending', value: false },
			{ name: 'Descending', value: true },
		],
		default: false,
		displayOptions: {
			show: {
				mode: ['basic'],
				includeSubfolders: [false],
			},
		},
		description: 'Sort order (ascending or descending)',
	},

	// Advanced mode
	{
		displayName: 'Folder External Key',
		name: 'advancedExternalKey',
		type: 'string',
		displayOptions: {
			show: {
				mode: ['advanced'],
			},
		},
		default: '',
		placeholder: 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6',
		description: 'External key of the folder to get files from',
	},

	{
		displayName: 'Sort Field',
		name: 'advancedSortField',
		type: 'string',
		displayOptions: {
			show: {
				mode: ['advanced'],
			},
		},
		default: '',
		placeholder: 'Name, Size, DateCreated, LastModified, ContentType',
		description: 'Field to sort files by (leave empty for default)',
	},

	{
		displayName: 'Sort Descending',
		name: 'advancedSortDescending',
		type: 'boolean',
		displayOptions: {
			show: {
				mode: ['advanced'],
			},
		},
		default: false,
		description: 'Whether to sort in descending order',
	},

	{
		displayName: 'Page Number',
		name: 'advancedPageNumber',
		type: 'number',
		displayOptions: {
			show: {
				mode: ['advanced'],
			},
		},
		default: undefined,
		description: 'Page number for pagination (starts at 1)',
	},

	{
		displayName: 'Page Size',
		name: 'advancedPageSize',
		type: 'number',
		displayOptions: {
			show: {
				mode: ['advanced'],
			},
		},
		typeOptions: {
			minValue: 5,
			maxValue: 1000,
		},
		default: undefined,
		description: 'Records per page (min 5, max 1000)',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['listFiles'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

async function getFilesFromFolder(
	context: IExecuteFunctions,
	folderKey?: string,
	sortField?: string,
	sortDescending?: boolean,
): Promise<IDataObject[]> {
	const qs: IDataObject = {};

	if (folderKey) {
		qs.externalKey = folderKey;
	}

	if (sortField) {
		qs.sortField = sortField;
	}
	if (sortDescending !== undefined) {
		qs.sortDescending = sortDescending;
	}

	return await getAllWithPagination(context, '/v3/files', qs, { useQPrefix: false });
}

async function getFoldersInFolder(
	context: IExecuteFunctions,
	parentFolderKey?: string,
): Promise<IDataObject[]> {
	const qs: IDataObject = {};

	if (parentFolderKey) {
		qs.externalKey = parentFolderKey;
	}

	return await getAllWithPagination(context, '/v3/files/folders', qs, { useQPrefix: false });
}

async function getFilesRecursively(
	context: IExecuteFunctions,
	folderKey?: string,
	sortField?: string,
	sortDescending?: boolean,
	maxDepth: number = 10,
	currentDepth: number = 0,
): Promise<IDataObject[]> {
	// Safety check
	if (currentDepth >= maxDepth) {
		throw new NodeOperationError(
			context.getNode(),
			`Maximum folder depth (${maxDepth}) exceeded. Consider using a more specific folder path.`,
		);
	}

	const allFiles: IDataObject[] = [];

	const files = await getFilesFromFolder(context, folderKey, sortField, sortDescending);
	allFiles.push(...files);

	// Safety check
	const MAX_FILES = 50000;
	if (allFiles.length >= MAX_FILES) {
		throw new NodeOperationError(
			context.getNode(),
			`Maximum file limit (${MAX_FILES}) reached. Consider using filters or a more specific folder path.`,
		);
	}

	const subfolders = await getFoldersInFolder(context, folderKey);

	for (const subfolder of subfolders) {
		const subfolderKey = String(subfolder.ExternalKey);
		const subfolderFiles = await getFilesRecursively(
			context,
			subfolderKey,
			sortField,
			sortDescending,
			maxDepth,
			currentDepth + 1,
		);
		allFiles.push(...subfolderFiles);

		if (allFiles.length >= MAX_FILES) {
			throw new NodeOperationError(
				context.getNode(),
				`Maximum file limit (${MAX_FILES}) reached. Consider using filters or a more specific folder path.`,
			);
		}
	}

	return allFiles;
}

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const mode = this.getNodeParameter('mode', i) as string;

			let folderKey: string | undefined;
			let sortField: string | undefined;
			let sortDescending: boolean | undefined;
			let files: IDataObject[];

			if (mode === 'basic') {
				const folder = this.getNodeParameter('folder', i) as IDataObject;
				const resolved = await getFolderKey.call(this, folder, i);
				folderKey = resolved.folderKey;

				const includeSubfolders = this.getNodeParameter('includeSubfolders', i) as boolean;

				if (includeSubfolders) {
					files = await getFilesRecursively(this, folderKey, undefined, undefined);
				} else {
					sortField = this.getNodeParameter('sortField', i) as string;
					sortDescending = this.getNodeParameter('sortDescending', i) as boolean;
					files = await getFilesFromFolder(this, folderKey, sortField, sortDescending);
				}
			} else {
				const qs: IDataObject = {};

				const advancedExternalKey = this.getNodeParameter('advancedExternalKey', i, '') as string;
				if (advancedExternalKey.trim()) {
					qs.externalKey = advancedExternalKey.trim();
				}

				const advancedSortField = this.getNodeParameter('advancedSortField', i, '') as string;
				if (advancedSortField.trim()) {
					qs.sortField = advancedSortField.trim();
				}

				const advancedSortDescending = this.getNodeParameter(
					'advancedSortDescending',
					i,
				) as boolean;
				if (advancedSortDescending) {
					qs.sortDescending = true;
				}

				const pageNumberValue = this.getNodeParameter('advancedPageNumber', i, null) as
					| number
					| null;
				const pageSizeValue = this.getNodeParameter('advancedPageSize', i, null) as number | null;

				if (pageNumberValue !== null && pageNumberValue !== undefined && pageNumberValue > 0) {
					qs.pageNumber = pageNumberValue;
				}
				if (pageSizeValue !== null && pageSizeValue !== undefined && pageSizeValue >= 5) {
					qs.pageSize = Math.max(Math.min(pageSizeValue, 1000), 5);
				}

				const responseData = (await caspioApiRequest.call(this, {
					method: 'GET',
					path: '/v3/files',
					qs,
				})) as CaspioFilesResponse;

				files = responseData.Result || [];
			}

			if (!Array.isArray(files)) {
				throw new NodeOperationError(
					this.getNode(),
					`Unexpected API response format. Expected array of files but got: ${typeof files}`,
					{ itemIndex: i },
				);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(files as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}

			if (error instanceof NodeApiError) {
				const httpCode = error.httpCode;

				if (httpCode === '404') {
					throw new NodeOperationError(
						this.getNode(),
						'The specified folder was not found. Please check the folder selection and try again.',
						{ itemIndex: i },
					);
				} else if (httpCode === '400') {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid query parameters. Please check your folder selection, sorting options, and syntax.',
						{ itemIndex: i },
					);
				} else if (httpCode === '401' || httpCode === '403') {
					throw new NodeOperationError(
						this.getNode(),
						'Authentication failed or insufficient permissions to access files.',
						{ itemIndex: i },
					);
				}
			}

			throw new NodeOperationError(
				this.getNode(),
				`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ itemIndex: i },
			);
		}
	}

	return returnData;
}
