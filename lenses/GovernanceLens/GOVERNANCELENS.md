# GovernanceLens

**Status: Preview** · *Agent health, governance, and feedback — a first-class governance view for admins and CoE teams.*

## What it measures

- What **agents** exist across the estate, and how **healthy** adoption of each is.
- What **governance** signals need attention (ownership, sprawl, risk).
- What **user sentiment** shows from product feedback.

## Unlocking data source(s)

| Source | Role | Required? |
|---|---|---|
| Agent tables | Agent inventory & health signals | **Required for this lens** |
| Product feedback / Agent 365 | Sentiment & governance signals | Required for the feedback views |

## Key pages / views

- **Agent Governance**
- **User Feedback**

## Setup

GovernanceLens lights up when the product feedback / Agent 365 source is loaded. See [PREREQUISITES.md](../ValueLens/docs/PREREQUISITES.md) and pick a deployment path: [Fabric](../ValueLens/deployment/1.%20Fabric/README.md) or [SharePoint (PAX)](../ValueLens/deployment/2.%20SharePoint/README.md).
