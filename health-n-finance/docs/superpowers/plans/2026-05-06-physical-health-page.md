# Physical Health Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's gym-days panel with a dedicated Physical Health page that tracks daily macros (protein, carbs, fats, water) and weight via separate charts with Week/Month/Year scale toggle, an inline auto-save form for today's logging, click-to-edit historical points, and timestamped meal notes.

**Architecture:** Single-page Svelte 5 app, all UI in `src/App.svelte` (existing pattern — no extracted components). New localStorage key (`finance-health-physical-logs-v1`) seeded from `data.private.js`. Routing via a new `showPhysicalHealthPage` boolean (mirrors existing `showMonthlySpends`). Charts rendered as inline SVG (matches existing Monthly Spends pattern). Water tracking migrated out of the Routine panel and into Physical Health entirely.

**Tech Stack:** Svelte 5 (`mount` API, `$:` reactives), Vite 8 dev server, plain JS (no TypeScript), CSS in `src/app.css`. No test framework — verification is manual via the running dev server at `http://localhost:5173/` (currently active in this session).

**Spec:** [docs/superpowers/specs/2026-05-06-physical-health-page-design.md](../specs/2026-05-06-physical-health-page-design.md)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/data.public.js` | Modify | Add `physicalHealth` seed; remove `gymDays`/`gymSeedLogs`/`waterSeedLogs`/water-intake row |
| `src/data.private.js` | Modify | Same as public, with realistic seed values for the user |
| `src/app-data.js` | Modify | Expose new `physicalHealth` field; remove gym/water fields |
| `src/App.svelte` | Modify | Storage key, state, helpers, navigation, page UI, form, charts, Routine cleanup |
| `src/app.css` | Modify | Styles for the page, form, charts, meal-notes list |

---

## Task 1: Update data layer

**Files:**
- Modify: `src/data.public.js`
- Modify: `src/data.private.js`
- Modify: `src/app-data.js`

- [ ] **Step 1.1:** Edit `src/data.public.js` — remove `gymDays` and `gymSeedLogs` arrays/objects, remove the `water-intake` entry from `routineItems`, remove the `waterSeedLogs` field, and add a `physicalHealth` field.

```js
// In src/data.public.js — replace the file's default export with:
export default {
  ribbons: [
    /* unchanged ribbons */
  ],
  creditCards: [{ name: 'Credit Card', amount: 0, note: 'Sample card' }],
  loanTrackerItems: [
    /* unchanged loanTrackerItems */
  ],
  peopleToGiveMoney: [
    /* unchanged */
  ],
  financeTransactions: [],
  routineItems: [
    { id: 'sleep-duration', time: '--', task: 'Sleep Duration' },
    { id: 'wake-up', time: '--', task: 'Wake Up' },
    { id: 'sleep', time: '--', task: 'Sleep' },
    { id: 'breakfast', time: '--', task: 'Meal 1' },
    { id: 'lunch', time: '--', task: 'Meal 2' },
    { id: 'fruit', time: '--', task: 'Snack', iconId: 'breakfast' },
    { id: 'dinner', time: '--', task: 'Meal 3' },
    // water-intake row removed
  ],
  routineNotes: {},
  routineSeedLogs: {},
  // waterSeedLogs removed
  physicalHealth: {
    targets: { protein: 150, carbs: 250, fats: 70, water: 3000, weight: 70 },
    daily: {},
  },
  // gymDays removed
  // gymSeedLogs removed
}
```

- [ ] **Step 1.2:** Edit `src/data.private.js` — same removals; add `physicalHealth` with seeded today entry so the user sees data immediately on page load.

```js
// Add to the default export of src/data.private.js (replace gymDays/gymSeedLogs section + remove water-intake from routineItems):
  physicalHealth: {
    targets: { protein: 150, carbs: 250, fats: 70, water: 3000, weight: 70 },
    daily: {
      '2026-05-06': {
        protein: 0,
        carbs: 0,
        fats: 0,
        water: 0,
        weight: 0,
        meals: [],
      },
    },
  },
