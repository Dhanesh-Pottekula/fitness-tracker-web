# Meal cart + calorie tracking — design

## Goal

Replace the text-only meal log on the Physical Health page with a per-meal cart of food items. Each item references a food in a built-in database (with macros per 100g) and stores a gram amount. The day's calories, protein, carbs, and fats are auto-computed from all items. Calories become a first-class tracked metric alongside the existing protein/carbs/fats/water/weight.

## Non-goals

- Recipe nesting (a food made up of other foods).
- Per-meal macro targets.
- Cloud sync of food DB.
- Barcode scanning, photo recognition, or external nutrition APIs.

## Data model

### `targets`

Add `calories: 2200` to `physicalHealth.targets`. Final shape:

```js
targets: { calories: 2200, protein: 150, carbs: 250, fats: 70, water: 3000, weight: 70 }
```

### `foods` (new)

A flat array on `physicalHealth.foods`. Built-in items are seeded in `data.private.js`. User-added custom items are appended to the same in-memory array. See **Persistence** below for how custom foods become durable — the browser cannot write to `data.private.js` directly, so the design uses localStorage for runtime persistence and a "copy snippet" affordance for promoting a custom food into the file.

```js
foods: [
  { id: 'egg',             name: 'Egg (whole)',       kcal: 155, protein: 13,   carbs:  1.1, fats: 11   },
  { id: 'idli',            name: 'Idli',              kcal:  39, protein:  2,   carbs:  8,   fats:  0.2 },
  { id: 'dosa-plain',      name: 'Dosa (plain)',      kcal: 168, protein:  4,   carbs: 29,   fats:  5   },
  { id: 'coconut-chutney', name: 'Coconut chutney',   kcal: 200, protein:  2,   carbs:  6,   fats: 19   },
  { id: 'sambar',          name: 'Sambar',            kcal:  57, protein:  3,   carbs:  8,   fats:  1.5 },
  { id: 'milk-whole',      name: 'Milk (whole)',      kcal:  61, protein:  3.2, carbs:  4.8, fats:  3.3 },
  { id: 'milk-toned',      name: 'Milk (toned)',      kcal:  50, protein:  3,   carbs:  5,   fats:  1.5 },
  { id: 'curd-whole',      name: 'Curd (whole)',      kcal:  60, protein:  3,   carbs:  5,   fats:  3   },
  { id: 'chicken-cooked',  name: 'Chicken (cooked)',  kcal: 165, protein: 31,   carbs:  0,   fats:  3.6 },
  { id: 'chicken-curry',   name: 'Chicken curry',     kcal: 200, protein: 20,   carbs:  4,   fats: 12   },
  { id: 'roti',            name: 'Roti / Chapati',    kcal: 310, protein: 11,   carbs: 56,   fats:  4   },
  { id: 'rice-cooked',     name: 'Rice (cooked)',     kcal: 130, protein:  2.7, carbs: 28,   fats:  0.3 },
  { id: 'carrot',          name: 'Carrot',            kcal:  41, protein:  0.9, carbs: 10,   fats:  0.2 },
  { id: 'cucumber',        name: 'Cucumber',          kcal:  16, protein:  0.7, carbs:  4,   fats:  0.1 },
  { id: 'banana',          name: 'Banana',            kcal:  89, protein:  1.1, carbs: 23,   fats:  0.3 },
  { id: 'apple',           name: 'Apple',             kcal:  52, protein:  0.3, carbs: 14,   fats:  0.2 },
  { id: 'peanut',          name: 'Peanut',            kcal: 567, protein: 26,   carbs: 16,   fats: 49   },
  { id: 'oats-dry',        name: 'Oats (dry)',        kcal: 389, protein: 17,   carbs: 66,   fats:  7   },
  { id: 'paneer',          name: 'Paneer',            kcal: 265, protein: 18,   carbs:  1.2, fats: 21   },
  { id: 'almond',          name: 'Almond',            kcal: 579, protein: 21,   carbs: 22,   fats: 50   },
]
```

All macro values are per 100g (or per 100ml for liquids — same number). The `kcal` field is the source of truth for calories of that food; we do not derive kcal from P/C/F (4/4/9 rule) because real-world values differ.

### `daily[date]`

