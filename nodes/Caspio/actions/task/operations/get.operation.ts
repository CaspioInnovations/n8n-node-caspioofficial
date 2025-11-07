import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { caspioApiRequest } from '../../../helpers/api';
import { updateDisplayOptions } from '../../../helpers/utils';

const properties: INodeProperties[] = [
];

export const description = updateDisplayOptions(
    {
        show: {
            resource: ['task'],
            operation: ['get']
        }
    },
    properties,
);

export async function execute(
    this: IExecuteFunctions,
): Promise<INodeExecutionData[]> {
    const res = await caspioApiRequest.call(this, {
        method: 'GET',
        path: `/v3/dataImportExportTasks`,
    }) as IDataObject;
    return this.helpers.constructExecutionMetaData(
        this.helpers.returnJsonArray([res]),
        { itemData: { item: 0 } },
    );
}