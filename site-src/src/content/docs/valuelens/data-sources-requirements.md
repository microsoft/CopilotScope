---
lens: valuelens
title: "Data sources & requirements"
description: "The core and optional data sources ValueLens consumes, the permission matrix, the Include/Exclude pattern, the 15 data contracts, current compatibility status, and the known cross-tenant limitation."
status: published
sourceFiles:
  - "lenses/ValueLens/docs/PREREQUISITES.md"
  - "lenses/ValueLens/docs/VALUELENS-STANDALONE-README.md"
  - "lenses/ValueLens/deployment/1. Fabric/docs/DATA-DICTIONARY.md"
  - "lenses/ValueLens/deployment/1. Fabric/docs/OPTIONAL-SOURCES.md"
  - "lenses/ValueLens/deployment/1. Fabric/docs/PERMISSIONS.md"
  - "lenses/ValueLens/deployment/1. Fabric/flows/COST-CONSUMPTION.md"
  - "lenses/ValueLens/deployment/3. Fabric Extended/Fabric + Copilot Studio/CREDIT-CONSUMPTION-SETUP.md"
---

ValueLens uses one data model and one refresh. You set up the shared ingestion once; the report then
lights up each page when its source is present. **Core** sources are required; **optional** sources
can be present or absent without ever breaking a refresh.

## Core versus optional

- **Core (required):** Copilot interactions (Purview audit logs), licensed users (Microsoft 365
  Admin Center), and org data (Microsoft Entra).
- **Optional:** Agents 365, Cowork / Work IQ consumption, Copilot Studio message-credit consumption
  (PPAC), product feedback, and Copilot Studio agent transcripts (Dataverse).

## Source, permission, and capacity matrix

The Fabric and SharePoint paths share aligned contracts for sources both paths implement, while the source layer differs: Fabric reads Lakehouse Delta tables and SharePoint reads CSVs. Dataverse agent tables and PPAC credit-consumption tables are Fabric Extended only; the SharePoint producer is not available for those contracts.

<div class="table-scroll">

| Source | Tier | Automated-pull permission | Manual-export role |
|---|---|---|---|
| Audit logs | Core | `AuditLogsQuery.Read.All` (Graph app) | Audit Reader / Compliance Administrator |
| Licensed users | Core | `Reports.Read.All` (Graph app) | Global Reader / Reports Reader |
| Org data | Core | `User.Read.All` (Graph app) | Global Reader / User Administrator |
| Agent transcripts (Dataverse) | Optional | App reg as a Dataverse **Application User** with **Read** on Conversation Transcript | System Administrator / System Customizer / Environment Maker |
| Credit consumption (PPAC) | Optional | None — export-only; landed by flow, then ingested | Global Administrator / Billing Administrator |
| Cost consumption (Cowork / Work IQ) | Optional | None — export-only; landed by flow, then ingested | Global Reader / Global Administrator / Copilot Administrator |
| Product feedback | Optional | None — export-only; landed by flow, then ingested | Global Administrator / Reports Reader |
| Agents 365 | Optional | `CopilotPackages.Read.All` + `Application.Read.All` (Registry ingester) | Global Administrator / Reports Reader (with AI Admin in a Frontier-enrolled tenant) |

</div>

To run anything on Fabric you also need **Contributor** or **Member** on the workspace, a Fabric
capacity (F2+ or trial), and **Read** on the Lakehouse SQL endpoint. Keep the client secret in
**Azure Key Vault**.

## The Include / Exclude pattern

Every optional source follows the same load-or-empty pattern so a missing source can never break a
refresh: an `EmptyTable` helper, a `try…otherwise` guard, and an `Enable_*` toggle. The `Enable_*`
controls are **list parameters** offering `Include` / `Exclude` (a dropdown in *Edit Parameters*),
not boolean flags. Set a toggle to `Include` **after** that source is configured and landing; set it
to `Exclude` when the source is not used. Any procedure that requires a source states the explicit
value to select.

## Producer preference

- **Agents 365** — the scheduled, app-only `Copilot_Agent365_Registry_Ingester` is the recommended
  default producer; `Copilot_Agent365_Lander` is the CSV fallback for when the app-registration
  permissions are unavailable. They write the same `dbo.agents_365` table — use one.
- **Product feedback** — `Copilot_ProductFeedback_Ingester` produces `dbo.user_feedback` from the
  OCV export. Product feedback is optional and export-based.

## The 15 data contracts

The table below is the complete ValueLens contract portfolio. Individual deployment paths implement only the contracts available to that path. A producer is compatible only if the Delta table or CSV
it writes exposes the exact column names (casing and spaces matter).

<div class="table-scroll">

