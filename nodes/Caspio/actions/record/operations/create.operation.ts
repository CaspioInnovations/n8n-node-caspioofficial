import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import {
	getCreateDescription,
	executeCreate,
	type CreateOperationConfig,
} from '../../shared/createRecords.operation';

const createConfig = {
	resource: 'record',
	operation: 'create',
	resourceField: 'table',
	fieldPropertyName: 'columns' as const,
	resourceMapperMethod: 'getColumnsForCreate',
	fieldWordSingular: 'column',
	fieldWordPlural: 'columns',
};

export const description = getCreateDescription(createConfig);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	tableName: string,
): Promise<INodeExecutionData[]> {
	const config: CreateOperationConfig = {
		resourceType: 'table',
		fieldPropertyName: 'columns',
		resourceMapperMethod: 'getColumnsForCreate',
	};

	return executeCreate.call(this, items, tableName, config);
}
