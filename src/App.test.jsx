import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { brandsResponse, jsonResponse, makeGood, offersResponse } from './test/fixtures.js'
import { renderWithStore } from './test/renderWithStore.jsx'

function mockApi(handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    return handler(new URL(url).searchParams)
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', 'test-key')
  })

  it('показывает заголовок и поле с подсказкой', () => {
    renderWithStore(<App />)
    expect(screen.getByRole('heading', { name: /поиск запчастей/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/например, 01089/i)).toBeInTheDocument()
  })

  it('проходит путь от артикула до таблицы аналогов', async () => {
    mockApi((params) => jsonResponse(params.has('brand') ? offersResponse : brandsResponse))
    const user = userEvent.setup()
    renderWithStore(<App />)

    await user.type(screen.getByLabelText('Артикул детали'), '01089{Enter}')
    await user.click(await screen.findByRole('button', { name: /FEBI/ }))

    const table = await screen.findByRole('table')
    expect(screen.getByRole('heading', { name: /FEBI 01089/ })).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(5)
    expect(within(table).getByText('искомая')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /FEBI/ })).toHaveClass('active')
  })

  it('новый поиск убирает таблицу предыдущего', async () => {
    mockApi((params) => {
      if (params.has('brand')) return jsonResponse(offersResponse)
      return jsonResponse(params.get('number') === '01089' ? brandsResponse : { goods: [] })
    })
    const user = userEvent.setup()
    renderWithStore(<App />)
    const input = screen.getByLabelText('Артикул детали')

    await user.type(input, '01089{Enter}')
    await user.click(await screen.findByRole('button', { name: /FEBI/ }))
    await screen.findByRole('table')
    await user.type(input, '1{Enter}')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(await screen.findByText(/ничего не найдено/)).toBeInTheDocument()
  })

  it('не показывает ответ на старый запрос, пришедший позже нового', async () => {
    let respondOld
    mockApi((params) => {
      if (params.get('number') === '01089') {
        return new Promise((resolve) => (respondOld = resolve))
      }
      return jsonResponse({ goods: [makeGood({ goodsID: 'new', brand: 'MEYLE', number: '7160' })] })
    })
    const user = userEvent.setup()
    renderWithStore(<App />)
    const input = screen.getByLabelText('Артикул детали')

    await user.type(input, '01089{Enter}')
    await user.clear(input)
    await user.type(input, '7160{Enter}')
    await screen.findByRole('button', { name: /MEYLE/ })
    await act(async () => respondOld(jsonResponse(brandsResponse)))

    expect(screen.getByRole('button', { name: /MEYLE/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /FEBI/ })).not.toBeInTheDocument()
  })

  it('не показывает таблицу, ответ на которую пришёл после клика по другому бренду', async () => {
    let respondFebi
    mockApi((params) => {
      if (!params.has('brand')) return jsonResponse(brandsResponse)
      if (params.get('brand') === 'FEBI') return new Promise((resolve) => (respondFebi = resolve))
      return jsonResponse({
        goods: [makeGood({ goodsID: 'g', brand: 'GLASER', number: 'H01089-00' })],
      })
    })
    const user = userEvent.setup()
    renderWithStore(<App />)

    await user.type(screen.getByLabelText('Артикул детали'), '01089{Enter}')
    await user.click(await screen.findByRole('button', { name: /FEBI/ }))
    await user.click(screen.getByRole('button', { name: /GLASER/ }))
    await screen.findByRole('table')
    await act(async () => respondFebi(jsonResponse(offersResponse)))

    expect(screen.getByRole('heading', { name: /GLASER H01089-00/ })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })
})