```

- [ ] **Step 1.3:** Edit `src/app-data.js` — expose `physicalHealth`, drop `gymDays`/`gymSeedLogs`/`waterSeedLogs`.

```js
// src/app-data.js — replace the export block:
import publicData from './data.public.js'

const privateModules = import.meta.glob('./data.private.js', { eager: true })
const privateData = Object.values(privateModules)[0]?.default
const forcePublicPreview = false
const data = forcePublicPreview ? publicData : privateData ?? publicData

export default {
  forcePublicPreview,
  ribbons: data.ribbons ?? [],
  creditCards: data.creditCards ?? [],
  loanTrackerItems: data.loanTrackerItems ?? [],
  peopleToGiveMoney: data.peopleToGiveMoney ?? [],
  financeTransactions: data.financeTransactions ?? [],
  routineItems: data.routineItems ?? [],
  routineNotes: data.routineNotes ?? {},
  routineSeedLogs: data.routineSeedLogs ?? {},
  physicalHealth: data.physicalHealth ?? { targets: {}, daily: {} },
}
```

- [ ] **Step 1.4:** Verify in browser. App should still load (Vite hot-reloads). Dashboard's Routine panel will lose the Water Intake row immediately. Gym panel will throw because App.svelte still references `appData.gymDays` — this is expected; Task 3 fixes it. Verify in DevTools console: `appData.physicalHealth.targets.protein === 150`.

---

## Task 2: Add Physical Health storage key, state, and bootstrap in App.svelte

**Files:**
- Modify: `src/App.svelte` (top script block, ~lines 1-1500)

- [ ] **Step 2.1:** Add the new storage key constant near the other storage keys at the top of `<script>` (around App.svelte:5-9).

```js
// src/App.svelte — add to the storage-key block:
const physicalHealthStorageKey = 'finance-health-physical-logs-v1'
```

- [ ] **Step 2.2:** Add state variables next to other route flags (around App.svelte:1316).

```js
// src/App.svelte — add near `let showMonthlySpends = false`:
let showPhysicalHealthPage = false
let physicalHealthLogs = bootstrapPhysicalHealthLogs(appData.physicalHealth)
let physicalHealthScale = 'month'  // 'week' | 'month' | 'year'
let physicalHealthEditDate = null  // null = editing today; else 'YYYY-MM-DD'
```

- [ ] **Step 2.3:** Add the bootstrap helper alongside other helpers (above the reactive declarations block, e.g. after the existing `bootstrapMonthlySpends` function around App.svelte:830).

```js
function bootstrapPhysicalHealthLogs(seed = {}) {
  const fallbackTargets = { protein: 0, carbs: 0, fats: 0, water: 0, weight: 0 }
  const seededTargets = { ...fallbackTargets, ...(seed.targets ?? {}) }
  const seededDaily = { ...(seed.daily ?? {}) }
  return { targets: seededTargets, daily: seededDaily }
}

function todayIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPhysicalHealthEntry(date) {
  return (
    physicalHealthLogs.daily[date] ?? {
      protein: 0,
      carbs: 0,
      fats: 0,
      water: 0,
      weight: 0,
      meals: [],
    }
  )
}

