import type { INodeProperties } from 'n8n-workflow';
import * as getMany from './operations/getMany.operation';
import * as create from './operations/create.operation';
import * as update from './operations/update.operation';
import * as _delete from './operations/delete.operation';
import { getTableRLC, getViewRLC } from '../../helpers/ui/resource.properties';

export { getMany, create, update, _delete as delete };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new record in a table',
				action: 'Create record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a record from a table',
				action: 'Delete records',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Returns records from a table or a view',
				action: 'Get many records',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a record in a table',
				action: 'Update records',
			},
		],
		default: 'getMany',
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
	},
	{
		displayName: 'Data Source Type',
		name: 'recordSource',
		type: 'options',
		options: [
			{
				name: 'Table',
				value: 'table',
			},
			{
				name: 'View',
				value: 'view',
			},
		],
		default: 'table',
		description: 'Choose whether to query a table or a view',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getMany'],
			},
		},
	},
	{
		...getTableRLC({
			displayOptions: {
				show: {
					resource: ['record'],
					operation: ['create', 'update', 'delete'],
				},
			},
		}),
	},
	{
		...getTableRLC({
			displayOptions: {
				show: {
					resource: ['record'],
					operation: ['getMany'],
					recordSource: ['table'],
				},
			},
		}),
	},
	{
		...getViewRLC({
			displayOptions: {
				show: {
					resource: ['record'],
					operation: ['getMany'],
					recordSource: ['view'],
				},
			},
		}),
	},
	...getMany.description,
	...create.description,
	...update.description,
	..._delete.description,
];
