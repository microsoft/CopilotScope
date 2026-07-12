---
lens: valuelens
title: "Troubleshooting & FAQ"
description: "Source-backed symptoms and fixes for ValueLens across Graph auth, audit queries, the Lakehouse, Power BI, licensing, SharePoint, refresh and capacity, pipelines, optional sources, credits, Agent 365, and the Copilot Studio add-on."
status: published
sourceFiles:
  - "lenses/ValueLens/deployment/1. Fabric/README.md"
  - "lenses/ValueLens/deployment/2. SharePoint/README.md"
  - "lenses/ValueLens/deployment/1. Fabric/pipelines/README.md"
  - "lenses/ValueLens/deployment/1. Fabric/docs/OPTIONAL-SOURCES.md"
  - "lenses/ValueLens/deployment/1. Fabric/flows/COST-CONSUMPTION-SETUP.md"
  - "lenses/ValueLens/deployment/3. Fabric Extended/Fabric + Copilot Studio/CREDIT-CONSUMPTION-SETUP.md"
  - "lenses/ValueLens/deployment/1. Fabric/docs/DATA-DICTIONARY.md"
---

Common ValueLens symptoms and fixes, consolidated from each deployment path. Each entry maps to the
setup guide it comes from.

## Graph authentication and permissions

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| `401` / `403` from Graph | Confirm the three **application** permissions are admin-consented; regenerate the client secret if it expired. The audit notebook needs `AuditLogsQuery.Read.All` specifically (it calls `/security/auditLog/queries`). |
| `0 records returned` (SharePoint extract) | `AuditLogsQuery.Read.All` consent is missing — re-grant it in Entra. |

</div>

## Audit log queries

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| Audit query never finishes | Purview processes it asynchronously; the notebook polls with backoff. If it times out, narrow `LOOKBACK_DAYS` in the CONFIG cell. |

</div>

## Lakehouse and default table

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| `the key didn't match any rows` | A notebook ran against the wrong Lakehouse — pin your Lakehouse as default and re-run. |

</div>

## Power BI endpoint and database

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| `Login failed` / `cannot open database` (Power BI) | The SQL endpoint host or database name is wrong — recheck the Lakehouse settings page. |

</div>

## Licensing and org data

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| All users show "Unlicensed" | The licensed-users notebook has not run yet, or its report period is too narrow (`REPORT_PERIOD = 'D30'`). |
| Masked UPNs (32-char hex) | In the Microsoft 365 Admin Center, under **Org settings → Reports**, untick "Display concealed names". |

</div>

## SharePoint upload and paths

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| `403 Forbidden` on upload | The app lacks per-site write — re-run `ProvisionSiteAccess-SP-AppReg.ps1`. |
| `404 Not Found` on upload | The `-FolderPath` does not exist in SharePoint — create it, or use `/` for the library root. |
| `python: command not found` | Install Python 3.10+ and retry. |

</div>

## Refresh and capacity

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| Refresh slow (over a minute) on Fabric | The dataset is in Import mode — put the workspace on a Fabric capacity and convert to **Direct Lake**. |
| Refresh hits the 1 GB / 2-hour cap (SharePoint / Pro) | Move high-volume tenants to the Fabric path. |

</div>

## Pipeline failures

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| A pipeline activity fails | Each activity retries at 60-second intervals for transient Graph throttling; the parallel branches don't block each other, so partial Delta writes are preserved. Open **Fabric Monitor Hub → Pipeline runs**, click into the failed activity, and view the notebook job log. |
| Export-only source writes an empty table | Credit consumption and product feedback have no API — land their CSVs (by flow or by hand) **before** the pipeline runs, or the ingester finds nothing. |

</div>

## Optional sources and empty states

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| An optional page is blank | Its `Enable_*` toggle is `Exclude`, or the source has not landed. Set the toggle to `Include` and confirm the source table or file is present. Every optional table degrades to an empty table with the correct columns, so the refresh still succeeds. |
| Partial product-feedback export breaks refresh | The model tolerates partial OCV exports (`MissingField.Ignore`); the producing notebook emits the full 23-column superset. Re-run this repo's `Copilot_ProductFeedback_Ingester.ipynb`. |

</div>

## Credit and cost consumption

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| Billing / consumption pages empty after refresh | The `Enable_Consumption` / `Enable_CostConsumption` toggle is still `Exclude`, or the CSVs are not in the folder. Set it to `Include` and confirm the exports are in `Files/credit_consumption/` or `Files/cost_consumption/` and the ingester has run. |
| Empty immediately after running the ingester | The SQL endpoint has not synced yet — wait about a minute and refresh again. |
| Refresh error: a column was not found | The CSVs were ingested by a different or older script. Re-run this repo's `Copilot_Credit_Consumption_Ingester.ipynb`, which produces the exact column names the model expects. |

</div>

## Agent 365 selection

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| Not sure which Agent 365 notebook to run | Use `Copilot_Agent365_Registry_Ingester` by default (app-only, scheduled). Fall back to `Copilot_Agent365_Lander` only when the ingester's app-registration permissions are unavailable. Both write the same `dbo.agents_365` table — run one, not both. |

</div>

## Copilot Studio (Fabric Extended)

<div class="table-scroll">

| Symptom | Fix |
|---|---|
| Credit-by-organization shows no breakdown | Cross-environment / cross-tenant identity: the Dataverse agent tables key on AAD object id, while org data is Entra from this tenant. They reconcile only for the same users in the same tenant. Unmatched rows surface under an "(Unattributed)" organization bucket. |
| Transcript notebook cannot get a Dataverse token | Fabric's `notebookutils.getToken` cannot mint a Dataverse token — use an app-registration service principal added as an **Application User** with **Read** on the Conversation Transcript table. |

</div>
