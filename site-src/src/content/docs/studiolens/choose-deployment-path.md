---
lens: studiolens
title: "Choose your deployment path"
description: "Compare the two StudioLens builds — Dataverse (Direct) and Fabric — across infrastructure, ingestion, retention, page availability, and message credits, and decide which to stand up."
status: published
sourceFiles:
  - "lenses/StudioLens/docs/STUDIOLENS-STANDALONE-README.md"
  - "lenses/StudioLens/deployment/1. Dataverse (Direct)/README.md"
  - "lenses/StudioLens/deployment/2. Fabric/README.md"
  - "lenses/StudioLens/deployment/1. Dataverse (Direct)/StudioLens - Dataverse.pbit"
  - "lenses/StudioLens/deployment/2. Fabric/StudioLens - Fabric.pbit"
---

StudioLens ships as two builds of one template. They share the transcript-analysis model, but they
differ in infrastructure, ingestion, retention and history, the pages that are visible, and whether
the PPAC message-credit pages are available. The two builds are **not** page-for-page identical —
pick the one that matches your setup.

## The two builds at a glance

<div class="table-scroll">

| | Dataverse (Direct) | Fabric |
|---|---|---|
| **Best for** | The simplest, lowest-footprint start — live, recent analysis. | Scale, longer history, and the message-credit pages. |
| **Infrastructure** | None — parses transcripts live in the Power BI model. | Fabric capacity (F2+ or trial) and a Lakehouse. |
| **Ingestion** | Live in-model parsing on refresh. | Scheduled Spark ingestion into Delta tables. |
| **Transcript pages** (quality, topics, flow, errors, feedback, knowledge) | Yes | Yes |
| **PPAC message-credit pages** | No — the Credit Consumption page ships **hidden** and is **not** available to ordinary report users. | Yes — Credit Consumption is a visible page. |
| **Data volume / history** | Small–medium; bounded by Dataverse's ~30-day transcript retention. | Large; longer history retained in the Lakehouse. |
| **Multi-environment** | One or many Dataverse environment URLs. | Via the Lakehouse. |
| **Visible page count** | 9 visible pages. | 11 visible pages. |

</div>

## Dataverse (Direct) — simplest

The simplest, lowest-footprint build. Transcripts are parsed **live in the Power BI model**, so there
is no infrastructure to stand up: open the template, set the two required inputs, sign in, and
refresh. Best for live, recent analysis within Dataverse's ~30-day retention window, across one or
many Dataverse environments.

## Fabric — scale, history, and credits

Scheduled **Spark ingestion** lands transcripts and message-credit consumption as Delta tables in a
Lakehouse. Choose Fabric for larger volumes, longer history beyond the Dataverse retention window,
and the **PPAC message-credit pages** that the Direct build does not expose.

## Set up your path

- [Dataverse (Direct) setup guide](/lenses/studiolens/docs/setup/dataverse-direct)
- [Fabric setup guide](/lenses/studiolens/docs/setup/fabric)
