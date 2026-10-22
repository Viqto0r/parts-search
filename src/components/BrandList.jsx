import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchBrands, selectBrands } from '../store/brandsSlice.js'
import { fetchOffers, selectOffers } from '../store/offersSlice.js'
import ErrorMessage from './ErrorMessage.jsx'
import Loader from './Loader.jsx'

function BrandList() {
  const dispatch = useDispatch()
  const { query, items, status, error } = useSelector(selectBrands)
  const { selected, status: offersStatus } = useSelector(selectOffers)
  const request = useRef(null)

  useEffect(() => {
    if (selected) {
      document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selected])

  function handleSelect({ brand, number }) {
    const isSelected = selected?.brand === brand && selected?.number === number
    if (isSelected && offersStatus !== 'failed') return
    request.current?.abort()
    request.current = dispatch(fetchOffers({ brand, number }))
  }

  if (status === 'idle') return null
  if (status === 'loading') {
    return <Loader />
  }
  if (status === 'failed') {
    return <ErrorMessage message={error} onRetry={() => dispatch(fetchBrands(query))} />
  }
  if (items.length === 0) {
    return <p className="text-body-secondary">По артикулу «{query}» ничего не найдено</p>
  }

  return (
    <div className="list-group">
      {items.map(({ brand, number, name }) => {
        const isActive = selected?.brand === brand && selected?.number === number
        return (
          <button
            key={`${brand}|${number}`}
            type="button"
            className={`list-group-item list-group-item-action${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => handleSelect({ brand, number })}
          >
            <span className="fw-bold">{brand}</span>
            {number.toLowerCase() !== query.toLowerCase() && (
              <small className="ms-2">{number}</small>
            )}
            <div className={isActive ? '' : 'text-body-secondary'}>{name}</div>
          </button>
        )
      })}
    </div>
  )
}

export default BrandList
