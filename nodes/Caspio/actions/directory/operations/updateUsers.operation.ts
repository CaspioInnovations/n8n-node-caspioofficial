import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../helpers/utils';
import {
	getUpdateProperties,
	executeUpdate,
	type UpdateOperationConfig,
} from '../../shared/updateRecords.operation';

const properties = getUpdateProperties({
	resource: 'directory',
	operation: 'updateUsers',
	loadOptionsField: 'directory',
	filterLoadOptionsMethod: 'getDirectoryUpdateFilterableFields',
	updateLoadOptionsMethod: 'getDirectoryUpdateableFields',
	entityName: 'users',
	wherePlaceholder: "e.g. Email LIKE '%@company.com' AND FirstName IS NOT NULL",
	whereDescription:
		'WHERE clause to select which users to update. Cannot use special attributes: _status, _sign_in_method, _2fa_status.',
});

const displayOptions = {
	show: {
		resource: ['directory'],
		operation: ['updateUsers'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	directoryId: string,
): Promise<INodeExecutionData[]> {
	const config: UpdateOperationConfig = {
		resourceType: 'directory',
		whereParamName: 'Where', // Directory API uses capitalized 'Where' (unlike Table API)
		validateDirectoryAttributes: true,
	};

	return executeUpdate.call(this, items, directoryId, config);
}
