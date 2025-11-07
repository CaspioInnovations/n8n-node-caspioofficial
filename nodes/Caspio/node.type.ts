import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
    record: 'create' | 'delete' | 'getMany' | 'update';
    file: 'delete' | 'download' | 'listFiles' | 'listFolders' | 'upload';
    attachment: 'delete' | 'download' | 'list' | 'upload';
    task: 'get' | 'run';
    directory: 'list' | 'getUsers' | 'createUser' | 'updateUsers' | 'deleteUsers' | 'activateUser';
};

export type CaspioType = AllEntities<NodeMap>;