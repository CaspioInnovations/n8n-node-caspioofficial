import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../helpers/utils';
import { getSelectProperties, executeSelect } from '../../shared/selectRecords.operation';

const properties = getSelectProperties('directory');

const displayOptions = {
	show: {
		resource: ['directory'],
		operation: ['getUsers'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	directoryId: string,
): Promise<INodeExecutionData[]> {
	return executeSelect.call(this, items, 'directory', directoryId);
}