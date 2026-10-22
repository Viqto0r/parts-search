const API_URL = 'https://api.favorit-parts.ru/hs/hsprice/'
const TIMEOUT_MS = 15000
const UNAVAILABLE = 'Сервис недоступен, проверьте соединение и повторите попытку'

const KNOWN_ERRORS = [
  ['Invalid key client', 'Неверный API-ключ'],
  ['Empty key', 'Не задан API-ключ'],
  ['Request quota exceeded', 'Превышен лимит запросов, попробуйте позже'],
]

function translateError(error) {
  const text = Array.isArray(error) ? error.join('; ') : String(error)
  const known = KNOWN_ERRORS.find(([code]) => text.includes(code))
  return known ? known[1] : text
}

export async function searchGoods({ number, brand }, signal) {
  const key = import.meta.env.VITE_FAVORIT_API_KEY
  if (!key) {
    throw new Error('Не задан API-ключ, проверьте .env')
  }

  const params = new URLSearchParams({ key, number })
  if (brand) {
    params.set('brand', brand)
    params.set('analogues', 'on')
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)
  signal?.addEventListener('abort', () => controller.abort())

  let response
  let text
  try {
    response = await fetch(`${API_URL}?${params}`, { signal: controller.signal })
    text = await response.text()
  } catch (err) {
    if (signal?.aborted) throw err
    // RTK принимает AbortError за отмену пользователем и молча гасит ошибку,
    // поэтому таймаут должен выглядеть как обычная ошибка
    if (timedOut || err instanceof TypeError) throw new Error(UNAVAILABLE, { cause: err })
    throw err
  } finally {
    clearTimeout(timer)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    if (!response.ok) throw new Error(`Ошибка сервера (код ${response.status})`)
    throw new Error('Некорректный ответ сервера')
  }

  // ошибки приходят с кодом 403, так что проверять error нужно раньше response.ok
  if (data.error) throw new Error(translateError(data.error))
  if (!response.ok) throw new Error(`Ошибка сервера (код ${response.status})`)
  return data.goods ?? []
}
