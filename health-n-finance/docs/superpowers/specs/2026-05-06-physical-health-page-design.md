# Physical Health Page — Design

**Date:** 2026-05-06
**Status:** Approved (pending implementation plan)
**Replaces:** Existing dashboard "Physical Health" panel (gym days + workouts)

## Summary

Replace the gym-days/workouts UI with a dedicated **Physical Health** page that tracks daily macros (protein, carbs, fats, water) and weight, with separate charts per metric and a Week / Month / Year time-scale toggle. Logging happens via an inline form pinned at the top of the page; clicking any historical chart point edits that day's values.

## Decisions

| # | Question | Decision |
|---|---|---|
| Q1 | Macro logging granularity | **Daily totals** — one row per day per macro |
| Q2 | Where it lives | **Dedicated page** — dashboard panel becomes a single "Open Physical Health" entry button |
| Q3 | Targets | **Yes** — set a target per macro; chart shows reference line, days colored by hit/miss |
| Q4 | Year-scale aggregation | **Weekly average** — 52 points across the year |
| Q5 | Input UX | **Both** — inline form for today, click historical points to edit past days |
| Q6 | Meal notes shape | **Timestamped lines** — `[time picker] [text input] [delete]`, multiple per day |
| Water | Overlap with Routine panel | **Migrate** — remove Routine's water row + `waterSeedLogs`; Physical Health is sole water tracker |

## Navigation & page structure

