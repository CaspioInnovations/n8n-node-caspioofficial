// Shared between 'create' operations for Tables and Directories

import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	NodeApiError,
} from 'n8n-workflow';
import {
	processCaspioError,
	updateDisplayOptions,
	removeFilteredFields,
	transformListFields,
	fetchResourceFields,
} from '../../helpers/utils';
import { caspioApiRequest } from '../../helpers/api';
import type { CaspioField } from '../../helpers/interfaces';

export interface CreateOperationConfig {
	resourceType: 'table' | 'directory';
	fieldPropertyName: 'columns' | 'userFields';
	resourceMapperMethod: string;
	applyFieldFiltering?: boolean;
}

export interface CreatePropertiesConfig {
	resource: string;
	operation: string;
	resourceField: string;
	fieldPropertyName: 'columns' | 'userFields';
	resourceMapperMethod: string;
	fieldWordSingular: string;
	fieldWordPlural: string;
}

export function getCreateProperties(config: CreatePropertiesConfig): INodeProperties[] {
	return [
		{
			displayName: config.fieldWordPlural.charAt(0).toUpperCase() + config.fieldWordPlural.slice(1),
			name: config.fieldPropertyName,
			type: 'resourceMapper',
			default: {
				mappingMode: 'defineBelow',
				value: null,
			},
			noDataExpression: true,
			required: true,
			displayOptions: {
				show: {
					resource: [config.resource],
					operation: [config.operation],
					[config.resourceField]: [{ _cnd: { exists: true } }],
				},
			},
			typeOptions: {
				loadOptionsDependsOn: [`${config.resourceField}.value`],
				resourceMapper: {
					resourceMapperMethod: config.resourceMapperMethod,
					mode: 'add',
					fieldWords: { singular: config.fieldWordSingular, plural: config.fieldWordPlural },
					addAllFields: true,
					multiKeyMatch: false,
				},
			},
		},
	];
}

export async function executeCreate(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	resourceName: string,
	config: CreateOperationConfig,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const endpoint =
		config.resourceType === 'table'
			? `/v3/tables/${resourceName}/records`
			: `/v3/directories/${resourceName}/users`;

	let resourceFields: CaspioField[] | null = null;

	for (let i = 0; i < items.length; i++) {
		try {
			const mappingMode = this.getNodeParameter(
				`${config.fieldPropertyName}.mappingMode`,
				i,
			) as string;

			let body: IDataObject;

			if (mappingMode === 'autoMapInputData') {
				const applyFiltering = config.applyFieldFiltering ?? true;

				if (applyFiltering) {
					if (!resourceFields) {
						resourceFields = await fetchResourceFields(this, resourceName, config.resourceType);
					}

					body = removeFilteredFields(items[i].json, resourceFields || []);
				} else {
					body = items[i].json;
				}
			} else {
				body = this.getNodeParameter(`${config.fieldPropertyName}.value`, i, {}) as IDataObject;
			}

			const fieldsForTransform = await fetchResourceFields(this, resourceName, config.resourceType);
			body = transformListFields(body, fieldsForTransform);

			const qs: IDataObject = {
				response: 'rows',
			};

			const responseData = (await caspioApiRequest.call(this, {
				method: 'POST',
				path: endpoint,
				body,
				qs,
			})) as IDataObject;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray([responseData] as IDataObject[]),
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

export function getCreateDescription(config: CreatePropertiesConfig): INodeProperties[] {
	const displayOptions = {
		show: {
			resource: [config.resource],
			operation: [config.operation],
		},
	};

	return updateDisplayOptions(displayOptions, getCreateProperties(config));
}
