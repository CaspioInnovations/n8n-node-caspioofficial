import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../helpers/utils';
import { caspioApiRequest } from '../../../helpers/api';
import { WhereClauseBuilder } from '../../../helpers/builders/where.builder';
import { getModeProperty } from '../../../helpers/ui/mode.properties';
import { getFilterCollectionProperty } from '../../../helpers/ui/filters.properties';

const properties: INodeProperties[] = [
	{
		displayName: 'Attachment Field Name or ID',
		name: 'attachmentFieldName',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['table.value'],
			loadOptionsMethod: 'getTableAttachmentFields',
		},
		required: true,
		default: '',
		description:
			'The attachment field to delete from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	getModeProperty({
		defaultMode: 'basic',
		basicDescription: 'Visual filter builder',
		advancedDescription: 'Provide a full WHERE clause',
		description: 'Choose how to select records to delete attachments for.',
		displayOptions: {
			hide: {
				attachmentFieldName: [''],
			},
		},
	}),

	getFilterCollectionProperty({
		resource: 'attachment',
		operation: 'delete',
		mode: 'basic',
		loadOptionsField: 'table',
		loadOptionsMethod: 'getTableFilterableFields',
		description: 'Configure filters to select which records are affected.',
		displayOptions: {
			show: {
				mode: ['basic'],
			},
			hide: {
				attachmentFieldName: [''],
			},
		},
	}),

	{
		displayName: 'Where',
		name: 'advancedWhere',
		type: 'string',
		default: '',
		placeholder: "e.g. Status = 'Active' AND Type = 'PDF'",
		description: 'SQL-like WHERE clause for selecting records',
		displayOptions: {
			show: {
				mode: ['advanced'],
			},
			hide: {
				attachmentFieldName: [''],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['attachment'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const tableName = encodeURIComponent(
				this.getNodeParameter('table', i, undefined, { extractValue: true }) as string,
			);
			const fieldName = this.getNodeParameter('attachmentFieldName', i) as string;
			const mode = this.getNodeParameter('mode', i) as string;

			let where = '';
			if (mode === 'basic') {
				const filters = this.getNodeParameter('filterCollection.filters', i, []) as Array<{
					fieldName: string;
					operator: string;
					value?: string;
				}>;
				if (!filters.length) {
					throw new NodeOperationError(
						this.getNode(),
						'Please add at least one filter condition.',
						{ itemIndex: i },
					);
				}

				for (let index = 0; index < filters.length; index++) {
					WhereClauseBuilder.validateFilter(filters[index], index);
				}

				where = WhereClauseBuilder.build(filters);
			} else {
				const advancedWhere = (this.getNodeParameter('advancedWhere', i, '') as string).trim();
				if (!advancedWhere) {
					throw new NodeOperationError(
						this.getNode(),
						'WHERE clause is required in Advanced mode.',
						{ itemIndex: i },
					);
				}
				where = advancedWhere;
			}

			const basePath = `/v3/tables/${tableName}/attachments/${encodeURIComponent(fieldName)}`;

			const response = await caspioApiRequest.call(this, {
				method: 'DELETE',
				path: basePath,
				qs: { where },
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
				`Failed to delete attachments: ${error.message}`,
				{ itemIndex: i },
			);
		}
	}

	return returnData;
}
