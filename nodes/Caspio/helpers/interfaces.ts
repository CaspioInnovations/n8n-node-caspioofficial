import type { IDataObject } from 'n8n-workflow';

export interface CaspioTable extends IDataObject {
	Name: string;
	Fields: CaspioField[];
}

export interface CaspioField extends IDataObject {
	Name: string;
	Type: string;
	Label?: string;
	Required?: boolean;
	TableFieldName?: string;
	ListField?: Record<string, string>;
	IsFormula?: boolean;
}

export interface CaspioPagination {
	TotalCount?: number;
	PageNumber?: number;
	PageSize?: number;
}

export interface CaspioListResponse<T = IDataObject> {
	Result: T[];
	Pagination?: CaspioPagination;
}

export interface CaspioSingleResponse<T = IDataObject> {
	Result: T;
}

export type CaspioDirectResponse<T = IDataObject> = T;
export type CaspioApiResponse<T = IDataObject> =
	| CaspioListResponse<T>
	| CaspioSingleResponse<T>
	| CaspioDirectResponse<T>;

export type CaspioRecordsResponse = CaspioListResponse<IDataObject>;
export type CaspioRecordResponse = CaspioSingleResponse<IDataObject>;
export type CaspioFieldsResponse = CaspioListResponse<CaspioField>;
export type CaspioTablesResponse = CaspioListResponse<CaspioTable>;

export interface CaspioFile extends IDataObject {
	Id: string;
	Name: string;
	Size?: number;
	LastModified?: string;
	ContentType?: string;
	ExternalKey?: string;
}

export interface CaspioFolder extends IDataObject {
	Id: string;
	Name: string;
	Path?: string;
	ParentId?: string;
	ExternalKey?: string;
}

export type CaspioFilesResponse = CaspioListResponse<CaspioFile>;
export type CaspioFoldersResponse = CaspioListResponse<CaspioFolder>;

export interface CaspioDirectory extends IDataObject {
	Id: string;
	Name: string;
	Description?: string;
}

export interface CaspioUser extends IDataObject {
	Id: string;
	Email: string;
	FirstName?: string;
	LastName?: string;
	Active?: boolean;
}

export type CaspioDirectoriesResponse = CaspioListResponse<CaspioDirectory>;
export type CaspioUsersResponse = CaspioListResponse<CaspioUser>;

export interface CaspioTask extends IDataObject {
	Id: string;
	Name: string;
	Status?: string;
	LastRun?: string;
}

export type CaspioTasksResponse = CaspioListResponse<CaspioTask>;
export type CaspioTaskResponse = CaspioSingleResponse<CaspioTask>;

export interface CaspioWebhook extends IDataObject {
	Id: string;
	Name: string;
	Secret?: string;
	OutgoingUrls?: string[];
	Events?: string[];
}

export type CaspioWebhooksResponse = CaspioListResponse<CaspioWebhook>;
export type CaspioWebhookResponse = CaspioSingleResponse<CaspioWebhook>;

export interface FileUploadItem {
	value: Buffer;
	options: {
		filename: string;
		contentType?: string;
	};
}

export type FormDataValue = FileUploadItem | FileUploadItem[];

export interface IRequestOpts {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE';
	path: string;
	body?: IDataObject;
	qs?: IDataObject;
	formData?: Record<string, FormDataValue>;
	binary?: boolean;
	headers?: IDataObject;
	json?: boolean;
}
