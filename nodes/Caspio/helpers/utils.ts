import type {
	IDataObject,
	NodeApiError,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { caspioApiRequest } from './api';
import type {
	CaspioDirectoriesResponse,
	CaspioField,
	CaspioFieldsResponse,
	CaspioDirectory,
	CaspioListResponse,
} from './interfaces';

// =============================================================================
// Error Handling
// =============================================================================

export function processCaspioError(error: NodeApiError, id?: string): NodeApiError {
	if (error.httpCode === '404' && id) {
		error.description = `Record ID ${id} not found`;
	}
	return error;
}

// =============================================================================
// Display Options
// =============================================================================

export function updateDisplayOptions(displayOptions: IDataObject, properties: INodeProperties[]) {
	function deepMerge(target: IDataObject, ...sources: (IDataObject | undefined)[]) {
		if (!sources.length) return target;
		const source = sources.shift();

		if (isObject(target) && source && isObject(source)) {
			for (const key in source) {
				if (isObject(source[key])) {
					if (!target[key]) Object.assign(target, { [key]: {} });
					deepMerge(target[key] as IDataObject, source[key] as IDataObject);
				} else {
					Object.assign(target, { [key]: source[key] });
				}
			}
		}
		return deepMerge(target, ...sources);
	}

	function isObject(item: unknown) {
		return item && typeof item === 'object' && !Array.isArray(item);
	}

	return properties.map((nodeProperty: INodeProperties) => ({
		...nodeProperty,
		displayOptions: deepMerge({}, nodeProperty.displayOptions as IDataObject, displayOptions),
	}));
}

// =============================================================================
// Folder Utilities
// =============================================================================

export async function getFolderKeyByPath(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	folderPath: string,
): Promise<string | undefined> {
	const normalized = (folderPath || '').trim();
	if (!normalized || normalized === '/') return undefined;

	const segments = normalized
		.split('/')
		.map((s) => s.trim())
		.filter(Boolean);
	let currentExternalKey: string | undefined = undefined;

	const findFolderInParent = async (
		parentKey: string | undefined,
		name: string,
	): Promise<{ Name: string; ExternalKey: string } | undefined> => {
		let pageNumber = 1;
		const pageSize = 1000;
		while (true) {
			const qs: IDataObject = { pageNumber, pageSize };
			if (parentKey) qs.externalKey = parentKey;

			const resp = (await caspioApiRequest.call(this, {
				method: 'GET',
				path: '/v3/files/folders',
				qs,
			})) as { Result?: IDataObject[]; Pagination?: { TotalCount?: number } };

			const items = (resp?.Result || []) as Array<{ Name: string; ExternalKey: string }>;
			const found = items.find((f) => f.Name === name);
			if (found) return found;

			const total = (resp?.Pagination?.TotalCount as number) ?? items.length;
			if (!items.length || pageNumber * pageSize >= total) break;
			pageNumber++;
		}
		return undefined;
	};

	const traversed: string[] = [];
	for (const segment of segments) {
		const found = await findFolderInParent(currentExternalKey, segment);
		if (!found) {
			const prefix = traversed.join('/') || '(root)';
			throw new Error(`Segment "${segment}" not found under ${prefix}`);
		}
		currentExternalKey = found.ExternalKey;
		traversed.push(segment);
	}

	return currentExternalKey;
}

export async function getFolderKey(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	folder: IDataObject,
	itemIndex?: number,
): Promise<{ folderKey?: string; folderPath?: string }> {
	if (!folder.value) {
		return { folderKey: undefined, folderPath: undefined };
	}

	const mode = folder.mode as string;
	const value = String(folder.value);

	if (mode === 'externalKey' || mode === 'id') {
		return { folderKey: value, folderPath: undefined };
	} else if (mode === 'path') {
		try {
			const folderKey = await getFolderKeyByPath.call(this, value);
			return { folderKey, folderPath: value };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			throw new NodeOperationError(
				this.getNode(),
				`Invalid folder path: ${msg}`,
				itemIndex !== undefined ? { itemIndex } : undefined,
			);
		}
	} else if (mode === 'list') {
		return { folderKey: value, folderPath: undefined };
	}

	return { folderKey: undefined, folderPath: undefined };
}

// =============================================================================
// Directory Utilities
// =============================================================================

export async function getDirectoryNameById(
	this: ILoadOptionsFunctions,
	directoryId: string,
): Promise<string> {
	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: '/v3/directories',
	})) as CaspioDirectoriesResponse;
	const directories = response.Result || [];

	const directory = directories.find((dir: CaspioDirectory) => dir.Id === directoryId);
	if (!directory) {
		throw new NodeOperationError(this.getNode(), `Directory with ID '${directoryId}' not found!`, {
			level: 'warning',
		});
	}

	return directory.Name;
}

