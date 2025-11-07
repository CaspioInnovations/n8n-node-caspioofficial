import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeProperties,
    IDataObject,
} from 'n8n-workflow';
import { caspioApiRequest } from '../../../helpers/api';
import { getFileIdentifierProperty } from '../../../helpers/ui/file.properties';

export const description: INodeProperties[] = [
    getFileIdentifierProperty({ resource: 'file', operation: 'delete' }),
];

export async function execute(
    this: IExecuteFunctions,
    items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
        const file = this.getNodeParameter('file', i) as IDataObject;
        const mode = file.mode as string;
        const value = file.value as string;

        let path: string;
        const qs: IDataObject = {};

        if (mode === 'externalKey') {
            path = `/v3/files/${encodeURIComponent(value)}`;
        } else {
            path = `/v3/files/path`;
            qs.filePath = value;
        }

        await caspioApiRequest.call(this, {
            method: 'DELETE',
            path,
            qs,
        });

        const resultData = {
            success: true,
            message: 'File deleted successfully',
            deletedFile: mode === 'externalKey'
                ? { externalKey: value }
                : { filePath: value },
        };

        returnData.push({
            json: resultData,
        });
    }

    return returnData;
}