function setPhysicalHealthEntry(date, partial) {
  const existing = getPhysicalHealthEntry(date)
  physicalHealthLogs = {
    ...physicalHealthLogs,
    daily: {
      ...physicalHealthLogs.daily,
      [date]: { ...existing, ...partial },
    },
  }
}
```

- [ ] **Step 2.4:** Persist on change. Find the existing `localStorage.setItem(monthlySpendStorageKey, ...)` reactive block (around App.svelte:1427) and add a parallel `$:` for physical health.

```js
// src/App.svelte — add after the existing localStorage.setItem reactive blocks:
$: if (hydrated) {
  localStorage.setItem(physicalHealthStorageKey, JSON.stringify(physicalHealthLogs))
}
```

- [ ] **Step 2.5:** Restore from localStorage on mount. Find the existing restore block (around App.svelte:1384 where `monthlySpendRaw` is read). Add:

```js
// src/App.svelte — add inside the same onMount block, near the other restore reads:
const physicalHealthRaw = localStorage.getItem(physicalHealthStorageKey)
if (physicalHealthRaw) {
  try {
    physicalHealthLogs = bootstrapPhysicalHealthLogs(JSON.parse(physicalHealthRaw))
  } catch (error) {
    console.warn('Could not parse physical health logs', error)
    physicalHealthLogs = bootstrapPhysicalHealthLogs(appData.physicalHealth)
  }
}
```

- [ ] **Step 2.6:** Verify in browser (DevTools console). Expected:
  - `localStorage.getItem('finance-health-physical-logs-v1')` returns a JSON string with `targets` and `daily`.
  - No errors logged from this block.

---

## Task 3: Replace dashboard gym panel with "Open Physical Health" button + add page route

**Files:**
- Modify: `src/App.svelte` (template + script)

- [ ] **Step 3.1:** Add open/close functions near `openMonthlySpends` (around App.svelte:1991).

```js
function openPhysicalHealth() {
  showMonthlySpends = false
  selectedGymDayId = null
  showPhysicalHealthPage = true
  physicalHealthEditDate = null
}

function closePhysicalHealth() {
  showPhysicalHealthPage = false
  physicalHealthEditDate = null
}
```

- [ ] **Step 3.2:** Persist the route in UI state. Find the existing `page:` field in the UI state save block (around App.svelte:1432) and update it.

```js
// src/App.svelte — replace the `page:` line in the UI state object:
page: selectedGymDayId
  ? 'gym'
  : showMonthlySpends
    ? 'monthly'
    : showPhysicalHealthPage
      ? 'physical-health'
      : 'home',
```

- [ ] **Step 3.3:** Restore the route. Find the existing restore branches (around App.svelte:1411 where `showMonthlySpends = true`). Add:

```js
// src/App.svelte — in the same restore block (after the `showMonthlySpends = true` branch):
if (restoredUiState?.page === 'physical-health') {
  showPhysicalHealthPage = true
}
```

- [ ] **Step 3.4:** Replace the gym panel content. Find `<section class="gym-panel"` (around App.svelte:2513). Replace the entire `<section class="gym-panel">...</section>` block with:

```svelte
<section class="gym-panel" aria-label="Physical health">
  <div class="routine-panel-header">
    <div>
      <h2 class="panel-title">Physical Health</h2>
      <p class="routine-kicker">Macros · Water · Weight</p>
    </div>
  </div>
  <button
    class="physical-health-open-button"
    type="button"
    on:click={openPhysicalHealth}
  >
    Open Physical Health
  </button>
