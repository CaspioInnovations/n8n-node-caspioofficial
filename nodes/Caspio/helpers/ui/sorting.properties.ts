import type { INodeProperties } from 'n8n-workflow';

export interface SortPropertyConfig {
	resource: string;
	operation: string;
	mode?: string;
	loadOptionsField?: string;
	loadOptionsMethod?: string;
	displayOptions?: INodeProperties['displayOptions'];
	description?: string;
	enableDescription?: string;
	fieldLoadDependsOn?: string[];
}

export function getSortEnableProperty(config: SortPropertyConfig): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	return {
		displayName: 'Sort Records',
		name: 'enableSorting',
		type: 'boolean',
		displayOptions: baseDisplayOptions,
		default: false,
		description: config.enableDescription || 'Whether to sort the returned records',
	};
}

export function getSortCollectionProperty(config: SortPropertyConfig): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			enableSorting: [true],
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	const loadOptionsDependsOn = config.fieldLoadDependsOn || [
		...(config.loadOptionsField ? [`${config.loadOptionsField}.value`] : []),
		'configureOutputFields',
		'fieldCollection.fields',
	];

	return {
		displayName: 'Sort Rules',
		name: 'sortCollection',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: baseDisplayOptions,
		default: {},
		placeholder: 'Add Sort Rule',
		options: [
			{
				displayName: 'Sort Rule',
				name: 'sorts',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn,
							loadOptionsMethod: config.loadOptionsMethod || 'getTableSortableFields',
						},
						required: true,
						default: '',
						description:
							'The field to sort by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Order',
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'ASC',
							},
							{
								name: 'Descending',
								value: 'DESC',
							},
						],
						required: true,
						default: 'ASC',
						description: 'Sort order (ascending or descending)',
					},
				],
			},
		],
		description: config.description || 'Configure how to sort the returned records',
	};
}
