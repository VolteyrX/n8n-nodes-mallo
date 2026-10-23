import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const MALLO_BASE_URL = 'https://api.getmallo.ai';

/**
 * Make an authenticated request to the Mallo API.
 * Authorization (Bearer sk_live_…) is injected by the `malloApi` credential.
 */
export async function malloApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		url: endpoint.startsWith('http') ? endpoint : `${MALLO_BASE_URL}${endpoint}`,
		qs,
		body,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		json: true,
	};

	if (Array.isArray(body) ? body.length === 0 : Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	return this.helpers.httpRequestWithAuthentication.call(this, 'malloApi', options);
}

/**
 * Convert an n8n fixedCollection ({ entry: [{ key, value }] }) into a plain object.
 * Empty keys are skipped.
 */
export function fixedCollectionToObject(
	collection: IDataObject,
	entryName = 'entry',
): IDataObject {
	const rows = (collection?.[entryName] as Array<{ key?: string; value?: unknown }>) ?? [];
	const result: IDataObject = {};
	for (const row of rows) {
		const key = (row.key ?? '').toString().trim();
		if (key === '') continue;
		result[key] = row.value as IDataObject[keyof IDataObject];
	}
	return result;
}

/**
 * Parse a `json`-typed parameter (which n8n may hand us as a string or an object)
 * into a plain object. Empty values become {}.
 */
export function parseJsonParameter(
	this: IExecuteFunctions,
	value: unknown,
	itemIndex: number,
	label: string,
): IDataObject {
	if (value === undefined || value === null || value === '') {
		return {};
	}
	if (typeof value === 'object') {
		return value as IDataObject;
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') return {};
		try {
			const parsed = JSON.parse(trimmed);
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				throw new Error('not an object');
			}
			return parsed as IDataObject;
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				`The "${label}" field must be a valid JSON object.`,
				{ itemIndex },
			);
		}
	}
	return {};
}

/**
 * Build the structured `lead` object from the first-name / last-name / email / notes
 * parameters, omitting empty fields. Returns undefined when nothing was provided.
 */
export function buildLead(fields: {
	firstName?: string;
	lastName?: string;
	email?: string;
	notes?: string;
}): IDataObject | undefined {
	const lead: IDataObject = {};
	if (fields.firstName) lead.first_name = fields.firstName;
	if (fields.lastName) lead.last_name = fields.lastName;
	if (fields.email) lead.email = fields.email;
	if (fields.notes) lead.notes = fields.notes;
	return Object.keys(lead).length > 0 ? lead : undefined;
}
