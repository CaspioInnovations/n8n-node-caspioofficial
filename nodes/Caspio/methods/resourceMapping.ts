import type { ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { caspioApiRequest } from '../helpers/api';
import { filterFieldsForUserInput, fetchDirectoryFields } from '../helpers/utils';
import type { CaspioFieldsResponse, CaspioField } from '../helpers/interfaces';

export async function getColumnsForCreate(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
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

	const filteredFields = filterFieldsForUserInput(fields);

	const result = filteredFields.map((field: CaspioField) => ({
		id: field.Name,
		displayName: field.Label || field.Name,
		display: true,
		defaultMatch: false,
		required: false,
	}));

	return {
		fields: result,
	};
}

export async function getDirectoryFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const tableFields = await fetchDirectoryFields.call(this);

	if (!tableFields.length) {
		throw new NodeOperationError(
			this.getNode(),
			'Directory field information could not be found!',
			{
				level: 'warning',
			},
		);
	}

	const fields = [
		{ id: 'Email', displayName: 'Email', display: true, defaultMatch: false, required: false },
	];

	const filteredFields = filterFieldsForUserInput(tableFields);
	const additionalFields = filteredFields
		.filter((field: CaspioField) => {
			return field.Name !== 'Email';
		})
		.map((field: CaspioField) => ({
			id: field.Name,
			displayName: field.Label || field.Name,
			display: true,
			defaultMatch: false,
			required: false,
		}));

	fields.push(...additionalFields);

	return {
		fields: fields,
	};
}
