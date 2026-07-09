# LeaderLens — Measure & DAX Catalogue (M3 spec)

*Gamified team & function roll-ups: leagues, rankings, streaks, badges — with a privacy
(de-identify) toggle.*

> **What this file is.** A **reviewable design spec** for the M3 LeaderLens build. Every measure
> below is written against the **real, verified** SharePoint-path model (table/column/measure names
> confirmed from the shipped `.pbit` schema). It is **not yet applied** to the `.pbit` binaries —
> those are authored in an **in-Desktop build pass** (open → add measures/pages → refresh → save),
> per the `.pbit` handling rules. This doc is what gets reviewed/merged first.
>
> **Path parity.** DAX binds to model objects that exist on **both** paths (SharePoint PAX and
> Fabric). Where a binding differs by path it is called out explicitly.

---

## 1. Verified data-model bindings

**Leaderboard grain** — one competitor = one user, keyed by:

| Concept | Fact column | Org column | Relationship |
|---|---|---|---|
| User identity | `'Chat + Agent Interactions (Audit Logs)'[Audit_UserId]` | `'Chat + Agent Org Data'[PersonId]` | active, many-to-one (audit → org) |
| Date | `…(Audit Logs)[ActivityDate]` | `'Calendar'[Date]` | active |
| Month rollup | `'ActiveDaysSummary'[MonthStart]` / `'UserMonthMetrics'` | `'Calendar'[Date]` | active |

**Org / manager table** — `'Chat + Agent Org Data'`. Columns that exist **today** on every path:
`PersonId`, `PersonId_Normalized`, `UserKey`, `displayName`, `mail`, `JobTitle`,
`BusinessAreaLabel`, `OrgLevel_3Label`, `id`, `manager_id`, `manager_displayName`,
`manager_userPrincipalName`, `manager_mail`, `manager_jobTitle`, `ManagerID`.

**M2 / PAX hierarchy contract columns** — `OrgLevel`, `HierarchyPath`, `TopOfChain_Name`,
`IsManager`, `DirectReports`, `Level0_Name … Level14_Name`. Produced by:
- **SharePoint path:** `Adapt-OrgFile-To-EntraUsers.py` (PAX) → org rollup CSV.
- **Fabric path:** `Copilot_Org_Data_Direct_Ingester.ipynb` §4b (M2) → Lakehouse Delta.

> ⚠️ **Availability note.** The *shipped* SharePoint template snapshot predates these columns, so a
> **fresh org refresh (PAX or Fabric)** is what surfaces `Level*_Name`. LeaderLens roll-ups are
> therefore authored with a **graceful fallback**: use `Level*_Name` when present; otherwise fall
> back to the **direct-manager** column `manager_displayName` (always present) or an **in-model
> `PATH(id, manager_id)`** chain (both keys always present). See §4.

**Reusable measures already in the model** (host = `'Chat + Agent Interactions (Audit Logs)'`) —
LeaderLens **extends** these, never duplicates them:
`[PromptsSubmitted]`, `[AI Tasks]`, `[AI Tasks per Active User]`, `[Estimated Hours Saved]`,
`[Hours Saved Per User]`, `[AI Assisted Value]`, `[Power Users]`, `[Habitual Users]`.

**Agent-adoption signal:** `…(Audit Logs)[Is_Agent_Activity]`, `'UserMonthMetrics'[HasAgent]`.
**Active-day signal:** `'ActiveDaysSummary'[ChatActiveDays]`, `'UserMonthMetrics'[ActiveDays]`.

---

## 2. Toggle tables (optional-source pattern)

Two disconnected 1-column tables. **No relationships** — read with `SELECTEDVALUE(…, "<default>")`
so the default is honoured when nothing is selected (same idiom as the existing `AI Layer` toggle).
Contract column names are fixed so measures keep binding.

**`Leader Metric`** — which value powers "points".

| Metric (default **Reclaimed Hours**) | Metric Sort |
|---|---|
| Reclaimed Hours | 1 |
| AI Tasks | 2 |
| AI Value (£) | 3 |

**`Leader Privacy`** — name display. **Default = Real names** (M0-locked §12.5).

| Name Display (default **Real names**) | Privacy Sort |
|---|---|
| Real names | 1 |
| De-identified | 2 |

> Both tables follow the **EmptyTable + `try…otherwise` + `Enable_*`** convention: each is generated
> in-model (no external source), so there is nothing to fail on refresh; a stubbed
> `Enable_LeaderMetric` / `Enable_LeaderPrivacy` flag lets a deployer hide the slicers without
> breaking measure binding.

---

## 3. Core: points & identity

