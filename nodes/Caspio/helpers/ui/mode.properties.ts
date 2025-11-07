import type { INodeProperties } from 'n8n-workflow';

export interface ModePropertyConfig {
	defaultMode?: 'basic' | 'advanced';
	displayOptions?: INodeProperties['displayOptions'];
	basicDescription?: string;
	advancedDescription?: string;
	description?: string;
}

export function getModeProperty(
	config: ModePropertyConfig = { defaultMode: 'basic' },
): INodeProperties {
	return {
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		default: 'basic',
		options: [
			{
				name: 'Basic',
				value: 'basic',
				description: config.basicDescription || 'Visual query builder with intuitive interface.',
			},
			{
				name: 'Advanced',
				value: 'advanced',
				description:
					config.advancedDescription || 'Direct API parameter input for complex queries.',
			},
		],
		description: config.description || 'Choose the interface complexity level',
		displayOptions: config.displayOptions,
	};
}