export async function fetchDirectoryFields(this: ILoadOptionsFunctions): Promise<CaspioField[]> {
	const directoryId = encodeURI(
		this.getNodeParameter('directory', undefined, {
			extractValue: true,
		}) as string,
	);

	if (!directoryId) {
		return [];
	}

	const directoryName = await getDirectoryNameById.call(this, directoryId);

	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: `/v3/tables/${encodeURI(directoryName)}/fields`,
	})) as CaspioFieldsResponse;

	return response.Result || [];
}

export function validateDirectoryWhereClause(whereClause: string): void {
	const systemAttributePattern = /\b_[a-zA-Z0-9_]+\b/i;
	if (systemAttributePattern.test(whereClause)) {
		throw new Error(
			'System attributes starting with underscore (_status, _sign_in_method, etc.) cannot be used in UPDATE/DELETE WHERE clauses. Use regular fields only.',
		);
	}
}

// =============================================================================
// Field Filtering
// =============================================================================

export const FILTERED_FIELD_TYPES = [
	'ATTACHMENT',
	'PASSWORD',
	'TIMESTAMP',
	'RANDOM ID',
	'AUTONUMBER',
	'PREFIXED AUTONUMBER',
	'GUID',
];

export function isFilteredFieldType(field: CaspioField): boolean {
	const fieldType = (field.Type || '').toUpperCase();
	const fieldTypeNoSpace = fieldType.replace(/\s+/g, '');
	const fieldTypeWithUnderscore = fieldType.replace(/\s+/g, '_');

	return FILTERED_FIELD_TYPES.some(
		(pattern) =>
			pattern === fieldType || pattern === fieldTypeWithUnderscore || pattern === fieldTypeNoSpace,
	);
}

export function isSystemField(field: CaspioField): boolean {
	const fieldName = field.Name;

	return (
		fieldName === 'UserGUID' ||
		fieldName.startsWith('_') ||
		fieldName === 'PK' ||
		fieldName.startsWith('PK_')
	);
}

export function isPasswordField(field: CaspioField): boolean {
	const fieldType = (field.Type || '').toLowerCase();
	return fieldType.includes('password');
}

export function isFormulaField(field: CaspioField): boolean {
	return field.IsFormula === true;
}

export function filterFieldsForUserInput(fields: CaspioField[]): CaspioField[] {
	return fields.filter((field: CaspioField) => {
		if (isFilteredFieldType(field)) {
			return false;
		}
		if (isSystemField(field)) {
			return false;
		}
		if (isFormulaField(field)) {
			return false;
		}

		return true;
	});
}

export function removeFilteredFields(data: IDataObject, tableFields: CaspioField[]): IDataObject {
	const filteredFieldNames = tableFields
		.filter((field: CaspioField) => isFilteredFieldType(field))
		.map((field: CaspioField) => field.Name);

	const newData: IDataObject = {};

	for (const field of Object.keys(data)) {
		if (!filteredFieldNames.includes(field)) {
			newData[field] = data[field];
		}
	}

	return newData;
}

export function filterOutPasswordFields(fields: CaspioField[]): CaspioField[] {
	return fields.filter((field) => !isPasswordField(field));
}

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationParams {
	limit?: number | null;
	pageNumber?: number | null;
	pageSize?: number | null;
}

export function buildPaginationQuery(params: PaginationParams): IDataObject {
	const qs: IDataObject = {};

	const wantsPagination =
		(params.pageNumber !== null && params.pageNumber !== undefined && params.pageNumber > 0) ||
		(params.pageSize !== null && params.pageSize !== undefined && params.pageSize > 0);

	if (wantsPagination) {
		qs['q.pageNumber'] = params.pageNumber && params.pageNumber > 0 ? params.pageNumber : 1;
		qs['q.pageSize'] =
			params.pageSize && params.pageSize > 0 ? Math.max(Math.min(params.pageSize, 1000), 5) : 1000;
		return qs;
	}

	if (params.limit !== null && params.limit !== undefined && params.limit > 0) {
		qs['q.limit'] = Math.min(params.limit, 1000);
	}

	return qs;
}

export interface PaginationOptions {
	useQPrefix?: boolean;
	maxRecords?: number;
}

