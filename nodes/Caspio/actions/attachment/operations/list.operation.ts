import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from '../../../helpers/utils';
import { getListAttachmentsProperties, executeListAttachments } from '../../shared/listAttachments.operation';

const properties: INodeProperties[] = getListAttachmentsProperties();

const displayOptions = {
	show: {
		resource: ['attachment'],
		operation: ['list'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const attachmentSource = this.getNodeParameter('attachmentSource', 0) as 'table' | 'view';
	return executeListAttachments.call(this, items, attachmentSource);
}