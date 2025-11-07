import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import {
	getCreateDescription,
	executeCreate,
	type CreateOperationConfig,
} from '../../shared/createRecords.operation';

const createConfig = {
	resource: 'directory',
	operation: 'createUser',
	resourceField: 'directory',
	fieldPropertyName: 'userFields' as const,
	resourceMapperMethod: 'getDirectoryFields',
	fieldWordSingular: 'field',
	fieldWordPlural: 'fields',
};

export const description = getCreateDescription(createConfig);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	directoryId: string,
): Promise<INodeExecutionData[]> {
	const config: CreateOperationConfig = {
		resourceType: 'directory',
		fieldPropertyName: 'userFields',
		resourceMapperMethod: 'getDirectoryFields',
	};

	return executeCreate.call(this, items, directoryId, config);
}
