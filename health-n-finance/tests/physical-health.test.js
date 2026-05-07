import { describe, it, expect } from 'vitest'
import { slugify } from '../src/physical-health.js'

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Brown Bread')).toBe('brown-bread')
  })

  it('strips punctuation', () => {
    expect(slugify('Milk (whole)')).toBe('milk-whole')
  })

  it('collapses repeated separators', () => {
    expect(slugify('Egg   --  whole')).toBe('egg-whole')
  })

  it('trims leading/trailing separators', () => {
    expect(slugify('  Idli  ')).toBe('idli')
  })

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })
})

import { itemMacros } from '../src/physical-health.js'

describe('itemMacros', () => {
  const foodsById = {
    egg: { id: 'egg', name: 'Egg', kcal: 155, protein: 13, carbs: 1.1, fats: 11 },
  }

  it('scales macros by grams / 100', () => {
    expect(itemMacros({ foodId: 'egg', grams: 350 }, foodsById)).toEqual({
      kcal: 155 * 3.5,
      protein: 13 * 3.5,
      carbs: 1.1 * 3.5,
      fats: 11 * 3.5,
    })
  })

  it('returns zeros when food is missing', () => {
    expect(itemMacros({ foodId: 'unknown', grams: 100 }, foodsById)).toEqual({
      kcal: 0, protein: 0, carbs: 0, fats: 0,
    })
  })

  it('returns zeros when grams is non-positive', () => {
    expect(itemMacros({ foodId: 'egg', grams: 0 }, foodsById)).toEqual({
      kcal: 0, protein: 0, carbs: 0, fats: 0,
    })
  })
})

import { dayMacros } from '../src/physical-health.js'

describe('dayMacros', () => {
  const foodsById = {
    egg: { id: 'egg', name: 'Egg', kcal: 155, protein: 13, carbs: 1.1, fats: 11 },
    milk: { id: 'milk', name: 'Milk', kcal: 60, protein: 3, carbs: 5, fats: 3 },
  }

  it('sums macros across all meals and items', () => {
    const entry = {
      water: 0,
      weight: 0,
      meals: [
        { time: '08:00', label: 'B', items: [
          { foodId: 'egg', grams: 100 },
          { foodId: 'milk', grams: 200 },
        ]},
        { time: '13:00', label: 'L', items: [{ foodId: 'milk', grams: 100 }] },
      ],
    }
    expect(dayMacros(entry, foodsById)).toEqual({
      kcal: 155 + 60 * 2 + 60,
      protein: 13 + 3 * 2 + 3,
      carbs: 1.1 + 5 * 2 + 5,
      fats: 11 + 3 * 2 + 3,
    })
  })

  it('returns zeros for empty meals', () => {
    expect(dayMacros({ water: 0, weight: 0, meals: [] }, foodsById)).toEqual({
      kcal: 0, protein: 0, carbs: 0, fats: 0,
    })
  })

  it('handles undefined entry gracefully', () => {
    expect(dayMacros(undefined, foodsById)).toEqual({
      kcal: 0, protein: 0, carbs: 0, fats: 0,
    })
  })
})

import { migrateDailyEntry } from '../src/physical-health.js'

describe('migrateDailyEntry', () => {
  it('converts legacy text meals to label/items shape', () => {
    const legacy = {
      protein: 100, carbs: 200, fats: 50, water: 1500, weight: 70,
      meals: [{ time: '08:00', text: 'Breakfast — eggs and toast' }],
    }
    expect(migrateDailyEntry(legacy)).toEqual({
      water: 1500,
      weight: 70,
      meals: [{ time: '08:00', label: 'Breakfast — eggs and toast', items: [] }],
    })
  })

  it('passes new-shape entries through', () => {
    const next = {
      water: 0, weight: 0,
      meals: [{ time: '08:00', label: 'B', items: [{ foodId: 'egg', grams: 100 }] }],
    }
    expect(migrateDailyEntry(next)).toEqual(next)
  })

  it('returns empty entry for null/undefined', () => {
    expect(migrateDailyEntry(null)).toEqual({ water: 0, weight: 0, meals: [] })
    expect(migrateDailyEntry(undefined)).toEqual({ water: 0, weight: 0, meals: [] })
  })

  it('handles partial entries (missing fields)', () => {
    expect(migrateDailyEntry({})).toEqual({ water: 0, weight: 0, meals: [] })
    expect(migrateDailyEntry({ meals: [] })).toEqual({ water: 0, weight: 0, meals: [] })
  })
})

import { findFoodById, mergeFoods } from '../src/physical-health.js'

describe('findFoodById', () => {
  const foods = [
    { id: 'egg', name: 'Egg', kcal: 155, protein: 13, carbs: 1.1, fats: 11 },
    { id: 'milk', name: 'Milk', kcal: 60, protein: 3, carbs: 5, fats: 3 },
  ]

  it('returns the food when id matches', () => {
    expect(findFoodById(foods, 'egg').name).toBe('Egg')
  })

  it('returns undefined when id is missing', () => {
    expect(findFoodById(foods, 'pizza')).toBeUndefined()
  })
})

describe('mergeFoods', () => {
  const a = [{ id: 'egg', name: 'Egg', kcal: 155, protein: 13, carbs: 1.1, fats: 11 }]
  const b = [
    { id: 'egg', name: 'Egg (fixed)', kcal: 160, protein: 13, carbs: 1.1, fats: 11 },
    { id: 'milk', name: 'Milk', kcal: 60, protein: 3, carbs: 5, fats: 3 },
  ]

  it('unions by id with second arg winning on conflict', () => {
    const merged = mergeFoods(a, b)
    expect(merged.find((f) => f.id === 'egg').kcal).toBe(160)
    expect(merged.find((f) => f.id === 'milk')).toBeTruthy()
    expect(merged).toHaveLength(2)
  })

  it('handles empty inputs', () => {
    expect(mergeFoods([], [])).toEqual([])
    expect(mergeFoods(undefined, b)).toHaveLength(2)
    expect(mergeFoods(a, undefined)).toEqual(a)
  })
})
