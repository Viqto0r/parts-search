import { beforeEach, describe, expect, it, vi } from 'vitest'
import { brandsResponse, hangingFetch, jsonResponse, notFoundResponse } from '../test/fixtures.js'
import { makeStore } from './index.js'
import { clearBrands, fetchBrands } from './brandsSlice.js'

describe('brandsSlice', () => {
  let store

  beforeEach(() => {
    vi.stubEnv('VITE_FAVORIT_API_KEY', 'test-key')
    store = makeStore()
  })

  const brands = () => store.getState().brands

  it('в начале пустой', () => {
    expect(brands()).toEqual({ query: '', requestId: null, items: [], status: 'idle', error: null })
  })

  it('при запросе ставит loading и запоминает артикул', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    store.dispatch(fetchBrands('01089'))
    expect(brands()).toMatchObject({ query: '01089', status: 'loading', error: null })
  })

  it('кладёт в store готовый список брендов', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(brandsResponse))
    await store.dispatch(fetchBrands('01089'))
    expect(brands().status).toBe('succeeded')
    expect(brands().items.map((item) => item.brand)).toEqual(['FEBI', 'Meat & Doria', 'GLASER'])
  })

  it('пустой ответ API даёт succeeded с пустым списком', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(notFoundResponse))
    await store.dispatch(fetchBrands('QQQ'))
    expect(brands()).toMatchObject({ status: 'succeeded', items: [] })
  })

  it('при ошибке API ставит failed и текст', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Invalid key client!' }, 403)
    )
    await store.dispatch(fetchBrands('01089'))
    expect(brands()).toMatchObject({ status: 'failed', error: 'Неверный API-ключ' })
  })

  it('отмена запроса не даёт failed', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    const promise = store.dispatch(fetchBrands('01089'))
    promise.abort()
    await promise
    expect(brands()).toMatchObject({ status: 'loading', error: null })
  })

  it('таймаут даёт failed', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch)
    store.dispatch(fetchBrands('01089'))
    await vi.advanceTimersByTimeAsync(15000)
    expect(brands().status).toBe('failed')
    expect(brands().error).toContain('Сервис недоступен')
  })

  it('clearBrands возвращает начальное состояние', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(brandsResponse))
    await store.dispatch(fetchBrands('01089'))
    store.dispatch(clearBrands())
    expect(brands()).toEqual({ query: '', requestId: null, items: [], status: 'idle', error: null })
  })

  it('игнорирует ответ, пришедший после сброса', async () => {
    let respond
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((resolve) => (respond = resolve)))
    const promise = store.dispatch(fetchBrands('01089'))
    store.dispatch(clearBrands())
    respond(jsonResponse(brandsResponse))
    await promise
    expect(brands().status).toBe('idle')
    expect(brands().items).toEqual([])
  })

  it('запоздавший сбой старого запроса не затирает новый результат', async () => {
    let failOld
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockReturnValueOnce(new Promise((_resolve, reject) => (failOld = reject)))
    store.dispatch(fetchBrands('01089'))
    fetchMock.mockImplementation(async () => jsonResponse(brandsResponse))
    await store.dispatch(fetchBrands('01089'))
    failOld(new TypeError('Failed to fetch'))
    await new Promise((resolve) => setTimeout(resolve))
    expect(brands().status).toBe('succeeded')
  })
})
