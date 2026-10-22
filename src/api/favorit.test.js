import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hangingFetch, jsonResponse } from '../test/fixtures.js'
import { searchGoods } from './favorit.js'

function mockFetch(response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

function requestedParams(fetchMock) {
  return new URL(fetchMock.mock.calls[0][0]).searchParams
}

describe('searchGoods', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', 'test-key')
  })

  it('отправляет ключ и номер на https-эндпоинт', async () => {
    const fetchMock = mockFetch(jsonResponse({ goods: [] }))
    await searchGoods({ number: '01089' })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.favorit-parts.ru/hs/hsprice/')
    expect(url.searchParams.get('key')).toBe('test-key')
    expect(url.searchParams.get('number')).toBe('01089')
    expect(url.searchParams.has('analogues')).toBe(false)
  })

  it('с брендом добавляет analogues=on и кодирует спецсимволы', async () => {
    const fetchMock = mockFetch(jsonResponse({ goods: [] }))
    await searchGoods({ number: 'A#1', brand: 'Meat & Doria' })
    expect(fetchMock.mock.calls[0][0]).toContain('brand=Meat+%26+Doria')
    const params = requestedParams(fetchMock)
    expect(params.get('brand')).toBe('Meat & Doria')
    expect(params.get('number')).toBe('A#1')
    expect(params.get('analogues')).toBe('on')
  })

  it('не отправляет запрос без ключа', async () => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', '')
    const fetchMock = mockFetch(jsonResponse({ goods: [] }))
    await expect(searchGoods({ number: '01089' })).rejects.toThrow(
      'Не задан API-ключ, проверьте .env'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('возвращает goods', async () => {
    const goods = [{ goodsID: '1', brand: 'FEBI' }]
    mockFetch(jsonResponse({ goods }))
    expect(await searchGoods({ number: '01089' })).toEqual(goods)
  })

  it('возвращает пустой массив, если goods нет', async () => {
    mockFetch(jsonResponse({}))
    expect(await searchGoods({ number: '01089' })).toEqual([])
  })

  it.each([
    ['Invalid key client!', 'Неверный API-ключ'],
    ['Empty key!', 'Не задан API-ключ'],
    ['Request quota exceeded!', 'Превышен лимит запросов, попробуйте позже'],
    ['Something else', 'Something else'],
    [['Empty key!', 'Empty number goods!'], 'Не задан API-ключ'],
    [['One', 'Two'], 'One; Two'],
  ])('ошибка API %j -> «%s»', async (error, message) => {
    mockFetch(jsonResponse({ error }, 403))
    await expect(searchGoods({ number: '01089' })).rejects.toThrow(message)
  })

  it('сообщает о коде ответа, если error нет', async () => {
    mockFetch(jsonResponse({}, 500))
    await expect(searchGoods({ number: '01089' })).rejects.toThrow('Ошибка сервера (код 500)')
  })

  it('при битом теле и коде 502 сообщает о коде ответа', async () => {
    mockFetch(jsonResponse('<html>', 502))
    await expect(searchGoods({ number: '01089' })).rejects.toThrow('Ошибка сервера (код 502)')
  })

  it('сообщает о битом JSON', async () => {
    mockFetch(jsonResponse('<html>'))
    await expect(searchGoods({ number: '01089' })).rejects.toThrow('Некорректный ответ сервера')
  })

  it('превращает обрыв сети в понятное сообщение', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(searchGoods({ number: '01089' })).rejects.toThrow('Сервис недоступен')
  })

  it('пробрасывает неожиданную ошибку как есть', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new RangeError('boom'))
    await expect(searchGoods({ number: '01089' })).rejects.toThrow('boom')
  })

  it('по таймауту бросает обычную ошибку, а не AbortError', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    const result = searchGoods({ number: '01089' }).catch((err) => err)
    await vi.advanceTimersByTimeAsync(15000)
    const err = await result
    expect(err.name).toBe('Error')
    expect(err.message).toContain('Сервис недоступен')
  })

  it('при внешней отмене пробрасывает AbortError', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    const controller = new AbortController()
    const result = searchGoods({ number: '01089' }, controller.signal)
    controller.abort()
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  })
})
