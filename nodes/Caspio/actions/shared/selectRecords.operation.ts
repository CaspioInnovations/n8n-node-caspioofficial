// Shared between 'select' operations for Tables, Views, and Directories

import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	IDisplayOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { caspioApiRequest } from '../../helpers/api';
import { buildPaginationQuery, getAllWithPagination } from '../../helpers/utils';
import { getModeProperty } from '../../helpers/ui/mode.properties';
import {
	getFilterCollectionProperty,
	getFilterEnableProperty,
} from '../../helpers/ui/filters.properties';
import {
	getFieldConfigurationToggle,
	getAdvancedFieldCollectionProperty,
} from '../../helpers/ui/fields.properties';
import {
	getSortEnableProperty,
	getSortCollectionProperty,
} from '../../helpers/ui/sorting.properties';
import { WhereClauseBuilder } from '../../helpers/builders/where.builder';
import { SelectClauseBuilder } from '../../helpers/builders/select.builder';
import { OrderByClauseBuilder } from '../../helpers/builders/orderby.builder';
import type { CaspioListResponse } from '../../helpers/interfaces';

function getUnifiedSelectProperties(
	resourceType: 'table' | 'view' | 'directory',
): INodeProperties[] {
	const resourceField = resourceType === 'directory' ? 'directory' : resourceType;
	const loadOptionsMethod =
		resourceType === 'table'
			? 'getTableSelectableFields'
			: resourceType === 'view'
				? 'getViewSelectableFields'
				: 'getDirectorySelectableFields';
	const filterLoadOptionsMethod =
		resourceType === 'table'
			? 'getTableFilterableFields'
			: resourceType === 'view'
				? 'getViewFilterableFields'
				: 'getDirectoryFilterableFields';
	const sortLoadOptionsMethod =
		resourceType === 'table'
			? 'getTableSortableFields'
			: resourceType === 'view'
				? 'getViewSortableFields'
				: 'getDirectorySortableFields';

	const buildShowConditions = (...additionalConditions: IDataObject[]): IDisplayOptions['show'] => {
		const base: IDataObject = {
			[resourceField]: [{ _cnd: { exists: true } }],
		};
		if (resourceType === 'directory') {
			base.operation = ['getUsers'];
		}
		for (const condition of additionalConditions) {
			Object.assign(base, condition);
		}
		return base as IDisplayOptions['show'];
	};

	const properties: INodeProperties[] = [
		// Mode selection
		getModeProperty({
			defaultMode: 'basic',
			displayOptions: {
				show: buildShowConditions(),
			},
		}),

		// Basic Mode UI Components

		getFieldConfigurationToggle({
			resource: resourceType,
			operation: resourceType === 'directory' ? 'getUsers' : 'selectRecords',
			mode: 'basic',
			displayOptions: {
				show: buildShowConditions({ mode: ['basic'] }),
			},
		}),

		...(resourceType === 'directory'
			? [
					{
						displayName: 'Field Names or IDs',
						name: 'selectedFields',
						type: 'multiOptions' as const,
						typeOptions: {
							loadOptionsDependsOn: [`${resourceField}.value`],
							loadOptionsMethod: loadOptionsMethod,
						},
						displayOptions: {
							show: buildShowConditions({ mode: ['basic'], configureOutputFields: [true] }),
						},
						default: [],
						description:
							'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
				]
			: [
					getAdvancedFieldCollectionProperty({
						resource: resourceType,
						operation: 'selectRecords',
						mode: 'basic',
						loadOptionsField: resourceField,
						loadOptionsMethod: loadOptionsMethod,
						allowAggregations: true,
						displayOptions: {
							show: buildShowConditions({ mode: ['basic'], configureOutputFields: [true] }),
						},
					}),
				]),

		getFilterEnableProperty({
			resource: resourceType,
			operation: resourceType === 'directory' ? 'getUsers' : 'selectRecords',
			mode: 'basic',
			displayOptions: {
				show: buildShowConditions({ mode: ['basic'] }),
			},
		}),

		getFilterCollectionProperty({
			resource: resourceType,
			operation: resourceType === 'directory' ? 'getUsers' : 'selectRecords',
			mode: 'basic',
			loadOptionsField: resourceField,
			loadOptionsMethod: filterLoadOptionsMethod,
			displayOptions: {
				show: buildShowConditions({ mode: ['basic'], enableFiltering: [true] }),
			},
		}),

		getSortEnableProperty({
			resource: resourceType,
			operation: resourceType === 'directory' ? 'getUsers' : 'selectRecords',
			mode: 'basic',
			displayOptions: {
				show: buildShowConditions({ mode: ['basic'] }),
			},
		}),

		getSortCollectionProperty({
			resource: resourceType,
			operation: resourceType === 'directory' ? 'getUsers' : 'selectRecords',
			mode: 'basic',
			loadOptionsField: resourceField,
			loadOptionsMethod: sortLoadOptionsMethod,
			fieldLoadDependsOn:
				resourceType === 'directory'
					? [`${resourceField}.value`, 'configureOutputFields', 'selectedFields']
					: [`${resourceField}.value`, 'configureOutputFields', 'fieldCollection.fields'],
			displayOptions: {
				show: buildShowConditions({ mode: ['basic'], enableSorting: [true] }),
			},
		}),

		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: {
				show: buildShowConditions({ mode: ['basic'] }),
			},
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},

		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: {
				show: buildShowConditions({ mode: ['basic'], returnAll: [false] }),
			},
			typeOptions: {
				minValue: 1,
				maxValue: 1000,
			},
			default: 50,
			description: 'Max number of results to return',
		},

		// Advanced Mode UI Components
		{
			displayName: 'Select',
			name: 'advancedSelect',
			type: 'string',
			displayOptions: {
				show: buildShowConditions({ mode: ['advanced'] }),
			},
			default: '',
			placeholder:
				resourceType === 'directory'
					? 'e.g. Email, FirstName, LastName, _status'
					: 'e.g. Field1, Field2, SUM(Field3) as Total',
			description:
				resourceType === 'directory'
					? 'List of fields separated by comma. Available special attributes: _status, _sign_in_method, _2fa_status.'
					: 'Field selection and aggregation syntax (leave empty for all fields)',
		},

		{
			displayName: 'Where',
			name: 'advancedWhere',
			type: 'string',
			displayOptions: {
				show: buildShowConditions({ mode: ['advanced'] }),
			},
			default: '',
			placeholder:
				resourceType === 'directory'
					? "e.g. _status = 'Active' AND Email LIKE '%@company.com'"
					: "e.g. Field1 = 'value' AND Field2 > 10",
			description: 'Filter conditions syntax (SQL-like WHERE clause)',
		},

		{
			displayName: 'Group By',
			name: 'advancedGroupBy',
			type: 'string',
			displayOptions: {
				show: buildShowConditions({ mode: ['advanced'] }),
			},
			default: '',
			placeholder: 'e.g. Field1, Field2',
			description: 'Grouping fields syntax (comma-separated field names)',
		},

		{
			displayName: 'Order By',
			name: 'advancedOrderBy',
			type: 'string',
			displayOptions: {
				show: buildShowConditions({ mode: ['advanced'] }),
			},
			default: '',
			placeholder: 'e.g. Field1 ASC, Field2 DESC',
			description: 'Sort order syntax (field names with ASC/DESC)',
		},

		{
			displayName: 'Limit',
			name: 'advancedLimit',
			type: 'number',
			displayOptions: {
				show: buildShowConditions({ mode: ['advanced'] }),
			},
			typeOptions: {
				maxValue: 1000,
			},
			default: undefined,
			description: 'Maximum records to return (max 1000 per request)',
		},

		{
			displayName: 'Page Number',
			name: 'advancedPageNumber',
			type: 'number',
			displayOptions: {
				show: buildShowConditions({ mode: ['advanced'] }),
			},
			default: undefined,
			description: 'Page number for pagination (starts at 1)',
		},

		{
			displayName: 'Page Size',
			name: 'advancedPageSize',
			type: 'number',
			displayOptions: {
				show: buildShowConditions({ mode: ['advanced'] }),
			},
			typeOptions: {
				minValue: 5,
				maxValue: 1000,
			},
			default: undefined,
			description: 'Records per page (min 5, max 1000)',
		},
	];

	return properties;
}

