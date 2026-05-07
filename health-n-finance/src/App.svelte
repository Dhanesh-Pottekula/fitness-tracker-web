<script>
  import { onMount, tick } from 'svelte'
  import appData from './app-data.js'
  import { dayMacros, migrateDailyEntry, mergeFoods, slugify } from './physical-health.js'

  const monthlySpendStorageKey = 'finance-health-monthly-spends-v1'
  const physicalHealthStorageKey = 'finance-health-physical-logs-v1'
  const uiStateStorageKey = 'finance-health-ui-state-v1'
  const repoRatePercent = 5.25

  const formatCurrencyWithPaisa = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)

  const getDailyInterestAtRepoRate = (amount) => (Number(amount) * (repoRatePercent / 100)) / 365

  const getBankLogo = (bank) => {
    if (bank === 'Kotak') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <title>Kotak-bank SVG Icon</title>
          <ellipse cx="24" cy="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" rx="20.5" ry="17"></ellipse>
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M24 36.065v-24.13M24 24c-4.093 4.925-5.447 6.551-9.7 6.551c-3.264 0-5.945-2.904-5.945-6.551c0-4.013 1.682-6.794 5.888-6.794c2.748 0 3.73.196 6.309 2.916M24 24c4.093-4.925 6.056-6.794 9.7-6.794c3.264 0 5.945 3.147 5.945 6.794c0 4.013-1.682 6.916-5.888 6.916c-2.664 0-4.2-.506-6.645-3.252"></path>
        </svg>
      `
    }

    if (bank === 'SBI') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <title>Yono-sbi SVG Icon</title>
          <circle cx="24" cy="24" r="21.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></circle>
          <circle cx="24" cy="24" r="5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></circle>
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M24 29v16.5"></path>
        </svg>
      `
    }

    if (bank === 'Slice') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <title>Slice SVG Icon</title>
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M24 30.5a13 13 0 1 0-13-13h13Zm0 13a13 13 0 0 1-13-13h13Z"></path>
        </svg>
      `
    }

    if (bank === 'Cash in Hand') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <title>Air-wallet SVG Icon</title>
          <rect
            width="37"
            height="37"
            x="5.5"
            y="5.5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            rx="5.5"
            ry="5.5"
          ></rect>
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M42.5 22c0-3.047-2.453-5.5-5.5-5.5H11A5.49 5.49 0 0 1 5.5 11"
          ></path>
          <circle
            cx="35"
            cy="29.5"
            r="3"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></circle>
        </svg>
      `
    }

    if (bank === 'Uber') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <title>Uber-driver SVG Icon</title>
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M38.5 42.5h-29a4 4 0 0 1-4-4v-29a4 4 0 0 1 4-4h29a4 4 0 0 1 4 4v29a4 4 0 0 1-4 4"></path>
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M35.786 18.956A2.726 2.726 0 0 1 38.5 16.23m-2.714 0v7.204m-3.179-1.369a2.73 2.73 0 0 1-2.32 1.369a2.714 2.714 0 0 1-2.807-2.715v-1.763a2.726 2.726 0 0 1 2.714-2.726c1.5 0 2.715 1.215 2.715 2.715v.893H27.48M9.5 12.565v7.273a3.608 3.608 0 0 0 7.204 0v-7.273m2.796 6.391a2.726 2.726 0 0 1 2.714-2.726a2.726 2.726 0 0 1 2.714 2.726v1.763c0 1.5-1.215 2.715-2.714 2.715h0a2.714 2.714 0 0 1-2.715-2.715h0m0 2.715V12.565M5.5 33.009h17.44l-4.031-4.031m4.031 4.031l-4.031 4.031"></path>
        </svg>
      `
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <title>Hdfc-bank SVG Icon</title>
        <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M30 18H18v12h12Zm12.5 3V7.5a2 2 0 0 0-2-2H27m-6 0H7.5a2 2 0 0 0-2 2V21m0 6v13.5a2 2 0 0 0 2 2H21m6 0h13.5a2 2 0 0 0 2-2V27"></path>
      </svg>
    `
  }

  const ribbons = appData.ribbons.map((ribbon) => ({
    ...ribbon,
    logo: getBankLogo(ribbon.bank),
  }))

  const totalAmountNumber = ribbons.reduce((sum, ribbon) => sum + Number(ribbon.amount), 0)
  const totalAmount = totalAmountNumber.toFixed(2)
  const displayRibbons = [...ribbons]
    .map((ribbon) =>
      ribbon.bank === 'Slice'
        ? {
            ...ribbon,
            detail: `${formatCurrencyWithPaisa(getDailyInterestAtRepoRate(ribbon.amount))}/day at ${repoRatePercent}% repo`,
          }
        : ribbon
    )
    .sort((left, right) => Number(right.amount) - Number(left.amount))
  const creditCards = appData.creditCards
  const loanTrackerItems = appData.loanTrackerItems
  const peopleToGiveMoney = appData.peopleToGiveMoney

  const peopleToGiveMoneyTotal = peopleToGiveMoney.reduce((sum, person) => sum + person.amount, 0)
  const peopleToGiveMoneySorted = [...peopleToGiveMoney].sort((left, right) => right.amount - left.amount)

  function monthKeyFromDate(date = new Date()) {
    const normalizedDate = new Date(date)
    normalizedDate.setMinutes(normalizedDate.getMinutes() - normalizedDate.getTimezoneOffset())
    return normalizedDate.toISOString().slice(0, 7)
  }

  function previousMonthKey(monthKey) {
    const [year, month] = monthKey.split('-').map(Number)
    const date = new Date(year, month - 2, 1)
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
  }

  function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-').map(Number)
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, 1)
    )
  }

  const monthShortLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const spendMonthTimeline = [
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
  ]

  function normalizeSpendName(value = '') {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
  }

  function createSpendId() {
    return `spend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function getSpendGraphTop(amount, maxAmount) {
    if (!maxAmount) return 50
    const ratio = Math.min(Math.max(amount / maxAmount, 0), 1)
    return 82 - ratio * 58
  }

  function getCompressedSpendGraphTop(amount, maxAmount) {
    if (!maxAmount) return 50
    const safeAmount = Math.max(amount, 0)
    const compressedMax = Math.log1p(Math.max(maxAmount, 1))
    const compressedValue = Math.log1p(safeAmount)
    const ratio = compressedMax > 0 ? Math.min(Math.max(compressedValue / compressedMax, 0), 1) : 0
    return 82 - ratio * 58
  }

  function getSpendGraphLeft(index, total) {
    return total <= 1 ? 50 : (index / Math.max(total - 1, 1)) * 100
  }

  function buildSpendGraphPoints(entries, maxAmount) {
    return entries.map((entry, index) => ({
      ...entry,
      left: getSpendGraphLeft(index, entries.length),
      top: getSpendGraphTop(entry.amount, maxAmount),
    }))
  }

  function buildMoneyMovementGraphPoints(entries, type, maxAmount, options = {}) {
    const topGetter = options.scale === 'compressed' ? getCompressedSpendGraphTop : getSpendGraphTop
    const matchingEntries = entries.filter((entry) => {
      const amount = getSpendDisplayAmount(entry)
      return type === 'came' ? amount > 0 : amount < 0
    })

    return matchingEntries.map((entry, index) => ({
      ...entry,
      amount: Math.abs(getSpendDisplayAmount(entry)),
      left: getSpendGraphLeft(index, matchingEntries.length),
      top: topGetter(Math.abs(getSpendDisplayAmount(entry)), maxAmount),
    }))
  }

  function buildMovementSeriesPoints(entries, type, maxAmount) {
    return entries.map((entry, index) => {
      const seriesAmount = type === 'earned' ? (entry.isCredit ? entry.amount : 0) : (!entry.isCredit ? entry.amount : 0)

      return {
        ...entry,
        seriesAmount,
        left: getSpendGraphLeft(index, entries.length),
        top: getSpendGraphTop(seriesAmount, maxAmount),
      }
    })
  }

  function getFullSpendGraphXAxisLabels(points = []) {
    return points.map((point) => {
      const transaction = point.details?.transaction
      const parsedDate = transaction?.date ? new Date(transaction.date) : null
      const dateLabel =
        parsedDate && Number.isFinite(parsedDate.getTime())
          ? parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : transaction?.date ?? ''

      return {
        id: `${point.id}-x-axis`,
        left: point.left,
        date: dateLabel,
        time: transaction?.time ?? '',
      }
    })
  }

  function buildSpendingGraphPoints(entries, maxAmount) {
    return buildMoneyMovementGraphPoints(entries, 'spent', maxAmount)
  }

  function getSpendGraphXAxisLabels(points = [], maxLabels = 5) {
    if (points.length === 0) return []

    const labelIndexes =
      points.length <= maxLabels
        ? points.map((_, index) => index)
        : Array.from({ length: maxLabels }, (_, index) => Math.round((index / (maxLabels - 1)) * (points.length - 1)))

    return [...new Set(labelIndexes)].map((index) => {
      const point = points[index]
      const transaction = point.details?.transaction
      const parsedDate = transaction?.date ? new Date(transaction.date) : null
      const dateLabel =
        parsedDate && Number.isFinite(parsedDate.getTime())
          ? parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : transaction?.date ?? ''

      return {
        id: `${point.id}-x-axis`,
        left: point.left,
        date: dateLabel,
        time: transaction?.time ?? '',
      }
    })
  }

  function formatTransactionShortDate(value) {
    const parsedDate = value ? new Date(value) : null
    if (!parsedDate || !Number.isFinite(parsedDate.getTime())) return value ?? ''

    return parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  function getLinearGraphPath(points) {
    if (points.length === 0) return ''
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.left} ${point.top}`).join(' ')
  }

  function getStackedAreaBandPath(upperPoints, lowerPoints) {
    if (upperPoints.length === 0 || lowerPoints.length === 0) return ''

    const upperPath = getLinearGraphPath(upperPoints)
    const lowerPath = [...lowerPoints]
      .reverse()
      .map((point, index) => `L ${point.left} ${point.top}`)
      .join(' ')

    return `${upperPath} ${lowerPath} Z`
  }

  function buildStackedAreaChart(transactions = [], mode = 'spent') {
    const filteredTransactions = transactions.filter((transaction) =>
      mode === 'earned' ? transaction.amount > 0 : transaction.amount < 0
    )

    const dates = [...new Set(filteredTransactions.map((transaction) => transaction.date))].sort(
      (left, right) => Date.parse(left) - Date.parse(right)
    )

    const categories = summarizeTransactions(filteredTransactions, (transaction) => transaction.category)
    const totalsByDate = new Map(
      dates.map((date) => [
        date,
        filteredTransactions
          .filter((transaction) => transaction.date === date)
          .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0), 0),
      ])
    )
    const maxTotal = getNiceAxisMax(Math.max(...dates.map((date) => totalsByDate.get(date) ?? 0), 1))
    const palette =
      mode === 'earned'
        ? ['#86efac', '#67e8f9', '#a7f3d0', '#93c5fd', '#bef264', '#6ee7b7', '#7dd3fc', '#bbf7d0']
        : ['#93c5fd', '#60a5fa', '#fb923c', '#fcd34d', '#94a3b8', '#fca5a5', '#c4b5fd', '#fdba74']

    const categoryValuesByDate = new Map()
    for (const category of categories) {
      categoryValuesByDate.set(
        category.name,
        dates.map((date) =>
          filteredTransactions
            .filter((transaction) => transaction.date === date && transaction.category === category.name)
            .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0), 0)
        )
      )
    }

    const runningTotals = Array.from({ length: dates.length }, () => 0)
    const series = categories.map((category, index) => {
      const values = categoryValuesByDate.get(category.name) ?? []
      const lowerPoints = values.map((_, pointIndex) => ({
        left: getSpendGraphLeft(pointIndex, dates.length),
        top: getSpendGraphTop(runningTotals[pointIndex], maxTotal),
      }))
      const upperTotals = values.map((value, pointIndex) => runningTotals[pointIndex] + value)
      const upperPoints = upperTotals.map((value, pointIndex) => ({
        left: getSpendGraphLeft(pointIndex, dates.length),
        top: getSpendGraphTop(value, maxTotal),
      }))

      upperTotals.forEach((value, pointIndex) => {
        runningTotals[pointIndex] = value
      })

      return {
        id: `${mode}-${category.name}`,
        name: category.name,
        amount: category.amount,
        color: palette[index % palette.length],
        areaPath: getStackedAreaBandPath(upperPoints, lowerPoints),
        linePath: getLinearGraphPath(upperPoints),
      }
    })

    return {
      dates,
      maxTotal,
      axisLabels: getSpendAxisLabels(maxTotal),
      xAxisLabels: dates.map((date, index) => ({
        id: `${mode}-${date}`,
        left: getSpendGraphLeft(index, dates.length),
        date: formatTransactionShortDate(date),
      })),
      series,
    }
  }

  function getSpendGraphPolyline(points) {
    return points.map((point) => `${point.left},${point.top}`).join(' ')
  }

  function getSmoothSpendGraphLinePath(points) {
    if (points.length === 0) return ''

    const [firstPoint, ...remainingPoints] = points
    let path = `M ${firstPoint.left} ${firstPoint.top}`
    const curveFactor = 0.2

    for (let index = 0; index < remainingPoints.length; index += 1) {
      const previousPoint = points[index]
      const nextPoint = remainingPoints[index]
      const horizontalDistance = nextPoint.left - previousPoint.left
      const controlOffset = horizontalDistance * curveFactor
      path += ` C ${previousPoint.left + controlOffset} ${previousPoint.top}, ${nextPoint.left - controlOffset} ${nextPoint.top}, ${nextPoint.left} ${nextPoint.top}`
    }

    return path
  }

  function getSmoothSpendGraphAreaPath(points) {
    if (points.length === 0) return ''

    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    return `${getSmoothSpendGraphLinePath(points)} L ${lastPoint.left} 92 L ${firstPoint.left} 92 Z`
  }

  function getSpendFlagPlacement(point) {
    return 'is-above'
  }

  function getSpendPointWrapPlacement(point) {
    if (point.left <= 2) return 'is-left-edge'
    if (point.left >= 98) return 'is-right-edge'
    return ''
  }

  function formatAxisCurrency(value) {
    if (value <= 0) return '₹0'

    const compactValue = new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      maximumFractionDigits: value >= 10000 ? 1 : 0,
    }).format(value)

    return `₹${compactValue}`
  }

  function getNiceAxisMax(maxAmount) {
    const safeMaxAmount = Math.max(maxAmount, 1)
    const exponent = Math.floor(Math.log10(safeMaxAmount))
    const magnitude = 10 ** exponent
    const normalized = safeMaxAmount / magnitude
    const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10

    return niceNormalized * magnitude
  }

  function getSpendAxisLabels(maxAmount) {
    const niceMaxAmount = getNiceAxisMax(maxAmount)

    return [1, 0.75, 0.5, 0.25, 0].map((ratio, index) => ({
      top: index * 25,
      label: formatAxisCurrency(niceMaxAmount * ratio),
    }))
  }

  function getCompressedSpendAxisLabels(maxAmount) {
    const niceMaxAmount = getNiceAxisMax(maxAmount)
    const compressedMax = Math.log1p(Math.max(niceMaxAmount, 1))

    return [1, 0.75, 0.5, 0.25, 0].map((ratio, index) => ({
      top: index * 25,
      label: formatAxisCurrency(Math.expm1(compressedMax * ratio)),
    }))
  }

  function getSpendPointSummary(entry) {
    const transaction = entry.details?.transaction

    if (!transaction) {
      return {
        title: entry.name,
        amount: formatCurrency(entry.amount),
        category: entry.recurring ? 'Recurring spending' : 'One-time spending',
        subCategory: '',
        note: '',
      }
    }

    return {
      title: transaction.paymentMethod,
      amount: formatCurrency(transaction.amount),
      category: transaction.category,
      subCategory: transaction.subCategory,
      note: transaction.note === 'None' ? '' : transaction.note,
    }
  }

  function normalizeSpendEntry(rawEntry = {}) {
    const amount = Number(rawEntry.amount)

    return {
      id: rawEntry.id ?? createSpendId(),
      name: normalizeSpendName(rawEntry.name ?? ''),
      amount: Number.isFinite(amount) ? amount : 0,
      recurring: rawEntry.recurring ?? false,
      managed: rawEntry.managed ?? false,
      details: rawEntry.details ?? null,
    }
  }

  function parseTransactionDateTime(entry = {}) {
    const transaction = entry.details?.transaction
    if (!transaction?.date || !transaction?.time) return 0

    const parsedDate = Date.parse(`${transaction.date} ${transaction.time}`)
    return Number.isFinite(parsedDate) ? parsedDate : 0
  }

  function sortSpendEntries(entries = []) {
    return [...entries]
      .map((entry) => normalizeSpendEntry(entry))
      .filter((entry) => entry.name)
      .sort(
        (left, right) =>
          parseTransactionDateTime(left) - parseTransactionDateTime(right) ||
          Number(right.recurring) - Number(left.recurring) ||
          left.name.localeCompare(right.name)
      )
  }

  function getSpendTotalValue(entry) {
    if (entry.details?.transaction) {
      return entry.details.transaction.amount < 0 ? entry.amount : 0
    }

    return entry.amount
  }

  function getSpendDisplayAmount(entry) {
    if (entry.details?.transaction) {
      return entry.details.transaction.amount
    }

    return entry.amount
  }

  function getMoneyMovement(entries = []) {
    return entries.reduce(
      (summary, entry) => {
        const amount = getSpendDisplayAmount(entry)

        if (amount > 0) {
          return { ...summary, came: summary.came + amount }
        }

        return { ...summary, spent: summary.spent + Math.abs(amount) }
      },
      { came: 0, spent: 0 }
    )
  }

  function getPieSlicePath(startAngle, endAngle, radius = 48, center = 50) {
    const startRadians = ((startAngle - 90) * Math.PI) / 180
    const endRadians = ((endAngle - 90) * Math.PI) / 180
    const startX = center + radius * Math.cos(startRadians)
    const startY = center + radius * Math.sin(startRadians)
    const endX = center + radius * Math.cos(endRadians)
    const endY = center + radius * Math.sin(endRadians)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

    return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`
  }

  function summarizeSpendEntries(entries = [], keyGetter) {
    const totals = new Map()

    for (const entry of entries) {
      const key = keyGetter(entry) || 'Other'
      totals.set(key, (totals.get(key) ?? 0) + Math.abs(getSpendDisplayAmount(entry)))
    }

    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name))
  }

  function getTransactionPaymentMode(paymentMethod = '') {
    const normalizedMethod = paymentMethod.toLowerCase()
    if (normalizedMethod.includes('upi')) return 'UPI'
    if (normalizedMethod.includes('card')) return 'Card'
    if (normalizedMethod.includes('cash')) return 'Cash'
    return paymentMethod || 'Other'
  }

  function summarizeTransactions(transactions = [], keyGetter) {
    const totals = new Map()

    for (const transaction of transactions) {
      const key = keyGetter(transaction) || 'Other'
      const current = totals.get(key) ?? { name: key, amount: 0, came: 0, spent: 0 }
      const amount = Number(transaction.amount) || 0

      totals.set(key, {
        ...current,
        amount: current.amount + Math.abs(amount),
        came: current.came + (amount > 0 ? amount : 0),
        spent: current.spent + (amount < 0 ? Math.abs(amount) : 0),
      })
    }

    return [...totals.values()].sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name))
  }

  const transportBarColors = ['#8bb8ff', '#8fd8ca', '#ffd28f', '#c7b7ff', '#ffb3ba', '#a7e5b1', '#f7c6e0', '#b9d8ff']

  function isBikeLoanMovementTransaction(transaction = {}) {
    const normalizedText = `${transaction.subCategory ?? ''} ${transaction.note ?? ''}`.toLowerCase()
    return transaction.category === 'Bike' && normalizedText.includes('loan')
  }

  function isBikePoolingSpendTransaction(transaction = {}) {
    return transaction.category === 'Bike' && transaction.amount < 0 && !isBikeLoanMovementTransaction(transaction)
  }

  function isCashAddedByUberTransaction(transaction = {}) {
    return (transaction.note ?? '').toLowerCase().includes('cash added by uber')
  }

  function isBikePoolingEarnTransaction(transaction = {}) {
    return (
      transaction.category === 'Uber' &&
      transaction.subCategory === 'Bike Pooling' &&
      transaction.amount > 0 &&
      !isCashAddedByUberTransaction(transaction)
    )
  }

  function isBikePoolingMovementTransaction(transaction = {}) {
    return isBikePoolingSpendTransaction(transaction) || isBikePoolingEarnTransaction(transaction)
  }

  function getRideDistanceKm(transaction = {}) {
    const match = (transaction.note ?? '').match(/(\d+(?:\.\d+)?)\s*kms?/i)
    return match ? Number(match[1]) : 0
  }

  function getBikeBarSegmentName(transaction) {
    const normalizedText = `${transaction.subCategory} ${transaction.note}`.toLowerCase()
    if (normalizedText.includes('battery repair')) return 'Repair'
    if (normalizedText.includes('petrol')) return 'Petrol'
    return transaction.subCategory
  }

  function buildStackedTransportSegments(transactions = [], kind) {
    if (kind === 'bike') {
      const totals = new Map()

      for (const transaction of transactions) {
        const isBikeSpend = transaction.category === 'Bike' && transaction.amount < 0
        const isBikeRepair = `${transaction.subCategory} ${transaction.note}`.toLowerCase().includes('bike battery repair')
        const isBikeLoanEmi = `${transaction.subCategory} ${transaction.note}`.toLowerCase().includes('loan')
        if (!isBikeSpend && !isBikeRepair) continue
        if (isBikeLoanEmi) continue

        const name = getBikeBarSegmentName(transaction)
        totals.set(name, {
          name,
          amount: (totals.get(name)?.amount ?? 0) + Math.abs(Number(transaction.amount) || 0),
          note: transaction.note,
        })
      }

      return [...totals.values()]
    }

    return transactions
      .filter((transaction) => transaction.category === 'Uber' && transaction.amount > 0)
      .map((transaction) => ({
        name: transaction.subCategory,
        amount: Number(transaction.amount) || 0,
        note: transaction.note,
        time: transaction.time,
        bank: transaction.bank,
      }))
  }

  function buildPieSlices(items = []) {
    const colors = ['#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316']
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    let startAngle = 0

    return items.map((item, index) => {
      const sweep = total > 0 ? (item.amount / total) * 360 : 0
      const endAngle = items.length === 1 && sweep === 360 ? 359.99 : startAngle + sweep
      const middleAngle = startAngle + sweep / 2
      const middleRadians = ((middleAngle - 90) * Math.PI) / 180
      const slice = {
        ...item,
        color: colors[index % colors.length],
        path: getPieSlicePath(startAngle, endAngle),
        labelX: 50 + 30 * Math.cos(middleRadians),
        labelY: 50 + 30 * Math.sin(middleRadians),
      }
      startAngle += sweep
      return slice
    })
  }

  function mergeSpendEntries(existingEntries = [], incomingEntries = []) {
    const nextEntries = sortSpendEntries(existingEntries)
    const seenNames = new Set(nextEntries.map((entry) => entry.name.toLowerCase()))

    for (const entry of sortSpendEntries(incomingEntries)) {
      const normalizedName = entry.name.toLowerCase()
      if (!seenNames.has(normalizedName)) {
        nextEntries.push({ ...entry, id: createSpendId() })
        seenNames.add(normalizedName)
      }
    }

    return sortSpendEntries(nextEntries)
  }

  const financeTransactions = appData.financeTransactions

  const financeSpendEntries = financeTransactions.map((transaction, index) => ({
    id: `seed-finance-${transaction.date.toLowerCase().replaceAll(' ', '-').replaceAll(',', '')}-${index}`,
    name: `${transaction.time} ${transaction.category} - ${transaction.subCategory} - ${transaction.note}`,
    amount: Math.abs(transaction.amount),
    recurring: false,
    details: {
      date: transaction.date,
      transaction,
    },
  }))

  function getCurrentMonthSeedEntries() {
    return financeSpendEntries
  }

  const currentMonthSeedEntryNames = new Set(getCurrentMonthSeedEntries().map((entry) => normalizeSpendName(entry.name).toLowerCase()))
  const legacyCurrentMonthManagedNames = new Set([
    'lunch - 2 tandoor rotis + pepper chicken dry half',
    'mom phone emi',
    "mom's spend",
    'mom spend',
    'moms spend',
    'finance',
    'rent',
  ])

  function shouldRemoveLegacySpendEntry(entry = {}) {
    const normalizedName = normalizeSpendName(entry.name).toLowerCase()

    return entry.managed || legacyCurrentMonthManagedNames.has(normalizedName)
  }

  function syncCurrentMonthSeedEntries(entries = []) {
    const preservedEntries = entries.filter(
      (entry) => {
        const normalizedName = normalizeSpendName(entry.name).toLowerCase()
        return (
          !shouldRemoveLegacySpendEntry(entry) &&
          !entry.id?.startsWith('seed-finance-') &&
          !currentMonthSeedEntryNames.has(normalizedName) &&
          !legacyCurrentMonthManagedNames.has(normalizedName) &&
          !normalizedName.startsWith('seed-finance-may-1-2026') &&
          !(
            (entry.details?.date === 'May 1, 2026' || entry.details?.date === 'May 2, 2026' || entry.details?.date === 'May 3, 2026') &&
            (entry.details?.transaction || entry.details?.transactions)
          )
        )
      }
    )

    return sortSpendEntries([...preservedEntries, ...getCurrentMonthSeedEntries()])
  }

  function ensureMonthlySpendMonth(monthlySpends, monthKey) {
    if (!monthKey) return monthlySpends

    const recurringEntries =
      monthlySpends[previousMonthKey(monthKey)]?.filter((entry) => entry.recurring).map((entry) => ({
        ...entry,
        id: createSpendId(),
      })) ?? []

    const seedEntries = monthKey === monthKeyFromDate() ? getCurrentMonthSeedEntries() : []
    const monthEntries = mergeSpendEntries(monthlySpends[monthKey] ?? [], [...recurringEntries, ...seedEntries])

    return {
      ...monthlySpends,
      [monthKey]:
        monthKey === monthKeyFromDate() ? syncCurrentMonthSeedEntries(monthEntries) : monthEntries,
    }
  }

  function bootstrapMonthlySpends(rawMonthlySpends = {}) {
    const normalizedMonthlySpends = Object.fromEntries(
      Object.entries(rawMonthlySpends).map(([monthKey, entries]) => [
        monthKey,
        sortSpendEntries((entries ?? []).filter((entry) => !shouldRemoveLegacySpendEntry(entry))),
      ])
    )

    return ensureMonthlySpendMonth(normalizedMonthlySpends, monthKeyFromDate())
  }

  function createEmptyMonthlySpendDraft() {
    return {
      name: '',
      amount: '',
      recurring: false,
    }
  }

  const todayDate = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 10)
  }


  function bootstrapPhysicalHealthLogs(seed = {}) {
    const fallbackTargets = { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0, weight: 0 }
    const seededTargets = { ...fallbackTargets, ...(seed.targets ?? {}) }
    const seededFoods = Array.isArray(seed.foods) ? seed.foods : []
    const rawDaily = seed.daily ?? {}
    const seededDaily = {}
    for (const [date, entry] of Object.entries(rawDaily)) {
      seededDaily[date] = migrateDailyEntry(entry)
    }
    return { targets: seededTargets, foods: seededFoods, daily: seededDaily }
  }

  function todayIsoDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  let hydrated = false
  let physicalHealthLogs = bootstrapPhysicalHealthLogs(appData.physicalHealth)
  let physicalHealthScale = 'month'
  let physicalHealthEditDate = null
  let showPhysicalHealthPage = false
  let monthlySpendLogs = bootstrapMonthlySpends()
  let selectedSpendMonth = monthKeyFromDate()
  let monthlySpendDraft = createEmptyMonthlySpendDraft()
  let monthlySpendEditId = null
  let showMonthlySpends = false
  let selectedSpendGraphId = null
  let selectedSpendCategory = null
  let selectedSpendSubCategory = null
  let selectedPaymentSection = 'spent-categories'
  let showMonthPicker = false
  let monthPickerYear = new Date().getFullYear()
  let dashboardGraphMode = 'came'
  let dashboardSelectedCategories = new Set()
  let hoveredDashboardSpendId = null
  let hoveredSelectedSpendId = null
  let hoveredCategorySlice = null
  let hoveredSubCategorySlice = null
  let monthlyMovementMode = 'spent'
  let selectedMovementCategory = null
  let monthlyMovementStage = null
  let categoryViewMode = 'pie'
  let selectedLoanTrackerId = null
  let restoredUiState = null
  let dashboardChartScroll = null
  let lastDashboardScrollSignature = ''

  onMount(() => {
    if (appData.forcePublicPreview) {
      monthlySpendLogs = bootstrapMonthlySpends({})
      physicalHealthLogs = bootstrapPhysicalHealthLogs(appData.physicalHealth)
      hydrated = true
      return
    }

    const physicalHealthRaw = localStorage.getItem(physicalHealthStorageKey)
    if (physicalHealthRaw) {
      try {
        const stored = JSON.parse(physicalHealthRaw)
        const fileSeed = appData.physicalHealth ?? {}
        physicalHealthLogs = bootstrapPhysicalHealthLogs({
          targets: { ...(stored.targets ?? {}), ...(fileSeed.targets ?? {}) },
          foods: mergeFoods(stored.foods, fileSeed.foods),
          daily: { ...(stored.daily ?? {}), ...(fileSeed.daily ?? {}) },
        })
      } catch (error) {
        console.warn('Could not parse physical health logs', error)
        physicalHealthLogs = bootstrapPhysicalHealthLogs(appData.physicalHealth)
      }
    } else {
      physicalHealthLogs = bootstrapPhysicalHealthLogs(appData.physicalHealth)
    }

    const monthlySpendRaw = localStorage.getItem(monthlySpendStorageKey)
    if (monthlySpendRaw) {
      try {
        monthlySpendLogs = bootstrapMonthlySpends(JSON.parse(monthlySpendRaw))
      } catch (error) {
        console.error('Unable to load monthly spends.', error)
      }
    } else {
      monthlySpendLogs = bootstrapMonthlySpends()
    }

    const uiStateRaw = localStorage.getItem(uiStateStorageKey)
    if (uiStateRaw) {
      try {
        restoredUiState = JSON.parse(uiStateRaw)
      } catch (error) {
        console.error('Unable to load UI state.', error)
      }
    }

    if (restoredUiState?.selectedSpendMonth) {
      selectedSpendMonth = restoredUiState.selectedSpendMonth
      monthlySpendLogs = ensureMonthlySpendMonth(monthlySpendLogs, restoredUiState.selectedSpendMonth)
    }

    if (restoredUiState?.page === 'monthly') {
      showMonthlySpends = true
    }

    if (restoredUiState?.page === 'physical-health') {
      showPhysicalHealthPage = true
    }

    hydrated = true
  })

  $: if (hydrated) {
    localStorage.setItem(monthlySpendStorageKey, JSON.stringify(monthlySpendLogs))
    localStorage.setItem(physicalHealthStorageKey, JSON.stringify(physicalHealthLogs))
    localStorage.setItem(
      uiStateStorageKey,
      JSON.stringify({
        page: showPhysicalHealthPage
          ? 'physical-health'
          : showMonthlySpends
            ? 'monthly'
            : 'home',
        selectedSpendMonth,
      })
    )
  }

  $: currentMonthSpendKey = monthKeyFromDate()
  $: currentMonthSpendLabel = formatMonthLabel(currentMonthSpendKey)
  $: dashboardMonthlySpendEntries = sortSpendEntries(monthlySpendLogs[currentMonthSpendKey] ?? [])
  $: dashboardMonthlySpendTotal = dashboardMonthlySpendEntries.reduce((sum, entry) => sum + getSpendTotalValue(entry), 0)
  $: dashboardMoneyMovement = getMoneyMovement(dashboardMonthlySpendEntries)
  $: dashboardCurrentMonthTransactions = dashboardMonthlySpendEntries
    .map((entry) => entry.details?.transaction)
    .filter(Boolean)
  $: dashboardCategoryTransactions = dashboardCurrentMonthTransactions.filter((transaction) =>
    dashboardGraphMode === 'came' ? transaction.amount > 0 : transaction.amount < 0
  )
  $: dashboardCategoryBreakdown = summarizeTransactions(
    dashboardCategoryTransactions,
    (transaction) => transaction.category,
  )
  $: dashboardCategoryBreakdownTotal = dashboardCategoryBreakdown.reduce(
    (sum, item) => sum + item.amount,
    0,
  )
  $: dashboardCategoryBreakdownNameSet = new Set(dashboardCategoryBreakdown.map((item) => item.name))
  $: dashboardSelectedCategoryTotal = dashboardCategoryBreakdown
    .filter((item) => dashboardSelectedCategories.has(item.name))
    .reduce((sum, item) => sum + item.amount, 0)
  $: dashboardSelectedCategoryCount = dashboardCategoryBreakdown.filter((item) =>
    dashboardSelectedCategories.has(item.name),
  ).length

  function toggleDashboardCategorySelection(name) {
    const next = new Set(dashboardSelectedCategories)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    dashboardSelectedCategories = next
  }

  function clearDashboardCategorySelection() {
    if (dashboardSelectedCategories.size === 0) return
    dashboardSelectedCategories = new Set()
  }

  $: dashboardGraphMode, clearDashboardCategorySelection()
  $: dashboardMonthlySpendGraphPoints = buildSpendingGraphPoints(
    dashboardMonthlySpendEntries,
    getNiceAxisMax(Math.max(...dashboardMonthlySpendEntries.map((entry) => entry.amount), 1))
  )
  $: dashboardMoneyCameGraphPoints = buildMoneyMovementGraphPoints(
    dashboardMonthlySpendEntries,
    'came',
    getNiceAxisMax(Math.max(...dashboardMonthlySpendEntries.map((entry) => entry.amount), 1)),
    { scale: 'compressed' }
  )
  $: dashboardActiveGraphEntries =
    dashboardGraphMode === 'came'
      ? dashboardMonthlySpendEntries.filter((entry) => getSpendDisplayAmount(entry) > 0)
      : dashboardMonthlySpendEntries.filter((entry) => getSpendDisplayAmount(entry) < 0)
  $: dashboardActiveGraphMax = getNiceAxisMax(
    Math.max(...dashboardActiveGraphEntries.map((entry) => Math.abs(getSpendDisplayAmount(entry))), 1)
  )
  $: dashboardActiveGraphPoints =
    dashboardGraphMode === 'came'
      ? buildMoneyMovementGraphPoints(dashboardMonthlySpendEntries, 'came', dashboardActiveGraphMax, {
          scale: 'compressed',
        })
      : buildSpendingGraphPoints(dashboardMonthlySpendEntries, dashboardActiveGraphMax)
  $: dashboardActiveGraphLinePath = getSmoothSpendGraphLinePath(dashboardActiveGraphPoints)
  $: dashboardActiveGraphAreaPath = getSmoothSpendGraphAreaPath(dashboardActiveGraphPoints)
  $: dashboardMonthlySpendAxisLabels =
    dashboardGraphMode === 'came'
      ? getCompressedSpendAxisLabels(dashboardActiveGraphMax)
      : getSpendAxisLabels(dashboardActiveGraphMax)
  $: dashboardMonthlySpendXAxisLabels = getSpendGraphXAxisLabels(dashboardActiveGraphPoints)
  $: dashboardChartWidth = Math.max(dashboardActiveGraphPoints.length * 76 + 44, 520)
  $: dashboardScrollSignature = `${dashboardGraphMode}:${dashboardActiveGraphPoints.map((point) => point.id).join('|')}`
  $: if (hydrated && dashboardChartScroll && dashboardScrollSignature !== lastDashboardScrollSignature) {
    lastDashboardScrollSignature = dashboardScrollSignature
    tick().then(() => {
      if (!dashboardChartScroll) return
      dashboardChartScroll.scrollLeft = dashboardChartScroll.scrollWidth
    })
  }
  $: selectedSpendMonthLabel = formatMonthLabel(selectedSpendMonth)
  $: isFutureSpendMonth = selectedSpendMonth > currentMonthSpendKey
  $: selectedMonthSpendEntries = sortSpendEntries(monthlySpendLogs[selectedSpendMonth] ?? [])
  $: selectedMonthSpendTotal = selectedMonthSpendEntries.reduce((sum, entry) => sum + getSpendTotalValue(entry), 0)
  $: selectedMonthMoneyMovement = getMoneyMovement(selectedMonthSpendEntries)
  $: selectedMonthMovementTotal = selectedMonthMoneyMovement.came + selectedMonthMoneyMovement.spent
  $: selectedMonthEarnedPercent =
    selectedMonthMovementTotal > 0 ? (selectedMonthMoneyMovement.came / selectedMonthMovementTotal) * 100 : 0
  $: selectedMonthSpentPercent =
    selectedMonthMovementTotal > 0 ? (selectedMonthMoneyMovement.spent / selectedMonthMovementTotal) * 100 : 0
  $: selectedMonthRecurringCount = selectedMonthSpendEntries.filter((entry) => entry.recurring).length
  $: selectedMonthSpendMax = getNiceAxisMax(Math.max(...selectedMonthSpendEntries.map((entry) => entry.amount), 1))
  $: selectedMonthSpendGraphPoints = buildSpendGraphPoints(
    selectedMonthSpendEntries,
    selectedMonthSpendMax
  )
  $: selectedMonthSpendLinePath = getSmoothSpendGraphLinePath(selectedMonthSpendGraphPoints)
  $: selectedMonthSpendAreaPath = getSmoothSpendGraphAreaPath(selectedMonthSpendGraphPoints)
  $: selectedMonthSpendAxisLabels = getSpendAxisLabels(selectedMonthSpendMax)
  $: monthHeroGraphEntries = spendMonthTimeline.map((monthKey) => {
    const entries = sortSpendEntries(monthlySpendLogs[monthKey] ?? [])
    const spent = entries.reduce((sum, entry) => sum + getSpendTotalValue(entry), 0)

    return {
      id: monthKey,
      name: formatMonthLabel(monthKey),
      amount: monthKey > currentMonthSpendKey ? 0 : spent,
      monthKey,
    }
  })
  $: monthHeroGraphMax = getNiceAxisMax(Math.max(...monthHeroGraphEntries.map((entry) => entry.amount), 1))
  $: monthHeroGraphPoints = buildSpendGraphPoints(monthHeroGraphEntries, monthHeroGraphMax)
  $: monthHeroGraphLinePath = getSmoothSpendGraphLinePath(monthHeroGraphPoints)
  $: monthHeroGraphAreaPath = getSmoothSpendGraphAreaPath(monthHeroGraphPoints)
  $: selectedSpendGraphEntry =
    selectedMonthSpendEntries.find((entry) => entry.id === selectedSpendGraphId) ?? selectedMonthSpendEntries[0] ?? null
  $: selectedSpendPointSummary = selectedSpendGraphEntry ? getSpendPointSummary(selectedSpendGraphEntry) : null
  $: selectedFinanceTransactions = activeSpendCategory
    ? selectedMonthSpendEntries
        .map((entry) => entry.details?.transaction)
        .filter(
          (transaction) =>
            transaction &&
            transaction.category === activeSpendCategory &&
            (!selectedSpendSubCategory || transaction.subCategory === selectedSpendSubCategory)
        )
    : []
  $: selectedMonthCategoryTotals = summarizeSpendEntries(
    selectedMonthSpendEntries,
    (entry) => entry.details?.transaction?.category ?? entry.name
  )
  $: selectedMonthCategorySlices = buildPieSlices(selectedMonthCategoryTotals)
  $: selectedCategoryBarMax = Math.max(...selectedMonthCategorySlices.map((item) => item.amount), 1)
  $: selectedCategoryBarItems = selectedMonthCategorySlices.map((categorySlice) => {
    const entries = selectedMonthSpendEntries.filter(
      (entry) => (entry.details?.transaction?.category ?? entry.name) === categorySlice.name
    )

    return {
      ...categorySlice,
      barHeight: Math.max(18, (categorySlice.amount / selectedCategoryBarMax) * 250),
      segments: entries.map((entry) => {
        const transaction = entry.details?.transaction
        return {
          id: entry.id,
          amount: Math.abs(getSpendDisplayAmount(entry)),
          category: categorySlice.name,
          subCategory: transaction?.subCategory ?? entry.name,
          note: transaction?.note === 'None' ? '' : transaction?.note ?? '',
          time: transaction?.time ?? '',
          color: categorySlice.color,
        }
      }),
    }
  }).sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name))
  $: selectedMonthMovementGraphEntries = selectedMonthSpendEntries.map((entry) => {
    const amount = getSpendDisplayAmount(entry)
    const transaction = entry.details?.transaction

    return {
      ...entry,
      amount: Math.abs(amount),
      signedAmount: amount,
      category: transaction?.category ?? entry.name,
      subCategory: transaction?.subCategory ?? entry.name,
      note: transaction?.note === 'None' ? '' : transaction?.note ?? '',
      isCredit: amount > 0,
    }
  })
  $: selectedMonthMovementGraphMax = getNiceAxisMax(
    Math.max(...selectedMonthMovementGraphEntries.map((entry) => entry.amount), 1)
  )
  $: selectedMonthTransactions = selectedMonthSpendEntries.map((entry) => entry.details?.transaction).filter(Boolean)
  $: selectedMonthMovementModeTransactions = selectedMonthTransactions.filter((transaction) =>
    monthlyMovementMode === 'earned' ? transaction.amount > 0 : transaction.amount < 0
  )
  $: selectedMonthMovementTotals = summarizeTransactions(
    selectedMonthMovementModeTransactions,
    (transaction) => transaction.category
  )
  $: selectedMonthMovementSlices = buildPieSlices(selectedMonthMovementTotals)
  $: selectedMonthMovementCategoryNotes = new Map(
    selectedMonthMovementTotals.map((item) => {
      const notes = [
        ...new Set(
          selectedMonthMovementModeTransactions
            .filter((transaction) => transaction.category === item.name)
            .map((transaction) => transaction.note)
            .filter((note) => note && note !== 'None')
        ),
      ]

      return [item.name, notes.join(' • ')]
    })
  )
  $: selectedBikeTransactions = selectedMonthTransactions.filter((transaction) => isBikePoolingMovementTransaction(transaction))
  $: selectedBikeMovement = selectedBikeTransactions.reduce(
    (summary, transaction) => ({
      earned: summary.earned + (isBikePoolingEarnTransaction(transaction) ? Number(transaction.amount) || 0 : 0),
      spent: summary.spent + (isBikePoolingSpendTransaction(transaction) ? Math.abs(Number(transaction.amount) || 0) : 0),
    }),
    { earned: 0, spent: 0 }
  )
  $: selectedBikeMovementTotal = selectedBikeMovement.earned + selectedBikeMovement.spent
  $: selectedBikeEarnedPercent =
    selectedBikeMovementTotal > 0 ? (selectedBikeMovement.earned / selectedBikeMovementTotal) * 100 : 0
  $: selectedBikeSpentPercent =
    selectedBikeMovementTotal > 0 ? (selectedBikeMovement.spent / selectedBikeMovementTotal) * 100 : 0
  $: selectedBikeRideDistanceKm = selectedBikeTransactions.reduce(
    (sum, transaction) => sum + (isBikePoolingEarnTransaction(transaction) ? getRideDistanceKm(transaction) : 0),
    0
  )
  $: selectedBikeCompareEntries = [
    {
      id: 'bike-spent',
      label: 'Spent',
      amount: selectedBikeMovement.spent,
      tone: 'spent',
      description: 'Petrol, repair and certificate',
    },
    {
      id: 'bike-earned',
      label: 'Earned',
      amount: selectedBikeMovement.earned,
      tone: 'earned',
      description: 'Bike pooling returns',
    },
  ]
  $: selectedBikeCompareMax = Math.max(...selectedBikeCompareEntries.map((entry) => entry.amount), 1)
  $: selectedBikeCompareBars = selectedBikeCompareEntries.map((entry) => ({
    ...entry,
    barHeight: Math.max(20, (entry.amount / selectedBikeCompareMax) * 250),
  }))
  $: selectedBikeCompareSpentBar = selectedBikeCompareBars.find((entry) => entry.id === 'bike-spent') ?? null
  $: selectedBikeCompareEarnedBar = selectedBikeCompareBars.find((entry) => entry.id === 'bike-earned') ?? null
  $: selectedBikeCompareConnector =
    selectedBikeCompareSpentBar && selectedBikeCompareEarnedBar
      ? {
          spentTop: 100 - (selectedBikeCompareSpentBar.barHeight / 250) * 100,
          earnedTop: 100 - (selectedBikeCompareEarnedBar.barHeight / 250) * 100,
        }
      : null
  $: selectedMovementTransactions = selectedMovementCategory
    ? selectedMonthTransactions.filter(
        (transaction) =>
          monthlyMovementMode === 'bike'
            ? selectedMovementCategory === 'bike-spent'
              ? isBikePoolingSpendTransaction(transaction)
              : selectedMovementCategory === 'bike-earned'
                ? isBikePoolingEarnTransaction(transaction)
                : false
            : transaction.category === selectedMovementCategory &&
              (monthlyMovementMode === 'earned' ? transaction.amount > 0 : transaction.amount < 0)
      )
    : []
  $: selectedMovementTotal = selectedMovementTransactions.reduce(
    (sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0),
    0
  )
  $: selectedMovementPanelTitle =
    monthlyMovementMode === 'bike'
      ? selectedMovementCategory === 'bike-spent'
        ? 'Bike Spent'
        : selectedMovementCategory === 'bike-earned'
          ? 'Bike Pooling Earned'
          : ''
      : selectedMovementCategory ?? ''
  $: selectedMovementPanelSubtitle =
    monthlyMovementMode === 'bike'
      ? selectedMovementCategory === 'bike-spent'
        ? 'Petrol, repair and certificate'
        : selectedMovementCategory === 'bike-earned'
          ? 'Bike pooling credits'
          : ''
      : `${monthlyMovementMode === 'earned' ? 'Earning' : 'Spending'} list`
  $: if (
    monthlyMovementMode !== 'bike' &&
    selectedMovementCategory !== null &&
    !selectedMonthMovementTotals.some((item) => item.name === selectedMovementCategory)
  ) {
    selectedMovementCategory = null
  }
  $: activeSpendCategory = selectedSpendCategory
  $: selectedLoanTracker = loanTrackerItems.find((item) => item.id === selectedLoanTrackerId) ?? null
  $: sortedLoanTrackerItems = [...loanTrackerItems].sort((left, right) => right.amountLeftValue - left.amountLeftValue)
  $: selectedMonthSubCategoryTotals = summarizeSpendEntries(
    activeSpendCategory
      ? selectedMonthSpendEntries.filter((entry) => (entry.details?.transaction?.category ?? entry.name) === activeSpendCategory)
      : [],
    (entry) => entry.details?.transaction?.subCategory ?? entry.name
  )
  $: selectedMonthSubCategorySlices = buildPieSlices(selectedMonthSubCategoryTotals)
  $: selectedPaymentModeTotals = summarizeTransactions(selectedMonthTransactions, (transaction) =>
    getTransactionPaymentMode(transaction.paymentMethod)
  )
  $: selectedPaymentModeSlices = buildPieSlices(selectedPaymentModeTotals)
  $: if (selectedMonthSpendEntries.length > 0 && !selectedMonthSpendEntries.some((entry) => entry.id === selectedSpendGraphId)) {
    selectedSpendGraphId = selectedMonthSpendEntries[0].id
  }
  $: if (selectedSpendCategory !== null && !selectedMonthCategoryTotals.some((item) => item.name === selectedSpendCategory)) {
    selectedSpendCategory = null
    selectedSpendSubCategory = null
  }
  $: if (
    selectedSpendSubCategory !== null &&
    !selectedMonthSubCategoryTotals.some((item) => item.name === selectedSpendSubCategory)
  ) {
    selectedSpendSubCategory = null
  }
  $: physicalHealthFormDate = physicalHealthEditDate ?? todayIsoDate()
  $: physicalHealthFormEntry = physicalHealthLogs.daily[physicalHealthFormDate] ?? {
    water: 0,
    weight: 0,
    meals: [],
  }
  $: physicalHealthFoodsById = Object.fromEntries(
    (physicalHealthLogs.foods ?? []).map((f) => [f.id, f]),
  )
  $: physicalHealthFormDayMacros = dayMacros(physicalHealthFormEntry, physicalHealthFoodsById)
  $: physicalHealthIsToday = physicalHealthFormDate === todayIsoDate()
  $: physicalHealthCharts = ['calories', 'protein', 'carbs', 'fats', 'water', 'weight'].map((metric) => {
    const points = physicalHealthChartPoints(metric, physicalHealthScale)
    const target = physicalHealthLogs.targets[metric] || 0
    const maxValue = Math.max(...points.map((p) => p.value), target, 1)
    return {
      metric,
      label: metric === 'weight' ? 'Weight' : metric.charAt(0).toUpperCase() + metric.slice(1),
      unit: metric === 'water' ? 'ml' : metric === 'weight' ? 'kg' : metric === 'calories' ? 'kcal' : 'g',
      style: metric === 'weight' ? 'line' : 'bar',
      points,
      target,
      maxValue,
    }
  })

  function openPhysicalHealth() {
    showMonthlySpends = false
    showPhysicalHealthPage = true
    physicalHealthEditDate = null
  }

  function closePhysicalHealth() {
    showPhysicalHealthPage = false
    physicalHealthEditDate = null
  }

  function getPhysicalHealthEntry(date) {
    return (
      physicalHealthLogs.daily[date] ?? {
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

  function updatePhysicalHealthMacro(date, field, rawValue) {
    const parsed = rawValue === '' ? 0 : Number(rawValue)
    if (!Number.isFinite(parsed)) return
    setPhysicalHealthEntry(date, { [field]: parsed })
  }

  let pickerOpenForMealIndex = null
  let pickerSearch = ''

  function openFoodPicker(mealIndex) {
    pickerOpenForMealIndex = mealIndex
    pickerSearch = ''
  }

  function closeFoodPicker() {
    pickerOpenForMealIndex = null
  }

  $: pickerFilteredFoods = (() => {
    const all = physicalHealthLogs.foods ?? []
    const q = pickerSearch.trim().toLowerCase()
    if (!q) return all.slice().sort((a, b) => a.name.localeCompare(b.name))
    return all
      .filter((f) => f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  })()

  function addFoodToCurrentMeal(foodId, grams) {
    const parsed = Number(grams)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    if (pickerOpenForMealIndex === null) return
    const date = physicalHealthFormDate
    const existing = getPhysicalHealthEntry(date)
    const meal = existing.meals[pickerOpenForMealIndex]
    if (!meal) return
    const nextItems = [...meal.items, { foodId, grams: parsed }]
    const nextMeals = existing.meals.map((m, i) =>
      i === pickerOpenForMealIndex ? { ...m, items: nextItems } : m,
    )
    setPhysicalHealthEntry(date, { meals: nextMeals })
    pickerSearch = ''
  }

  let pickerCustomOpen = false
  let pickerCustomDraft = { name: '', kcal: '', protein: '', carbs: '', fats: '' }

  function resetCustomDraft() {
    pickerCustomDraft = { name: '', kcal: '', protein: '', carbs: '', fats: '' }
    pickerCustomOpen = false
  }

  async function copyFoodSnippet(food) {
    const snippet = `      { id: '${food.id}', name: '${food.name.replace(/'/g, "\\'")}', kcal: ${food.kcal}, protein: ${food.protein}, carbs: ${food.carbs}, fats: ${food.fats} },`
    try {
      await navigator.clipboard.writeText(snippet)
    } catch (error) {
      console.warn('Clipboard write failed', error)
      window.prompt('Copy this snippet for data.private.js', snippet)
    }
  }

  function saveCustomFood() {
    const name = pickerCustomDraft.name.trim()
    if (!name) return
    const kcal    = Number(pickerCustomDraft.kcal)
    const protein = Number(pickerCustomDraft.protein)
    const carbs   = Number(pickerCustomDraft.carbs)
    const fats    = Number(pickerCustomDraft.fats)
    if (![kcal, protein, carbs, fats].every((n) => Number.isFinite(n) && n >= 0)) return

    let id = slugify(name)
    if (!id) return
    const existingIds = new Set((physicalHealthLogs.foods ?? []).map((f) => f.id))
    let unique = id
    let n = 2
    while (existingIds.has(unique)) {
      unique = `${id}-${n++}`
    }

    const food = { id: unique, name, kcal, protein, carbs, fats, custom: true }
    physicalHealthLogs = {
      ...physicalHealthLogs,
      foods: [...(physicalHealthLogs.foods ?? []), food],
    }
    addFoodToCurrentMeal(unique, 100)
    resetCustomDraft()
  }

  function addMealEntry(date) {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const existing = getPhysicalHealthEntry(date)
    setPhysicalHealthEntry(date, {
      meals: [...existing.meals, { time, label: '', items: [] }],
    })
    return existing.meals.length
  }

  function addMealAndOpenPicker(date) {
    const newIndex = addMealEntry(date)
    openFoodPicker(newIndex)
  }

  function updateMealField(date, mealIndex, field, value) {
    const existing = getPhysicalHealthEntry(date)
    const next = existing.meals.map((meal, i) =>
      i === mealIndex ? { ...meal, [field]: value } : meal,
    )
    setPhysicalHealthEntry(date, { meals: next })
  }

  function updateMealItemGrams(date, mealIndex, itemIndex, rawValue) {
    const grams = rawValue === '' ? 0 : Number(rawValue)
    if (!Number.isFinite(grams) || grams < 0) return
    const existing = getPhysicalHealthEntry(date)
    const meal = existing.meals[mealIndex]
    if (!meal) return
    const nextItems = meal.items.map((item, i) =>
      i === itemIndex ? { ...item, grams } : item,
    )
    const nextMeals = existing.meals.map((m, i) =>
      i === mealIndex ? { ...m, items: nextItems } : m,
    )
    setPhysicalHealthEntry(date, { meals: nextMeals })
  }

  function removeMealItem(date, mealIndex, itemIndex) {
    const existing = getPhysicalHealthEntry(date)
    const meal = existing.meals[mealIndex]
    if (!meal) return
    const nextItems = meal.items.filter((_, i) => i !== itemIndex)
    const nextMeals = existing.meals.map((m, i) =>
      i === mealIndex ? { ...m, items: nextItems } : m,
    )
    setPhysicalHealthEntry(date, { meals: nextMeals })
  }

  function deleteMealEntry(date, index) {
    const existing = getPhysicalHealthEntry(date)
    setPhysicalHealthEntry(date, {
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
    const result = []
    const monday = new Date(today)
    const dayOfWeek = (monday.getDay() + 6) % 7
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
    const lookupValue = (iso) => {
      const entry = physicalHealthLogs.daily[iso]
      if (!entry) return 0
      if (metric === 'water' || metric === 'weight') {
        return Number(entry[metric]) || 0
      }
      const m = dayMacros(entry, physicalHealthFoodsById)
      if (metric === 'calories') return m.kcal
      return m[metric] || 0
    }

    if (scale === 'year') {
      return range.map((weekStart, idx) => {
        const start = new Date(weekStart)
        let sum = 0
        let count = 0
        for (let i = 0; i < 7; i++) {
          const d = new Date(start)
          d.setDate(d.getDate() + i)
          const iso = d.toISOString().slice(0, 10)
          const value = lookupValue(iso)
          if (value > 0) {
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
      const value = lookupValue(iso)
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

  function openMonthlySpends() {
    showMonthlySpends = true
    monthlySpendLogs = ensureMonthlySpendMonth(monthlySpendLogs, selectedSpendMonth)
    monthlySpendDraft = createEmptyMonthlySpendDraft()
    monthlySpendEditId = null
    selectedSpendGraphId = null
    selectedSpendCategory = null
    selectedSpendSubCategory = null
    selectedPaymentSection = 'spent-categories'
    selectedMovementCategory = null
  }

  function closeMonthlySpends() {
    showMonthlySpends = false
    monthlySpendDraft = createEmptyMonthlySpendDraft()
    monthlySpendEditId = null
    selectedSpendCategory = null
    selectedSpendSubCategory = null
    selectedPaymentSection = 'spent-categories'
    selectedMovementCategory = null
  }

  function handleMonthlySpendMonthChange(event) {
    const nextMonth = event.currentTarget.value
    if (!nextMonth) return

    selectMonthlySpendMonth(nextMonth)
  }

  function selectMonthlySpendMonth(nextMonth) {
    if (!nextMonth) return

    selectedSpendMonth = nextMonth
    monthlySpendLogs = ensureMonthlySpendMonth(monthlySpendLogs, nextMonth)
    monthlySpendDraft = createEmptyMonthlySpendDraft()
    monthlySpendEditId = null
    selectedSpendGraphId = null
    selectedSpendCategory = null
    selectedSpendSubCategory = null
    selectedPaymentSection = 'spent-categories'
    selectedMovementCategory = null
  }

  function toggleMonthPicker() {
    const [year] = selectedSpendMonth.split('-').map(Number)
    monthPickerYear = year
    showMonthPicker = !showMonthPicker
  }

  function selectMonthFromPicker(monthIndex) {
    selectMonthlySpendMonth(`${monthPickerYear}-${`${monthIndex + 1}`.padStart(2, '0')}`)
    showMonthPicker = false
  }

  function selectCurrentSpendMonth() {
    selectMonthlySpendMonth(monthKeyFromDate())
    showMonthPicker = false
  }

  function saveMonthlySpend() {
    const normalizedName = normalizeSpendName(monthlySpendDraft.name)
    if (!normalizedName) return

    const parsedAmount = Number(monthlySpendDraft.amount)
    const nextAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0
    const existingEntry = (monthlySpendLogs[selectedSpendMonth] ?? []).find(
      (entry) =>
        entry.id === monthlySpendEditId || entry.name.toLowerCase() === normalizedName.toLowerCase()
    )

    const nextEntry = normalizeSpendEntry({
      id: monthlySpendEditId ?? createSpendId(),
      name: normalizedName,
      amount: nextAmount,
      recurring: monthlySpendDraft.recurring,
      details: existingEntry?.details ?? null,
    })

    const nextEntries = [
      ...(monthlySpendLogs[selectedSpendMonth] ?? []).filter(
        (entry) =>
          entry.id !== monthlySpendEditId && entry.name.toLowerCase() !== normalizedName.toLowerCase()
      ),
      nextEntry,
    ]

    monthlySpendLogs = {
      ...monthlySpendLogs,
      [selectedSpendMonth]: sortSpendEntries(nextEntries),
    }

    monthlySpendDraft = createEmptyMonthlySpendDraft()
    monthlySpendEditId = null
    selectedSpendGraphId = nextEntry.id
  }

  function editMonthlySpend(entry) {
    monthlySpendEditId = entry.id
    monthlySpendDraft = {
      name: entry.name,
      amount: `${entry.amount}`,
      recurring: entry.recurring,
    }
  }

  function removeMonthlySpend(entryId) {
    monthlySpendLogs = {
      ...monthlySpendLogs,
      [selectedSpendMonth]: (monthlySpendLogs[selectedSpendMonth] ?? []).filter((entry) => entry.id !== entryId),
    }

    if (monthlySpendEditId === entryId) {
      monthlySpendDraft = createEmptyMonthlySpendDraft()
      monthlySpendEditId = null
    }
  }

  function resetMonthlySpendDraft() {
    monthlySpendDraft = createEmptyMonthlySpendDraft()
    monthlySpendEditId = null
  }

</script>

<svelte:head>
  <title>Finance & Health</title>
</svelte:head>

<main class="app">
  {#if showPhysicalHealthPage}
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
            { key: 'calories', label: 'Calories', unit: 'kcal' },
            { key: 'protein',  label: 'Protein',  unit: 'g'    },
            { key: 'carbs',    label: 'Carbs',    unit: 'g'    },
            { key: 'fats',     label: 'Fats',     unit: 'g'    },
          ] as macro (macro.key)}
            <div class="physical-health-stat-tile">
              <span class="physical-health-stat-label">{macro.label}</span>
              <span class="physical-health-stat-value">
                {Math.round(physicalHealthFormDayMacros[macro.key === 'calories' ? 'kcal' : macro.key])}
                <span class="physical-health-stat-unit">{macro.unit}</span>
              </span>
              <span class="physical-health-stat-target">
                / {physicalHealthLogs.targets[macro.key] || 0}{macro.unit}
              </span>
            </div>
          {/each}
        </div>

        <div class="physical-health-manual-inputs">
          {#each [
            { key: 'water',  label: 'Water',  unit: 'ml', step: '1'   },
            { key: 'weight', label: 'Weight', unit: 'kg', step: '0.1' },
          ] as macro (macro.key)}
            <label class="physical-health-macro">
              <span class="physical-health-macro-label">{macro.label}</span>
              <div class="physical-health-macro-input">
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step={macro.step}
                  value={physicalHealthFormEntry[macro.key] || ''}
                  on:blur={(event) =>
                    updatePhysicalHealthMacro(physicalHealthFormDate, macro.key, event.currentTarget.value)}
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
          {#each physicalHealthFormEntry.meals as meal, mealIndex (mealIndex)}
            <div class="physical-health-meal-card">
              <div class="physical-health-meal-head">
                <input
                  type="time"
                  value={meal.time}
                  on:blur={(event) =>
                    updateMealField(physicalHealthFormDate, mealIndex, 'time', event.currentTarget.value)}
                />
                <input
                  type="text"
                  placeholder="Meal name (e.g. Breakfast)"
                  value={meal.label}
                  on:blur={(event) =>
                    updateMealField(physicalHealthFormDate, mealIndex, 'label', event.currentTarget.value)}
                />
                <button
                  class="physical-health-meal-delete"
                  type="button"
                  aria-label="Remove meal"
                  on:click={() => deleteMealEntry(physicalHealthFormDate, mealIndex)}
                >
                  ×
                </button>
              </div>

              {#if meal.items.length > 0}
                <ul class="physical-health-meal-items">
                  {#each meal.items as item, itemIndex (itemIndex)}
                    {@const food = physicalHealthFoodsById[item.foodId]}
                    <li class="physical-health-meal-item">
                      <span class="physical-health-meal-item-name">
                        {food ? food.name : `Unknown (${item.foodId})`}
                      </span>
                      <input
                        class="physical-health-meal-item-grams"
                        type="number"
                        min="0"
                        step="1"
                        value={item.grams}
                        on:blur={(event) =>
                          updateMealItemGrams(
                            physicalHealthFormDate,
                            mealIndex,
                            itemIndex,
                            event.currentTarget.value,
                          )}
                      />
                      <span class="physical-health-meal-item-unit">g</span>
                      <button
                        class="physical-health-meal-item-remove"
                        type="button"
                        aria-label="Remove item"
                        on:click={() => removeMealItem(physicalHealthFormDate, mealIndex, itemIndex)}
                      >
                        ×
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}

              <button
                class="physical-health-add-items"
                type="button"
                on:click={() => openFoodPicker(mealIndex)}
              >
                + Add items to this meal
              </button>
            </div>
          {/each}

          <button
            class="physical-health-add-meal"
            type="button"
            on:click={() => addMealAndOpenPicker(physicalHealthFormDate)}
          >
            + Add meal
          </button>
        </div>

        {#if pickerOpenForMealIndex !== null}
          <div
            class="food-picker-backdrop"
            on:click|self={closeFoodPicker}
            role="dialog"
            aria-modal="true"
            aria-label="Add items to meal"
          >
            <div class="food-picker">
              <header class="food-picker-head">
                <h3>Add items</h3>
                <button type="button" class="food-picker-close" on:click={closeFoodPicker} aria-label="Close">×</button>
              </header>

              <input
                class="food-picker-search"
                type="search"
                placeholder="Search foods…"
                bind:value={pickerSearch}
                autofocus
              />

              <ul class="food-picker-results">
                {#each pickerFilteredFoods as food (food.id)}
                  <li class="food-picker-result">
                    <div class="food-picker-result-info">
                      <span class="food-picker-result-name">{food.name}</span>
                      <span class="food-picker-result-macros">
                        {food.kcal} kcal · {food.protein}P · {food.carbs}C · {food.fats}F / 100g
                      </span>
                      {#if food.custom}
                        <button
                          type="button"
                          class="food-picker-result-copy"
                          on:click={() => copyFoodSnippet(food)}
                        >
                          Copy as data.private.js snippet
                        </button>
                      {/if}
                    </div>
                    <input
                      class="food-picker-result-grams"
                      type="number"
                      min="1"
                      step="1"
                      value="100"
                      on:focus={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      class="food-picker-result-add"
                      on:click={(e) => {
                        const input = e.currentTarget.previousElementSibling
                        addFoodToCurrentMeal(food.id, input.value)
                      }}
                    >
                      Add
                    </button>
                  </li>
                {:else}
                  <li class="food-picker-empty">No foods match "{pickerSearch}"</li>
                {/each}
              </ul>

              <div class="food-picker-cart">
                <p class="food-picker-cart-title">In this meal</p>
                {#if physicalHealthFormEntry.meals[pickerOpenForMealIndex]?.items.length}
                  <ul>
                    {#each physicalHealthFormEntry.meals[pickerOpenForMealIndex].items as item, itemIndex (itemIndex)}
                      {@const food = physicalHealthFoodsById[item.foodId]}
                      <li>
                        <span>{food ? food.name : item.foodId}</span>
                        <span>{item.grams} g</span>
                        <button
                          type="button"
                          on:click={() =>
                            removeMealItem(physicalHealthFormDate, pickerOpenForMealIndex, itemIndex)}
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <p class="food-picker-cart-empty">No items yet — search and tap Add.</p>
                {/if}
              </div>

              {#if pickerCustomOpen}
                <div class="food-picker-custom">
                  <p class="food-picker-cart-title">Add custom food</p>
                  <input
                    type="text"
                    placeholder="Name"
                    bind:value={pickerCustomDraft.name}
                  />
                  <div class="food-picker-custom-macros">
                    <label>kcal <input type="number" min="0" step="1" bind:value={pickerCustomDraft.kcal} /></label>
                    <label>P    <input type="number" min="0" step="0.1" bind:value={pickerCustomDraft.protein} /></label>
                    <label>C    <input type="number" min="0" step="0.1" bind:value={pickerCustomDraft.carbs} /></label>
                    <label>F    <input type="number" min="0" step="0.1" bind:value={pickerCustomDraft.fats} /></label>
                  </div>
                  <div class="food-picker-custom-actions">
                    <button type="button" on:click={resetCustomDraft}>Cancel</button>
                    <button type="button" class="food-picker-done" on:click={saveCustomFood}>Save & add</button>
                  </div>
                </div>
              {:else}
                <button
                  type="button"
                  class="food-picker-add-custom"
                  on:click={() => (pickerCustomOpen = true)}
                >
                  + Add custom food
                </button>
              {/if}

              <footer class="food-picker-foot">
                <button type="button" class="food-picker-done" on:click={closeFoodPicker}>Done</button>
              </footer>
            </div>
          </div>
        {/if}
      </section>

      <div class="physical-health-charts">
        {#each physicalHealthCharts as chart (chart.metric)}
          <article class="physical-health-chart-card">
            <header class="physical-health-chart-head">
              <h3>{chart.label}</h3>
              <span>Target: {chart.target}{chart.unit}</span>
            </header>
            <div class="physical-health-chart-body">
              <svg
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
                class="physical-health-chart-svg"
                aria-hidden="true"
              >
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
    </section>
  {:else if showMonthlySpends}
    <section class="monthly-spends-page">
      <div class="monthly-spend-topbar">
        <button class="back-button" type="button" on:click={closeMonthlySpends}>← Back</button>
      </div>

      <div class="gym-day-hero monthly-spend-hero">
        <div class="month-hero-graph" aria-label="Month selector">
          <svg class="monthly-spend-graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {#if monthHeroGraphAreaPath}
              <path class="monthly-spend-graph-area month-hero-area" d={monthHeroGraphAreaPath}></path>
            {/if}
            {#if monthHeroGraphLinePath}
              <path class="monthly-spend-graph-line month-hero-line" d={monthHeroGraphLinePath}></path>
            {/if}
          </svg>

          {#each monthHeroGraphPoints as point}
            <button
              class={`month-hero-point ${getSpendPointWrapPlacement(point)}`}
              class:is-active={selectedSpendMonth === point.monthKey}
              class:is-future={point.monthKey > currentMonthSpendKey}
              type="button"
              style={`left:${point.left}%; top:${point.top}%`}
              on:click={() => selectMonthlySpendMonth(point.monthKey)}
              aria-label={`${point.name} ${point.monthKey > currentMonthSpendKey ? 'Future Month Spents' : formatCurrency(point.amount)}`}
            >
              <span>{point.name}</span>
            </button>
          {/each}

          <strong class="month-hero-selected-label">
            {isFutureSpendMonth ? 'Future Month Spents' : selectedSpendMonthLabel}
          </strong>
        </div>
      </div>

      <section class="monthly-tape-card" aria-label="Monthly spending and earning summary">
        <div class="monthly-tape-header">
          <strong>{selectedSpendMonthLabel}</strong>
          <span>Earned vs spent</span>
        </div>

        <div class="monthly-tape-stage" aria-hidden="true">
          <div class="monthly-tape-track">
            <div class="monthly-tape-segment is-earned" style={`width:${selectedMonthEarnedPercent}%`}></div>
            <div class="monthly-tape-segment is-spent" style={`width:${selectedMonthSpentPercent}%`}></div>
          </div>
        </div>

        <div class="monthly-tape-metrics">
          <article class="monthly-tape-metric is-earned">
            <span>Earned</span>
            <strong>+{formatCurrency(selectedMonthMoneyMovement.came)}</strong>
          </article>
          <article class="monthly-tape-metric is-spent">
            <span>Spent</span>
            <strong>-{formatCurrency(selectedMonthMoneyMovement.spent)}</strong>
          </article>
        </div>

        <div class="monthly-bike-tape">
          <div class="monthly-bike-tape-header">
            <strong>Bike Pooling</strong>
            <span>Bike costs vs pooling returns</span>
          </div>
          <div class="monthly-tape-track is-bike">
            <div class="monthly-tape-segment is-spent is-bike" style={`width:${selectedBikeSpentPercent}%`}></div>
            <div class="monthly-tape-segment is-earned is-bike" style={`width:${selectedBikeEarnedPercent}%`}></div>
          </div>
          <div class="monthly-bike-tape-metrics">
            <span class="is-spent">Spent -{formatCurrency(selectedBikeMovement.spent)}</span>
            <span>Distance {selectedBikeRideDistanceKm.toFixed(2)}km</span>
            <span class="is-earned">Earned +{formatCurrency(selectedBikeMovement.earned)}</span>
          </div>
        </div>
      </section>

      <section class="monthly-category-bar-card monthly-movement-card" aria-label="Monthly spending and earning graph">
        <div class="monthly-movement-toggle" aria-label="Monthly movement mode">
          <button
            class:is-active={monthlyMovementMode === 'spent'}
            type="button"
            on:click={() => {
              monthlyMovementMode = 'spent'
              selectedMovementCategory = null
            }}
          >
            Spending
          </button>
          <button
            class:is-active={monthlyMovementMode === 'earned'}
            type="button"
            on:click={() => {
              monthlyMovementMode = 'earned'
              selectedMovementCategory = null
            }}
          >
            Earning
          </button>
        </div>

        <div class="monthly-spend-pie-grid monthly-movement-pie-grid">
          <div class="monthly-spend-pie-block">
            <div class="monthly-spend-pie-shell monthly-movement-pie-shell">
              {#if selectedMonthMovementSlices.length > 0}
                <svg class="monthly-spend-pie monthly-movement-pie" viewBox="0 0 100 100" aria-label={`${monthlyMovementMode} category pie chart`}>
                  {#each selectedMonthMovementSlices as slice}
                    <g>
                      <path
                        class:is-active={selectedMovementCategory === slice.name}
                        d={slice.path}
                        fill={slice.color}
                      ></path>
                      <foreignObject x={slice.labelX - 7} y={slice.labelY - 7} width="14" height="14">
                        <button
                          class="monthly-pie-hit-target"
                          type="button"
                          aria-label={`${slice.name} ${formatCurrency(slice.amount)}`}
                          on:click={() => {
                            selectedMovementCategory = selectedMovementCategory === slice.name ? null : slice.name
                          }}
                        ></button>
                      </foreignObject>
                    </g>
                  {/each}
                </svg>
              {:else}
                <div class="monthly-movement-empty monthly-category-hover-panel is-empty">
                  No {monthlyMovementMode === 'earned' ? 'earnings' : 'spendings'} yet
                </div>
              {/if}
            </div>
          </div>

          <div class={`monthly-spend-pie-list ${selectedMonthMovementTotals.length > 5 ? 'is-list-view' : ''}`}>
            {#each selectedMonthMovementSlices as slice}
              <button
                class:is-active={selectedMovementCategory === slice.name}
                type="button"
                style={`--slice-color:${slice.color}`}
                on:click={() => {
                  selectedMovementCategory = selectedMovementCategory === slice.name ? null : slice.name
                }}
              >
                <i style={`background:${slice.color}`}></i>
                <span>{slice.name}</span>
                <strong>{formatCurrency(slice.amount)}</strong>
              </button>
            {/each}
          </div>
        </div>

        {#if selectedMovementTransactions.length > 0}
          <section class="finance-transaction-panel monthly-movement-transaction-panel" aria-label={`${selectedMovementPanelTitle} transactions`}>
            <div class="finance-transaction-header">
              <div>
                <h2>{selectedMovementPanelTitle}</h2>
                <p>{selectedMovementPanelSubtitle}</p>
              </div>
              <strong>{formatCurrency(selectedMovementTotal)}</strong>
            </div>

            <div class="finance-transaction-table">
              <div class="finance-transaction-row header">
                <span>Date</span>
                <span>Time</span>
                <span>Bank</span>
                <span>Method</span>
                <span>Amount</span>
                <span>Category</span>
                <span>Sub category</span>
              </div>

              {#each selectedMovementTransactions as transaction}
                <div class="finance-transaction-row" class:is-credit={transaction.amount > 0}>
                  <span>{transaction.date}</span>
                  <span>{transaction.time}</span>
                  <span>{transaction.bank}</span>
                  <span>{transaction.paymentMethod}</span>
                  <strong>{formatCurrency(transaction.amount)}</strong>
                  <span>{transaction.category}</span>
                  <span class="finance-subcategory-cell">
                    <span>{transaction.subCategory}</span>
                    {#if transaction.note && transaction.note !== 'None'}
                      <span class="finance-note-wrap">
                        <button class="finance-note-button" type="button">Note</button>
                        <span class="finance-note-tooltip">{transaction.note}</span>
                      </span>
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          </section>
        {/if}
      </section>


      {#if selectedFinanceTransactions.length > 0}
        <section class="finance-transaction-panel" aria-label="Finance transactions">
          <div class="finance-transaction-header">
            <div>
              <p class="routine-kicker">{activeSpendCategory}</p>
              <h2>{selectedSpendSubCategory ?? selectedSpendMonthLabel}</h2>
            </div>
            <strong>{formatCurrency(selectedFinanceTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0))}</strong>
          </div>

          <div class="finance-transaction-table">
            <div class="finance-transaction-row header">
              <span>Time</span>
              <span>Bank</span>
              <span>Method</span>
              <span>Amount</span>
              <span>Category</span>
              <span>Sub category</span>
            </div>

            {#each selectedFinanceTransactions as transaction}
              <div class="finance-transaction-row" class:is-credit={transaction.amount > 0}>
                <span>{transaction.time}</span>
                <span>{transaction.bank}</span>
                <span>{transaction.paymentMethod}</span>
                <strong>{formatCurrency(transaction.amount)}</strong>
                <span>{transaction.category}</span>
                <span class="finance-subcategory-cell">
                  <span>{transaction.subCategory}</span>
                  {#if transaction.note && transaction.note !== 'None'}
                    <span class="finance-note-wrap">
                      <button class="finance-note-button" type="button">Note</button>
                      <span class="finance-note-tooltip">{transaction.note}</span>
                    </span>
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </section>
  {:else}
    <section class="dashboard-layout">
      <div class="left-column">
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

        <section class="monthly-spend-panel" aria-label="Monthly spends">
          <div class="monthly-spend-panel-header">
            <div>
              <p class="routine-kicker">Monthly Spends</p>
              <h2>{currentMonthSpendLabel}</h2>
              <button class="monthly-spend-analyse-button" type="button" on:click={openMonthlySpends}>
                Analyse
              </button>
            </div>
            <div class="monthly-spend-total-stack">
              <strong class="recurring-total">{formatCurrency(dashboardMonthlySpendTotal)}</strong>
              <div class="money-movement-row">
                <button
                  class="money-movement-positive"
                  class:is-active={dashboardGraphMode === 'came'}
                  type="button"
                  on:click={() => (dashboardGraphMode = 'came')}
                >
                  +{formatCurrency(dashboardMoneyMovement.came)}
                </button>
                <button
                  class="money-movement-negative"
                  class:is-active={dashboardGraphMode === 'spent'}
                  type="button"
                  on:click={() => (dashboardGraphMode = 'spent')}
                >
                  -{formatCurrency(dashboardMoneyMovement.spent)}
                </button>
              </div>
            </div>
          </div>

          {#if dashboardCategoryBreakdown.length > 0}
            <div
              class="monthly-spend-category-breakdown"
              class:is-came={dashboardGraphMode === 'came'}
              aria-label={`${dashboardGraphMode === 'came' ? 'Earning' : 'Spending'} by category`}
            >
              <div class="monthly-spend-category-breakdown-head">
                <p class="monthly-spend-category-breakdown-title">
                  {dashboardGraphMode === 'came' ? 'Earning' : 'Spending'} by category
                </p>
                <strong>{formatCurrency(dashboardCategoryBreakdownTotal)}</strong>
              </div>
              <div class="monthly-spend-category-breakdown-list">
                {#each dashboardCategoryBreakdown as item (item.name)}
                  <label
                    class="monthly-spend-category-breakdown-row"
                    class:is-selected={dashboardSelectedCategories.has(item.name)}
                  >
                    <span class="monthly-spend-category-breakdown-name">{item.name}</span>
                    <div class="monthly-spend-category-breakdown-bar" aria-hidden="true">
                      <span
                        style={`width:${
                          dashboardCategoryBreakdownTotal > 0
                            ? (item.amount / dashboardCategoryBreakdownTotal) * 100
                            : 0
                        }%`}
                      ></span>
                    </div>
                    <strong class="monthly-spend-category-breakdown-amount">{formatCurrency(item.amount)}</strong>
                    <input
                      class="monthly-spend-category-breakdown-check"
                      type="checkbox"
                      aria-label={`Select ${item.name}`}
                      checked={dashboardSelectedCategories.has(item.name)}
                      on:change={() => toggleDashboardCategorySelection(item.name)}
                    />
                    <span class="monthly-spend-category-breakdown-tooltip" role="tooltip">
                      {item.name} · {formatCurrency(item.amount)}
                    </span>
                  </label>
                {/each}
              </div>
              {#if dashboardSelectedCategoryCount > 0}
                <div class="monthly-spend-category-breakdown-selected" aria-live="polite">
                  <span>Selected ({dashboardSelectedCategoryCount})</span>
                  <strong>{formatCurrency(dashboardSelectedCategoryTotal)}</strong>
                  <button
                    type="button"
                    class="monthly-spend-category-breakdown-clear"
                    on:click={clearDashboardCategorySelection}
                  >
                    Clear
                  </button>
                </div>
              {/if}
            </div>
          {/if}

          <div class="monthly-spend-dashboard-graph">
            <div class="monthly-spend-dashboard-scroll" bind:this={dashboardChartScroll}>
              <div class="monthly-spend-dashboard-stage" style={`width:${dashboardChartWidth}px`}>
                <div class="monthly-spend-plot-area">
                  <svg class="monthly-spend-graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {#if dashboardActiveGraphAreaPath}
                      <path
                        class:income={dashboardGraphMode === 'came'}
                        class:spending={dashboardGraphMode === 'spent'}
                        class="monthly-spend-graph-area"
                        d={dashboardActiveGraphAreaPath}
                      ></path>
                    {/if}
                    {#if dashboardActiveGraphLinePath}
                      <path
                        class:income={dashboardGraphMode === 'came'}
                        class:spending={dashboardGraphMode === 'spent'}
                        class="monthly-spend-graph-line"
                        d={dashboardActiveGraphLinePath}
                      ></path>
                    {/if}
                  </svg>

                  {#each dashboardActiveGraphPoints as point}
                    <div
                      class={`monthly-spend-point-wrap ${getSpendPointWrapPlacement(point)}`}
                      style={`left:${point.left}%; top:${point.top}%`}
                    >
                      {#if hoveredDashboardSpendId === point.id}
                        <div class={`monthly-spend-point-flag is-visible ${getSpendFlagPlacement(point)}`}>
                          <strong class="monthly-spend-point-amount">{getSpendPointSummary(point).amount}</strong>
                          <strong class="monthly-spend-point-category">{getSpendPointSummary(point).category}</strong>
                          {#if getSpendPointSummary(point).subCategory}
                            <span class="monthly-spend-point-subcategory">{getSpendPointSummary(point).subCategory}</span>
                          {/if}
                          {#if getSpendPointSummary(point).note}
                            <span class="monthly-spend-point-note">{getSpendPointSummary(point).note}</span>
                          {/if}
                        </div>
                      {/if}

                      <button
                        class:income={dashboardGraphMode === 'came'}
                        class="monthly-spend-dashboard-point"
                        type="button"
                        aria-label={`${point.name} ${formatCurrency(getSpendDisplayAmount(point))} in ${currentMonthSpendLabel}`}
                        on:mouseenter={() => (hoveredDashboardSpendId = point.id)}
                        on:mouseleave={() => (hoveredDashboardSpendId = null)}
                        on:focus={() => (hoveredDashboardSpendId = point.id)}
                        on:blur={() => (hoveredDashboardSpendId = null)}
                      ></button>
                    </div>
                  {/each}
                </div>

                <div class="monthly-spend-x-axis" aria-hidden="true">
                  {#each dashboardMonthlySpendXAxisLabels as axisLabel}
                    <span
                      class:is-left-edge={axisLabel.left <= 2}
                      class:is-right-edge={axisLabel.left >= 98}
                      style={`left:${axisLabel.left}%`}
                    >
                      <strong>{axisLabel.date}</strong>
                      <small>{axisLabel.time}</small>
                    </span>
                  {/each}
                </div>
              </div>
            </div>
          </div>

        </section>

        <section class="loan-tracker-panel" aria-label="Loans">
          <div class="routine-panel-header loan-tracker-header">
            <div>
              <h2 class="panel-title">Loans</h2>
            </div>
          </div>

          <div class="loan-tracker-grid">
            {#each sortedLoanTrackerItems as loanItem}
              <article class="loan-plan-card" class:is-active={selectedLoanTrackerId === loanItem.id}>
                <button
                  class="loan-plan-trigger"
                  type="button"
                  aria-expanded={selectedLoanTrackerId === loanItem.id}
                  on:click={() => {
                    selectedLoanTrackerId = selectedLoanTrackerId === loanItem.id ? null : loanItem.id
                  }}
                >
                  <div class="loan-plan-gauge" aria-hidden="true">
                    <svg viewBox="0 0 120 74" class="loan-plan-gauge-svg">
                      <defs>
                        <linearGradient id={`loan-speed-gradient-${loanItem.id}`} x1="10" y1="62" x2="110" y2="62" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stop-color="#38bdf8"></stop>
                          <stop offset="48%" stop-color="#f59e0b"></stop>
                          <stop offset="82%" stop-color="#f97316"></stop>
                          <stop offset="100%" stop-color="#ef4444"></stop>
                        </linearGradient>
                      </defs>
                      <path
                        class="loan-plan-gauge-track"
                        d="M10 62 A50 50 0 0 1 110 62"
                        pathLength="100"
                      ></path>
                      <path
                        class="loan-plan-gauge-progress"
                        d="M10 62 A50 50 0 0 1 110 62"
                        pathLength="100"
                        style={`stroke:url(#loan-speed-gradient-${loanItem.id}); stroke-dasharray:${Math.max(0, Math.min(loanItem.progress, 1)) * 100} 100;`}
                      ></path>
                      <g
                        class="loan-plan-gauge-needle"
                        style={`transform:rotate(${Math.max(-90, Math.min(90, -90 + Math.max(0, Math.min(loanItem.progress, 1)) * 180))}deg); transform-origin:60px 62px;`}
                      >
                        <line x1="60" y1="62" x2="60" y2="19" />
                      </g>
                      <circle class="loan-plan-gauge-cap" cx="60" cy="62" r="4"></circle>
                    </svg>
                    <div class="loan-plan-gauge-copy">
                      <strong>{loanItem.headline}</strong>
                    </div>
                  </div>

                  <div class="loan-plan-header">
                    <div>
                      <span>{loanItem.lender}</span>
                      <strong>{loanItem.title}</strong>
                      <small>{loanItem.support}</small>
                    </div>
                  </div>

                  <div class="loan-plan-amount-left">
                    <span>Amount left</span>
                    <strong>{loanItem.amountLeft}</strong>
                  </div>

                  <span class="loan-plan-pill">{selectedLoanTrackerId === loanItem.id ? 'Close details' : 'View details'}</span>
                </button>
              </article>
            {/each}
          </div>

          {#if selectedLoanTracker}
            <div
              class="loan-tracker-modal-backdrop"
              role="presentation"
              on:click|self={() => (selectedLoanTrackerId = null)}
            >
              <div
                class="loan-tracker-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${selectedLoanTracker.title} details`}
              >
                <div class="loan-tracker-modal-header">
                  <div>
                    <span>{selectedLoanTracker.lender}</span>
                    <strong>{selectedLoanTracker.title}</strong>
                    <p>{selectedLoanTracker.support}</p>
                  </div>
                  <button
                    class="loan-tracker-modal-close"
                    type="button"
                    aria-label="Close loan details"
                    on:click={() => (selectedLoanTrackerId = null)}
                  >
                    ×
                  </button>
                </div>

                <div class="loan-tracker-modal-hero">
                  <div class="loan-plan-gauge is-large" aria-hidden="true">
                    <svg viewBox="0 0 120 74" class="loan-plan-gauge-svg">
                      <defs>
                        <linearGradient id={`loan-speed-gradient-modal-${selectedLoanTracker.id}`} x1="10" y1="62" x2="110" y2="62" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stop-color="#38bdf8"></stop>
                          <stop offset="48%" stop-color="#f59e0b"></stop>
                          <stop offset="82%" stop-color="#f97316"></stop>
                          <stop offset="100%" stop-color="#ef4444"></stop>
                        </linearGradient>
                      </defs>
                      <path
                        class="loan-plan-gauge-track"
                        d="M10 62 A50 50 0 0 1 110 62"
                        pathLength="100"
                      ></path>
                      <path
                        class="loan-plan-gauge-progress"
                        d="M10 62 A50 50 0 0 1 110 62"
                        pathLength="100"
                        style={`stroke:url(#loan-speed-gradient-modal-${selectedLoanTracker.id}); stroke-dasharray:${Math.max(0, Math.min(selectedLoanTracker.progress, 1)) * 100} 100;`}
                      ></path>
                      <g
                        class="loan-plan-gauge-needle"
                        style={`transform:rotate(${Math.max(-90, Math.min(90, -90 + Math.max(0, Math.min(selectedLoanTracker.progress, 1)) * 180))}deg); transform-origin:60px 62px;`}
                      >
                        <line x1="60" y1="62" x2="60" y2="19" />
                      </g>
                      <circle class="loan-plan-gauge-cap" cx="60" cy="62" r="4"></circle>
                    </svg>
                    <div class="loan-plan-gauge-copy">
                      <strong>{selectedLoanTracker.headline}</strong>
                    </div>
                  </div>

                  <div class="loan-plan-metrics">
                    {#each selectedLoanTracker.detailRows as row}
                      <div class="loan-plan-metric">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    {/each}
                  </div>
                </div>

                <div class="loan-plan-schedule">
                  {#each selectedLoanTracker.schedule as item}
                    <div class="loan-plan-schedule-row">{item}</div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </section>
      </div>

      <section class="ribbon-stack" aria-label="Bank accounts">
        {#each displayRibbons as ribbon}
          <article
            class="ribbon"
            style={`--ribbon-bg:${ribbon.bg}; --ribbon-bg-end:${ribbon.bgEnd}; --ribbon-text:${ribbon.text}; --ribbon-muted:${ribbon.muted}; --ribbon-icon:${ribbon.icon}; --ribbon-stripe:${ribbon.stripe}; --ribbon-border:${ribbon.border};`}
          >
            <div class="ribbon-info">
              <div class="logo-wrap" aria-hidden="true">
                {@html ribbon.logo}
              </div>
              <div class="ribbon-copy">
                <p class="bank">{ribbon.bank}</p>
                <p class="account">{ribbon.bank === 'Cash in Hand' ? ribbon.account : `A/C ${ribbon.account}`}</p>
                {#if ribbon.detail}
                  <p class="ribbon-detail">{ribbon.detail}</p>
                {/if}
              </div>
            </div>
            <strong class="amount">₹{ribbon.amount}</strong>
          </article>
        {/each}

        <article
          class="ribbon total-ribbon"
          style="--ribbon-bg:#0f172a; --ribbon-bg-end:#1e293b; --ribbon-text:#ffffff; --ribbon-muted:rgba(255,255,255,0.72); --ribbon-icon:#f8fafc; --ribbon-stripe:#f59e0b; --ribbon-border:#0f172a;"
        >
          <div class="ribbon-info">
            <div class="logo-wrap total-mark" aria-hidden="true">₹</div>
            <div>
              <p class="bank">Total</p>
              <p class="account">All accounts</p>
            </div>
          </div>
          <strong class="amount">₹{totalAmount}</strong>
        </article>

        {#each creditCards as card}
          <article
            class="ribbon"
            style="--ribbon-bg:#ffe8ec; --ribbon-bg-end:#c4dcff; --ribbon-text:#173f7a; --ribbon-muted:#5a6473; --ribbon-icon:#1f4b8f; --ribbon-stripe:#e31e2f; --ribbon-border:#bfd0eb;"
          >
            <div class="ribbon-info">
              <div class="logo-wrap total-mark" aria-hidden="true">₹</div>
              <div>
                <p class="bank">{card.name}</p>
                <p class="account">{card.note}</p>
              </div>
            </div>
            <strong class="amount">{formatCurrency(card.amount)}</strong>
          </article>
        {/each}

        <article class="loan-ribbon people-ribbon">
            <div class="loan-header">
              <div class="loan-header-main">
                <div class="logo-wrap total-mark" aria-hidden="true">₹</div>
                <div>
                  <p class="bank">{formatCurrency(peopleToGiveMoneyTotal)}</p>
                  <p class="account">Pending personal payments</p>
                </div>
              </div>
            </div>

          <div class="loan-list">
            {#each peopleToGiveMoneySorted as person}
              <div class="loan-row">
                <span>{person.name}</span>
                <strong>{formatCurrency(person.amount)}</strong>
              </div>
            {/each}
          </div>
        </article>
      </section>
    </section>
  {/if}
</main>
