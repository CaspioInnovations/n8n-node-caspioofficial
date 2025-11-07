import type { INodeProperties } from 'n8n-workflow';
import * as listFiles from './operations/listFiles.operation';
import * as download from './operations/download.operation';
import * as upload from './operations/upload.operation';
import * as listFolders from './operations/listFolders.operation';
import * as _delete from './operations/delete.operation';

export { listFiles, listFolders, download, upload, _delete as delete };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file from Files area',
				action: 'Delete file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file from Files area',
				action: 'Download file',
			},
			{
				name: 'Get File Properties',
				value: 'listFiles',
				description: 'Returns file properties from Fiels area',
				action: 'Get file properties',
			},
			{
				name: 'Get Folder Properties',
				value: 'listFolders',
				description: 'Returns folder properties from Files area',
				action: 'Get folder properties',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file to Files area',
				action: 'Upload file',
			},
		],
		default: 'listFiles',
		displayOptions: {
			show: { resource: ['file'] },
		},
	},
	...listFiles.description,
	...listFolders.description,
	...download.description,
	...upload.description,
	..._delete.description,
];