</section>
```

- [ ] **Step 3.5:** Remove the gym day detail page rendering. Find the `{#if selectedGymDay}` branch in `<main class="app">` (around App.svelte:2121) and the matching `{:else if ...}` for monthly spends. Replace the whole `{#if selectedGymDay} ... {:else if ...} ... {:else}` chain to add a physical-health branch. Keep gym day branch removed entirely.

```svelte
<!-- src/App.svelte — replace the top-level page branching in <main class="app"> -->
<main class="app">
  {#if showPhysicalHealthPage}
    <!-- Physical Health page placeholder; filled in Tasks 4-6 -->
    <section class="physical-health-page">
      <div class="physical-health-topbar">
        <button class="back-button" type="button" on:click={closePhysicalHealth}>← Back</button>
      </div>
    </section>
  {:else if showMonthlySpends}
    <!-- existing monthly spends page section, unchanged -->
  {:else}
    <!-- existing dashboard layout, unchanged -->
  {/if}
</main>
```

Note: when modifying, do NOT delete the existing monthly-spends page or dashboard markup — only remove the `{#if selectedGymDay} ... {:else if showMonthlySpends}` branching change so it becomes `{#if showPhysicalHealthPage} ... {:else if showMonthlySpends} ... {:else}`. Drop the entire `{#if selectedGymDay}` block and the gym-day-page section beneath it.

- [ ] **Step 3.6:** Remove now-orphaned gym helpers and state. In the `<script>` block, delete:
  - `let gymDays = appData.gymDays` and the entire `gymLogs`, `gymSeedLogs`, `gymStorageKey` related state and functions (`openGymDay`, `closeGymDay`, `loadGymDraft`, `gymEntryDraft`, `gymGraphCards`, etc.).
  - Use grep to find them: `grep -n "gym\|Gym" src/App.svelte` — remove every reference except the `<section class="gym-panel">` template (which is now the Open button).

  Caution: `gymStorageKey = 'finance-health-gym-logs-v1'` and the localStorage write for it must be removed. The old `finance-health-gym-logs-v1` key is abandoned (acceptable — spec says no migration).

- [ ] **Step 3.7:** Verify in browser. Open `http://localhost:5173/`. Dashboard should show:
  - Routine panel (without Water Intake row)
  - "Physical Health" panel containing only an "Open Physical Health" button
  - Monthly Spends panel + Loans panel + ribbons unchanged
  - Click "Open Physical Health" → page swaps to a near-empty page with a Back button
  - Click Back → returns to dashboard
  - No console errors

---

## Task 4: Page shell + scale toggle

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/app.css`

- [ ] **Step 4.1:** Replace the placeholder physical-health-page section with a header containing title + scale toggle.

```svelte
<section class="physical-health-page">
  <div class="physical-health-topbar">
    <button class="back-button" type="button" on:click={closePhysicalHealth}>← Back</button>
    <h1 class="physical-health-title">Physical Health</h1>
    <div class="physical-health-scale-toggle" role="tablist" aria-label="Time scale">
      {#each ['week', 'month', 'year'] as scale}
        <button
          type="button"
          role="tab"
          class:is-active={physicalHealthScale === scale}
          on:click={() => (physicalHealthScale = scale)}
        >
          {scale[0].toUpperCase() + scale.slice(1)}
        </button>
      {/each}
    </div>
  </div>

  <!-- Inline form goes here in Task 5 -->
  <!-- Charts go here in Task 6 -->
</section>
```

- [ ] **Step 4.2:** Add CSS to `src/app.css` (append at end of file).

```css
.physical-health-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 22px 32px;
  max-width: 980px;
  margin: 0 auto;
}

.physical-health-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.physical-health-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
  flex: 1;
}

