import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { router } from './router';
import * as record from './actions/record/Record.resource';
import * as file from './actions/file/File.resource';
import * as attachment from './actions/attachment/Attachment.resource';
import * as task from './actions/task/Task.resource';
import * as directory from './actions/directory/Directory.resource';
import { listSearch, loadOptions, resourceMapping } from './methods';

export class Caspio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Caspio',
		name: 'caspio',
		icon: 'file:caspio.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Caspio REST API.',
		documentationUrl:
			'https://howto.caspio.com/integrate-your-apps/integration-with-n8n/n8n-integration-actions',
		defaults: {
			name: 'Caspio',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'caspioOAuth2Api',
				required: true,
				testedBy: 'testAuth',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Attachment',
						value: 'attachment',
					},
					{
						name: 'Data Import/Export Task',
						value: 'task',
					},
					{
						name: 'Directory',
						value: 'directory',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Record',
						value: 'record',
					},
				],
				default: 'record',
			},
			...record.description,
			...file.description,
			...attachment.description,
			...task.description,
			...directory.description,
		],
		usableAsTool: true,
	};

	methods = {
		listSearch,
		loadOptions,
		resourceMapping,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