```js
'2026-05-07': {
  water: 0,                         // ml, manual
  weight: 0,                        // kg, manual
  meals: [
    {
      time: '08:00',
      label: 'Breakfast',           // optional free text — defaults to a meal name based on time
      items: [
        { foodId: 'egg',         grams: 350 },
        { foodId: 'idli',        grams: 150 },
        { foodId: 'sambar',      grams: 150 },
        { foodId: 'coconut-chutney', grams: 50 },
        { foodId: 'milk-whole',  grams: 250 },
      ],
    },
  ],
}
```

The previous numeric fields `protein`, `carbs`, `fats` on a daily entry are **removed**. They are now derived. `water` and `weight` remain.

### Migration

The existing seed in `data.private.js` for `'2026-05-06'` and `'2026-05-07'` (text-only meals from earlier in this conversation) must be rewritten in the new shape. Day totals are derived from items, so they will be **approximate** — within ~10–15% of the user's eyeballed numbers (cal 2300 / P 160 / C 162 / F 100). Exact match is not achievable with whole-food items because real-world macros vary by prep (oil used, raw vs cooked weight, cut, etc.).

Yesterday's items (best-fit estimate):

| Meal | Item | Grams |
|---|---|---|
| 08:00 Breakfast | egg | 350 |
| | dosa-plain | 80 |
| | coconut-chutney | 50 |
| | milk-whole | 250 |
| 13:00 Lunch | chicken-curry | 250 |
| | curd-whole | 250 |
| | roti | 70 |
| | carrot | 50 |
| | cucumber | 50 |
| 17:00 Snack | milk-whole | 250 |
| 21:00 Dinner | chicken-curry | 250 |
| | roti | 70 |

These grams compute to roughly 2700 cal / 190 P / 170 C / 140 F. Higher than user-reported because chicken-curry is calorie-dense (oil) and 7 eggs is a lot of fat. If the user wants tighter match, they'll edit grams in the UI after launch.

Today (2026-05-07):

| Meal | Item | Grams |
|---|---|---|
| 08:00 Breakfast | egg | 350 |
| | idli | 150 |
| | sambar | 150 |
| | coconut-chutney | 50 |
| | milk-whole | 250 |

## Derivations

```js
const itemMacros = (item, foodsById) => {
  const food = foodsById[item.foodId]
  if (!food) return { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  const factor = item.grams / 100
  return {
    kcal:    food.kcal    * factor,
    protein: food.protein * factor,
    carbs:   food.carbs   * factor,
    fats:    food.fats    * factor,
  }
}

const dayMacros = (entry, foodsById) =>
  entry.meals
    .flatMap((m) => m.items)
    .reduce(
      (acc, item) => {
        const m = itemMacros(item, foodsById)
        return {
          kcal:    acc.kcal    + m.kcal,
          protein: acc.protein + m.protein,
          carbs:   acc.carbs   + m.carbs,
          fats:    acc.fats    + m.fats,
        }
      },
      { kcal: 0, protein: 0, carbs: 0, fats: 0 },
    )
```

Display rounds to whole numbers.

## UI

### Day view (replaces existing macros + meals sections)

```
─── 7 May 2026 ────────────────────────────
  Cal   2300 / 2200    P  160 / 150
  C      162 / 250     F  100 /  70
  Water  [    0 ] / 3000 ml
  Weight [    0 ] / 70  kg

  Meals
  ┌─────────────────────────────────────┐
  │ 08:00  Breakfast              [✕]   │
  │   • Egg (whole)        350 g        │
  │   • Idli               150 g        │
  │   • Sambar             150 g        │
  │   • Coconut chutney     50 g        │
  │   • Milk (whole)       250 ml       │
  │   [ + Add items to this meal ]      │
  └─────────────────────────────────────┘

  [ + Add meal ]
```

Macro cards become read-only stat tiles (no inputs). Water and weight remain editable number inputs.

A click on an item row opens an inline editor for grams (no modal — quick edit). A click on `[✕]` removes the meal after confirm.

### "+ Add meal" flow

1. Append a new meal to the day's `meals` array with: `time = current HH:mm`, `label = ''`, `items = []`.
2. Auto-open the picker modal scoped to that new meal.

### "+ Add items to this meal" flow

Same: open the picker modal scoped to that meal.

### Picker modal

