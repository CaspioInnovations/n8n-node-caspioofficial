// Shared between 'delete' operations for Tables and Directories

import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	NodeApiError,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { processCaspioError, updateDisplayOptions } from '../../helpers/utils';
import { caspioApiRequest } from '../../helpers/api';
import { getModeProperty } from '../../helpers/ui/mode.properties';
import { getFilterCollectionProperty } from '../../helpers/ui/filters.properties';
import { WhereClauseBuilder } from '../../helpers/builders/where.builder';

export interface DeleteOperationConfig {
	resource: string;
	operation: string;
	resourceField: string; // 'table' or 'directory'
	queryParamName: 'where' | 'Where'; // API uses different casing
	loadOptionsMethod: string;
	validationFn?: (whereClause: string) => void;
	warningMessage?: string;
	basicModeDescription?: string;
	advancedModeDescription?: string;
	wherePlaceholder?: string;
	whereDescription?: string;
	modeDescription?: string;
	filterDescription?: string;
}

export function getUnifiedDeleteProperties(config: DeleteOperationConfig): INodeProperties[] {
	const properties: INodeProperties[] = [
		getModeProperty({
			defaultMode: 'basic',
			basicDescription: config.basicModeDescription || 'Visual filter builder',
			advancedDescription: config.advancedModeDescription || 'Provide a full WHERE clause',
			description: config.modeDescription || 'Choose how to select records to delete',
			displayOptions: {
				show: {
					resource: [config.resource],
					operation: [config.operation],
					[config.resourceField]: [{ _cnd: { exists: true } }],
				},
			},
		}),

		getFilterCollectionProperty({
			resource: config.resource,
			operation: config.operation,
			mode: 'basic',
			loadOptionsField: config.resourceField,
			loadOptionsMethod: config.loadOptionsMethod,
			description:
				config.filterDescription || 'Configure filters to select which records to delete',
		}),

		{
			displayName: 'Where' + (config.resource === 'directory' ? ' Clause' : ''),
			name: 'advancedWhere',
			type: 'string',
			required: config.resource === 'directory' ? true : false,
			default: '',
			placeholder:
				config.wherePlaceholder ||
				(config.resource === 'table'
					? "e.g. Status = 'Active' AND Type = 'PDF'"
					: "e.g. Email LIKE '%@oldcompany.com' AND LastLogin < '2023-01-01'"),
			description:
				config.whereDescription ||
				(config.resource === 'directory'
					? 'WHERE clause to select which users to delete. Cannot use special attributes: _status, _sign_in_method, _2fa_status.'
					: 'SQL-like WHERE clause for selecting records to delete'),
			displayOptions: {
				show: {
					resource: [config.resource],
					operation: [config.operation],
					[config.resourceField]: [{ _cnd: { exists: true } }],
					mode: ['advanced'],
				},
			},
		},
	];

	// Add warning notice if provided (used in Directory user deletion)
	if (config.warningMessage) {
		properties.push({
			displayName: config.warningMessage,
			name: 'deleteWarning',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					resource: [config.resource],
					operation: [config.operation],
					[config.resourceField]: [{ _cnd: { exists: true } }],
				},
			},
		});
	}

	return properties;
}

export async function executeDelete(
	context: IExecuteFunctions,
	items: INodeExecutionData[],
	endpoint: string,
	config: DeleteOperationConfig,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const mode = context.getNodeParameter('mode', i, 'basic') as string;

			let whereClause: string;
			if (mode === 'basic') {
				const filterCollection = context.getNodeParameter(
					'filterCollection.filters',
					i,
					[],
				) as Array<{
					fieldName: string;
					operator: string;
					value?: string;
				}>;

				if (filterCollection.length === 0) {
					throw new NodeOperationError(
						context.getNode(),
						`At least one filter condition must be defined to identify which ${config.resource === 'directory' ? 'users' : 'records'} to delete`,
						{ itemIndex: i },
					);
				}

				for (let index = 0; index < filterCollection.length; index++) {
					try {
						WhereClauseBuilder.validateFilter(filterCollection[index], index);
					} catch (error) {
						throw new NodeOperationError(context.getNode(), (error as Error).message, {
							itemIndex: i,
						});
					}
				}

				whereClause = WhereClauseBuilder.build(filterCollection);
			} else {
				whereClause = context.getNodeParameter('advancedWhere', i, '') as string;

				if (!whereClause.trim()) {
					throw new NodeOperationError(
						context.getNode(),
						`WHERE clause is required in Advanced mode to identify which ${config.resource === 'directory' ? 'users' : 'records'} to delete`,
						{ itemIndex: i },
					);
				}

				whereClause = whereClause.trim();
			}

			if (config.validationFn) {
				try {
					config.validationFn(whereClause);
				} catch (error) {
					throw new NodeOperationError(context.getNode(), (error as Error).message, {
						itemIndex: i,
					});
				}
			}

			const qs: IDataObject = {
				[config.queryParamName]: whereClause,
			};

			const responseData = await caspioApiRequest.call(context, {
				method: 'DELETE',
				path: endpoint,
				qs,
			});

			const executionData = context.helpers.constructExecutionMetaData(
				context.helpers.returnJsonArray([responseData] as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			const processed = processCaspioError(error as NodeApiError, undefined);
			if (context.continueOnFail()) {
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

export function getDeleteDescription(config: DeleteOperationConfig): INodeProperties[] {
	const displayOptions = {
		show: {
			resource: [config.resource],
			operation: [config.operation],
		},
	};

	return updateDisplayOptions(displayOptions, getUnifiedDeleteProperties(config));
}
