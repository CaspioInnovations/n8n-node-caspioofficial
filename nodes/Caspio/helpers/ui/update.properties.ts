import type { INodeProperties } from 'n8n-workflow';

export interface UpdateFieldPropertyConfig {
	resource: string;
	operation: string;
	mode?: string;
	loadOptionsField?: string;
	loadOptionsMethod?: string;
	displayOptions?: INodeProperties['displayOptions'];
	description?: string;
	fieldDescription?: string;
	valueDescription?: string;
}

export function getUpdateFieldsCollectionProperty(
	config: UpdateFieldPropertyConfig,
): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	return {
		displayName: 'Update Fields',
		name: 'updateFieldsCollection',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: baseDisplayOptions,
		default: {},
		placeholder: 'Add Field to Update',
		options: [
			{
				displayName: 'Field Update',
				name: 'updates',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							...(config.loadOptionsField && {
								loadOptionsDependsOn: [`${config.loadOptionsField}.value`],
							}),
							loadOptionsMethod: config.loadOptionsMethod || 'getTableUpdateableFields',
						},
						required: true,
						default: '',
						description:
							config.fieldDescription ||
							'The field to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description:
							config.valueDescription ||
							'The value to set for this field. Leave empty to set the field to NULL (supports expressions and variables).',
					},
				],
			},
		],
		description: config.description || 'Configure which fields to update and their new values',
	};
}

export interface UpdateFieldConfig {
	fieldName: string;
	value?: string;
}

export interface UpdateFieldsCollection {
	updates: UpdateFieldConfig[];
}
