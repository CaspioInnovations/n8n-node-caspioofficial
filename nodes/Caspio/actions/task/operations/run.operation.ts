import type {
	IExecuteFunctions,
	INodeProperties,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { caspioApiRequest } from '../../../helpers/api';
import { updateDisplayOptions } from '../../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'External Key',
		name: 'externalKey',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6',
		description: 'The unique external key identifier for the task',
	},
];

export const description = updateDisplayOptions(
	{
		show: {
			resource: ['task'],
			operation: ['run'],
		},
	},
	properties,
);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const key = this.getNodeParameter('externalKey', 0) as string;
	const res = (await caspioApiRequest.call(this, {
		method: 'POST',
		path: `/v3/dataImportExportTasks/${encodeURIComponent(key)}/run`,
	})) as IDataObject;

	return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray([res]), {
		itemData: { item: 0 },
	});
}
