<div align="center">

# 🔬 CopilotScope

#### by Microsoft Business Value Advisory (BVA)

### The Frontier Copilot Reporting Kit

Power BI lenses to measure the **value, adoption, maturity, behaviour, and impact** of Microsoft 365 Copilot.

[![Built by Microsoft BVA](https://img.shields.io/badge/BUILT_BY-MICROSOFT_BVA-4F73B8?style=for-the-badge&labelColor=1C2632)](https://github.com/Keithland89/CopilotScope)
[![Power BI Template](https://img.shields.io/badge/POWER_BI-TEMPLATE-F2C811?style=for-the-badge&logo=powerbi&logoColor=1C2632&labelColor=1C2632)](#the-lenses)
[![Status](https://img.shields.io/badge/STATUS-IN_BUILD-09B39D?style=for-the-badge&labelColor=1C2632)](#latest-release)

Set up your Copilot data once. Each lens then reads the same model to examine value, adoption,
readiness, maturity, behaviour, leadership, and Copilot Studio agents.

</div>

> **🚧 Status:** early build. CopilotScope reorganises the existing *AI Business Value Dashboard* into a
> kit of named Power BI **lenses**. See [Latest release](#latest-release) for the milestone plan.

---

## How it works

Most lenses come from the **same core setup**. You only add a data source to unlock a specialised lens.

| Data source (set up once) | Lenses it unlocks |
|---|---|
| **Audit log** (core) | ValueLens · AdoptionLens · MaturityLens · LeaderLens |
| **Org data + manager hierarchy** | LeaderLens roll-ups · org slicing across all lenses |
| **Licensed users** | ReadinessLens |
| **Credit / cost (PPAC / MAC)** | ValueLens (cost pages) |
| **Copilot Studio transcripts (Dataverse)** | StudioLens |
| **M365 work behaviour (Purview UAL)** | BehaviorLens *(WIP)* |
| **Product feedback / Agent 365** | GovernanceLens |

On **Scope Home**, each lens tile shows as **active** (its source is loaded) or **greyed with "add
&lt;source&gt; to unlock"** — so you literally see which lenses your current setup powers. See
[Set up once](#set-up-once) and [`docs/PREREQUISITES.md`](./lenses/ValueLens/docs/PREREQUISITES.md).

## The lenses

Every lens is **source-gated** — it lights up only when its data is present. Tags: **(Preview)** = built,
still stabilising; **(WIP)** = in progress.

### ValueLens

Cost vs value, ROI, and time & tasks saved — the FinOps view of Copilot. Turns audit activity into
human-equivalent hours and money, and (with credit/cost loaded) reconciles that against PPAC / MAC spend.

*More information on [ValueLens](./lenses/ValueLens/VALUELENS.md).*

### AdoptionLens

Post-adoption usage, reach, and activation — who is active, how widely Copilot has spread, and how
engagement trends over time. The core "are people actually using it?" lens.

*More information on [AdoptionLens](./lenses/AdoptionLens/ADOPTIONLENS.md).*

### ReadinessLens (Preview)

Pre-adoption readiness — who is **licensed, enabled, and ready**, plus provisioning gaps and
reclamation candidates. Helps you close the gap between licences bought and value realised.

*More information on [ReadinessLens](./lenses/ReadinessLens/READINESSLENS.md).*

### MaturityLens

The adoption **proficiency curve** (Initial → Efficient) with a **Maturity Meter** gauge. Shows where
your population sits on the maturity journey and how it is progressing.

*More information on [MaturityLens](./lenses/MaturityLens/MATURITYLENS.md).*

### LeaderLens (Preview)

Team and function roll-ups with **gamified leagues, streaks, badges, and leaderboards** — powered by the
org / manager hierarchy. Gives leaders a competitive, motivating view of adoption across their org.
Shows **real names by default**; a **de-identify toggle** is available as an opt-in.

*More information on [LeaderLens](./lenses/LeaderLens/LEADERLENS.md).*

### BehaviorLens (WIP)

Employee **work-behaviour patterns** (Exchange / SharePoint / OneDrive / Teams) mapped to the AI-activity
taxonomy — the **manual-vs-AI baseline** that shows where Copilot could take work off people's plates.
Optional source (Purview UAL may not be available in every tenant).

*More information on [BehaviorLens](./lenses/BehaviorLens/BEHAVIORLENS.md).*

### StudioLens

Deep **Copilot Studio** agent evaluation — quality, topics, transcripts, errors, feedback, and PPAC
credits. Available as a page-group inside CopilotScope **and** standalone (incl. Dataverse-Direct):
[StudioLens-for-Copilot-Studio](https://github.com/Keithland89/StudioLens-for-Copilot-Studio).

*More information on [StudioLens](./lenses/StudioLens/STUDIOLENS.md).*

### GovernanceLens

Agent **health, governance, and feedback** — a first-class governance view for admins and CoE teams:
agent inventory, adoption/health signals, and sentiment from product feedback.

*More information on [GovernanceLens](./lenses/GovernanceLens/GOVERNANCELENS.md).*

---

## Set up once

CopilotScope reuses **one data model and one refresh** across every lens (see
Product architecture). You set up the shared
ingestion once, then lenses appear as their sources load.

1. **Pick a deployment path** — Fabric or SharePoint (see [Deployment paths](#deployment-paths)).
2. **Run the core ingestion** — the audit-log ingester (Fabric notebooks) or PAX extract (SharePoint).
3. **Add optional sources** to unlock specialised lenses — org/manager hierarchy, licensed users,
   credit/cost, Copilot Studio transcripts, M365 work behaviour, product feedback.
4. **Open the template** and set the `Enable_*` parameters for the sources you loaded.

Prerequisites (licences, Fabric capacity, Graph / Dataverse / Purview permissions, credit/consumption
notes) are documented once in **[`docs/PREREQUISITES.md`](./lenses/ValueLens/docs/PREREQUISITES.md)** — referenced from every
setup section rather than repeated inline.

- Fabric setup: `1. Fabric/README.md` *(seeded in M1b)*
- SharePoint setup: `2. SharePoint/README.md` *(seeded in M1b)*

> Every optional source follows the **optional-source pattern** (`EmptyTable` + `try…otherwise` +
> `Enable_*` toggle), so measures keep binding whether or not a source is present.

## Deployment paths

| Path | Best for |
|---|---|
| **1 · Fabric** | scheduled Spark ingestion, larger volumes, PPAC message-credit pages |
| **2 · SharePoint** | flat-file / Power Automate (PAX) landing, no Fabric capacity required |

Both paths ship the **same lenses** over the **same semantic model** — only the ingestion differs.

## Known limitations

- **BehaviorLens** depends on **Purview UAL / M365 work-behaviour** data, which may not be accessible in
  every tenant. The lens is optional and greys out when the source is absent.
- The **manager / org hierarchy** that powers LeaderLens roll-ups is currently produced only on the
  **SharePoint (PAX)** path. The Fabric org ingester builds it in a later milestone (M2).
- Some lenses are **(Preview)** / **(WIP)** — see [The lenses](#the-lenses) for current status.

## Latest release

CopilotScope is in **early build**. The milestone plan (M0 → M6) lives in the
engineering brief.

> **Tip:** to be notified of releases, click **Watch → Custom → Releases** at the top of the repo.

## Related

- **[StudioLens-for-Copilot-Studio](https://github.com/Keithland89/StudioLens-for-Copilot-Studio)** — the
  standalone Copilot Studio agent deep-dive (also runs **Dataverse-Direct**, no Fabric required).
  Cross-linked from Scope Home; the same StudioLens page-group also lives inside CopilotScope.

**How CopilotScope differs from the Power CAT Copilot Studio Kit.** The Power CAT Kit's *Agent Insights
Hub* and *Agent Value Summary* are **Dataverse-solution analytics for makers**. CopilotScope is **Power BI
value / adoption analytics for leaders and CoE teams** across all of Microsoft 365 Copilot — the two are
**complementary**, not competing.

## About

CopilotScope is created and maintained by the **Microsoft Business Value Advisory (BVA)** team.

## License

MIT — see [LICENSE](./LICENSE).
