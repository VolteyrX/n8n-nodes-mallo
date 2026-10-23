# n8n-nodes-mallo

This is an n8n community node that lets you use [Mallo](https://getmallo.ai) in your n8n workflows.

Mallo is a multi-tenant WhatsApp SaaS: an AI agent qualifies inbound leads, answers from a knowledge base, books appointments, and runs outbound WhatsApp campaigns with follow-ups.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In short, on self-hosted n8n: **Settings → Community Nodes → Install**, then enter `n8n-nodes-mallo`.

## Operations

### Message — Send a Template Message

Sends one approved WhatsApp template to one lead and queues it for delivery. Returns immediately; the actual send happens asynchronously.

- **Template Name**, **Language**, **Phone** (required)
- **Template Variables** — placeholder values keyed `1`, `2`, … matching `{{1}}`, `{{2}}`
- **Additional Fields** — From Number (optional, auto-resolves your WhatsApp channel when empty), Agent, First/Last Name, Email, Notes, Overwrite Existing Notes, Extra Lead Data (JSON), Metadata (JSON), Idempotency Key

### Campaign — Add Lead to Campaign

Adds one lead to an already-existing campaign. If the campaign has follow-ups (relances) configured, they are scheduled for this lead.

- **Campaign** (required, picked from your account), **Phone** (required)
- **Send Now** — when off, the lead stays pending until the campaign is launched
- **Campaign Fields** — named fields for dashboard campaigns (e.g. `prenom`)
- **Template Variables** — positional keys (`1`, `2`, …) for API/legacy campaigns
- **Additional Fields** — First/Last Name, Email, Notes, Overwrite Existing Notes, Extra Lead Data (JSON), Metadata (JSON)

### Custom API Call — Make an API Call

Perform any authenticated call to the Mallo API. Pick a method, enter a path relative to `https://api.getmallo.ai` (e.g. `/public/v1/campaigns`), and optionally a JSON body.

## Credentials

You need a Mallo API key (`sk_live_…`). Create one in Mallo under **Settings → Developers**, then add a **Mallo API** credential in n8n and paste the key. The credential is validated against `/whoami`.

## Resources

- [Mallo](https://getmallo.ai)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Compatibility

Tested against n8n 1.x. Requires Node.js >= 20.15.
