// Shared between 'list' operation for Tables and Views

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { caspioApiRequest } from '../../helpers/api';
import { getModeProperty } from '../../helpers/ui/mode.properties';
import { WhereClauseBuilder } from '../../helpers/builders/where.builder';

export function getListAttachmentsProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Attachment Field Name or ID',
			name: 'attachmentFieldName',
			type: 'options',
			typeOptions: {
				loadOptionsDependsOn: ['attachmentSource', 'table.value', 'view.value'],
				loadOptionsMethod: 'getAttachmentFields',
			},
			required: true,
			default: '',
			description:
				'The attachment field to query. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},

		getModeProperty({
			defaultMode: 'basic',
			description: 'Choose the interface complexity level.',
			displayOptions: {
				show: {
					attachmentFieldName: [{ _cnd: { not: '' } }],
				},
			},
		}),

		{
			displayName: 'Enable Filtering',
			name: 'enableFiltering',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					mode: ['basic'],
					attachmentFieldName: [{ _cnd: { not: '' } }],
				},
			},
			description: 'Whether to apply filters to limit which attachment records are returned',
		},

		{
			displayName: 'Filters',
			name: 'filterCollection',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					mode: ['basic'],
					enableFiltering: [true],
					attachmentFieldName: [{ _cnd: { not: '' } }],
				},
			},
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
								loadOptionsDependsOn: ['attachmentSource', 'table.value', 'view.value'],
								loadOptionsMethod: 'getAttachmentFilterFields',
							},
							required: true,
							default: '',
							description:
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
							description: 'The value to compare against (leave empty for operators like IS NULL, IS NOT NULL that don\'t require a value)',
						},
					],
				},
			],
			description: 'Configure filters to limit which attachment records are returned',
		},

		{
			displayName: 'Where',
			name: 'advancedWhere',
			type: 'string',
			displayOptions: {
				show: {
					mode: ['advanced'],
					attachmentFieldName: [{ _cnd: { not: '' } }],
				},
			},
			default: '',
			placeholder: "e.g. Field1 = 'value' AND Field2 > 10",
			description: 'Filter conditions syntax (SQL-like WHERE clause)',
		},
	];
}

export async function executeListAttachments(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	resourceType: 'table' | 'view',
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const resourceField = resourceType;

	for (let i = 0; i < items.length; i++) {
		try {
			const resourceName = encodeURIComponent(
				this.getNodeParameter(resourceField, i, undefined, { extractValue: true }) as string,
			);
			const fieldName = this.getNodeParameter('attachmentFieldName', i) as string;

			const mode = this.getNodeParameter('mode', i, 'basic') as string;
			const qs: IDataObject = {};

			if (mode === 'basic') {
				const enableFiltering = this.getNodeParameter('enableFiltering', i, false) as boolean;
				if (enableFiltering) {
					const filterCollection = this.getNodeParameter(
						'filterCollection.filters',
						i,
						[],
					) as Array<{
						fieldName: string;
						operator: string;
						value?: string;
					}>;

					if (filterCollection.length > 0) {
						for (let index = 0; index < filterCollection.length; index++) {
							WhereClauseBuilder.validateFilter(filterCollection[index], index);
						}

						qs.where = WhereClauseBuilder.build(filterCollection);
					}
				}
			} else {
				const advancedWhere = this.getNodeParameter('advancedWhere', i, '') as string;
				if (advancedWhere.trim()) {
					qs.where = advancedWhere.trim();
				}
			}

			const endpoint = `/v3/${resourceType}s/${resourceName}/attachments/${encodeURIComponent(fieldName)}/fileInfo`;
			const response = await caspioApiRequest.call(this, {
				method: 'GET',
				path: endpoint,
				qs,
			});

			const data = Array.isArray(response) ? response : [response];
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(data),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(
				this.getNode(),
				`Failed to list attachments from ${resourceType}: ${error.message}`,
				{ itemIndex: i },
			);
		}
	}

	return returnData;
}
