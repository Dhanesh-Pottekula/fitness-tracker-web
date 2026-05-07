export function slugify(input) {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function itemMacros(item, foodsById) {
  const food = foodsById[item.foodId]
  const grams = Number(item.grams)
  if (!food || !Number.isFinite(grams) || grams <= 0) {
    return { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  }
  const factor = grams / 100
  return {
    kcal: food.kcal * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fats: food.fats * factor,
  }
}

export function dayMacros(entry, foodsById) {
  const empty = { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  if (!entry || !Array.isArray(entry.meals)) return empty
  return entry.meals.reduce((acc, meal) => {
    if (!Array.isArray(meal.items)) return acc
    return meal.items.reduce((inner, item) => {
      const m = itemMacros(item, foodsById)
      return {
        kcal: inner.kcal + m.kcal,
        protein: inner.protein + m.protein,
        carbs: inner.carbs + m.carbs,
        fats: inner.fats + m.fats,
      }
    }, acc)
  }, empty)
}

export function migrateDailyEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return { water: 0, weight: 0, meals: [] }
  }
  const meals = Array.isArray(entry.meals)
    ? entry.meals.map((meal) => {
        if (Array.isArray(meal.items)) {
          return {
            time: meal.time ?? '00:00',
            label: meal.label ?? '',
            items: meal.items,
          }
        }
        return {
          time: meal.time ?? '00:00',
          label: meal.text ?? meal.label ?? '',
          items: [],
        }
      })
    : []
  return {
    water: Number(entry.water) || 0,
    weight: Number(entry.weight) || 0,
    meals,
  }
}

export function findFoodById(foods, id) {
  if (!Array.isArray(foods)) return undefined
  return foods.find((f) => f.id === id)
}

export function mergeFoods(base, overrides) {
  const map = new Map()
  for (const food of base ?? []) map.set(food.id, food)
  for (const food of overrides ?? []) map.set(food.id, food)
  return Array.from(map.values())
}
