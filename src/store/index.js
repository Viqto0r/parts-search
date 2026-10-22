import { configureStore } from '@reduxjs/toolkit'
import brands from './brandsSlice.js'
import offers from './offersSlice.js'

export function makeStore(preloadedState) {
  return configureStore({ reducer: { brands, offers }, preloadedState })
}

export const store = makeStore()
