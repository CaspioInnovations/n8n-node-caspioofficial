import type { INodeProperties } from 'n8n-workflow';

interface FileIdentifierOptions {
	resource: string;
	operation: string;
	description?: string;
}

export function getFileIdentifierProperty(options: FileIdentifierOptions): INodeProperties {
	const { resource, operation, description } = options;

	return {
		displayName: 'File',
		name: 'file',
		type: 'resourceLocator',
		default: { mode: 'externalKey', value: '' },
		required: true,
		modes: [
			{
				displayName: 'External Key',
				name: 'externalKey',
				type: 'string',
				placeholder: 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6',
			},
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				placeholder: 'e.g. Projects/MyProject/document.pdf',
			},
		],
		displayOptions: { show: { operation: [operation], resource: [resource] } },
		description: description || `The file to ${operation}`,
	};
}

interface FolderIdentifierOptions {
	resource: string;
	operation: string;
	description?: string;
	required?: boolean;
}

export function getFolderIdentifierProperty(options: FolderIdentifierOptions): INodeProperties {
	const { resource, operation, description, required = false } = options;

	return {
		displayName: 'Folder',
		name: 'folder',
		type: 'resourceLocator',
		default: { mode: 'path', value: '' },
		required,
		modes: [
			{
				displayName: 'External Key',
				name: 'externalKey',
				type: 'string',
				placeholder: 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				placeholder: 'e.g. Projects/ProjectA/images',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[^/].*[^/]$|^$',
							errorMessage: 'Path should not start or end with /',
						},
					},
				],
			},
		],
		displayOptions: { show: { operation: [operation], resource: [resource] } },
		description: description || 'The folder to use',
	};
}
