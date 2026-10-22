import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hangingFetch } from '../test/fixtures.js'
import { renderWithStore } from '../test/renderWithStore.jsx'
import OffersTable from './OffersTable.jsx'

const selected = { brand: 'FEBI', number: '01089' }

const rows = [
  {
    id: '1',
    brand: 'FEBI',
    number: '01089',
    name: 'Антифриз',
    isOriginal: true,
    stock: 3,
    price: 1082,
    hasPriceRange: false,
  },
  {
    id: '2',
    brand: 'BBB',
    number: 'X2',
    name: 'Разные цены',
    isOriginal: false,
    stock: 7,
    price: 1200,
    hasPriceRange: true,
  },
  {
    id: '3',
    brand: 'AAA',
    number: 'X1',
    name: 'Нет в наличии',
    isOriginal: false,
    stock: 0,
    price: null,
    hasPriceRange: false,
  },
]

function renderTable(offers) {
  return renderWithStore(<OffersTable />, {
    offers: { selected, items: [], status: 'succeeded', error: null, ...offers },
  })
}

describe('OffersTable', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', 'test-key')
  })

  it('ничего не рисует, пока бренд не выбран', () => {
    const { container } = renderTable({ selected: null, status: 'idle' })
    expect(container).toBeEmptyDOMElement()
  })

  it('показывает лоадер', () => {
    renderTable({ status: 'loading' })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('сообщает, что предложений нет', () => {
    renderTable({ items: [] })
    expect(screen.getByText('Предложений не найдено')).toBeInTheDocument()
  })

  it('показывает ошибку и повторяет запрос по кнопке', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    renderTable({ status: 'failed', error: 'Сервис недоступен' })
    expect(screen.getByRole('alert')).toHaveTextContent('Сервис недоступен')
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    const params = new URL(fetchMock.mock.calls[0][0]).searchParams
    expect(params.get('brand')).toBe('FEBI')
    expect(params.get('number')).toBe('01089')
  })

  it('выводит заголовок и счётчик позиций', () => {
    renderTable({ items: rows })
    expect(
      screen.getByRole('heading', { name: 'FEBI 01089 — аналоги и предложения' })
    ).toBeInTheDocument()
    expect(screen.getByText('Позиций: 3')).toBeInTheDocument()
  })

  it('выводит колонки и по строке на товар', () => {
    renderTable({ items: rows })
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual(['Производитель', 'Номер', 'Название', 'Остаток', 'Цена'])
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('помечает искомую деталь бейджем', () => {
    renderTable({ items: rows })
    expect(screen.getAllByText('искомая')).toHaveLength(1)
    const row = screen.getByRole('row', { name: /Антифриз/ })
    expect(within(row).getByText('искомая')).toBeInTheDocument()
  })

  it.each([
    ['Антифриз', /^1\s082,00\s₽$/],
    ['Разные цены', /^от\s1\s200,00\s₽$/],
  ])('показывает цену строки «%s»', (name, price) => {
    renderTable({ items: rows })
    const row = screen.getByRole('row', { name: new RegExp(name) })
    expect(within(row).getAllByRole('cell')[4].textContent).toMatch(price)
  })

  it('приглушает строку без наличия и ставит прочерк вместо цены', () => {
    renderTable({ items: rows })
    const row = screen.getByRole('row', { name: /Нет в наличии/ })
    expect(row).toHaveClass('row-muted')
    const cells = within(row).getAllByRole('cell')
    expect(cells[3]).toHaveTextContent('0 шт.')
    expect(cells[4]).toHaveTextContent('—')
  })
})
