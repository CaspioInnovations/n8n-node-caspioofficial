import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { caspioApiRequest } from '../helpers/api';
import {
	isFilteredFieldType,
	isSystemField,
	isPasswordField,
	filterFieldsForUserInput,
	fetchDirectoryFields,
} from '../helpers/utils';
import type { CaspioField, CaspioFieldsResponse } from '../helpers/interfaces';

// For trigger actions only
export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const tableName = encodeURI(
		this.getNodeParameter('table', undefined, {
			extractValue: true,
		}) as string,
	);

	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: `/v3/tables/${tableName}/fields`,
	})) as CaspioFieldsResponse;
	const fields = response.Result;

	if (!fields) {
		throw new NodeOperationError(this.getNode(), 'Table information could not be found!', {
			level: 'warning',
		});
	}

	const allowedFields = fields.filter((field) => !isPasswordField(field));

	const fieldOptions = allowedFields.map((field: CaspioField) => ({
		name: field.Label || field.Name,
		value: field.Name,
		description: `Type: ${field.Type}`,
	}));

	fieldOptions.unshift({
		name: 'PK_ID',
		value: 'PK_ID',
		description: 'Primary Key - Auto-generated ID',
	});

	return fieldOptions;
}

// Generic helper to load fields for both tables and views

async function getResourceFields(
	this: ILoadOptionsFunctions,
	resourceType: 'table' | 'view',
	fieldType: 'selectable' | 'filterable' | 'sortable' | 'attachment',
): Promise<INodePropertyOptions[]> {
	const parameterName = resourceType;
	const resourcePath = resourceType === 'table' ? 'tables' : 'views';

	const resourceName = encodeURI(
		this.getNodeParameter(parameterName, undefined, {
			extractValue: true,
		}) as string,
	);

	if (!resourceName) {
		return [];
	}

	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: `/v3/${resourcePath}/${resourceName}/fields`,
	})) as CaspioFieldsResponse;
	const fields = response.Result;

	if (!fields) {
		if (resourceType === 'view' && fieldType === 'selectable') {
			throw new NodeOperationError(this.getNode(), 'View information could not be found!', {
				level: 'warning',
			});
		}
		return [];
	}

	let allowedFields = fields.filter((field) => !isPasswordField(field));

	switch (fieldType) {
		case 'filterable':
			allowedFields = allowedFields.filter(
				(field: CaspioField) => !field.Type?.toLowerCase().includes('list'),
			);
			break;
		case 'attachment':
			allowedFields = allowedFields.filter((field: CaspioField) => {
				const fieldType = field.Type?.toLowerCase() || '';
				return fieldType.includes('attachment');
			});
			break;
		case 'selectable':
		case 'sortable':
			break;
	}

	const fieldOptions = allowedFields.map((field: CaspioField) => ({
		name: field.Label || field.Name,
		value: field.Name,
		description: `Type: ${field.Type}`,
	}));

	// Add PK_ID for filterable, selectable, and sortable fields since it's not returned by the API but is always available
	if (fieldType === 'filterable' || fieldType === 'selectable' || fieldType === 'sortable') {
		fieldOptions.unshift({
			name: 'PK_ID',
			value: 'PK_ID',
			description: 'Primary Key - Auto-generated ID',
		});

		// Add compound view PK fields for filterable and selectable (not sortable)
		if (resourceType === 'view' && fieldType !== 'sortable') {
			const tablePKFields = extractViewTablePKFields(fields);

			if (tablePKFields.length > 1) {
				const tablePKOptions = tablePKFields.map((pkField) => ({
					name: pkField,
					value: pkField,
					description: 'Table-specific Primary Key',
				}));

				fieldOptions.splice(1, 0, ...tablePKOptions);
			}
		}
	}

	if (fieldType === 'attachment' && fieldOptions.length > 0 && !fieldOptions[0].value) {
		fieldOptions[0].value = fieldOptions[0].value || '';
	}

	return fieldOptions;
}

// ============= Table Fields =============

export async function getTableSelectableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getResourceFields.call(this, 'table', 'selectable');
}

