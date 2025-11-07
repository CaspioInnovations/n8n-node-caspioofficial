import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from '../../../helpers/utils';
import { getDownloadAttachmentsProperties, executeDownloadAttachments } from '../../shared/downloadAttachments.operation';

const properties: INodeProperties[] = getDownloadAttachmentsProperties();

const displayOptions = {
	show: {
		resource: ['attachment'],
		operation: ['download'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const attachmentSource = this.getNodeParameter('attachmentSource', 0) as 'table' | 'view';
	return executeDownloadAttachments.call(this, items, attachmentSource);
}