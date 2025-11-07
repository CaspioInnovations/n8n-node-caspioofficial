import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { IRequestOpts, FileUploadItem } from './interfaces';

export async function caspioApiRequest<T = IDataObject>(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	{ method, path, body = {}, qs = {}, formData, binary = false, headers, json }: IRequestOpts,
): Promise<T> {
	const creds = await this.getCredentials('caspioOAuth2Api');
	const baseURL = `https://${creds.integrationURL}/integrations/rest`;

	const options: IHttpRequestOptions = {
		headers: headers || { Accept: binary ? 'application/octet-stream' : 'application/json' },
		method,
		baseURL,
		url: baseURL + path,
		qs,
		json: json !== undefined ? json : !binary,
	};

	if (binary) {
		options.encoding = 'arraybuffer';
	}

	if (formData) {
		const form = new FormData();

		const appendFile = (key: string, item: FileUploadItem) => {
			const { value, options } = item;
			const blob = new Blob([value], {
				type: options.contentType || 'application/octet-stream',
			});
			form.append(key, blob, options.filename);
		};

		for (const [key, value] of Object.entries(formData)) {
			if (Array.isArray(value)) {
				value.forEach((item) => appendFile(key, item));
			} else {
				appendFile(key, value);
			}
		}

		options.body = form;
		delete options.json;
	} else if (Object.keys(body).length) {
		options.body = body;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'caspioOAuth2Api', options);
	} catch (err) {
		throw new NodeApiError(this.getNode(), err as JsonObject);
	}
}
