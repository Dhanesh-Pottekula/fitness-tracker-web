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
  physicalHealth: data.physicalHealth ?? { targets: {}, foods: [], daily: {} },
}
