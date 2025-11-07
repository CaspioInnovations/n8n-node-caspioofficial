import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { caspioApiRequest } from '../helpers/api';

export async function tableSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: '/v3/tables',
	})) as { Result?: string[] };
	let tables = response.Result || [];

	if (filter) {
		tables = tables.filter((table: string) => table.toLowerCase().includes(filter.toLowerCase()));
	}

	return {
		results: tables.map((table: string) => ({
			name: table,
			value: table,
		})),
	};
}

export async function viewSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: '/v3/views',
	})) as { Result?: string[] };
	let views = response.Result || [];

	if (filter) {
		views = views.filter((view: string) => view.toLowerCase().includes(filter.toLowerCase()));
	}

	return {
		results: views.map((view: string) => ({
			name: view,
			value: view,
		})),
	};
}

export async function directorySearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await caspioApiRequest.call(this, {
		method: 'GET',
		path: '/v3/directories',
	})) as { Result?: Array<{ Name: string; Id: string }> };
	let directories = response.Result || [];

	if (filter) {
		directories = directories.filter((dir: { Name: string; Id: string }) =>
			dir.Name.toLowerCase().includes(filter.toLowerCase()),
		);
	}

	return {
		results: directories.map((dir: { Name: string; Id: string }) => ({
			name: dir.Name,
			value: dir.Id,
		})),
	};
}