export function getSelectProperties(
	resourceType: 'table' | 'view' | 'directory',
): INodeProperties[] {
	return getUnifiedSelectProperties(resourceType);
}

function buildBasicModeQuery(
	context: IExecuteFunctions,
	itemIndex: number,
	resourceType: 'table' | 'view' | 'directory',
): { query: IDataObject; isAggregateOnly: boolean } {
	const qs: IDataObject = {};
	let isAggregateOnly = false;

	const configureOutputFields = context.getNodeParameter(
		'configureOutputFields',
		itemIndex,
	) as boolean;
	if (configureOutputFields) {
		if (resourceType === 'directory') {
			const selectedFields = context.getNodeParameter('selectedFields', itemIndex, []) as string[];
			if (selectedFields.length > 0) {
				qs['q.select'] = selectedFields.join(',');
			}
		} else {
			const fieldCollection = context.getNodeParameter(
				'fieldCollection.fields',
				itemIndex,
				[],
			) as Array<{
				fieldName: string;
				aggregate: boolean;
				aggregationType?: string;
				alias?: string;
			}>;

			if (fieldCollection.length > 0) {
				const selectResult = SelectClauseBuilder.build(fieldCollection);
				qs['q.select'] = selectResult.select;

				if (selectResult.groupBy) {
					qs['q.groupBy'] = selectResult.groupBy;
				}

				isAggregateOnly = selectResult.isAggregateOnly;
			}
		}
	}

	const enableFiltering = context.getNodeParameter('enableFiltering', itemIndex) as boolean;
	if (enableFiltering) {
		const filterCollection = context.getNodeParameter(
			'filterCollection.filters',
			itemIndex,
			[],
		) as Array<{
			fieldName: string;
			operator: string;
			value?: string;
		}>;

		if (filterCollection.length > 0) {
			filterCollection.forEach((filter, index) => {
				try {
					WhereClauseBuilder.validateFilter(filter, index);
				} catch (error) {
					throw new NodeOperationError(context.getNode(), error.message, { itemIndex });
				}
			});

			qs['q.where'] = WhereClauseBuilder.build(filterCollection);
		}
	}

	const enableSorting = context.getNodeParameter('enableSorting', itemIndex) as boolean;
	if (enableSorting) {
		const sortCollection = context.getNodeParameter(
			'sortCollection.sorts',
			itemIndex,
			[],
		) as Array<{
			fieldName: string;
			direction: string;
		}>;

		if (sortCollection.length > 0) {
			qs['q.orderBy'] = OrderByClauseBuilder.build(
				sortCollection.map((sort) => ({
					...sort,
					direction: sort.direction as 'ASC' | 'DESC',
				})),
			);
		}
	}

	return { query: qs, isAggregateOnly };
}

