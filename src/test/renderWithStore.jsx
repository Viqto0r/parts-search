import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '../store/index.js'

export function renderWithStore(ui, preloadedState) {
  const store = makeStore(preloadedState)
  return { store, ...render(<Provider store={store}>{ui}</Provider>) }
}
