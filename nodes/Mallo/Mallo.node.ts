import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildLead,
	fixedCollectionToObject,
	malloApiRequest,
	parseJsonParameter,
} from './GenericFunctions';

export class Mallo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mallo',
		name: 'mallo',
		icon: 'file:mallo.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send WhatsApp templates, add leads to campaigns, and call the Mallo API',
		defaults: {
			name: 'Mallo',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'malloApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.getmallo.ai',
		},
		properties: [
			// ----------------------------------------------------------------------
			// Resource
			// ----------------------------------------------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Custom API Call', value: 'custom' },
				],
				default: 'message',
			},

			// ----------------------------------------------------------------------
			// Operations
			// ----------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{
						name: 'Send a Template Message',
						value: 'sendTemplate',
						action: 'Send a template message',
						description: 'Send one approved WhatsApp template to one lead',
					},
				],
				default: 'sendTemplate',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['campaign'] } },
				options: [
					{
						name: 'Add Lead to Campaign',
						value: 'addLead',
						action: 'Add a lead to a campaign',
						description: 'Add one lead to an existing campaign',
					},
				],
				default: 'addLead',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['custom'] } },
				options: [
					{
						name: 'Make an API Call',
						value: 'apiCall',
						action: 'Make a custom API call',
						description: 'Perform a custom authenticated call to the Mallo API',
					},
				],
				default: 'apiCall',
			},

			// ======================================================================
			// Message: Send a Template Message
			// ======================================================================
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
				description: 'Name of an approved template on the channel',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'fr',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
				description: 'Template language code, e.g. en or fr',
			},
			{
				displayName: 'Phone',
				name: 'recipient',
				type: 'string',
				default: '',
				required: true,
				placeholder: '+33612345678',
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
				description: 'Lead phone number. Prefer E.164, e.g. +33612345678.',
			},
			{
				displayName: 'Template Variables',
				name: 'variables',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Variable',
				default: {},
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
				description: 'Template placeholder values. Keys must be 1, 2, 3… matching {{1}}, {{2}} in the template.',
				options: [
					{
						name: 'entry',
						displayName: 'Variable',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: '1',
								description: 'Placeholder position: 1, 2, 3…',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
				options: [
					{
						displayName: 'Agent Name or ID',
						name: 'agentId',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getAgents' },
						default: '',
						description:
							'Pins the agent that owns the resulting conversation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{
						displayName: 'Extra Lead Data (JSON)',
						name: 'leadData',
						type: 'json',
						default: '{}',
						description: 'Free-form lead attributes merged with the structured lead fields',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'From Number',
						name: 'fromNumber',
						type: 'string',
						default: '',
						placeholder: '+33123456789',
						description:
							'Optional sender number (E.164). Leave empty to auto-resolve your single active WhatsApp channel.',
					},
					{
						displayName: 'Idempotency Key',
						name: 'idempotencyKey',
						type: 'string',
						default: '',
						description: 'Optional. Replaying the same key within 24h returns the original response instead of sending again.',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Metadata (JSON)',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'Free-form metadata stored with the send',
					},
					{
						displayName: 'Notes',
						name: 'notes',
						type: 'string',
						typeOptions: { rows: 2 },
						default: '',
					},
					{
						displayName: 'Overwrite Existing Notes',
						name: 'overwriteNotes',
						type: 'boolean',
						default: false,
						description: 'Whether to replace the stored lead notes instead of appending to them',
					},
				],
			},

			// ======================================================================
			// Campaign: Add Lead to Campaign
			// ======================================================================
			{
				displayName: 'Campaign Name or ID',
				name: 'campaignId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getCampaigns' },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['campaign'], operation: ['addLead'] } },
				description:
					'The campaign to add the lead to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				required: true,
				placeholder: '+33612345678',
				displayOptions: { show: { resource: ['campaign'], operation: ['addLead'] } },
				description: 'Lead phone number. Prefer E.164, e.g. +33612345678.',
			},
			{
				displayName: 'Send Now',
				name: 'enqueue',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['campaign'], operation: ['addLead'] } },
				description:
					'Whether to send immediately. If off, the lead stays pending until the campaign is launched or scheduled.',
			},
			{
				displayName: 'Campaign Fields',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['campaign'], operation: ['addLead'] } },
				description:
					'For dashboard campaigns (named fields). Keys must match the campaign field keys, e.g. prenom.',
				options: [
					{
						name: 'entry',
						displayName: 'Field',
						values: [
							{ displayName: 'Key', name: 'key', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Template Variables',
				name: 'variables',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Variable',
				default: {},
				displayOptions: { show: { resource: ['campaign'], operation: ['addLead'] } },
				description: 'For positional/API campaigns only. Keys = 1, 2, 3… matching {{1}}, {{2}}.',
				options: [
					{
						name: 'entry',
						displayName: 'Variable',
						values: [
							{ displayName: 'Key', name: 'key', type: 'string', default: '', placeholder: '1' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['campaign'], operation: ['addLead'] } },
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{
						displayName: 'Extra Lead Data (JSON)',
						name: 'leadData',
						type: 'json',
						default: '{}',
						description: 'Free-form lead attributes merged with the structured lead fields',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Metadata (JSON)',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'Free-form metadata stored with the recipient',
					},
					{
						displayName: 'Notes',
						name: 'notes',
						type: 'string',
						typeOptions: { rows: 2 },
						default: '',
					},
					{
						displayName: 'Overwrite Existing Notes',
						name: 'overwriteNotes',
						type: 'boolean',
						default: false,
						description: 'Whether to replace the stored lead notes instead of appending to them',
					},
				],
			},

			// ======================================================================
			// Custom: Make an API Call
			// ======================================================================
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['custom'], operation: ['apiCall'] } },
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'GET',
			},
			{
				displayName: 'URL',
				name: 'path',
				type: 'string',
				default: '/whoami',
				required: true,
				displayOptions: { show: { resource: ['custom'], operation: ['apiCall'] } },
				description:
					'Path relative to https://api.getmallo.ai. Query string goes here if needed, e.g. /public/v1/campaigns?limit=10.',
			},
			{
				displayName: 'Body (JSON)',
				name: 'body',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						resource: ['custom'],
						operation: ['apiCall'],
						method: ['POST', 'PATCH', 'PUT'],
					},
				},
				description: 'JSON body for POST / PATCH / PUT requests',
			},
		],
	};

	methods = {
		loadOptions: {
			async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await malloApiRequest.call(this, 'GET', '/public/v1/campaigns');
				const campaigns = (response?.campaigns as IDataObject[]) ?? [];
				return campaigns.map((c) => ({
					name: (c.name as string) || (c.id as string),
					value: c.id as string,
				}));
			},
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await malloApiRequest.call(this, 'GET', '/public/v1/agents');
				const agents = (response?.agents as IDataObject[]) ?? [];
				return agents.map((a) => ({
					name: (a.name as string) || (a.id as string),
					value: a.id as string,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject;

				if (resource === 'message' && operation === 'sendTemplate') {
					const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						template_name: this.getNodeParameter('templateName', i) as string,
						language: this.getNodeParameter('language', i) as string,
						recipient: this.getNodeParameter('recipient', i) as string,
					};

					const variables = fixedCollectionToObject(
						this.getNodeParameter('variables', i, {}) as IDataObject,
					);
					if (Object.keys(variables).length > 0) body.variables = variables;

					if (additional.fromNumber) body.from_number = additional.fromNumber;
					if (additional.agentId) body.agent_id = additional.agentId;

					const lead = buildLead({
						firstName: additional.firstName as string,
						lastName: additional.lastName as string,
						email: additional.email as string,
						notes: additional.notes as string,
					});
					if (lead) body.lead = lead;

					if (additional.overwriteNotes) body.overwrite_notes = true;

					const leadData = parseJsonParameter.call(this, additional.leadData, i, 'Extra Lead Data');
					if (Object.keys(leadData).length > 0) body.lead_data = leadData;

					const metadata = parseJsonParameter.call(this, additional.metadata, i, 'Metadata');
					if (Object.keys(metadata).length > 0) body.metadata = metadata;

					const headers: IDataObject = {};
					if (additional.idempotencyKey) headers['Idempotency-Key'] = additional.idempotencyKey;

					responseData = await malloApiRequest.call(
						this,
						'POST',
						'/public/v1/outbound/send',
						body,
						{},
						headers,
					);
				} else if (resource === 'campaign' && operation === 'addLead') {
					const campaignId = this.getNodeParameter('campaignId', i) as string;
					const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const recipient: IDataObject = {
						phone: this.getNodeParameter('phone', i) as string,
					};

					const fields = fixedCollectionToObject(
						this.getNodeParameter('fields', i, {}) as IDataObject,
					);
					if (Object.keys(fields).length > 0) recipient.fields = fields;

					const variables = fixedCollectionToObject(
						this.getNodeParameter('variables', i, {}) as IDataObject,
					);
					if (Object.keys(variables).length > 0) recipient.variables = variables;

					const lead = buildLead({
						firstName: additional.firstName as string,
						lastName: additional.lastName as string,
						email: additional.email as string,
						notes: additional.notes as string,
					});
					if (lead) recipient.lead_data = { ...lead };

					const leadData = parseJsonParameter.call(this, additional.leadData, i, 'Extra Lead Data');
					if (Object.keys(leadData).length > 0) {
						recipient.lead_data = { ...((recipient.lead_data as IDataObject) ?? {}), ...leadData };
					}

					const metadata = parseJsonParameter.call(this, additional.metadata, i, 'Metadata');
					if (Object.keys(metadata).length > 0) recipient.metadata = metadata;

					if (additional.overwriteNotes) recipient.overwrite_notes = true;

					const body: IDataObject = {
						enqueue: this.getNodeParameter('enqueue', i) as boolean,
						recipients: [recipient],
					};

					responseData = await malloApiRequest.call(
						this,
						'POST',
						`/public/v1/campaigns/${campaignId}/recipients`,
						body,
					);
				} else if (resource === 'custom' && operation === 'apiCall') {
					const method = this.getNodeParameter('method', i) as string;
					const path = this.getNodeParameter('path', i) as string;

					let body: IDataObject = {};
					if (['POST', 'PATCH', 'PUT'].includes(method)) {
						body = parseJsonParameter.call(
							this,
							this.getNodeParameter('body', i, {}),
							i,
							'Body',
						);
					}

					responseData = await malloApiRequest.call(
						this,
						method as 'GET',
						path.startsWith('/') ? path : `/${path}`,
						body,
					);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}".`,
						{ itemIndex: i },
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData ?? {}),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
