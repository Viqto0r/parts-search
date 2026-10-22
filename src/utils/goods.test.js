import { describe, expect, it } from 'vitest'
import { brandsResponse, emptyGood, makeGood, offersResponse } from '../test/fixtures.js'
import { isEmptyGood, toBrandList, toOfferRows } from './goods.js'

describe('isEmptyGood', () => {
  it('узнаёт пустой элемент «ничего не найдено»', () => {
    expect(isEmptyGood(emptyGood)).toBe(true)
  })

  it('узнаёт пустой элемент по нулевому goodsID', () => {
    expect(isEmptyGood(makeGood({ goodsID: '00000000-0000-0000-0000-000000000000' }))).toBe(true)
  })

  it('не трогает настоящий товар', () => {
    expect(isEmptyGood(makeGood())).toBe(false)
  })
})

describe('toBrandList', () => {
  it('возвращает пустой список, если нашёлся только пустой элемент', () => {
    expect(toBrandList([emptyGood], '01089')).toEqual([])
  })

  it('убирает дубли по бренду и номеру', () => {
    const list = toBrandList(brandsResponse.goods, '01089')
    expect(list.filter((item) => item.brand === 'FEBI')).toHaveLength(1)
    expect(list).toHaveLength(3)
  })

  it('оставляет только brand, number и name', () => {
    const [item] = toBrandList([makeGood()], '01089')
    expect(Object.keys(item)).toEqual(['brand', 'number', 'name'])
  })

  it('сначала ставит совпадение с номером без учёта регистра, затем сортирует по бренду', () => {
    const goods = [
      makeGood({ goodsID: '1', brand: 'ZZZ', number: 'ab12' }),
      makeGood({ goodsID: '2', brand: 'AAA', number: 'other' }),
      makeGood({ goodsID: '3', brand: 'MMM', number: 'AB12' }),
    ]
    const brands = toBrandList(goods, 'Ab12').map((item) => item.brand)
    expect(brands).toEqual(['MMM', 'ZZZ', 'AAA'])
  })

  it('различает один бренд с разными номерами', () => {
    const goods = [
      makeGood({ goodsID: '1', number: 'A1' }),
      makeGood({ goodsID: '2', number: 'A2' }),
    ]
    expect(toBrandList(goods, 'A')).toHaveLength(2)
  })
})

describe('toOfferRows', () => {
  const rows = toOfferRows(offersResponse.goods)
  const byId = (id) => rows.find((row) => row.id === id)

  it('ставит искомую деталь первой', () => {
    expect(rows[0]).toMatchObject({ id: 'id-1', isOriginal: true })
    expect(rows.slice(1).every((row) => !row.isOriginal)).toBe(true)
  })

  it('отбрасывает пустые элементы', () => {
    expect(rows).toHaveLength(4)
  })

  it('сортирует аналоги: в наличии по цене, затем без наличия', () => {
    expect(rows.map((row) => row.id)).toEqual(['id-1', 'id-cheap', 'id-range', 'id-gone'])
  })

  it('берёт минимальную цену со складов, а не цену товара', () => {
    expect(byId('id-range')).toMatchObject({ price: 1200, hasPriceRange: true })
    expect(byId('id-1').price).toBe(1082)
  })

  it('не считает диапазоном одинаковые цены на складах', () => {
    const [row] = toOfferRows([
      makeGood({
        warehouses: [
          { id: 'a', price: 100, stock: 1 },
          { id: 'b', price: 100, stock: 1 },
        ],
      }),
    ])
    expect(row.hasPriceRange).toBe(false)
  })

  it('товар без складов получает цену null', () => {
    expect(byId('id-gone')).toMatchObject({ price: null, stock: 0, hasPriceRange: false })
  })

  it('убирает дубли по goodsID, в том числе оригинал среди аналогов', () => {
    const original = makeGood({ analogues: [makeGood(), makeGood({ goodsID: 'id-2' })] })
    expect(toOfferRows([original]).map((row) => row.id)).toEqual(['id-1', 'id-2'])
  })

  it('сортирует аналоги без наличия по бренду', () => {
    const gone = (goodsID, brand) => makeGood({ goodsID, brand, count: 0, warehouses: [] })
    const goods = [
      makeGood({ analogues: [gone('2', 'ZZZ'), gone('3', 'AAA'), makeGood({ goodsID: '4' })] }),
    ]
    expect(toOfferRows(goods).map((row) => row.id)).toEqual(['id-1', '4', '3', '2'])
  })

  it('работает, если analogues нет', () => {
    expect(toOfferRows([makeGood()])).toHaveLength(1)
  })
})