function buildAdvancedModeQuery(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const qs: IDataObject = {};

	const selectValue = context.getNodeParameter('advancedSelect', itemIndex, '') as string;
	if (selectValue.trim()) {
		qs['q.select'] = selectValue.trim();
	}

	const whereValue = context.getNodeParameter('advancedWhere', itemIndex, '') as string;
	if (whereValue.trim()) {
		qs['q.where'] = whereValue.trim();
	}

	const groupByValue = context.getNodeParameter('advancedGroupBy', itemIndex, '') as string;
	if (groupByValue.trim()) {
		qs['q.groupBy'] = groupByValue.trim();
	}

	const orderByValue = context.getNodeParameter('advancedOrderBy', itemIndex, '') as string;
	if (orderByValue.trim()) {
		qs['q.orderBy'] = orderByValue.trim();
	}

	const limitValue = context.getNodeParameter('advancedLimit', itemIndex, null) as number | null;
	const pageNumberValue = context.getNodeParameter('advancedPageNumber', itemIndex, null) as
		| number
		| null;
	const pageSizeValue = context.getNodeParameter('advancedPageSize', itemIndex, null) as
		| number
		| null;

	const paginationParams = {
		limit: limitValue,
		pageNumber: pageNumberValue,
		pageSize: pageSizeValue,
	};

	Object.assign(qs, buildPaginationQuery(paginationParams));
	return qs;
}