.physical-health-scale-toggle {
  display: inline-flex;
  background: rgba(15, 23, 42, 0.06);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.physical-health-scale-toggle button {
  appearance: none;
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.6);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.physical-health-scale-toggle button.is-active {
  background: #fff;
  color: rgba(15, 23, 42, 0.95);
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
}

.physical-health-open-button {
  appearance: none;
  border: none;
  padding: 14px 18px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  cursor: pointer;
  width: 100%;
  margin-top: 12px;
  box-shadow: 0 8px 18px rgba(99, 102, 241, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.physical-health-open-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(99, 102, 241, 0.32);
}
```

- [ ] **Step 4.3:** Verify in browser. Open Physical Health page. Should see:
  - Back button on left
  - "Physical Health" title in middle
  - Week/Month/Year toggle on right with Month active by default
  - Clicking Week/Year highlights that button
  - No console errors

---

## Task 5: Inline form (numbers + meal notes)

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/app.css`

- [ ] **Step 5.1:** Add reactive helpers in the script block.

```js
// src/App.svelte — add to the reactive declarations block:
$: physicalHealthFormDate = physicalHealthEditDate ?? todayIsoDate()
$: physicalHealthFormEntry = getPhysicalHealthEntry(physicalHealthFormDate)
$: physicalHealthIsToday = physicalHealthFormDate === todayIsoDate()

function updatePhysicalHealthMacro(field, rawValue) {
  const parsed = rawValue === '' ? 0 : Number(rawValue)
  if (!Number.isFinite(parsed)) return
  setPhysicalHealthEntry(physicalHealthFormDate, { [field]: parsed })
}

function addMealEntry() {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const existing = getPhysicalHealthEntry(physicalHealthFormDate)
  setPhysicalHealthEntry(physicalHealthFormDate, {
    meals: [...existing.meals, { time, text: '' }],
  })
}

function updateMealEntry(index, field, value) {
  const existing = getPhysicalHealthEntry(physicalHealthFormDate)
  const next = existing.meals.map((meal, i) => (i === index ? { ...meal, [field]: value } : meal))
  setPhysicalHealthEntry(physicalHealthFormDate, { meals: next })
}

function deleteMealEntry(index) {
  const existing = getPhysicalHealthEntry(physicalHealthFormDate)
  setPhysicalHealthEntry(physicalHealthFormDate, {
    meals: existing.meals.filter((_, i) => i !== index),
  })
}

function backToToday() {
  physicalHealthEditDate = null
}

function formatPhysicalHealthDate(isoDate) {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
```

- [ ] **Step 5.2:** Insert form markup inside the page section (after the topbar, before charts placeholder).

```svelte
<section class="physical-health-form" aria-label="Daily log">
  <div class="physical-health-form-head">
    {#if physicalHealthIsToday}
      <p class="physical-health-form-kicker">Today</p>
      <h2>{formatPhysicalHealthDate(physicalHealthFormDate)}</h2>
    {:else}
      <p class="physical-health-form-kicker">Editing</p>
      <h2>{formatPhysicalHealthDate(physicalHealthFormDate)}</h2>
      <button class="physical-health-back-today" type="button" on:click={backToToday}>
        Back to today
      </button>
    {/if}
  </div>

  <div class="physical-health-macros">
    {#each [
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbs',   label: 'Carbs',   unit: 'g' },
      { key: 'fats',    label: 'Fats',    unit: 'g' },
      { key: 'water',   label: 'Water',   unit: 'ml' },
      { key: 'weight',  label: 'Weight',  unit: 'kg' },
    ] as macro}
      <label class="physical-health-macro">
        <span class="physical-health-macro-label">{macro.label}</span>
        <div class="physical-health-macro-input">
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step={macro.unit === 'kg' ? '0.1' : '1'}
            value={physicalHealthFormEntry[macro.key] || ''}
            on:blur={(event) => updatePhysicalHealthMacro(macro.key, event.currentTarget.value)}
          />
          <span class="physical-health-macro-unit">{macro.unit}</span>
        </div>
        <span class="physical-health-macro-target">
          / {physicalHealthLogs.targets[macro.key] || 0}{macro.unit}
        </span>
      </label>
    {/each}
  </div>

  <div class="physical-health-meals">
    <p class="physical-health-meals-title">Meals</p>
    {#each physicalHealthFormEntry.meals as meal, index (index)}
      <div class="physical-health-meal-row">
        <input
          type="time"
          value={meal.time}
          on:blur={(event) => updateMealEntry(index, 'time', event.currentTarget.value)}
        />
        <input
          type="text"
          placeholder="What did you eat?"
          value={meal.text}
          on:blur={(event) => updateMealEntry(index, 'text', event.currentTarget.value)}
        />
        <button
          class="physical-health-meal-delete"
          type="button"
          aria-label="Remove meal"
          on:click={() => deleteMealEntry(index)}
        >
          ×
        </button>
      </div>
    {/each}
    <button class="physical-health-add-meal" type="button" on:click={addMealEntry}>
      + Add meal
    </button>
  </div>
</section>
```

- [ ] **Step 5.3:** Add CSS for the form.

```css
.physical-health-form {
  padding: 18px 20px 16px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(241, 245, 249, 0.7));
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
}

.physical-health-form-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}

.physical-health-form-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
}

.physical-health-form-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
  flex: 1;
}

.physical-health-back-today {
  appearance: none;
  border: 1px solid rgba(15, 23, 42, 0.15);
  background: #fff;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.7);
  cursor: pointer;
}

.physical-health-back-today:hover {
  background: rgba(15, 23, 42, 0.04);
}

.physical-health-macros {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.physical-health-macro {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.physical-health-macro-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
}

.physical-health-macro-input {
  display: flex;
  align-items: baseline;
  gap: 6px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 8px 10px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.physical-health-macro-input:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
}

.physical-health-macro-input input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(15, 23, 42, 0.95);
  min-width: 0;
}

.physical-health-macro-unit {
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.5);
}

.physical-health-macro-target {
  font-size: 11px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.45);
  font-variant-numeric: tabular-nums;
}

.physical-health-meals {
  border-top: 1px dashed rgba(15, 23, 42, 0.12);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.physical-health-meals-title {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
}

.physical-health-meal-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
}

.physical-health-meal-row input[type='time'],
.physical-health-meal-row input[type='text'] {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  background: #fff;
  outline: none;
  transition: border-color 0.15s ease;
}

.physical-health-meal-row input:focus {
  border-color: #6366f1;
}

.physical-health-meal-delete {
  appearance: none;
  border: none;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.55);
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.physical-health-meal-delete:hover {
  background: rgba(239, 68, 68, 0.12);
  color: rgb(220, 38, 38);
}

.physical-health-add-meal {
  appearance: none;
  border: 1px dashed rgba(15, 23, 42, 0.2);
  background: transparent;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.65);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.physical-health-add-meal:hover {
  background: rgba(15, 23, 42, 0.04);
  border-color: rgba(15, 23, 42, 0.35);
}
```

- [ ] **Step 5.4:** Verify in browser. Open Physical Health page. Expected:
  - Form card visible with "Today · May 6, 2026" header
  - 5 number inputs in a responsive grid, each with target shown ("/ 150g" etc.)
  - Empty meal list with "+ Add meal" button
  - Type a value (e.g., 120 in Protein), tab/click out — DevTools `localStorage.getItem('finance-health-physical-logs-v1')` shows the value persisted
  - Click "+ Add meal" → new row appears with current time pre-filled, type into the text input, blur — persists
  - Click × to delete a meal row → it disappears, persists
  - Reload page → form values restored

---

## Task 6: Five charts (macros bars + weight line)

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/app.css`

- [ ] **Step 6.1:** Add chart-data helpers in the script block.

```js
function physicalHealthDateRange(scale) {
  const today = new Date()
  if (scale === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().slice(0, 10)
    })
  }
  if (scale === 'month') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (29 - i))
      return d.toISOString().slice(0, 10)
    })
  }
  // 'year' → 52 weekly buckets, return ISO date strings of the Monday of each week
  const result = []
  const monday = new Date(today)
  const dayOfWeek = (monday.getDay() + 6) % 7  // 0=Mon ... 6=Sun
  monday.setDate(monday.getDate() - dayOfWeek)
  for (let i = 51; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(d.getDate() - i * 7)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

function physicalHealthChartPoints(metric, scale) {
  const range = physicalHealthDateRange(scale)
  if (scale === 'year') {
    // Weekly average for each Monday in `range`
    return range.map((weekStart, idx) => {
      const start = new Date(weekStart)
      let sum = 0
      let count = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        const iso = d.toISOString().slice(0, 10)
        const value = physicalHealthLogs.daily[iso]?.[metric]
        if (typeof value === 'number' && value > 0) {
          sum += value
          count++
        }
      }
      return {
        date: weekStart,
        label: `Wk ${idx + 1}`,
        value: count > 0 ? sum / count : 0,
        clickDate: weekStart,
      }
    })
  }
  return range.map((iso) => {
    const value = physicalHealthLogs.daily[iso]?.[metric] ?? 0
    const date = new Date(iso)
    return {
      date: iso,
      label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value,
      clickDate: iso,
    }
  })
}

