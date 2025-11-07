import type { INodeProperties } from 'n8n-workflow';
import * as list from './operations/listDirectories.operation';
import * as getUsers from './operations/getUsers.operation';
import * as createUser from './operations/createUser.operation';
import * as updateUsers from './operations/updateUsers.operation';
import * as deleteUsers from './operations/deleteUsers.operation';
import * as activateUser from './operations/activateUser.operation';
import { directoryRLC } from '../../helpers/ui/resource.properties';

export { list, getUsers, createUser, updateUsers, deleteUsers, activateUser };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Activate User',
				value: 'activateUser',
				description: 'Activate a user in a directory',
				action: 'Activate user',
			},
			{
				name: 'Create User',
				value: 'createUser',
				description: 'Create a new user in a directory',
				action: 'Create user',
			},
			{
				name: 'Delete User',
				value: 'deleteUsers',
				description: 'Delete users from a directory',
				action: 'Delete users',
			},
			{
				name: 'Get Many Directories',
				value: 'list',
				description: 'Returns the list of directories',
				action: 'Get many directories',
			},
			{
				name: 'Get Many Users',
				value: 'getUsers',
				description: 'Returns the list of users in a directory',
				action: 'Get many users',
			},
			{
				name: 'Update User',
				value: 'updateUsers',
				description: 'Update a user in a directory',
				action: 'Update users',
			},
		],
		default: 'getUsers',
		displayOptions: {
			show: {
				resource: ['directory'],
			},
		},
	},
	{
		...directoryRLC,
		displayOptions: {
			show: {
				resource: ['directory'],
				operation: ['getUsers', 'createUser', 'updateUsers', 'deleteUsers', 'activateUser'],
			},
		},
	},
	...list.description,
	...getUsers.description,
	...createUser.description,
	...updateUsers.description,
	...deleteUsers.description,
	...activateUser.description,
];