export async function getAllWithPagination(
	context: IExecuteFunctions,
	endpoint: string,
	baseQuery: IDataObject,
	options: PaginationOptions = {},
): Promise<IDataObject[]> {
	const { useQPrefix = true, maxRecords } = options;
	const allRecords: IDataObject[] = [];
	let pageNumber = 1;
	const pageSize = 1000;
	let totalCount: number | undefined;

	const MAX_PAGES = 1000;
	let pagesProcessed = 0;

	while (pagesProcessed < MAX_PAGES) {
		const paginationParams = useQPrefix
			? { 'q.pageNumber': pageNumber, 'q.pageSize': pageSize }
			: { pageNumber, pageSize };

		const response = (await caspioApiRequest.call(context, {
			method: 'GET',
			path: endpoint,
			qs: { ...baseQuery, ...paginationParams },
		})) as CaspioListResponse;

		const records = response.Result || [];
		allRecords.push(...records);

		if (pageNumber === 1 && response.Pagination?.TotalCount !== undefined) {
			totalCount = response.Pagination.TotalCount;
		}

		if (maxRecords && allRecords.length >= maxRecords) {
			return allRecords.slice(0, maxRecords);
		}

		if (totalCount !== undefined) {
			if (pageNumber * pageSize >= totalCount) {
				break;
			}
		} else {
			if (records.length === 0 || records.length < pageSize) {
				break;
			}
		}

		pageNumber++;
		pagesProcessed++;
	}

	return allRecords;
}

export function getStandardPaginationProperties(mode: string): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: {
				show: {
					mode: [mode],
				},
			},
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: {
				show: {
					mode: [mode],
					returnAll: [false],
				},
			},
			typeOptions: {
				minValue: 1,
				maxValue: 1000,
			},
			default: 50,
			description: 'Max number of results to return',
		},
	];
}

export function getAdvancedPaginationProperties(mode: string): INodeProperties[] {
	return [
		{
			displayName: 'Limit',
			name: 'advancedLimit',
			type: 'number',
			displayOptions: {
				show: {
					mode: [mode],
				},
			},
			typeOptions: {
				maxValue: 1000,
			},
			default: undefined,
			description: 'Maximum records to return (leave empty for no limit)',
		},
		{
			displayName: 'Page Number',
			name: 'advancedPageNumber',
			type: 'number',
			displayOptions: {
				show: {
					mode: [mode],
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
					mode: [mode],
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
}

// =============================================================================
// Table Utilities
// =============================================================================

export async function fetchResourceFields(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	resourceName: string,
	resourceType: 'table' | 'directory',
): Promise<CaspioField[]> {
	if (resourceType === 'table') {
		const response = (await caspioApiRequest.call(context, {
			method: 'GET',
			path: `/v3/tables/${resourceName}/fields`,
		})) as CaspioFieldsResponse;
		return response.Result || [];
	} else {
		const directoryName = await getDirectoryNameById.call(
			context as ILoadOptionsFunctions,
			resourceName,
		);

		const response = (await caspioApiRequest.call(context, {
			method: 'GET',
			path: `/v3/tables/${encodeURI(directoryName)}/fields`,
		})) as CaspioFieldsResponse;
		return response.Result || [];
	}
}

// Transforms list field values to Caspio API format: "[1], [2]"

export function transformListFields(
	body: IDataObject,
	fieldDefinitions: CaspioField[],
): IDataObject {
	const result: IDataObject = {};

	for (const [fieldName, value] of Object.entries(body)) {
		const fieldDef = fieldDefinitions.find((f) => f.Name === fieldName);
		const isListField = fieldDef?.Type?.startsWith('LIST') && fieldDef.ListField;

		if (!isListField) {
			result[fieldName] = value;
			continue;
		}

		if (value === null || value === undefined || value === '') {
			result[fieldName] = value;
			continue;
		}

		if (typeof value === 'string' && value.match(/^\[.*\]/)) {
			result[fieldName] = value;
			continue;
		}

		if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
			const ids = Object.keys(value).filter(Boolean);
			result[fieldName] = ids.map((id) => `[${id}]`).join(', ');
			continue;
		}

		const userValues = Array.isArray(value)
			? value.map(String)
			: String(value)
					.split(',')
					.map((v) => v.trim());

		const isListDate = fieldDef!.Type?.toUpperCase().includes('DATE');

		const ids = userValues
			.map((val) => {
				return Object.entries(fieldDef!.ListField!).find(([, listVal]) => {
					if (isListDate) {
						const valDate = String(val).substring(0, 10);
						const listValDate = String(listVal).substring(0, 10);
						return valDate === listValDate;
					}
					return listVal == val;
				})?.[0];
			})
			.filter(Boolean);

		result[fieldName] = ids.map((id) => `[${id}]`).join(', ');
	}

	return result;
}
