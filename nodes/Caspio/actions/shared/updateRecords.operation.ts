// Shared between 'update' operations for Tables and Directories

import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	NodeApiError,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { caspioApiRequest } from '../../helpers/api';
import {
	processCaspioError,
	validateDirectoryWhereClause,
	transformListFields,
	fetchResourceFields,
} from '../../helpers/utils';
import { getModeProperty } from '../../helpers/ui/mode.properties';
import { getFilterCollectionProperty } from '../../helpers/ui/filters.properties';
import { WhereClauseBuilder } from '../../helpers/builders/where.builder';
import {
	getUpdateFieldsCollectionProperty,
	type UpdateFieldConfig,
} from '../../helpers/ui/update.properties';

export interface UpdateOperationConfig {
	resourceType: 'table' | 'directory';
	whereParamName: 'where' | 'Where';
	validateDirectoryAttributes?: boolean;
}

export interface UpdatePropertiesConfig {
	resource: string;
	operation: string;
	loadOptionsField: string;
	filterLoadOptionsMethod: string;
	updateLoadOptionsMethod: string;
	entityName: string; // 'records' or 'users'
	wherePlaceholder: string;
	whereDescription: string;
}

export function getUpdateProperties(config: UpdatePropertiesConfig): INodeProperties[] {
	const properties: INodeProperties[] = [
		getModeProperty({
			defaultMode: 'basic',
			basicDescription: 'Simple interface for common updates',
			advancedDescription: 'Provide a full WHERE clause',
			description: `Choose how to select ${config.entityName} to update`,
			displayOptions: {
				show: {
					resource: [config.resource],
					operation: [config.operation],
					[config.loadOptionsField]: [{ _cnd: { exists: true } }],
				},
			},
		}),

		getFilterCollectionProperty({
			resource: config.resource,
			operation: config.operation,
			mode: 'basic',
			loadOptionsField: config.loadOptionsField,
			loadOptionsMethod: config.filterLoadOptionsMethod,
			operatorDescription:
				'The comparison operator to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			description: `Configure filters to specify which ${config.entityName} to update`,
		}),

		{
			displayName: 'Where Clause',
			name: 'advancedWhere',
			type: 'string',
			required: true,
			default: '',
			placeholder: config.wherePlaceholder,
			description: config.whereDescription,
			displayOptions: {
				show: {
					resource: [config.resource],
					operation: [config.operation],
					[config.loadOptionsField]: [{ _cnd: { exists: true } }],
					mode: ['advanced'],
				},
			},
		},

		getUpdateFieldsCollectionProperty({
			resource: config.resource,
			operation: config.operation,
			loadOptionsField: config.loadOptionsField,
			loadOptionsMethod: config.updateLoadOptionsMethod,
			description: `Configure which ${config.entityName === 'users' ? 'user fields' : 'fields'} to update and their new values`,
			fieldDescription: `The ${config.entityName === 'users' ? 'user field' : 'field'} to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.`,
			valueDescription: `The value to set for this ${config.entityName === 'users' ? 'user field' : 'field'}. Leave empty to set the field to NULL (supports expressions and variables).`,
		}),
	];

	return properties;
}

export async function executeUpdate(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	resourceName: string,
	config?: UpdateOperationConfig,
): Promise<INodeExecutionData[]> {
	const operationConfig: UpdateOperationConfig = config || {
		resourceType: 'table',
		whereParamName: 'where',
		validateDirectoryAttributes: false,
	};

	const returnData: INodeExecutionData[] = [];
	const endpoint =
		operationConfig.resourceType === 'table'
			? `/v3/tables/${resourceName}/records`
			: `/v3/directories/${resourceName}/users`;

	for (let i = 0; i < items.length; i++) {
		try {
			const mode = this.getNodeParameter('mode', i) as string;
			const qs: IDataObject = {
				response: 'rows',
			};

			let whereClause: string;

			if (mode === 'basic') {
				const filterCollection = this.getNodeParameter('filterCollection.filters', i, []) as Array<{
					fieldName: string;
					operator: string;
					value?: string;
				}>;

				if (filterCollection.length === 0) {
					throw new NodeOperationError(
						this.getNode(),
						'At least one filter condition must be defined to identify which records to update',
						{ itemIndex: i },
					);
				}

				for (let index = 0; index < filterCollection.length; index++) {
					try {
						WhereClauseBuilder.validateFilter(filterCollection[index], index);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), (error as Error).message, {
							itemIndex: i,
						});
					}
				}

				whereClause = WhereClauseBuilder.build(filterCollection);
			} else {
				const advancedWhere = this.getNodeParameter('advancedWhere', i, '') as string;
				if (advancedWhere.trim()) {
					whereClause = advancedWhere.trim();
				} else {
					throw new NodeOperationError(
						this.getNode(),
						'WHERE clause is required in Advanced mode to identify which records to update',
						{ itemIndex: i },
					);
				}
			}

			if (operationConfig.validateDirectoryAttributes) {
				try {
					validateDirectoryWhereClause(whereClause);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
				}
			}

			qs[operationConfig.whereParamName] = whereClause;

			const updateFieldsCollection = this.getNodeParameter(
				'updateFieldsCollection.updates',
				i,
				[],
			) as UpdateFieldConfig[];

			if (updateFieldsCollection.length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					'At least one field must be configured for update',
					{ itemIndex: i },
				);
			}

			let body: IDataObject = {};
			for (const fieldConfig of updateFieldsCollection) {
				body[fieldConfig.fieldName] = fieldConfig.value || null;
			}

			const fieldsForTransform = await fetchResourceFields(
				this,
				resourceName,
				operationConfig.resourceType,
			);
			body = transformListFields(body, fieldsForTransform);

			const response = await caspioApiRequest.call(this, {
				method: 'PUT',
				path: endpoint,
				qs,
				body,
			});

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray([response] as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			const processed = processCaspioError(error as NodeApiError, undefined);
			if (this.continueOnFail()) {
				returnData.push({
					json: { message: processed.message, error: processed },
				});
				continue;
			}
			throw processed;
		}
	}
	return returnData;
}