export async function getTableFilterableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getResourceFields.call(this, 'table', 'filterable');
}

export async function getTableFilterOperators(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return [
		{ name: 'Equals', value: 'equals' },
		{ name: 'Does Not Equal', value: 'notEquals' },
		{ name: 'Is Empty', value: 'isEmpty' },
		{ name: 'Is Not Empty', value: 'isNotEmpty' },
		{ name: 'Contains', value: 'contains' },
		{ name: 'Greater Than', value: 'greaterThan' },
		{ name: 'Greater than or Equal To', value: 'greaterThanOrEqual' },
		{ name: 'Less Than', value: 'lessThan' },
		{ name: 'Less than or Equal To', value: 'lessThanOrEqual' },
		{ name: 'Is True', value: 'isTrue' },
		{ name: 'Is False', value: 'isFalse' },
	];
}
// Returns all fields for sorting if not using Configure Output Fields
export async function getTableSortableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const configureOutputFields = this.getNodeParameter('configureOutputFields', false) as boolean;

	if (!configureOutputFields) {
		return await getResourceFields.call(this, 'table', 'sortable');
	} else {
		const fieldCollection = this.getNodeParameter('fieldCollection.fields', []) as Array<{
			fieldName: string;
			aggregate: boolean;
			alias?: string;
		}>;

		return fieldCollection.map((field) => ({
			name: field.aggregate && field.alias ? field.alias : field.fieldName,
			value: field.aggregate && field.alias ? field.alias : field.fieldName,
			description: field.aggregate ? `Aggregated field` : `Original field`,
		}));
	}
}

export async function getTableUpdateableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const tableName = encodeURI(
		this.getNodeParameter('table', undefined, {
			extractValue: true,
		}) as string,
	);

	if (!tableName) {
		return [];
	}

	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: `/v3/tables/${tableName}/fields`,
	})) as CaspioFieldsResponse;
	const fields = response.Result;

	if (!fields) {
		return [];
	}

	const allowedFields = fields.filter((field: CaspioField) => {
		if (isFilteredFieldType(field)) return false; // Filters TIMESTAMP, AUTONUMBER, etc.
		if (isSystemField(field)) return false; // Filters PK_, UserGUID, _*, *ID
		if (isPasswordField(field)) return false; // Filters password fields
		return true;
	});

	return allowedFields.map((field: CaspioField) => ({
		name: field.Label || field.Name,
		value: field.Name,
		description: `Type: ${field.Type}${field.Required ? ' (Required)' : ''}`,
	}));
}

// ============= View Fields =============

// For compound views, extract individual table names to create PK_ID_<TableName> fields
function extractViewTablePKFields(fields: CaspioField[]): string[] {
	if (!fields || fields.length === 0) {
		return [];
	}

	const tableNames = new Set<string>();

	for (const field of fields) {
		if (
			field.TableFieldName &&
			typeof field.TableFieldName === 'string' &&
			field.TableFieldName.includes('.')
		) {
			const tableName = field.TableFieldName.split('.')[0].trim();
			if (tableName) {
				tableNames.add(tableName);
			}
		}
	}

	return Array.from(tableNames)
		.sort()
		.map((tableName) => `_PK_ID_${tableName}`);
}

export async function getViewSelectableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getResourceFields.call(this, 'view', 'selectable');
}

export async function getViewFilterableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getResourceFields.call(this, 'view', 'filterable');
}

// Returns all fields for sorting if not using Configure Output Fields
export async function getViewSortableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const configureOutputFields = this.getNodeParameter('configureOutputFields', false) as boolean;

	if (!configureOutputFields) {
		return await getResourceFields.call(this, 'view', 'sortable');
	} else {
		const fieldCollection = this.getNodeParameter('fieldCollection.fields', []) as Array<{
			fieldName: string;
			aggregate: boolean;
			alias?: string;
		}>;

		return fieldCollection.map((field) => ({
			name: field.aggregate && field.alias ? field.alias : field.fieldName,
			value: field.aggregate && field.alias ? field.alias : field.fieldName,
			description: field.aggregate ? `Aggregated field` : `Original field`,
		}));
	}
}

