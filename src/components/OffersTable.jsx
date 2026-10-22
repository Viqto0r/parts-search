import { useDispatch, useSelector } from 'react-redux'
import { fetchOffers, selectOffers } from '../store/offersSlice.js'
import { formatPrice } from '../utils/format.js'
import ErrorMessage from './ErrorMessage.jsx'
import Loader from './Loader.jsx'

function OffersTable() {
  const dispatch = useDispatch()
  const { selected, items, status, error } = useSelector(selectOffers)

  if (!selected) return null

  function renderBody() {
    if (status === 'loading') return <Loader />
    if (status === 'failed') {
      return <ErrorMessage message={error} onRetry={() => dispatch(fetchOffers(selected))} />
    }
    if (items.length === 0) return <p className="text-body-secondary">Предложений не найдено</p>

    return (
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Производитель</th>
              <th>Номер</th>
              <th>Название</th>
              <th className="text-end">Остаток</th>
              <th className="text-end">Цена</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className={row.stock === 0 ? 'row-muted' : ''}>
                <td>
                  {row.brand}
                  {row.isOriginal && <span className="badge text-bg-primary ms-2">искомая</span>}
                </td>
                <td>{row.number}</td>
                <td>{row.name}</td>
                <td className="text-end">{row.stock} шт.</td>
                <td className="text-end text-nowrap">
                  {row.price === null
                    ? '—'
                    : `${row.hasPriceRange ? 'от ' : ''}${formatPrice(row.price)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section id="offers">
      <div className="d-flex flex-wrap justify-content-between align-items-baseline column-gap-3 mb-2">
        <h2 className="h5 mb-0">
          {selected.brand} {selected.number} — аналоги и предложения
        </h2>
        {status === 'succeeded' && (
          <span className="text-body-secondary text-nowrap">Позиций: {items.length}</span>
        )}
      </div>
      {renderBody()}
    </section>
  )
}

export default OffersTable
