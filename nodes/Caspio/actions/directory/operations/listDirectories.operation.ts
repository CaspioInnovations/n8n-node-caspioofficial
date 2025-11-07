import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { caspioApiRequest } from '../../../helpers/api';
import { updateDisplayOptions } from '../../../helpers/utils';
import type { CaspioDirectoriesResponse } from '../../../helpers/interfaces';

const properties: INodeProperties[] = [];

export const description = updateDisplayOptions(
	{
		show: {
			resource: ['directory'],
			operation: ['list']
		}
	},
	properties,
);

export async function execute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[]> {
	const res = await caspioApiRequest.call(this, {
		method: 'GET',
		path: `/v3/directories`,
	}) as CaspioDirectoriesResponse;

	return this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(res.Result || []),
		{ itemData: { item: 0 } },
	);
}