# ValueLens

**Status: LIVE** · *The FinOps view of Copilot — cost vs. value, ROI, and time & tasks saved.*

## What it measures

- How much **time** and how many **tasks** Copilot has saved, and what that is worth in **money**.
- The **ROI** of Copilot once licence and consumption **cost** are factored in.
- How realised value trends over time and where it is concentrated.

## Unlocking data source(s)

| Source | Role | Required? |
|---|---|---|
| Audit log | Copilot activity that drives value | **Core** |
| Human Time Estimates | Minutes-saved assumptions per behaviour | Core (shipped) |
| Credit / cost (PPAC / MAC) | Message-credit and licence cost | Optional — unlocks the cost pages |

## Key pages / views

- **Activity & Value**
- **Credit / Cost Consumption** *(appears when the credit/cost source is loaded)*

## Setup

ValueLens works from the core audit log out of the box. Load the credit / cost source to unlock the cost/ROI pages. See [PREREQUISITES.md](./docs/PREREQUISITES.md) and pick a deployment path: [Fabric](./deployment/1.%20Fabric/README.md) or [SharePoint (PAX)](./deployment/2.%20SharePoint/README.md).

## Related

Also available standalone: [ValueLens for Microsoft Copilot](https://github.com/Keithland89/ValueLens-for-Microsoft-Copilot).
