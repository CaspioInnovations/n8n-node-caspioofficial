import type { INodeProperties } from 'n8n-workflow';
import * as list from './operations/list.operation';
import * as download from './operations/download.operation';
import * as upload from './operations/upload.operation';
import * as _delete from './operations/delete.operation';
import { tableRLC, viewRLC } from '../../helpers/ui/resource.properties';

export { list, download, upload, _delete as delete };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['attachment'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete attachments',
				description: 'Delete files from an attachment field',
			},
			{
				name: 'Download',
				value: 'download',
				action: 'Download attachments',
				description: 'Download files from an attachment field',
			},
			{
				name: 'Get Properties',
				value: 'list',
				action: 'Get attachment properties',
				description: 'Returns file properties stored in an attachment field',
			},
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload attachment',
				description: 'Upload a file to an attachment field',
			},
		],
		default: 'list',
	},
	{
		displayName: 'Data Source Type',
		name: 'attachmentSource',
		type: 'options',
		options: [
			{ name: 'Table', value: 'table' },
			{ name: 'View', value: 'view' },
		],
		default: 'table',
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['list', 'download'],
			},
		},
		description: 'Choose between using Table or View as your attachment source',
	},
	{
		...tableRLC,
		displayOptions: {
			show: {
				resource: ['attachment'],
			},
			hide: {
				attachmentSource: ['view'],
			},
		},
	},
	{
		...viewRLC,
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['list', 'download'],
				attachmentSource: ['view'],
			},
		},
	},
	...list.description,
	...upload.description,
	...download.description,
	..._delete.description,
];
