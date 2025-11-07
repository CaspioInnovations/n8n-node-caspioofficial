// Shared between 'download' operation for Tables and Views

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { caspioApiRequest } from '../../helpers/api';

export function getDownloadAttachmentsProperties(): INodeProperties[] {
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
				'The attachment field to download from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Record PK ID',
			name: 'recordPkId',
			type: 'string',
			displayOptions: {
				show: {
					attachmentFieldName: [{ _cnd: { not: '' } }],
				},
			},
			default: '',
			required: true,
			description: 'Primary key of the record',
		},
		{
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			displayOptions: {
				show: {
					attachmentFieldName: [{ _cnd: { not: '' } }],
				},
			},
			default: 'data',
			required: true,
			description: 'Name of the binary property to write to',
		},
	];
}

export async function executeDownloadAttachments(
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
			const recordId = this.getNodeParameter('recordPkId', i) as string;
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

			const encodedFieldName = encodeURIComponent(fieldName);
			const encodedRecordId = encodeURIComponent(recordId);
			const basePath = `/v3/${resourceType}s/${resourceName}/attachments/${encodedFieldName}`;

			// Fetch metadata for filename/type (OAuth2 helper strips headers from binary responses)
			const metadata = (await caspioApiRequest.call(this, {
				method: 'GET',
				path: `${basePath}/fileInfo`,
				qs: { 'q.where': `PK_ID=${recordId}` },
			})) as { Result?: Array<{ FileName?: string; FileType?: string; Size?: number }> };

			const fileInfo = metadata?.Result?.[0];
			if (!fileInfo) {
				throw new NodeOperationError(this.getNode(), `No attachment found for record ${recordId}`, {
					itemIndex: i,
				});
			}

			// Download binary
			const buffer = (await caspioApiRequest.call(this, {
				method: 'GET',
				path: `${basePath}/${encodedRecordId}`,
				binary: true,
			})) as Buffer;

			// Caspio stores filename and extension separately for attachments
			const fileName =
				fileInfo.FileName && fileInfo.FileType
					? `${fileInfo.FileName}.${fileInfo.FileType}`
					: fileInfo.FileName || 'data';

			const binaryData = await this.helpers.prepareBinaryData(buffer, fileName);

			returnData.push({
				json: { name: fileName, extension: fileInfo.FileType, size: fileInfo.Size },
				binary: { [binaryPropertyName]: binaryData },
			});
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(
				this.getNode(),
				`Failed to download attachment from ${resourceType}: ${(error as Error).message}`,
				{ itemIndex: i },
			);
		}
	}

	return returnData;
}
