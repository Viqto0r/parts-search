import { beforeEach, describe, expect, it, vi } from 'vitest'
import { brandsResponse, hangingFetch, jsonResponse, offersResponse } from '../test/fixtures.js'
import { makeStore } from './index.js'
import { clearBrands, fetchBrands } from './brandsSlice.js'
import { fetchOffers } from './offersSlice.js'

const febi = { brand: 'FEBI', number: '01089' }

describe('offersSlice', () => {
  let store

  beforeEach(() => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', 'test-key')
    store = makeStore()
  })

  const offers = () => store.getState().offers

  it('при запросе запоминает выбранную позицию', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    store.dispatch(fetchOffers(febi))
    expect(offers()).toMatchObject({ selected: febi, status: 'loading' })
  })

  it('кладёт строки таблицы', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(offersResponse))
    await store.dispatch(fetchOffers(febi))
    expect(offers().status).toBe('succeeded')
    expect(offers().items).toHaveLength(4)
    expect(offers().items[0].isOriginal).toBe(true)
  })

  it('вызывает API с номером и брендом позиции', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(offersResponse))
    await store.dispatch(fetchOffers({ brand: 'GLASER', number: 'H01089-00' }))
    const params = new URL(fetchMock.mock.calls[0][0]).searchParams
    expect(params.get('number')).toBe('H01089-00')
    expect(params.get('brand')).toBe('GLASER')
    expect(params.get('analogues')).toBe('on')
  })

  it('при ошибке API ставит failed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'Empty key!' }, 403))
    await store.dispatch(fetchOffers(febi))
    expect(offers()).toMatchObject({ status: 'failed', error: 'Не задан API-ключ' })
  })

  it('отмена запроса не даёт failed', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    const promise = store.dispatch(fetchOffers(febi))
    promise.abort()
    await promise
    expect(offers().status).toBe('loading')
  })

  it('таймаут даёт failed', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    store.dispatch(fetchOffers(febi))
    await vi.advanceTimersByTimeAsync(15000)
    expect(offers().status).toBe('failed')
  })

  it('сбрасывается новым поиском брендов', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(offersResponse))
    await store.dispatch(fetchOffers(febi))
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(brandsResponse))
    store.dispatch(fetchBrands('7160500039S'))
    expect(offers()).toEqual({
      selected: null,
      requestId: null,
      items: [],
      status: 'idle',
      error: null,
    })
  })

  it('сбрасывается через clearBrands', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(offersResponse))
    await store.dispatch(fetchOffers(febi))
    store.dispatch(clearBrands())
    expect(offers()).toEqual({
      selected: null,
      requestId: null,
      items: [],
      status: 'idle',
      error: null,
    })
  })

  it('игнорирует ответ, пришедший после сброса', async () => {
    let respond
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((resolve) => (respond = resolve)))
    const promise = store.dispatch(fetchOffers(febi))
    store.dispatch(clearBrands())
    respond(jsonResponse(offersResponse))
    await promise
    expect(offers().status).toBe('idle')
    expect(offers().items).toEqual([])
  })

  it('игнорирует ошибку, пришедшую после сброса', async () => {
    let respond
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((resolve) => (respond = resolve)))
    const promise = store.dispatch(fetchOffers(febi))
    store.dispatch(clearBrands())
    respond(jsonResponse({ error: 'Empty key!' }, 403))
    await promise
    expect(offers().status).toBe('idle')
  })

  it('запоздавший сбой старого повтора не затирает новый результат', async () => {
    const other = { brand: 'GLASER', number: 'H01089-00' }
    let failOld
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockReturnValueOnce(new Promise((_resolve, reject) => (failOld = reject)))
    store.dispatch(fetchOffers(febi))
    fetchMock.mockImplementation(async () => jsonResponse(offersResponse))
    await store.dispatch(fetchOffers(other))
    await store.dispatch(fetchOffers(febi))
    failOld(new TypeError('Failed to fetch'))
    await new Promise((resolve) => setTimeout(resolve))
    expect(offers().status).toBe('succeeded')
    expect(offers().items).toHaveLength(4)
  })
})
