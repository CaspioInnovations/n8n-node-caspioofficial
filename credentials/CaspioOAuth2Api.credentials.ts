import { Icon, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CaspioOAuth2Api implements ICredentialType {
	name = 'caspioOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Caspio OAuth2 API';
	icon: Icon = 'file:caspio.svg';
	documentationUrl =
		'https://howto.caspio.com/integrate-your-apps/integration-with-n8n/n8n-integration-credentials';
	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'clientCredentials',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://{{$self.integrationURL}}/oauth/token',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Integration URL',
			name: 'integrationURL',
			type: 'string',
			default: '',
			placeholder: 'a1bcd234.caspio.com',
			required: true,
			description: 'Your Integration URL available in Account settings in Caspio.',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'Client ID available in Web services profile in Caspio.',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Client Secret available in Web services profile in Caspio.',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Send Additional Body Properties',
			name: 'sendAdditionalBodyProperties',
			type: 'hidden',
			default: false,
		},
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'all',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: '=https://{{$credentials.integrationURL}}/oauth/token',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: '=grant_type=client_credentials&client_id={{$credentials.clientId}}&client_secret={{$credentials.clientSecret}}',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'access_token',
					value: '',
					message: 'Invalid credentials: failed to obtain access token',
				},
			},
		],
	};
}
