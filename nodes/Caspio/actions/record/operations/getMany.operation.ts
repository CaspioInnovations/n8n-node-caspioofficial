import type { INodeExecutionData, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { getSelectProperties, executeSelect } from '../../shared/selectRecords.operation';
import { getModeProperty } from '../../../helpers/ui/mode.properties';
import { updateDisplayOptions } from '../../../helpers/utils';

function createModeProperty(recordSource: 'table' | 'view'): INodeProperties {
	return getModeProperty({
		defaultMode: 'basic',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getMany'],
				recordSource: [recordSource],
				[recordSource]: [{ _cnd: { exists: true } }],
			},
		},
	});
}

function preparePropertiesForRecordSource(recordSource: 'table' | 'view'): INodeProperties[] {
	const baseProperties = getSelectProperties(recordSource).filter((prop) => prop.name !== 'mode');

	const displayOptions = {
		show: {
			resource: ['record'],
			operation: ['getMany'],
			recordSource: [recordSource],
		},
	};

	return updateDisplayOptions(displayOptions, baseProperties);
}

const properties: INodeProperties[] = [
	createModeProperty('table'),
	...preparePropertiesForRecordSource('table'),
	createModeProperty('view'),
	...preparePropertiesForRecordSource('view'),
];

export const description = properties;

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	resourceName: string,
	recordSource: 'table' | 'view',
): Promise<INodeExecutionData[]> {
	return executeSelect.call(this, items, recordSource, resourceName);
}
