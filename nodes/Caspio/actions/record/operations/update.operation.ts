import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../helpers/utils';
import {
	getUpdateProperties,
	executeUpdate,
	type UpdateOperationConfig,
} from '../../shared/updateRecords.operation';

const properties = getUpdateProperties({
	resource: 'record',
	operation: 'update',
	loadOptionsField: 'table',
	filterLoadOptionsMethod: 'getTableFilterableFields',
	updateLoadOptionsMethod: 'getTableUpdateableFields',
	entityName: 'records',
	wherePlaceholder: "e.g. Field1 = 'value' AND Field2 > 10",
	whereDescription:
		'Filter conditions syntax (SQL-like WHERE clause) to identify records to update',
});

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	tableName: string,
): Promise<INodeExecutionData[]> {
	const config: UpdateOperationConfig = {
		resourceType: 'table',
		whereParamName: 'where',
		validateDirectoryAttributes: false,
	};

	return executeUpdate.call(this, items, tableName, config);
}
