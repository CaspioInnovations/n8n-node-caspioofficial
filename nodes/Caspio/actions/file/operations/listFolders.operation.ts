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
import type { CaspioFoldersResponse } from '../../../helpers/interfaces';

const properties: INodeProperties[] = [
	getModeProperty({
		defaultMode: 'basic',
		basicDescription: 'Visual interface with parent folder selection and sorting',
		advancedDescription: 'Direct API parameter input for complex queries',
		description: 'Choose the interface complexity level.',
	}),

	{
		displayName: 'Parent Folder',
		name: 'parentFolder',
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
		description: 'Select the parent folder to list subfolders from (leave empty for root)',
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
			'Whether to also list folders from all subfolders recursively (requires multiple API calls). Note: Sorting is disabled when including subfolders.',
	},

	{
		displayName: 'Sort By',
		name: 'sortField',
		type: 'options',
		options: [
			{ name: 'Name', value: 'Name' },
			{ name: 'Date Created', value: 'DateCreated' },
		],
		default: 'Name',
		displayOptions: {
			show: {
				mode: ['basic'],
				includeSubfolders: [false],
			},
		},
		description: 'Field to sort folders by',
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

	{
		displayName: 'Parent Folder External Key',
		name: 'advancedExternalKey',
		type: 'string',
		displayOptions: {
			show: {
				mode: ['advanced'],
			},
		},
		default: '',
		placeholder: 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6',
		description: 'External key of the parent folder to list subfolders from',
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
		placeholder: 'Name, DateCreated',
		description: 'Field to sort folders by (leave empty for default)',
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
		operation: ['listFolders'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

async function getFoldersFromParent(
	context: IExecuteFunctions,
	parentFolderKey?: string,
	sortField?: string,
	sortDescending?: boolean,
): Promise<IDataObject[]> {
	const qs: IDataObject = {};

	if (parentFolderKey) {
		qs.externalKey = parentFolderKey;
	}

	if (sortField) {
		qs.sortField = sortField;
	}
	if (sortDescending !== undefined) {
		qs.sortDescending = sortDescending;
	}

	return await getAllWithPagination(context, '/v3/files/folders', qs, { useQPrefix: false });
}

async function getFoldersRecursively(
	context: IExecuteFunctions,
	parentFolderKey?: string,
	sortField?: string,
	sortDescending?: boolean,
	currentDepth = 0,
	folderCount = { value: 0 },
): Promise<IDataObject[]> {
	const MAX_DEPTH = 10;
	const MAX_FOLDERS = 50000;

	if (currentDepth >= MAX_DEPTH) {
		throw new NodeOperationError(
			context.getNode(),
			`Maximum folder depth of ${MAX_DEPTH} levels exceeded. Please reduce nesting or disable "Include Subfolders".`,
		);
	}

	if (folderCount.value >= MAX_FOLDERS) {
		throw new NodeOperationError(
			context.getNode(),
			`Maximum folder count of ${MAX_FOLDERS} exceeded. Please reduce scope or disable "Include Subfolders".`,
		);
	}

	const allFolders: IDataObject[] = [];

	const folders = await getFoldersFromParent(context, parentFolderKey, sortField, sortDescending);
	allFolders.push(...folders);
	folderCount.value += folders.length;

	for (const folder of folders) {
		const subfolderFolders = await getFoldersRecursively(
			context,
			String(folder.ExternalKey),
			sortField,
			sortDescending,
			currentDepth + 1,
			folderCount,
		);
		allFolders.push(...subfolderFolders);
	}

	return allFolders;
}

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const mode = this.getNodeParameter('mode', i) as string;

			let parentFolderKey: string | undefined;
			let sortField: string | undefined;
			let sortDescending: boolean | undefined;
			let folders: IDataObject[];

			if (mode === 'basic') {
				const parentFolder = this.getNodeParameter('parentFolder', i) as IDataObject;
				const resolved = await getFolderKey.call(this, parentFolder, i);
				parentFolderKey = resolved.folderKey;

				const includeSubfolders = this.getNodeParameter('includeSubfolders', i) as boolean;

				if (includeSubfolders) {
					folders = await getFoldersRecursively(this, parentFolderKey, undefined, undefined);
				} else {
					sortField = this.getNodeParameter('sortField', i) as string;
					sortDescending = this.getNodeParameter('sortDescending', i) as boolean;
					folders = await getFoldersFromParent(this, parentFolderKey, sortField, sortDescending);
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
					path: '/v3/files/folders',
					qs,
				})) as CaspioFoldersResponse;

				folders = responseData.Result || [];
			}

			if (!Array.isArray(folders)) {
				throw new NodeOperationError(
					this.getNode(),
					`Unexpected API response format. Expected array of folders but got: ${typeof folders}`,
					{ itemIndex: i },
				);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(folders as IDataObject[]),
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
						'The specified parent folder was not found. Please check the folder selection and try again.',
						{ itemIndex: i },
					);
				} else if (httpCode === '400') {
					throw new NodeOperationError(
						this.getNode(),
						'Invalid query parameters. Please check your parent folder selection, sorting options, and syntax.',
						{ itemIndex: i },
					);
				} else if (httpCode === '401' || httpCode === '403') {
					throw new NodeOperationError(
						this.getNode(),
						'Authentication failed or insufficient permissions to access folders.',
						{ itemIndex: i },
					);
				}
			}

			throw new NodeOperationError(
				this.getNode(),
				`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ itemIndex: i },
			);
		}
	}

	return returnData;
}
