# BehaviorLens

**Status: NEXT** · *Employee work-behaviour patterns mapped to the AI-activity taxonomy — the manual-vs-AI baseline.*

## What it measures

- What **work-behaviour patterns** exist across Exchange / SharePoint / OneDrive / Teams.
- How those manual behaviours map onto the **AI-activity taxonomy** — where work is still done by hand.
- Where the **manual-vs-AI baseline** is widest, i.e. where Copilot could take the most off people's plates.

## Unlocking data source(s)

| Source | Role | Required? |
|---|---|---|
| M365 work behaviour (Purview UAL) | Manual work signals | **Required — optional source** |
| Audit log | AI-side activity for comparison | Core |

## Key pages / views

- *Behaviour pages are added as the lens is built.*

## Setup

BehaviorLens is optional and depends on Purview UAL / M365 work-behaviour data, which may not be accessible in every tenant. The lens greys out when the source is absent. See [PREREQUISITES.md](../ValueLens/docs/PREREQUISITES.md) and the [Fabric Extended](../ValueLens/deployment/3.%20Fabric%20Extended/README.md) path.
