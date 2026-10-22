export function jsonResponse(body, status = 200) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'text/plain' },
  })
}

export function hangingFetch(_url, { signal }) {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  })
}

const EMPTY_GOODS_ID = '00000000-0000-0000-0000-000000000000'

export function makeGood(overrides = {}) {
  return {
    goodsID: 'id-1',
    brand: 'FEBI',
    number: '01089',
    name: 'Антифриз (синий) 1,5 л. G11',
    count: 3,
    price: 1084.23,
    rate: 1,
    warehouses: [{ id: 'w1', code: 'СПБ', own: true, price: 1082, stock: 3 }],
    ...overrides,
  }
}

export const emptyGood = makeGood({
  goodsID: EMPTY_GOODS_ID,
  brand: '',
  number: '',
  name: '',
  count: 0,
  price: 0,
  rate: 0,
  warehouses: [],
})

export const brandsResponse = {
  goods: [
    makeGood({ goodsID: 'id-meat', brand: 'Meat & Doria', number: '01089', name: 'Фильтр' }),
    makeGood({ goodsID: 'id-glaser', brand: 'GLASER', number: 'H01089-00', name: 'Прокладка' }),
    makeGood({ goodsID: 'id-febi', brand: 'FEBI', number: '01089' }),
    makeGood({ goodsID: 'id-febi-dup', brand: 'FEBI', number: '01089' }),
  ],
}

export const offersResponse = {
  goods: [
    makeGood({
      analogues: [
        makeGood({
          goodsID: 'id-gone',
          brand: 'AAA',
          number: 'X1',
          name: 'Нет в наличии',
          count: 0,
          warehouses: [],
        }),
        makeGood({
          goodsID: 'id-range',
          brand: 'BBB',
          number: 'X2',
          name: 'Разные цены',
          count: 7,
          price: 9999,
          warehouses: [
            { id: 'w1', code: 'СПБ', price: 1500, stock: 2 },
            { id: 'w2', code: 'МСК', price: 1200, stock: 5 },
          ],
        }),
        makeGood({
          goodsID: 'id-cheap',
          brand: 'CCC',
          number: 'X3',
          name: 'Дешёвый',
          count: 4,
          warehouses: [{ id: 'w1', code: 'СПБ', price: 500, stock: 4 }],
        }),
        emptyGood,
      ],
    }),
  ],
}

export const notFoundResponse = { goods: [emptyGood] }
