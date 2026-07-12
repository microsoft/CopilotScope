---
lens: studiolens
title: "Data sources & requirements"
description: "Path-scoped StudioLens data sources and permissions: Dataverse (Direct) transcripts over the Web API plus an org-data CSV, or Fabric Lakehouse tables, with the transcript and consumption contracts and Dataverse's ~30-day retention."
status: published
sourceFiles:
  - "lenses/StudioLens/docs/PREREQUISITES.md"
  - "lenses/StudioLens/deployment/1. Dataverse (Direct)/README.md"
  - "lenses/StudioLens/deployment/2. Fabric/README.md"
  - "lenses/StudioLens/deployment/1. Dataverse (Direct)/StudioLens - Dataverse.pbit"
  - "lenses/StudioLens/deployment/2. Fabric/StudioLens - Fabric.pbit"
  - "lenses/StudioLens/deployment/2. Fabric/notebooks/Copilot_Credit_Consumption_Ingester.ipynb"
---

StudioLens requirements are **path-scoped**. The Dataverse (Direct) build reads transcripts live over
the Dataverse Web API and needs an org-data CSV; the Fabric build reads Delta tables from a Lakehouse
that its notebooks populate. Both share the same transcript contract.

## Inputs by path

- **Dataverse (Direct)** — `conversationtranscripts` over the Dataverse **Web API** (`OData.Feed`,
  `/api/data/v9.2/`) plus an **Org Data CSV** for user and department context.
- **Fabric** — Delta tables in a **Lakehouse**, populated by the StudioLens notebooks, read over the
  Lakehouse SQL endpoint.

## Permissions

<div class="table-scroll">

| Path | Source | Permission |
|---|---|---|
| Dataverse (Direct) | Conversation Transcript table | **Read** via an **Organizational** login (System Customizer / Environment Maker) |
| Dataverse (Direct) | Org Data CSV | Read access to the CSV (SharePoint, local/synced, or UNC — gateway where required) |
| Fabric | Dataverse `ConversationTranscript` | Graph **application** permissions + **Dataverse Read on ConversationTranscript** |
| Fabric | PPAC MCSMessages (message credits) | **Global or Billing Administrator** to export the reports |
| Fabric | Lakehouse | **Fabric capacity (F2+)** and a Lakehouse |

</div>

## Transcript contract (both paths)

The transcript-analysis model produces a consistent set of tables:

<div class="table-scroll">

| Table | Holds |
|---|---|
| `agent_sessions` | One row per conversation session. |
| `agent_turns` | One row per turn. |
| `agent_errors` | Error events. |
| `agent_subagents` | Sub-agent calls. |
| `agent_catalogue` | Agents seen in the transcripts. |
| `agent_performance` | Latency / performance signals. |

</div>

## Consumption contract (Fabric only)

<div class="table-scroll">

| Table | Holds |
|---|---|
| `credit_consumption_tenant` | Tenant-level message-credit consumption. |
| `credit_consumption_agent` | Per-agent message-credit consumption. |
| `credit_consumption_user` | Per-user message-credit consumption. |

</div>

The PPAC message-credit pages are **Fabric-only**. On the Dataverse (Direct) build the Credit
Consumption page ships **hidden and unpopulated** — do not expect credit analysis on that path.

## Retention

Dataverse retains conversation transcripts for approximately **30 days**. For historical analysis
beyond that window, use the **Fabric** build, which lands transcripts into the Lakehouse before the
retention window closes.
