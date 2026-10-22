const EMPTY_GOODS_ID = '00000000-0000-0000-0000-000000000000'

export function isEmptyGood(good) {
  return !good.brand || good.goodsID === EMPTY_GOODS_ID
}

export function toBrandList(goods, query) {
  const seen = new Set()
  const items = []
  for (const good of goods) {
    const key = `${good.brand}|${good.number}`
    if (isEmptyGood(good) || seen.has(key)) continue
    seen.add(key)
    items.push({ brand: good.brand, number: good.number, name: good.name })
  }

  const isExact = (item) => item.number.toLowerCase() === query.toLowerCase()
  return items.sort((a, b) => isExact(b) - isExact(a) || a.brand.localeCompare(b.brand))
}

export function toOfferRows(goods) {
  const originals = goods.filter((good) => !isEmptyGood(good))
  const analogues = goods
    .flatMap((good) => good.analogues ?? [])
    .filter((good) => !isEmptyGood(good))

  const seen = new Set()
  const rows = []
  for (const [list, isOriginal] of [
    [originals, true],
    [analogues, false],
  ]) {
    for (const good of list) {
      if (seen.has(good.goodsID)) continue
      seen.add(good.goodsID)
      rows.push(toRow(good, isOriginal))
    }
  }

  return rows.sort(compareRows)
}

// цену берём со склада: price на уровне товара документация использовать не велит
function toRow(good, isOriginal) {
  const prices = good.warehouses.map((warehouse) => warehouse.price)
  return {
    id: good.goodsID,
    brand: good.brand,
    number: good.number,
    name: good.name,
    isOriginal,
    stock: good.count,
    price: prices.length ? Math.min(...prices) : null,
    hasPriceRange: new Set(prices).size > 1,
  }
}

function compareRows(a, b) {
  if (a.isOriginal !== b.isOriginal) return a.isOriginal ? -1 : 1
  if (a.price === null || b.price === null) {
    if (a.price !== b.price) return a.price === null ? 1 : -1
    return a.brand.localeCompare(b.brand)
  }
  return a.price - b.price
}
