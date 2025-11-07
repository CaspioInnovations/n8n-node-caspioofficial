import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import {
	getDeleteDescription,
	executeDelete,
	type DeleteOperationConfig,
} from '../../shared/deleteRecords.operation';

const deleteConfig: DeleteOperationConfig = {
	resource: 'record',
	operation: 'delete',
	resourceField: 'table',
	queryParamName: 'where',
	loadOptionsMethod: 'getTableFilterableFields',
	basicModeDescription: 'Visual filter builder',
	advancedModeDescription: 'Provide a full WHERE clause',
	wherePlaceholder: "e.g. Status = 'Active' AND Type = 'PDF'",
	whereDescription: 'SQL-like WHERE clause for selecting records to delete',
	modeDescription: 'Choose how to select records to delete',
	filterDescription: 'Configure filters to select which records to delete',
};

export const description = getDeleteDescription(deleteConfig);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	tableName: string,
): Promise<INodeExecutionData[]> {
	const endpoint = `/v3/tables/${tableName}/records`;
	return executeDelete(this, items, endpoint, deleteConfig);
}