```DAX
-- The single configurable "score" every ranking / league / badge reads.
LeaderLens Points =
SWITCH(
    SELECTEDVALUE ( 'Leader Metric'[Metric], "Reclaimed Hours" ),
    "Reclaimed Hours", [Estimated Hours Saved],
    "AI Tasks",        [AI Tasks],
    "AI Value (£)",    [AI Assisted Value],
    [Estimated Hours Saved]           -- fallback = capacity tone
)
```

```DAX
LeaderLens Points (fmt) =
VAR m = SELECTEDVALUE ( 'Leader Metric'[Metric], "Reclaimed Hours" )
VAR v = [LeaderLens Points]
RETURN
    SWITCH ( m,
        "AI Value (£)",     FORMAT ( v, "£#,0" ),
        "Reclaimed Hours",  FORMAT ( v, "#,0.0" ) & " h",
        FORMAT ( v, "#,0" )                        -- AI Tasks
    )
```

```DAX
LeaderLens Active Users =
CALCULATE (
    DISTINCTCOUNT ( 'Chat + Agent Interactions (Audit Logs)'[Audit_UserId] ),
    [AI Tasks] > 0
)
```

---

## 4. Roll-up hierarchy (3 tiers + graceful fallback)

LeaderLens exposes three roll-up tiers. Group the audit fact by the org attribute for each tier.

| Tier | Group-by (preferred) | Fallback (always present) |
|---|---|---|
| **Individual** | `'Chat + Agent Org Data'[PersonId]` (display `[displayName]`) | — |
| **Team** (direct manager) | `'Chat + Agent Org Data'[manager_userPrincipalName]` (display `[manager_displayName]`) | — (always present) |
| **Org / function** | `'Chat + Agent Org Data'[Level1_Name]` … `[LevelN_Name]` (M2/PAX) | `[BusinessAreaLabel]` / `[OrgLevel_3Label]` |

**Full-chain fallback (no PAX columns yet)** — a self-contained in-model hierarchy that works the
moment an org table is loaded, using keys that are *always* present:

```DAX
-- Calculated column on 'Chat + Agent Org Data' (fallback only; skip if Level*_Name present)
Org Chain Path = PATH ( 'Chat + Agent Org Data'[id], 'Chat + Agent Org Data'[manager_id] )
Org Chain Depth = PATHLENGTH ( 'Chat + Agent Org Data'[Org Chain Path] )
-- Level N display name via the id at depth N:
Org Level1 Name =
LOOKUPVALUE (
    'Chat + Agent Org Data'[displayName],
    'Chat + Agent Org Data'[id], PATHITEM ( 'Chat + Agent Org Data'[Org Chain Path], 1 )
)
-- …repeat for Level2..N (or expand with a template) — these mirror PAX Level*_Name.
```

> **Build rule:** prefer the **M2/PAX `Level*_Name` columns** when the refreshed org table has them
> (identical contract on both paths). Only materialise the `PATH()` fallback if a deployment loads a
> raw org export without the PAX/M2 step. Team-tier roll-ups (`manager_displayName`) need **no**
> hierarchy columns and light up immediately.

---

## 5. Rankings

```DAX
LeaderLens Rank (User) =
IF (
    [AI Tasks] > 0 || NOT ISBLANK ( [LeaderLens Points] ),
    RANKX (
        ALLSELECTED ( 'Chat + Agent Org Data'[PersonId] ),
        [LeaderLens Points],
        , DESC, Dense
    )
)
```

```DAX
LeaderLens Rank (Team) =
RANKX (
    ALLSELECTED ( 'Chat + Agent Org Data'[manager_userPrincipalName] ),
    [LeaderLens Points],
    , DESC, Dense
)
```

```DAX
-- Org-tier rank: swap the ALLSELECTED column for the active Level*_Name / BusinessAreaLabel.
LeaderLens Rank (Org) =
RANKX (
    ALLSELECTED ( 'Chat + Agent Org Data'[BusinessAreaLabel] ),
    [LeaderLens Points],
    , DESC, Dense
)
```

```DAX
LeaderLens Percentile Rank =            -- 0..1, higher = better; drives leagues & the Top-% badge
VAR N = COUNTROWS ( ALLSELECTED ( 'Chat + Agent Org Data'[PersonId] ) )
VAR R = [LeaderLens Rank (User)]
RETURN IF ( N > 0 && NOT ISBLANK ( R ), DIVIDE ( N - R + 1, N ) )
```

---

## 6. Leagues & movement (climb / relegate)

Five divisions by percentile of `LeaderLens Points` within the selected scope.

