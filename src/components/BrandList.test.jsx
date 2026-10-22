import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hangingFetch, jsonResponse, offersResponse } from '../test/fixtures.js'
import { renderWithStore } from '../test/renderWithStore.jsx'
import BrandList from './BrandList.jsx'

const items = [
  { brand: 'FEBI', number: '01089', name: 'Антифриз' },
  { brand: 'GLASER', number: 'H01089-00', name: 'Прокладка' },
]

const offersIdle = { selected: null, items: [], status: 'idle', error: null }

function renderList(brands, offers = offersIdle) {
  return renderWithStore(<BrandList />, {
    brands: { query: '01089', items: [], status: 'succeeded', error: null, ...brands },
    offers,
  })
}

describe('BrandList', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', 'test-key')
  })

  it('ничего не показывает до первого поиска', () => {
    const { container } = renderList({ status: 'idle', query: '' })
    expect(container).toBeEmptyDOMElement()
  })

  it('показывает лоадер во время загрузки', () => {
    renderList({ status: 'loading' })
    expect(screen.getByRole('status')).toHaveTextContent('Загрузка...')
  })

  it('сообщает, что ничего не найдено', () => {
    renderList({ query: 'QQQZZZ999' })
    expect(screen.getByText('По артикулу «QQQZZZ999» ничего не найдено')).toBeInTheDocument()
  })

  it('показывает ошибку и повторяет запрос по кнопке', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    renderList({ status: 'failed', error: 'Неверный API-ключ' })
    expect(screen.getByRole('alert')).toHaveTextContent('Неверный API-ключ')
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('number')).toBe('01089')
  })

  it('выводит производителей и номер, если он отличается от введённого', () => {
    renderList({ items })
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByText('FEBI')).toBeInTheDocument()
    expect(screen.getByText('Прокладка')).toBeInTheDocument()
    expect(screen.getByText('H01089-00')).toBeInTheDocument()
    expect(screen.queryByText('01089')).not.toBeInTheDocument()
  })

  it('подсвечивает выбранного производителя', () => {
    renderList({ items }, { ...offersIdle, selected: { brand: 'GLASER', number: 'H01089-00' } })
    expect(screen.getByRole('button', { name: /GLASER/ })).toHaveClass('active')
    expect(screen.getByRole('button', { name: /FEBI/ })).not.toHaveClass('active')
  })

  it('по клику запрашивает предложения по номеру позиции и прокручивает к таблице', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(offersResponse))
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    const { store } = renderList({ items })
    const target = document.body.appendChild(document.createElement('div'))
    target.id = 'offers'
    await userEvent.click(screen.getByRole('button', { name: /GLASER/ }))
    const params = new URL(fetchMock.mock.calls[0][0]).searchParams
    expect(params.get('number')).toBe('H01089-00')
    expect(params.get('brand')).toBe('GLASER')
    expect(store.getState().offers.selected).toEqual({ brand: 'GLASER', number: 'H01089-00' })
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' })
    target.remove()
  })

  it('не шлёт запрос при повторном клике по выбранному', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    renderList(
      { items },
      { selected: { brand: 'FEBI', number: '01089' }, items: [], status: 'succeeded', error: null }
    )
    await userEvent.click(screen.getByRole('button', { name: /FEBI/ }))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('повторяет запрос по клику на выбранного, если была ошибка', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    renderList(
      { items },
      { selected: { brand: 'FEBI', number: '01089' }, items: [], status: 'failed', error: 'x' }
    )
    await userEvent.click(screen.getByRole('button', { name: /FEBI/ }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('отменяет предыдущий запрос при клике по другому бренду', async () => {
    const signals = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, { signal }) => {
      signals.push(signal)
      return hangingFetch(url, { signal })
    })
    renderList({ items })
    await userEvent.click(screen.getByRole('button', { name: /FEBI/ }))
    await userEvent.click(screen.getByRole('button', { name: /GLASER/ }))
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })
})