async function fetchRecords(
	context: IExecuteFunctions,
	endpoint: string,
	query: IDataObject,
): Promise<IDataObject[]> {
	const response = (await caspioApiRequest.call(context, {
		method: 'GET',
		path: endpoint,
		qs: query,
	})) as CaspioListResponse;

	return response.Result || [];
}

function handleApiError(
	context: IExecuteFunctions,
	error: Error,
	resourceType: string,
	resourceName: string,
	itemIndex: number,
): never {
	if (error instanceof NodeOperationError) {
		throw error;
	}

	const errorMessage = error.message || 'Unknown error occurred';
	if (errorMessage.includes('404')) {
		throw new NodeOperationError(
			context.getNode(),
			`The specified ${resourceType} "${resourceName}" was not found. Please check the name and try again.`,
			{ itemIndex },
		);
	} else if (errorMessage.includes('400')) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid query parameters. Please check your field selections, filters, and syntax.`,
			{ itemIndex },
		);
	} else if (errorMessage.includes('401') || errorMessage.includes('403')) {
		throw new NodeOperationError(
			context.getNode(),
			`Authentication failed or insufficient permissions to access ${resourceType} "${resourceName}".`,
			{ itemIndex },
		);
	} else {
		throw new NodeOperationError(
			context.getNode(),
			`Failed to query ${resourceType}: ${errorMessage}`,
			{ itemIndex },
		);
	}
}

export async function executeSelect(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	resourceType: 'table' | 'view' | 'directory',
	resourceName: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const endpoint =
		resourceType === 'table'
			? `/v3/tables/${resourceName}/records`
			: resourceType === 'view'
				? `/v3/views/${resourceName}/records`
				: `/v3/directories/${resourceName}/users`;

	for (let i = 0; i < items.length; i++) {
		try {
			const mode = this.getNodeParameter('mode', i, 'basic') as string;
			let query: IDataObject;
			let isAggregateOnly = false;

			if (mode === 'basic') {
				const result = buildBasicModeQuery(this, i, resourceType);
				query = result.query;
				isAggregateOnly = result.isAggregateOnly;
			} else {
				query = buildAdvancedModeQuery(this, i);
			}

			let records: IDataObject[];

			if (mode === 'basic') {
				const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;

				if (returnAll) {
					if (isAggregateOnly) {
						records = await fetchRecords(this, endpoint, query);
					} else {
						records = await getAllWithPagination(this, endpoint, query, { useQPrefix: true });
					}
				} else {
					if (isAggregateOnly) {
						records = await fetchRecords(this, endpoint, query);
					} else {
						const limit = this.getNodeParameter('limit', i, 50) as number;

						const limitedQuery = {
							...query,
							'q.limit': limit,
						};

						records = await fetchRecords(this, endpoint, limitedQuery);
					}
				}
			} else {
				records = await fetchRecords(this, endpoint, query);
			}

			if (!Array.isArray(records)) {
				throw new NodeOperationError(
					this.getNode(),
					`Unexpected API response format. Expected array of records but got: ${typeof records}`,
					{ itemIndex: i },
				);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(records as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			handleApiError(this, error, resourceType, resourceName, i);
		}
	}

	return returnData;
}
