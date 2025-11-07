import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeProperties,
    IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getFileIdentifierProperty } from '../../../helpers/ui/file.properties';
import { caspioApiRequest } from '../../../helpers/api';
import type { CaspioFile } from '../../../helpers/interfaces';

export const description: INodeProperties[] = [
    getFileIdentifierProperty({ resource: 'file', operation: 'download' }),
    {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        description: 'The name of the binary property to write to',
        displayOptions: { show: { operation: ['download'], resource: ['file'] } },
    },
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

        const qs: IDataObject = {};
        let downloadPath: string;
        let metadataPath: string;

        if (mode === 'externalKey') {
            downloadPath = `/v3/files/${encodeURIComponent(value)}`;
            metadataPath = `/v3/files/${encodeURIComponent(value)}/fileInfo`;
        } else {
            downloadPath = `/v3/files/path`;
            metadataPath = `/v3/files/path/fileInfo`;
            qs.filePath = value;
        }

        const metadata = await caspioApiRequest.call(this, {
            method: 'GET',
            path: metadataPath,
            qs,
        }) as { Result?: CaspioFile };

        if (!metadata?.Result) {
            throw new NodeOperationError(
                this.getNode(),
                `Failed to fetch file metadata for: ${value}`,
            );
        }

        const fileName = metadata.Result.Name || 'data';
        const mimeType = metadata.Result.ContentType;
        const fileSize = metadata.Result.Size || null;

        const response = await caspioApiRequest.call(this, {
            method: 'GET',
            path: downloadPath,
            qs,
            binary: true,
        });

        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
        const binaryData = await this.helpers.prepareBinaryData(response as Buffer, fileName, mimeType);

        returnData.push({
            json: {
                name: fileName,
                contentType: mimeType,
                size: fileSize,
            },
            binary: { [binaryPropertyName]: binaryData },
        });
    }

    return returnData;
}