```
╔═══ Add items ═══════════════════════╗
║  Search [ chick______________ ]     ║
║                                     ║
║  ▸ Chicken (cooked)   165 kcal/100g ║
║      grams [ 100 ]   [ Add ]        ║
║  ▸ Chicken curry      200 kcal/100g ║
║      grams [ 100 ]   [ Add ]        ║
║  ─────────────────────────────────  ║
║  In this meal:                      ║
║   • Chicken (cooked) 250g    [✕]    ║
║   • Curd (whole)     250 ml  [✕]    ║
║   • Roti / Chapati    70g    [✕]    ║
║                                     ║
║  [ + Add custom food ]              ║
║  [ Done ]                           ║
╚═════════════════════════════════════╝
```

Behavior:

- Search filters `foods` by case-insensitive substring on `name`.
- Default grams in each result row is `100`. User edits it before tapping **Add**.
- Tapping **Add** appends `{ foodId, grams }` to the meal's `items` and clears the search.
- "In this meal" list shows what's already in the cart; `[✕]` removes that item.
- **Done** closes the modal.

### Custom food form (inside picker)

Tapping `[ + Add custom food ]` reveals an inline form:

```
  Add custom food
   Name      [ ____________________ ]
   per 100g  kcal [__]  P [__]  C [__]  F [__]
   [ Cancel ]   [ Save & add to meal ]
```

On save:

- Generate `id` from a slugified `name` (e.g., `"Brown Bread"` → `brown-bread`). If collision, append `-2`, `-3`, etc.
- Append the new food to `physicalHealth.foods` (in-memory).
- Persist via localStorage (see Persistence). For durability across browser-data wipes, a small "Copy as JSON for `data.private.js`" link on the food's row in the picker reveals the snippet to paste.
- Add the food to the current meal at 100g (default).

### Charts

Add a new **Calories** chart card to the existing chart section, rendered the same way as protein/carbs/fats (bar chart, target line, hit-target highlight). Order: Calories → Protein → Carbs → Fats → Water → Weight. The protein/carbs/fats chart values now come from the derived day totals, not the (removed) numeric fields.

## Persistence

Existing pattern: `physicalHealthLogs` is bootstrapped from `data.private.js`, then localStorage overrides per the merge in [App.svelte:865-879](../../../src/App.svelte#L865-L879). On every state change, the whole object is written to localStorage.

Changes:

- `foods` is included in `physicalHealthLogs` and persisted to localStorage the same way as `daily` and `targets`.
- Bootstrap merge for `foods`: union by `id`, with file values winning on conflict. This way, edits to the file's seed take effect on next reload, and runtime-added custom foods stay around.
- Bootstrap merge for `daily`: file dates win on conflict (the existing fix from this conversation).
- Bootstrap merge for `targets`: file values win.
- Legacy daily entries in localStorage (old shape with `protein/carbs/fats` and `meals: [{ time, text }]`) are migrated on load: numeric fields are dropped, text meals are converted to `{ time, label: text, items: [] }`. No data loss; just no auto-derived macros for those days until items are added.

### Custom-food durability

The browser cannot write to `data.private.js` directly (Vite dev server is read-only). Two-tier model:

1. **Runtime**: custom foods saved to localStorage. Available immediately, survives reloads on the same browser.
2. **Durable**: a "Copy snippet" affordance on each user-added food in the picker reveals a JSON line ready to paste into `data.private.js`'s `foods` array. User pastes manually (or asks Claude). Once in the file, the localStorage entry becomes redundant and is deduped on next load.

This avoids adding a write API to the dev server while still letting users add foods on the fly.

## Components / structure

The Physical Health section in `App.svelte` is already large. Extracting Svelte components is the right move:

- `PhysicalHealthDay.svelte` — macro tiles + meals list + water/weight inputs for one day.
- `MealRow.svelte` — one meal: time, label, item list, "+ Add items".
- `FoodPicker.svelte` — the modal: search, results, in-this-meal list, custom-food form.

State helpers (food lookup map, day-macro derivation, slugify) move to a new `src/physical-health.js` module.

The data merge logic in `bootstrapPhysicalHealthLogs` and the `onMount` handler stay in `App.svelte` for now (they coordinate with monthly spends and UI state).

## Targets section

The targets in `data.private.js` need the new `calories: 2200` key added. No UI to edit targets is part of this work — they remain edited via file. (Existing targets aren't editable in the UI either.)

## Out of scope (explicitly)

- A "delete custom food" UI. (Add via UI, remove via file edit.)
- Searching by food group, sort by anything other than alphabetical.
- Showing macro totals per meal (only per day).
- Editing the food DB's seed values via UI.
- Importing nutrition data from external sources.

## Open questions

None remaining — all clarifying questions have been answered.
