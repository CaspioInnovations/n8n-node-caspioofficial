import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';
import { validateDirectoryWhereClause } from '../../../helpers/utils';
import {
	getDeleteDescription,
	executeDelete,
	type DeleteOperationConfig,
} from '../../shared/deleteRecords.operation';

const deleteConfig: DeleteOperationConfig = {
	resource: 'directory',
	operation: 'deleteUsers',
	resourceField: 'directory',
	queryParamName: 'Where', // API uses capitalized 'Where' for directories
	loadOptionsMethod: 'getDirectoryUpdateFilterableFields',
	validationFn: validateDirectoryWhereClause,
	warningMessage: '⚠️ Warning: This operation will permanently delete users from the directory',
	basicModeDescription: 'Simple interface for common deletions',
	advancedModeDescription: 'Provide a full WHERE clause',
	wherePlaceholder: "e.g. Email LIKE '%@oldcompany.com' AND LastLogin < '2023-01-01'",
	whereDescription:
		'WHERE clause to select which users to delete. Cannot use special attributes: _status, _sign_in_method, _2fa_status.',
	modeDescription: 'Choose how to select users to delete',
	filterDescription: 'Configure filters to specify which users to delete',
};

export const description = getDeleteDescription(deleteConfig);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	directoryId: string,
): Promise<INodeExecutionData[]> {
	const endpoint = `/v3/directories/${directoryId}/users`;
	return executeDelete(this, items, endpoint, deleteConfig);
}