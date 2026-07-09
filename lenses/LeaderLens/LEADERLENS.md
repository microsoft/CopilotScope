# LeaderLens

**Status: Preview** · *Team & function roll-ups with gamified leagues, streaks, badges, and leaderboards.*

## What it measures

- How adoption **rolls up** by team, function, and manager.
- Who the **leaders** are — top teams and individuals — and how **streaks** and **badges** track sustained engagement.
- How **league tables** compare cohorts to drive friendly competition.

## Unlocking data source(s)

| Source | Role | Required? |
|---|---|---|
| Audit log | Activity to rank and reward | **Core** |
| Org / manager hierarchy | Team & function roll-ups | **Required for roll-ups** |

## Key pages / views

- **Leader · Leaderboards**
- **Leader · Leagues**
- **Leader · Streaks & Badges**

Shows real names by default; a de-identify toggle is provided as an opt-in.

## Setup

LeaderLens needs the org / manager hierarchy for roll-ups. On the SharePoint (PAX) path this is produced today; on Fabric the hierarchy is added in milestone M2. See [PREREQUISITES.md](../ValueLens/docs/PREREQUISITES.md) and the deployment-path guides: [Fabric](../ValueLens/deployment/1.%20Fabric/README.md) / [SharePoint (PAX)](../ValueLens/deployment/2.%20SharePoint/README.md).

> Full DAX & bindings: see [LeaderLens-measures.md](./docs/LeaderLens-measures.md).
