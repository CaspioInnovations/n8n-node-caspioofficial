import type { INodeProperties } from 'n8n-workflow';

export interface FieldPropertyConfig {
	resource: string;
	operation: string;
	mode?: string;
	loadOptionsField?: string;
	loadOptionsMethod?: string;
	displayOptions?: INodeProperties['displayOptions'];
	description?: string;
	enableDescription?: string;
	allowAggregations?: boolean;
}

// Configure Output Fields toggle
export function getFieldConfigurationToggle(config: FieldPropertyConfig): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	return {
		displayName: 'Configure Output Fields',
		name: 'configureOutputFields',
		type: 'boolean',
		displayOptions: baseDisplayOptions,
		default: false,
		description:
			config.enableDescription ||
			'Whether to configure specific fields and aggregations for the output',
	};
}

// Multi-select field names or IDs
export function getFieldSelectionProperty(config: FieldPropertyConfig): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			configureOutputFields: [true],
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	return {
		displayName: 'Field Names or IDs',
		name: 'selectedFields',
		type: 'multiOptions',
		typeOptions: {
			...(config.loadOptionsField && {
				loadOptionsDependsOn: [`${config.loadOptionsField}.value`],
			}),
			loadOptionsMethod: config.loadOptionsMethod || 'getTableSelectableFields',
		},
		displayOptions: baseDisplayOptions,
		default: [],
		description:
			config.description ||
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

// Advanced field collection with Aggregation support
export function getAdvancedFieldCollectionProperty(config: FieldPropertyConfig): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			configureOutputFields: [true],
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	const fieldValues: INodeProperties[] = [
		{
			displayName: 'Field Name or ID',
			name: 'fieldName',
			type: 'options',
			typeOptions: {
				...(config.loadOptionsField && {
					loadOptionsDependsOn: [`${config.loadOptionsField}.value`],
				}),
				loadOptionsMethod: config.loadOptionsMethod || 'getTableSelectableFields',
			},
			required: true,
			default: '',
			description:
				'The field to include in the query. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
	];

	if (config.allowAggregations) {
		fieldValues.unshift(
			{
				displayName: '⚠️ This aggregation works only with numeric fields',
				name: 'numericFieldNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						aggregate: [true],
						aggregationType: ['SUM', 'AVG'],
					},
				},
			},
			{
				displayName: 'Aggregate',
				name: 'aggregate',
				type: 'boolean',
				default: false,
				description: 'Whether to apply an aggregation function to this field',
			},
			{
				displayName: 'Aggregation',
				name: 'aggregationType',
				type: 'options',
				options: [
					{ name: 'Average', value: 'AVG' },
					{ name: 'Count', value: 'COUNT' },
					{ name: 'Count Unique', value: 'COUNT(DISTINCT' },
					{ name: 'Maximum', value: 'MAX' },
					{ name: 'Minimum', value: 'MIN' },
					{ name: 'Sum', value: 'SUM' },
				],
				default: 'COUNT',
				description: 'The aggregation function to apply',
				displayOptions: {
					show: {
						aggregate: [true],
					},
				},
			},
			{
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				default: '',
				description: 'Custom name for this field in the output (optional)',
				displayOptions: {
					show: {
						aggregate: [true],
					},
				},
			},
		);
	}

	return {
		displayName: 'Fields',
		name: 'fieldCollection',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: baseDisplayOptions,
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Field Configuration',
				name: 'fields',
				values: fieldValues,
			},
		],
		description: config.description || 'Configure the fields to include in your query',
	};
}
