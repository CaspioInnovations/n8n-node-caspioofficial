import type { INodeProperties } from 'n8n-workflow';

export interface ResourceLocatorConfig {
	displayOptions?: INodeProperties['displayOptions'];
	required?: boolean;
	displayName?: string;
	description?: string;
	placeholder?: string;
	validationRegex?: string;
	validationMessage?: string;
}

export function getTableRLC(config: ResourceLocatorConfig = {}): INodeProperties {
	return {
		displayName: config.displayName || 'Table',
		name: 'table',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: config.required !== false,
		description: config.description,
		displayOptions: config.displayOptions,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'tableSearch',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: config.validationRegex || '[a-zA-Z0-9_]+',
							errorMessage: config.validationMessage || 'Not a valid Caspio Table name',
						},
					},
				],
				placeholder: config.placeholder || 'e.g. MyTable',
			},
		],
	};
}

export function getViewRLC(config: ResourceLocatorConfig = {}): INodeProperties {
	return {
		displayName: config.displayName || 'View',
		name: 'view',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: config.required !== false,
		description: config.description,
		displayOptions: config.displayOptions,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'viewSearch',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: config.validationRegex || '[a-zA-Z0-9_]+',
							errorMessage: config.validationMessage || 'Not a valid Caspio View name',
						},
					},
				],
				placeholder: config.placeholder || 'e.g. MyView',
			},
		],
	};
}

export function getDirectoryRLC(config: ResourceLocatorConfig = {}): INodeProperties {
	return {
		displayName: config.displayName || 'Directory',
		name: 'directory',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: config.required !== false,
		description: config.description,
		displayOptions: config.displayOptions,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'directorySearch',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: config.placeholder || 'e.g. p5m962',
			},
		],
	};
}

export const tableRLC = getTableRLC();
export const viewRLC = getViewRLC();
export const directoryRLC = getDirectoryRLC();
