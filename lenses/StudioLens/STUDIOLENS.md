# StudioLens

**Status: LIVE** · *Deep Copilot Studio agent evaluation — quality, topics, transcripts, errors, feedback, and credits.*

## What it measures

- How individual **Copilot Studio agents** are performing — quality, resolution, errors.
- What **topics** users bring, and what **transcripts** and **feedback** reveal.
- What agents are **costing** in PPAC credits.

## Unlocking data source(s)

| Source | Role | Required? |
|---|---|---|
| Agent tables (transcripts) | Studio agent activity | **Required for this lens** |
| PPAC credits | Agent consumption | Optional |

Inside CopilotScope, StudioLens lights up when Copilot Studio transcripts (Dataverse) are loaded.

## Key pages / views

- The **Studio** page-group inside CopilotScope (lights up when transcripts are loaded), or
- the standalone repo (two paths: **Dataverse (Direct)** and **Fabric**).

## Setup

For Studio-only analysis, use the standalone repo (incl. Dataverse-Direct — open the `.pbit`, set 3 parameters, no infrastructure). See [PREREQUISITES.md](./docs/PREREQUISITES.md) and pick a deployment path: [Dataverse (Direct)](./deployment/1.%20Dataverse%20(Direct)/README.md) or [Fabric](./deployment/2.%20Fabric/README.md). The [Fabric Extended](../ValueLens/deployment/3.%20Fabric%20Extended/README.md) path adds the in-kit Studio add-on.

## Related

Previously shipped standalone at https://github.com/microsoft/StudioLens-for-Copilot-Studio; this repository is now the canonical home.
