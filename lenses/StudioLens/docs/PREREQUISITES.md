# Prerequisites

CopilotScope uses **one data model and one refresh**. You set up the shared ingestion once; each lens
then lights up when **its** source is present. This page lists the licences, capacity, and permissions
for each source in one place, so setup sections don't repeat them inline.

## Setup → Lens source matrix

| Data source (set up once) | Lenses it unlocks | Required for those lenses? |
|---|---|---|
| **Audit log** (core) | ValueLens · AdoptionLens · MaturityLens · LeaderLens | **Core** — always set up |
| **Org data + manager hierarchy** | LeaderLens roll-ups · org slicing across all lenses | Required for LeaderLens roll-ups |
| **Licensed users** | ReadinessLens | Required for ReadinessLens |
| **Credit / cost (PPAC / MAC)** | ValueLens cost pages | Optional (unlocks cost/ROI pages) |
| **Copilot Studio transcripts (Dataverse)** | StudioLens | Required for StudioLens |
| **M365 work behaviour (Purview UAL)** | BehaviorLens *(WIP)* | Optional — may be unavailable per tenant |
| **Product feedback / Agent 365** | GovernanceLens | Required for GovernanceLens |

Every optional source follows the **optional-source pattern** (`EmptyTable` + `try…otherwise` +
`Enable_*` toggle), so measures keep binding whether or not a source is present. Set the matching
`Enable_*` parameter when you load a source.

## Licences & capacity

- **Microsoft 365 Copilot** licences for the population you want to measure.
- **Fabric path:** a Fabric capacity (for Spark ingestion and the Lakehouse SQL endpoint).
- **SharePoint path:** no Fabric capacity required — flat-file / Power Automate (PAX) landing.
- **Power BI Desktop** to open and refresh the template.

## Permissions by source

| Source | Access needed |
|---|---|
| Audit log | Purview / Microsoft 365 audit-log read (unified audit log) |
| Org data + manager hierarchy | Microsoft Graph directory read (users & managers) |
| Licensed users | Microsoft Graph / admin read of licence assignments |
| Credit / cost (PPAC / MAC) | Power Platform Admin Center / consumption export access |
| Copilot Studio transcripts | Dataverse read on the Copilot Studio transcript tables |
| M365 work behaviour (Purview UAL) | Purview unified audit log access for the relevant workloads |
| Product feedback / Agent 365 | Access to the product-feedback / Agent 365 tables |

## Deployment paths

| Path | Ingestion | Notes |
|---|---|---|
| **1 · Fabric** | Notebooks land Delta tables in a Lakehouse; thin template over the SQL endpoint | Best for scheduled ingestion, larger volumes, PPAC credit pages |
| **2 · SharePoint** | PAX extract → rollup CSVs → template | No Fabric capacity required |

> Do not commit any real tenant data, tenant domains, SharePoint URLs, or customer identifiers to this
> public repo. Use synthetic values (e.g. `user000@example.com`) in any sample or screenshot.
