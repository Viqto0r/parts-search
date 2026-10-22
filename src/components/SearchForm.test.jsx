import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { brandsResponse, hangingFetch, jsonResponse } from '../test/fixtures.js'
import { renderWithStore } from '../test/renderWithStore.jsx'
import SearchForm from './SearchForm.jsx'

function setup() {
  vi.useFakeTimers()
  // без этого RTL не замечает фейковые таймеры vitest и user-event зависает
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => jsonResponse(brandsResponse))
  const view = renderWithStore(<SearchForm />)
  return { user, fetchMock, ...view }
}

const input = () => screen.getByLabelText('Артикул детали')

describe('SearchForm', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', 'test-key')
  })

  it('ставит фокус в поле при загрузке', () => {
    setup()
    expect(input()).toHaveFocus()
  })

  it('кнопка очистки появляется при вводе, очищает поле и результаты', async () => {
    const { user, store } = setup()
    expect(screen.queryByRole('button', { name: 'Очистить' })).not.toBeInTheDocument()
    await user.type(input(), '01089{Enter}')
    await user.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(input()).toHaveValue('')
    expect(input()).toHaveFocus()
    expect(store.getState().brands.status).toBe('idle')
    expect(screen.queryByRole('button', { name: 'Очистить' })).not.toBeInTheDocument()
  })

  it('ищет через 600 мс после ввода, один раз', async () => {
    const { user, fetchMock } = setup()
    await user.type(input(), '01089')
    await vi.advanceTimersByTimeAsync(599)
    expect(fetchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('обрезает пробелы по краям', async () => {
    const { user, fetchMock } = setup()
    await user.type(input(), '  01089  ')
    await vi.advanceTimersByTimeAsync(600)
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('number')).toBe('01089')
  })

  it('не ищет, пока введено меньше 3 символов', async () => {
    const { user, fetchMock, store } = setup()
    await user.type(input(), '01')
    await vi.advanceTimersByTimeAsync(1000)
    await user.click(screen.getByRole('button', { name: 'Найти' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.getState().brands.status).toBe('idle')
  })

  it('по Enter ищет сразу и не даёт второго запроса от дебаунса', async () => {
    const { user, fetchMock } = setup()
    await user.type(input(), '01089{Enter}')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('по кнопке «Найти» ищет сразу', async () => {
    const { user, fetchMock } = setup()
    await user.type(input(), '01089')
    await user.click(screen.getByRole('button', { name: 'Найти' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('не шлёт запрос повторно для того же артикула', async () => {
    const { user, fetchMock } = setup()
    await user.type(input(), '01089')
    await vi.advanceTimersByTimeAsync(600)
    await user.type(input(), ' ')
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('повторяет запрос после ошибки', async () => {
    const { user, fetchMock } = setup()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await user.type(input(), '01089')
    await vi.advanceTimersByTimeAsync(600)
    await user.type(input(), '{Enter}')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('при вводе короче 3 символов сбрасывает результаты и отменяет запрос', async () => {
    const { user, store } = setup()
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    await user.type(input(), '01089{Enter}')
    expect(store.getState().brands.status).toBe('loading')
    await user.clear(input())
    expect(store.getState().brands).toEqual({
      query: '',
      requestId: null,
      items: [],
      status: 'idle',
      error: null,
    })
  })

  it('новый ввод отменяет предыдущий запрос', async () => {
    const { user, fetchMock } = setup()
    const signals = []
    fetchMock.mockImplementation((url, { signal }) => {
      signals.push(signal)
      return hangingFetch(url, { signal })
    })
    await user.type(input(), '01089{Enter}')
    await user.type(input(), '1{Enter}')
    expect(signals).toHaveLength(2)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  it('не перезаписывает новый результат ответом на старый запрос', async () => {
    const { user, fetchMock, store } = setup()
    let respondOld
    fetchMock
      .mockReturnValueOnce(new Promise((resolve) => (respondOld = resolve)))
      .mockResolvedValueOnce(jsonResponse({ goods: [] }))
    await user.type(input(), '01089{Enter}')
    await user.type(input(), '1{Enter}')
    await act(async () => respondOld(jsonResponse(brandsResponse)))
    expect(store.getState().brands).toMatchObject({ query: '010891', items: [] })
  })
})