function physicalHealthHitTarget(metric, value) {
  const target = physicalHealthLogs.targets[metric] || 0
  if (target === 0 || value === 0) return false
  if (metric === 'weight') return Math.abs(value - target) <= 1
  return value >= target
}

function openPhysicalHealthDay(isoDate) {
  if (isoDate === todayIsoDate()) {
    physicalHealthEditDate = null
  } else {
    physicalHealthEditDate = isoDate
  }
}
```

- [ ] **Step 6.2:** Add reactive chart-data declarations.

```js
$: physicalHealthCharts = ['protein', 'carbs', 'fats', 'water', 'weight'].map((metric) => {
  const points = physicalHealthChartPoints(metric, physicalHealthScale)
  const target = physicalHealthLogs.targets[metric] || 0
  const maxValue = Math.max(...points.map((p) => p.value), target, 1)
  return {
    metric,
    label: metric === 'weight' ? 'Weight' : metric.charAt(0).toUpperCase() + metric.slice(1),
    unit: metric === 'water' ? 'ml' : metric === 'weight' ? 'kg' : 'g',
    style: metric === 'weight' ? 'line' : 'bar',
    points,
    target,
    maxValue,
  }
})
```

- [ ] **Step 6.3:** Add chart markup inside the page section (after the form).

```svelte
<div class="physical-health-charts">
  {#each physicalHealthCharts as chart (chart.metric)}
    <article class="physical-health-chart-card">
      <header class="physical-health-chart-head">
        <h3>{chart.label}</h3>
        <span>Target: {chart.target}{chart.unit}</span>
      </header>
      <div class="physical-health-chart-body">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" class="physical-health-chart-svg" aria-hidden="true">
          {#if chart.target > 0}
            {@const targetY = 50 - (chart.target / chart.maxValue) * 46 - 2}
            <line
              class="physical-health-chart-target"
              x1="0"
              x2="100"
              y1={targetY}
              y2={targetY}
            ></line>
          {/if}
          {#if chart.style === 'line' && chart.points.length > 1}
            {@const linePath = chart.points
              .map((p, i) => {
                const x = (i / Math.max(chart.points.length - 1, 1)) * 100
                const y = p.value === 0 ? 50 : 50 - (p.value / chart.maxValue) * 46 - 2
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
              })
              .join(' ')}
            <path class="physical-health-chart-line" d={linePath}></path>
          {/if}
        </svg>
        <div class="physical-health-chart-bars">
          {#each chart.points as point, i}
            {@const heightPercent = point.value === 0 ? 0 : (point.value / chart.maxValue) * 92}
            {@const left = (i / Math.max(chart.points.length, 1)) * 100}
            {@const width = (1 / Math.max(chart.points.length, 1)) * 100}
            <button
              class="physical-health-chart-point"
              class:is-line={chart.style === 'line'}
              class:is-hit={physicalHealthHitTarget(chart.metric, point.value)}
              class:is-zero={point.value === 0}
              type="button"
              style={`left:${left}%; width:${width}%; height:${heightPercent}%`}
              aria-label={`${chart.label} ${point.label} ${Math.round(point.value)}${chart.unit}`}
              on:click={() => openPhysicalHealthDay(point.clickDate)}
            ></button>
          {/each}
        </div>
      </div>
      <footer class="physical-health-chart-footer">
        <span>{chart.points[0]?.label ?? ''}</span>
        <span>{chart.points[chart.points.length - 1]?.label ?? ''}</span>
      </footer>
    </article>
  {/each}
</div>
```

- [ ] **Step 6.4:** Add chart CSS.

```css
.physical-health-charts {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.physical-health-chart-card {
  padding: 14px 18px 12px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(248, 250, 252, 0.66));
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.physical-health-chart-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.physical-health-chart-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.physical-health-chart-head span {
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.55);
  font-variant-numeric: tabular-nums;
}

.physical-health-chart-body {
  position: relative;
  height: 130px;
  background: rgba(15, 23, 42, 0.03);
  border-radius: 10px;
  overflow: hidden;
}

.physical-health-chart-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.physical-health-chart-target {
  stroke: rgba(15, 23, 42, 0.45);
  stroke-width: 0.4;
  stroke-dasharray: 1.5 1.5;
  vector-effect: non-scaling-stroke;
}

.physical-health-chart-line {
  fill: none;
  stroke: #6366f1;
  stroke-width: 0.9;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.physical-health-chart-bars {
  position: absolute;
  inset: 0;
}

.physical-health-chart-point {
  position: absolute;
  bottom: 0;
  appearance: none;
  border: none;
  cursor: pointer;
  background: rgba(99, 102, 241, 0.55);
  border-radius: 4px 4px 0 0;
  margin: 0 1px;
  transition: background 0.15s ease;
}

.physical-health-chart-point:hover {
  background: rgba(99, 102, 241, 0.85);
}

.physical-health-chart-point.is-hit {
  background: rgba(16, 185, 129, 0.7);
}

.physical-health-chart-point.is-hit:hover {
  background: rgba(16, 185, 129, 0.95);
}

.physical-health-chart-point.is-zero {
  background: rgba(15, 23, 42, 0.12);
  height: 4px !important;
}

.physical-health-chart-point.is-line {
  background: rgba(99, 102, 241, 0.85);
  width: 8px !important;
  height: 8px !important;
  border-radius: 50%;
  transform: translate(-50%, 50%);
}

.physical-health-chart-point.is-line.is-hit {
  background: rgba(16, 185, 129, 0.95);
}

.physical-health-chart-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.5);
}
```

- [ ] **Step 6.5:** Verify in browser. Open Physical Health page. Expected:
  - Five chart cards stacked: Protein, Carbs, Fats, Water, Weight
  - Each card has title + target on right ("Target: 150g" etc.)
  - Today's bar should reflect the values entered in Task 5
  - Switch to Week scale → 7 bars per chart
  - Switch to Year scale → 52 bars per chart, mostly zero (dim greys)
  - Bars colored green when at-or-above target, indigo otherwise, dim grey if no data
  - Click any non-zero bar → form switches to that day; bar/point colors and form fields update
  - Click "Back to today" → form returns to today
  - Reload preserves the scale choice (since `physicalHealthScale` doesn't currently persist — this is acceptable; spec doesn't require it)

---

## Task 7: Self-review verification pass

**Files:**
- (no edits — manual verification only)

- [ ] **Step 7.1:** Spec coverage check. Open the spec ([2026-05-06-physical-health-page-design.md](../specs/2026-05-06-physical-health-page-design.md)) and walk every section against the implemented app:
  - Navigation — Open Physical Health button on dashboard; Back returns; URL state persists across reload (via `restoredUiState.page === 'physical-health'`).
  - Data model — `localStorage.getItem('finance-health-physical-logs-v1')` shows `{ targets, daily }`; targets seeded from `data.private.js`.
  - Inline form auto-saves on blur (no save button).
  - Chart styles: bars for protein/carbs/fats/water; line for weight.
  - Target line drawn dashed; hit/miss coloring works.
  - Scale toggle changes all charts simultaneously.
  - Year scale uses weekly average.
  - Click historical bar → form switches to that day.
  - Meal notes: timestamped, +Add, ×Delete, persist.

- [ ] **Step 7.2:** Routine panel check. Confirm:
  - Routine panel still renders on dashboard
  - Water Intake row is gone
  - Other routine rows (Sleep, Wake Up, Sleep, Meal 1/2/3, Snack) work as before

- [ ] **Step 7.3:** Data sanity check. In DevTools:
  - `localStorage.removeItem('finance-health-water-logs-v1')` — clean up abandoned water key.
  - `localStorage.removeItem('finance-health-gym-logs-v1')` — clean up abandoned gym key.
  - Reload — app should still work, no errors.

- [ ] **Step 7.4:** Console error sweep. Open DevTools Console with the app running. Click Open Physical Health, change scale, edit form fields, click bars, click Back. Expected: zero errors logged.

---

## Out of scope (per spec)

- Per-meal macro breakdown
- Food database / auto-calculation from foods
- Imports from MyFitnessPal/Apple Health
- Multiple weigh-ins per day
- Editing aggregated weekly bars (year-scale click jumps to the Monday of that week)
- Migrating old `waterSeedLogs` data
