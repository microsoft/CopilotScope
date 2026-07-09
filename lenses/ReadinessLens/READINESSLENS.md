# ReadinessLens

**Status: Preview** · *Pre-adoption readiness — who is licensed, enabled, and ready, plus provisioning and reclamation.*

## What it measures

- Who is **licensed**, **enabled**, and **ready** to use Copilot.
- Where the **provisioning gaps** are — licensed but not enabled, or enabled but never active.
- Which licences are **reclamation candidates** (assigned but unused).

## Unlocking data source(s)

| Source | Role | Required? |
|---|---|---|
| Licensed users | Licence assignment & status | **Required for this lens** |
| Org data | Slicing by team / function | Optional (recommended) |

## Key pages / views

- **License Readiness**

## Setup

ReadinessLens lights up when the licensed-users source is loaded. See [PREREQUISITES.md](../ValueLens/docs/PREREQUISITES.md) and pick a deployment path: [Fabric](../ValueLens/deployment/1.%20Fabric/README.md) or [SharePoint (PAX)](../ValueLens/deployment/2.%20SharePoint/README.md).