| # | Dashboard table | Delta name | Tier | Fabric producer |
|---|---|---|---|---|
| 1 | Chat + Agent Interactions (Audit Logs) | `dbo.Copilot_Interactions_Parsed` | Core | `Copilot_Audit_Log_Direct_Ingester` |
| 2 | Copilot Licensed | `copilot_licensed_users` | Core | `Copilot_Licensed_Users_Direct_Ingester` |
| 3 | Chat + Agent Org Data | `copilot_org_data` | Core | `Copilot_Org_Data_Direct_Ingester` |
| 4 | Agents 365 | `dbo.agents_365` | Optional | `Copilot_Agent365_Registry_Ingester` (default) / `Copilot_Agent365_Lander` |
| 5 | ProductFeedback | `dbo.user_feedback` | Optional | `Copilot_ProductFeedback_Ingester` |
| 6 | Agent Sessions | `agent_sessions` | Optional (Dataverse) | `Copilot_Agent_Transcript_Parser` |
| 7 | Agent Turns | `agent_turns` | Optional (Dataverse) | `Copilot_Agent_Transcript_Parser` |
| 8 | Agent Errors | `agent_errors` | Optional (Dataverse) | `Copilot_Agent_Transcript_Parser` |
| 9 | Agent Sub-Agent Calls | `agent_subagents` | Optional (Dataverse) | `Copilot_Agent_Transcript_Parser` |
| 10 | Agent Catalogue | `agent_catalogue` | Optional (Dataverse) | `Copilot_Agent_Transcript_Parser` |
| 11 | Agent Performance | `agent_performance` | Optional (Dataverse) | `Copilot_Agent_Transcript_Parser` |
| 12 | Credit Consumption (Tenant) | `credit_consumption_tenant` | Optional (billing) | `Copilot_Credit_Consumption_Ingester` |
| 13 | Credit Consumption (Agent) | `credit_consumption_agent` | Optional (billing) | `Copilot_Credit_Consumption_Ingester` |
| 14 | Credit Consumption (User) | `credit_consumption_user` | Optional (billing) | `Copilot_Credit_Consumption_Ingester` |
| 15 | Copilot Cost Consumption | `copilot_cost_consumption` | Optional (billing) | `Copilot_Cost_Consumption_Ingester` |

</div>

Tables 12–14 (PPAC per-agent message credits) ship with the Fabric + Copilot Studio add-on and are
gated by `Enable_Consumption`. All other model tables (calendar, legends, ranking, glossary, value
maps) are calculated or static and have no external source.

### Core table key columns

- **`dbo.Copilot_Interactions_Parsed`** — key columns include `CreationDate`, `AgentId`, `AgentName`,
  `ApplicationName`, `Audit_UserId`, `Audit_UserId_Normalized`, `Workload`, `Message_Id`,
  `Message_isPrompt`, `InteractionDate`, and the two agent keys `Agent_TitleID` and `Agent_EntraId`
  (populated mutually exclusively per row so legacy and Entra Agent ID agents both join).
- **`copilot_licensed_users`** — `User_Principal_Name` (canonical join key), `Has_license`, and
  `UPN_Normalized`, plus the Office 365 active-user detail columns.
- **`copilot_org_data`** — `id` (AAD object id), `PersonId` (UPN), `displayName`, `Organization`,
  `JobTitle`, `officeLocation`, `city`, `country`, `managerUPN`. The producer must populate `id` or
  the credit-by-organization breakdown cannot attribute.

## Compatibility status

The tracked contract findings are all **resolved** in the current build:

<div class="table-scroll">

| Area | Status |
|---|---|
| `user_feedback` empty placeholder column count | **Fixed** — the notebook now emits the full 23-column superset, so a missing or partial export cannot break refresh. |
| `copilot_licensed_users` underscore vs spaced names | **Fixed** — the underscore variants are in the model's variant lists, so UPN and licence load correctly. |
| `agents_365` reading a SharePoint URL on Fabric | **Fixed** — the lander writes `dbo.agents_365`; the model reads it as a Fabric table gated by `Enable_Agent365`. |
| Core M "field already exists" on pre-flattened output | **Fixed** — re-based on the guarded versions with conditional parsing. |
| Agent Sessions → Org credit join dangling | **Fixed** — the org ingester now emits the Graph `id` (AAD object id); re-land org data after upgrading. |

</div>

## Known limitation — cross-environment / cross-tenant identity

The Dataverse agent tables key on the user's AAD object id, while org data is Entra from *this*
tenant. They reconcile only when the transcripts and the Entra directory describe the same users in
the same tenant. If agents are published in a different environment or tenant (common in demos), the
object ids won't exist in the org table and the credit-by-organization breakdown won't attribute — a
data-alignment issue, not a model bug. When the object IDs do not reconcile, the credit-by-organization breakdown may be missing or misleading. The source recommends future hardening: emit a UPN when available, add a UPN fallback relationship, and surface unmatched rows under an '(Unmapped)' bucket. Those are recommendations, not confirmed current behavior.

## Privacy and security

Do not commit real tenant data, tenant domains, SharePoint URLs, or customer identifiers to a public
repository — use synthetic values such as `user000@example.com` in any sample or screenshot. For
privacy-restricted tenants, the SharePoint extract supports a de-identify option that masks user
identities in the output.