// ============= Attachment Fields =============

export async function getTableAttachmentFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getResourceFields.call(this, 'table', 'attachment');
}

export async function getAttachmentFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const attachmentSource = this.getNodeParameter('attachmentSource', 0) as 'table' | 'view';
	return await getResourceFields.call(this, attachmentSource, 'attachment');
}

export async function getAttachmentFilterFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const attachmentSource = this.getNodeParameter('attachmentSource', 0) as 'table' | 'view';

	if (attachmentSource === 'table') {
		return await getTableFilterableFields.call(this);
	} else {
		return await getViewFilterableFields.call(this);
	}
}

// ============= Directory Fields =============

export const getDirectorySelectableFields = (function () {
	const PRIORITY_FIELD_NAMES = new Set(['PK_ID', 'UserGUID', 'Email']);
	const PRIORITY_FIELD_DISPLAY = new Map([
		['PK_ID', 'PK_ID'],
		['UserGUID', 'UserGUID'],
		['Email', 'Email'],
	]);

	const SPECIAL_FIELDS: INodePropertyOptions[] = [
		{ name: '_Status', value: '_status', description: '(Type: STRING)' },
		{
			name: '_Sign_in_method',
			value: '_sign_in_method',
			description: '(Type: STRING)',
		},
		{ name: '_2fa_status', value: '_2fa_status', description: '(Type: STRING)' },
	];

	function createFieldOption(field: CaspioField, isPriority = false): INodePropertyOptions {
		const displayName = isPriority
			? PRIORITY_FIELD_DISPLAY.get(field.Name) || field.Label || field.Name
			: field.Label || field.Name;

		return {
			name: displayName,
			value: field.Name,
			description: isPriority
				? `User field: ${field.Name}`
				: `User field: ${field.Name} (Type: ${field.Type})`,
		};
	}

	function shouldExcludeField(field: CaspioField): boolean {
		return isPasswordField(field);
	}

	return async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const fields = await fetchDirectoryFields.call(this);

		if (!fields.length) {
			return [];
		}

		const priorityFields: INodePropertyOptions[] = [];
		const regularFields: INodePropertyOptions[] = [];

		for (const field of fields) {
			if (shouldExcludeField(field)) {
				continue;
			}

			if (PRIORITY_FIELD_NAMES.has(field.Name)) {
				priorityFields.push(createFieldOption(field, true));
			} else {
				regularFields.push(createFieldOption(field, false));
			}
		}

		regularFields.sort((a, b) => a.name.localeCompare(b.name));

		priorityFields.sort((a, b) => {
			const orderA = Array.from(PRIORITY_FIELD_NAMES).indexOf(a.value as string);
			const orderB = Array.from(PRIORITY_FIELD_NAMES).indexOf(b.value as string);
			return orderA - orderB;
		});

		return [...priorityFields, ...regularFields, ...SPECIAL_FIELDS];
	};
})();

export async function getDirectoryFilterableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getDirectorySelectableFields.call(this);
}

// For building WHERE clause for UPDATE and DELETE operations
export async function getDirectoryUpdateFilterableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const allFields = await getDirectorySelectableFields.call(this);
	return allFields.filter((field) => !field.value.toString().startsWith('_'));
}

export async function getDirectorySortableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await getDirectorySelectableFields.call(this);
}

export async function getDirectoryFilterOperators(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return [
		{ name: 'Equals', value: 'equals' },
		{ name: 'Does Not Equal', value: 'notEquals' },
	];
}

export async function getDirectoryUpdateableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const fields = await fetchDirectoryFields.call(this);

	if (!fields.length) {
		return [];
	}
	const updateableFields = filterFieldsForUserInput(fields).map((field: CaspioField) => ({
		name: field.Label || field.Name,
		value: field.Name,
		description: `User field: ${field.Name} (Type: ${field.Type})${field.Required ? ' (Required)' : ''}`,
	}));

	updateableFields.sort((a, b) => a.name.localeCompare(b.name));

	return updateableFields;
}
