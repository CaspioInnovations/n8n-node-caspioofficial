import type { INodeProperties } from 'n8n-workflow';
import * as get from './operations/get.operation';
import * as run from './operations/run.operation';

export { get, run };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Get Many',
				value: 'get',
				action: 'Get many data import export tasks',
				description: 'Returns the list of data import/export tasks',
			},
			{
				name: 'Run',
				value: 'run',
				description: 'Run a chosen data import export task',
				action: 'Run data import export task',
			},
		],
		default: 'get',
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
	},
	...get.description,
	...run.description,
];