- Dashboard's "Physical Health" panel: replaced with a single button **"Open Physical Health"**.
- Click → swaps the rendered page from the dashboard to the Physical Health page (same page-switching pattern as Monthly Spends "Analyse" at [App.svelte:2181](../../src/App.svelte#L2181)).
- Page top bar: title · back button · scale toggle (`Week` / `Month` / `Year`). The toggle drives all 5 charts simultaneously.

## Data model

One new localStorage key: `finance-health-physical-logs-v1`.

```js
{
  targets: {
    protein: 150,   // g/day
    carbs:   250,   // g/day
    fats:    70,    // g/day
    water:   3000,  // ml/day
    weight:  70,    // kg goal
  },
  daily: {
    'YYYY-MM-DD': {
      protein: 120,    // g
      carbs:   200,    // g
      fats:    60,     // g
      water:   2500,   // ml
      weight:  72.5,   // kg (single weigh-in per day)
      meals: [
        { time: '08:30', text: '4 eggs, oats' },
        { time: '13:00', text: 'chicken curry, 3 rotis' },
      ],
    },
  },
}
```

- Seed comes from a new `physicalHealth: { targets, daily }` field in [data.private.js](../../src/data.private.js).
- Falls back to defaults (`targets` zeros, empty `daily`) if absent.
- Mutations write to localStorage immediately on form blur.

## Inline form (top of page)

A pinned card always visible above the charts.

**Header:** today's date label. When editing a past day, switches to "Editing &lt;Date&gt;" with a "Back to today" link.

**Numbers row:** five number inputs side-by-side:

```
Protein [   ] g  / 150g     Carbs [   ] g  / 250g     Fats [   ] g  / 70g
Water   [   ] ml / 3000ml   Weight [   ] kg / goal 70kg
```

- Each input shows its target inline as `/ <target><unit>`.
- Auto-saves on blur (no explicit save button).
- Empty / unparseable input → treats that field as `null` for that day (excluded from chart).

**Meal-notes section** (below numbers):

```
─── Meals ─────────────────────────────────
  [08:30]  4 eggs, oats                  [×]
  [13:00]  chicken curry, 3 rotis        [×]
  [20:00]  dal, rice                     [×]
  + Add meal
```

- Each row: time picker, text input, delete button.
- "+ Add meal" appends a new row with the current time pre-filled.
- Auto-saves the meals array on any change.
- Meal text is **not plotted** — context only.

## Charts

Vertically stacked, scale-toggle drives all of them.

| Order | Metric | Style | Y-axis | Target line |
|---|---|---|---|---|
| 1 | Protein | Bars | grams | Yes (dashed) |
| 2 | Carbs | Bars | grams | Yes (dashed) |
| 3 | Fats | Bars | grams | Yes (dashed) |
| 4 | Water | Bars | ml | Yes (dashed) |
| 5 | Weight | Smoothed line | kg | Yes (dashed at goal) |

**Why bars vs line:** macros are discrete daily sums (bar reads as "today's number"); weight is a continuous metric (line reads trend better).

**Hit/miss coloring:**
- Macros (protein/carbs/fats/water): **green** if value ≥ target, **grey** if below.
- Weight: **green** if within ±1 kg of goal, **grey** otherwise.

**Click behavior:** clicking any bar/point loads that day's values into the inline form for editing. The form header switches to "Editing &lt;Date&gt;".

**Scale toggle:**
- **Week** → last 7 days, daily values
- **Month** → last 30 days, daily values
- **Year** → last 52 weeks, **weekly average** of each metric

When viewing Year scale, clicking a weekly bar/point loads the **most recent day in that week** into the form (no aggregate editing).

## Water migration

Remove the existing water tracking from the Routine panel and merge it into Physical Health:

1. Remove the `water-intake` entry from `routineItems` in [data.private.js](../../src/data.private.js) and `data.public.js`.
2. Remove the `waterSeedLogs` field from both data files.
3. Remove the `waterStorageKey` constant + all water-specific logic in App.svelte ([App.svelte:7](../../src/App.svelte#L7) and references).
4. Existing localStorage `finance-health-water-logs-v1` data is **abandoned** (not migrated). Acceptable because the existing data is timestamps not volumes — incompatible with the new ml-based model.

## What gets removed

| Item | Where | Action |
|---|---|---|
| Gym days list + workouts UI | Dashboard "Physical Health" panel ([App.svelte:2513](../../src/App.svelte#L2513)) | Replace with single "Open Physical Health" button |
| Gym day detail page | [App.svelte:2086](../../src/App.svelte#L2086) | Delete (no longer reachable) |
| `gymDays`, `gymSeedLogs`, `gymStorageKey` | App.svelte + data files | Delete |
| Routine "Water Intake" row | `routineItems` in data files | Delete entry |
| `waterSeedLogs`, `waterStorageKey` | App.svelte + data files | Delete |

The dashboard's existing Routine panel keeps its other rows (Sleep, Wake, Meal 1/2/3, Snack) — only the Water row is removed.

## Implementation approach

Add inside `App.svelte` (matches existing pattern — file is already large, but new feature is self-contained).

**New state:**
- `physicalHealthLogs` — full structure from localStorage
- `physicalHealthScale` — `'week' | 'month' | 'year'`
- `physicalHealthEditDate` — `null` for today, else `'YYYY-MM-DD'`
- `currentPage === 'physical-health'` — new value for the existing page-switch state

**New helpers:**
- `bootstrapPhysicalHealthLogs()` — seed merge
- `getDailyEntry(date)` — current values for inline form
- `getChartDataForMetric(metric, scale)` — returns bar/line data for one chart
- `aggregateWeekly(daily, metric)` — for year-scale view
- `formatMetric(value, metric)` — unit-aware display ("120g", "2500ml", "72.5kg")
- `isMetricOnTarget(metric, value, target)` — coloring logic

**New section:** `<section class="physical-health-page">` rendered when `currentPage === 'physical-health'`.

**New CSS:** ~150 lines in [app.css](../../src/app.css) for the page, pinned form, chart cards, meal lines.

**Estimated size:** ~400-500 lines in App.svelte, ~150 lines in app.css.

## Out of scope (explicitly)

- Per-meal macro breakdown (Q1: daily totals only).
- Food database / auto-calculation of macros from foods.
- Importing data from external trackers (MyFitnessPal, Apple Health, etc.).
- Multiple weigh-ins per day.
- Editing aggregated weekly bars in Year scale (clicking jumps to the latest day in that week instead).
- Migrating old `waterSeedLogs` data into the new model.

## Open questions

None — all decisions resolved during brainstorming.
