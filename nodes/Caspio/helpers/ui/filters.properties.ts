import type { INodeProperties } from 'n8n-workflow';
import { WhereClauseBuilder } from '../builders/where.builder';

export interface FilterPropertyConfig {
	resource: string;
	operation: string;
	mode?: string;
	loadOptionsField?: string;
	loadOptionsMethod?: string;
	displayOptions?: INodeProperties['displayOptions'];
	description?: string;
	fieldDescription?: string;
	operatorDescription?: string;
	valueDescription?: string;
}

export function getFilterCollectionProperty(config: FilterPropertyConfig): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	return {
		displayName: 'Filters',
		name: 'filterCollection',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: baseDisplayOptions,
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Filter Condition',
				name: 'filters',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						typeOptions: {
							...(config.loadOptionsField && {
								loadOptionsDependsOn: [`${config.loadOptionsField}.value`],
							}),
							loadOptionsMethod: config.loadOptionsMethod || 'getTableFilterableFields',
						},
						required: true,
						default: '',
						description:
							config.fieldDescription ||
							'The field to filter on (excludes List fields). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Operator Name or ID',
						name: 'operator',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						required: true,
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getTableFilterOperators',
						},
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description:
							config.valueDescription ||
							'The value to compare against (supports expressions and variables)',
						displayOptions: {
							hide: {
								operator: WhereClauseBuilder.getOperatorsWithoutValue(),
							},
						},
					},
				],
			},
		],
		description: config.description || 'Configure filters to limit which records are returned',
	};
}

export function getFilterEnableProperty(config: FilterPropertyConfig): INodeProperties {
	const baseDisplayOptions = config.displayOptions || {
		show: {
			resource: [config.resource],
			operation: [config.operation],
			...(config.mode && { mode: [config.mode] }),
			...(config.loadOptionsField && { [config.loadOptionsField]: [{ _cnd: { exists: true } }] }),
		},
	};

	return {
		displayName: 'Filter Records',
		name: 'enableFiltering',
		type: 'boolean',
		displayOptions: baseDisplayOptions,
		default: false,
		description: 'Whether to apply filters to limit which records are returned',
	};
}
