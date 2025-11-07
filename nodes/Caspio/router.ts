import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import * as record from './actions/record/Record.resource';
import * as file from './actions/file/File.resource';
import * as attachment from './actions/attachment/Attachment.resource';
import * as task from './actions/task/Task.resource';
import * as directory from './actions/directory/Directory.resource';
import type { CaspioType } from './node.type';

interface ResourceOperation {
	execute: (this: IExecuteFunctions, ...args: unknown[]) => Promise<INodeExecutionData[]>;
}

interface ResourceModule {
	[key: string]: ResourceOperation | unknown;
}

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const resource = this.getNodeParameter<CaspioType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const caspioNodeData = { resource, operation } as CaspioType;

	switch (caspioNodeData.resource) {
		case 'record': {
			if (caspioNodeData.operation === 'getMany') {
				const recordSource = this.getNodeParameter('recordSource', 0) as 'table' | 'view';
				const resourceName = encodeURI(
					this.getNodeParameter(recordSource, 0, undefined, {
						extractValue: true,
					}) as string,
				);
				returnData = await record.getMany.execute.call(this, items, resourceName, recordSource);
			} else {
				const tableName = encodeURI(
					this.getNodeParameter('table', 0, undefined, {
						extractValue: true,
					}) as string,
				);
				returnData = await (
					(record as ResourceModule)[caspioNodeData.operation] as ResourceOperation
				).execute.call(this, items, tableName);
			}
			break;
		}
		case 'file': {
			returnData = await (
				(file as ResourceModule)[caspioNodeData.operation] as ResourceOperation
			).execute.call(this, items);
			break;
		}
		case 'attachment': {
			returnData = await (
				(attachment as ResourceModule)[caspioNodeData.operation] as ResourceOperation
			).execute.call(this, items);
			break;
		}
		case 'task': {
			returnData = await (
				(task as ResourceModule)[caspioNodeData.operation] as ResourceOperation
			).execute.call(this);
			break;
		}
		case 'directory': {
			if (caspioNodeData.operation === 'list') {
				returnData = await directory.list.execute.call(this);
			} else {
				const directoryId = encodeURI(
					this.getNodeParameter('directory', 0, undefined, {
						extractValue: true,
					}) as string,
				);
				returnData = await (
					(directory as ResourceModule)[caspioNodeData.operation] as ResourceOperation
				).execute.call(this, items, directoryId);
			}
			break;
		}
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported!`);
	}

	return [returnData];
}