```DAX
LeaderLens League =
VAR p = [LeaderLens Percentile Rank]
RETURN
    SWITCH ( TRUE (),
        ISBLANK ( p ),   BLANK (),
        p >= 0.90, "💎 Diamond",
        p >= 0.70, "🥇 Gold",
        p >= 0.40, "🥈 Silver",
        p >= 0.15, "🥉 Bronze",
                   "⚪ Starter"
    )
LeaderLens League Index =               -- 1..5 for movement math
SWITCH ( [LeaderLens League],
    "💎 Diamond",5, "🥇 Gold",4, "🥈 Silver",3, "🥉 Bronze",2, "⚪ Starter",1 )
```

```DAX
-- Prior-period league via a period-shift on Calendar (month granularity shown).
LeaderLens League Index (Prior) =
CALCULATE (
    [LeaderLens League Index],
    DATEADD ( 'Calendar'[Date], -1, MONTH )
)
LeaderLens League Movement =
VAR cur = [LeaderLens League Index]
VAR prv = [LeaderLens League Index (Prior)]
RETURN
    SWITCH ( TRUE (),
        ISBLANK ( cur ) || ISBLANK ( prv ), "•",
        cur > prv, "▲ Promoted",
        cur < prv, "▼ Relegated",
                   "▬ Held"
    )
```

---

## 7. Streaks (consecutive active weeks)

"Active week" = a week with ≥ 1 AI task. Uses `'Calendar'[Week Start]`.

```DAX
LeaderLens Weekly Active =                 -- 1 / 0, evaluated per Calendar week
INT ( [AI Tasks] > 0 )
```

```DAX
LeaderLens Current Streak (Weeks) =
VAR WeekTbl =
    ADDCOLUMNS (
        SUMMARIZE ( ALLSELECTED ( 'Calendar'[Week Start] ), 'Calendar'[Week Start] ),
        "@Active", CALCULATE ( [LeaderLens Weekly Active] )
    )
VAR LastActive = MAXX ( FILTER ( WeekTbl, [@Active] = 1 ), [Week Start] )
VAR LastBreak  = MAXX ( FILTER ( WeekTbl, [@Active] = 0 && [Week Start] < LastActive ), [Week Start] )
RETURN
    COUNTROWS (
        FILTER (
            WeekTbl,
            [@Active] = 1
                && [Week Start] <= LastActive
                && ( ISBLANK ( LastBreak ) || [Week Start] > LastBreak )
        )
    )
```

```DAX
-- Longest run = classic gaps-and-islands (weeks are 7 days apart).
LeaderLens Longest Streak (Weeks) =
VAR Active =
    FILTER (
        ADDCOLUMNS (
            SUMMARIZE ( ALLSELECTED ( 'Calendar'[Week Start] ), 'Calendar'[Week Start] ),
            "@Active", CALCULATE ( [LeaderLens Weekly Active] )
        ),
        [@Active] = 1
    )
VAR Grouped =
    ADDCOLUMNS (
        Active,
        "@Grp",
            ( INT ( [Week Start] ) / 7 )
            - RANKX ( Active, [Week Start], , ASC, Dense )
    )
RETURN
    MAXX ( GROUPBY ( Grouped, [@Grp], "@Run", COUNTX ( CURRENTGROUP (), 1 ) ), [@Run] )
```

> The longest-streak island math is standard but fiddly against import models — **finalise/validate
> in the in-Desktop pass** (a pre-computed weekly-active bridge may be simpler than the inline
> `SUMMARIZE`).

---

## 8. Badges

Threshold flags, surfaced as an emoji strip. Tunable thresholds shown inline.

```DAX
LeaderLens Badge — On Fire      = IF ( [LeaderLens Current Streak (Weeks)] >= 4, "🔥", "" )   -- 4+ wk streak
LeaderLens Badge — Consistent   = IF ( [LeaderLens Longest Streak (Weeks)] >= 8, "💎", "" )   -- 8+ wk best run
LeaderLens Badge — Top Decile   = IF ( [LeaderLens Percentile Rank] >= 0.90, "🏅", "" )
LeaderLens Badge — Fast Riser   = IF ( [LeaderLens League Movement] = "▲ Promoted", "🚀", "" )
LeaderLens Badge — Agent Adopter= IF ( CALCULATE ( [AI Tasks], 'Chat + Agent Interactions (Audit Logs)'[Is_Agent_Activity] = TRUE () ) > 0, "🤖", "" )
LeaderLens Badge — Time Saver   = IF ( [Estimated Hours Saved] >= 20, "⏱️", "" )              -- 20+ h saved
LeaderLens Badge — Explorer     =
    IF ( CALCULATE ( DISTINCTCOUNT ( 'Chat + Agent Interactions (Audit Logs)'[Behavior_Category] ), [AI Tasks] > 0 ) >= 5, "🌐", "" )
```

