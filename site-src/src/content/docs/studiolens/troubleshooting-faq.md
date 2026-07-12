---
lens: studiolens
title: "Troubleshooting & FAQ"
description: "Source-backed StudioLens symptoms and fixes for both builds: Organizational sign-in and Conversation Transcript access, zero transcripts, multi-environment credentials, privacy levels, gateways, and the Fabric Enable_Dataverse and Enable_Consumption toggles."
status: published
sourceFiles:
  - "lenses/StudioLens/deployment/1. Dataverse (Direct)/README.md"
  - "lenses/StudioLens/deployment/2. Fabric/README.md"
  - "lenses/StudioLens/deployment/2. Fabric/notebooks/Copilot_Credit_Consumption_Ingester.ipynb"
  - "lenses/StudioLens/deployment/1. Dataverse (Direct)/StudioLens - Dataverse.pbit"
  - "lenses/StudioLens/deployment/2. Fabric/StudioLens - Fabric.pbit"
---

Source-backed symptoms and fixes for both StudioLens builds. If a symptom isn't here, re-check the
setup guide for your path first.

## Dataverse (Direct)

<div class="table-scroll">

| Symptom | Likely cause | Fix |
|---|---|---|
| Sign-in fails or connects as the wrong identity | Wrong account, or not using Organizational account | On the first refresh choose **Organizational account** and sign in with the correct org login; clear the cached data source credential if the wrong account was used. |
| Refresh returns no transcripts | The signed-in account can't **Read the Conversation Transcript table** | Grant Conversation Transcript **Read** (System Customizer / Environment Maker) and refresh. |
| Zero transcript rows but users load fine | No transcripts in scope for that environment | Check the **Dataverse Diagnostic** table: if `conversationtranscripts` = 0 but `systemusers` > 0, the connection is fine — the environment just has no transcripts in scope. |
| One environment breaks a multi-environment refresh | Per-environment credential missing, or an environment unreachable | Configure **per-environment credentials** (Settings – Data source credentials) and sign in to each; unreachable environments are skipped, not fatal. |
| `Formula.Firewall` error combining sources | Inconsistent privacy levels | Set **all** sources to the **Organizational** privacy level. |
| A local or UNC Org Data CSV won't load | `File.Contents` path needs a gateway | Use an **on-premises data gateway**, or move the CSV to a **SharePoint URL** (`Web.Contents`, no gateway). |
| Breakdowns show "Unknown" | Optional **Org Data CSV** missing | Provide the Org Data CSV so user and department breakdowns resolve. |

</div>

## Fabric

<div class="table-scroll">

| Symptom | Likely cause | Fix |
|---|---|---|
| Template can't find a table | The notebook hasn't run, or the wrong Lakehouse is attached | Run the core notebooks and confirm the **correct Lakehouse is attached and pinned** as default. |
| A notebook does nothing or errors on config | The `# === CONFIG ===` cell wasn't filled | Fill the CONFIG cell (SQL endpoint, Lakehouse name, secret via Key Vault / `notebookutils`) and re-run. |
| Credit Consumption page is empty | `Enable_Consumption` still `Exclude`, or the MCSMessages CSVs haven't landed / the ingester hasn't run | Set **`Enable_Consumption = Include`**, land the PPAC **MCSMessages** exports, and run `Copilot_Credit_Consumption_Ingester.ipynb`. |
| Agent pages are empty | `Enable_Dataverse` still `Exclude` | Set **`Enable_Dataverse = Include`**. |

</div>
