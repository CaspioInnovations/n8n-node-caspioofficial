import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	NodeApiError,
} from 'n8n-workflow';
import { processCaspioError, updateDisplayOptions } from '../../../helpers/utils';
import { caspioApiRequest } from '../../../helpers/api';

const properties: INodeProperties[] = [
	{
		displayName: 'User GUID',
		name: 'userGUID',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 12345678-1234-1234-1234-123456789abc',
		description: 'The UserGUID field value that uniquely identifies the user to activate',
		displayOptions: {
			show: {
				resource: ['directory'],
				operation: ['activateUser'],
				directory: [{ _cnd: { exists: true } }],
			},
		},
	},
	{
		displayName: 'Send Activation Email',
		name: 'sendEmail',
		type: 'boolean',
		default: true,
		description: 'Whether to send the built-in activation email to the user',
		displayOptions: {
			show: {
				resource: ['directory'],
				operation: ['activateUser'],
				directory: [{ _cnd: { exists: true } }],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['directory'],
		operation: ['activateUser'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	directoryId: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const endpoint = `/v3/directories/${directoryId}/users/activate`;

	for (let i = 0; i < items.length; i++) {
		try {
			const userGUID = this.getNodeParameter('userGUID', i) as string;
			const sendEmail = this.getNodeParameter('sendEmail', i, true) as boolean;

			const body: IDataObject = {
				UserGUID: userGUID,
				SendEmail: sendEmail,
			};

			const responseData = await caspioApiRequest.call(this, {
				method: 'POST',
				path: endpoint,
				body,
			});

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray([responseData] as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			const processed = processCaspioError(error as NodeApiError, undefined);
			if (this.continueOnFail()) {
				returnData.push({
					json: { message: processed.message, error: processed },
				});
				continue;
			}
			throw processed;
		}
	}
	return returnData;
}