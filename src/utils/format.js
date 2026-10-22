const formatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })

export function formatPrice(value) {
  return formatter.format(value)
}