```DAX
LeaderLens Badge Strip =
CONCATENATEX (
    { [LeaderLens Badge — On Fire], [LeaderLens Badge — Consistent], [LeaderLens Badge — Top Decile],
      [LeaderLens Badge — Fast Riser], [LeaderLens Badge — Agent Adopter], [LeaderLens Badge — Time Saver],
      [LeaderLens Badge — Explorer] },
    [Value], " ",, ASC
)
LeaderLens Badges Earned =
COUNTX (
    { [LeaderLens Badge — On Fire], [LeaderLens Badge — Consistent], [LeaderLens Badge — Top Decile],
      [LeaderLens Badge — Fast Riser], [LeaderLens Badge — Agent Adopter], [LeaderLens Badge — Time Saver],
      [LeaderLens Badge — Explorer] },
    IF ( [Value] <> "", 1 )
)
```

---

## 9. Privacy — de-identify toggle (OFF by default)

Default = **real names** (M0-locked §12.5). When the deployer flips `Leader Privacy` to
*De-identified*, every name-bearing visual reads the masked measure instead of the raw column.
Pseudonyms are **deterministic & stable** (driven by the user's rank), so the same person keeps the
same alias across a session.

```DAX
LeaderLens Display Name =
IF (
    SELECTEDVALUE ( 'Leader Privacy'[Name Display], "Real names" ) = "De-identified",
    "Contributor #" & FORMAT ( [LeaderLens Rank (User)], "000" ),
    SELECTEDVALUE ( 'Chat + Agent Org Data'[displayName] )
)
LeaderLens Team Display Name =
IF (
    SELECTEDVALUE ( 'Leader Privacy'[Name Display], "Real names" ) = "De-identified",
    "Team #" & FORMAT ( [LeaderLens Rank (Team)], "000" ),
    SELECTEDVALUE ( 'Chat + Agent Org Data'[manager_displayName] )
)
```

> Visuals bind their name field to **`[LeaderLens Display Name]`**, never to the raw `displayName`
> column, so the toggle governs every surface. **M6 demo assets are always synthetic** regardless of
> this toggle.

---

## 10. Pages (page-tab group "Leader · …")

Per the brief's lens-group tab convention:

- **Leader · Leaderboards** — individual + team leaderboards (`[LeaderLens Display Name]`,
  `[LeaderLens Points (fmt)]`, `[LeaderLens Rank (User)]`), manager → team → individual drill.
- **Leader · Leagues** — division standings, `[LeaderLens League]`, `[LeaderLens League Movement]`
  promotion/relegation arrows.
- **Leader · Streaks & Badges** — streak leaders (`[LeaderLens Current Streak (Weeks)]`), badge wall
  (`[LeaderLens Badge Strip]`, `[LeaderLens Badges Earned]`).

Each page carries the `Leader Metric` and `Leader Privacy` slicers so the whole lens is re-scored /
anonymised from one place.

---

## 11. Contract-safety checklist (must hold after the in-Desktop build)

- [ ] Toggle tables generated in-model (no external source); `Enable_LeaderMetric` /
      `Enable_LeaderPrivacy` present.
- [ ] All name visuals bound to `[LeaderLens Display Name]` / `[LeaderLens Team Display Name]`
      (never raw `displayName`).
- [ ] Roll-ups prefer `Level*_Name`; degrade to `manager_displayName` / `BusinessAreaLabel` without
      error when PAX/M2 columns are absent (`try…otherwise` / `COALESCE`).
- [ ] No new hard dependency on any single optional source — LeaderLens renders (leaderboard tier)
      with **only** audit + org loaded.
- [ ] Reused measures (`[AI Tasks]`, `[Estimated Hours Saved]`, `[AI Assisted Value]`, …) unchanged.
- [ ] Desktop **open → refresh → save** validates the `.pbit` before any binary is committed.

---

## 12. Open defaults to confirm (M0 alignment)

1. **Points default = Reclaimed Hours** (capacity tone). Alternatives via `Leader Metric` toggle:
   AI Tasks (volume) or AI Value (£). *Confirm the default, or flip it.*
2. **Privacy default = Real names** (M0-locked §12.5) — kept, **despite** brief §8/§12.5 *prose*
   that reads as recommending de-identify ON. Flagged for explicit confirmation; build reflects the
   **locked** decision (real names default, opt-in de-identify, M6 always synthetic).
3. **League bands** = 90 / 70 / 40 / 15 percentile cuts (Diamond/Gold/Silver/Bronze/Starter) and
   **movement granularity = month**. Tunable.
