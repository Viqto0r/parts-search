import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useStore } from 'react-redux'
import { clearBrands, fetchBrands } from '../store/brandsSlice.js'

const MIN_LENGTH = 3
const DEBOUNCE_MS = 600

function SearchForm() {
  const dispatch = useDispatch()
  const store = useStore()
  const [value, setValue] = useState('')
  const request = useRef(null)
  const timer = useRef(null)
  const inputRef = useRef(null)
  const number = value.trim()

  const search = useCallback(
    (text, { force }) => {
      const { query, status } = store.getState().brands
      if (!force && text === query && status !== 'failed') return
      request.current?.abort()
      request.current = dispatch(fetchBrands(text))
    },
    [dispatch, store]
  )

  useEffect(() => {
    if (number.length < MIN_LENGTH) return
    timer.current = setTimeout(() => search(number, { force: false }), DEBOUNCE_MS)
    return () => clearTimeout(timer.current)
  }, [number, search])

  function update(next) {
    setValue(next)
    if (next.trim().length < MIN_LENGTH) {
      request.current?.abort()
      dispatch(clearBrands())
    }
  }

  function handleClear() {
    update('')
    inputRef.current.focus()
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (number.length < MIN_LENGTH) return
    clearTimeout(timer.current)
    search(number, { force: true })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <label htmlFor="number" className="form-label">
        Артикул детали
      </label>
      <div className="input-group">
        <div className="search-field">
          <input
            id="number"
            ref={inputRef}
            className="form-control"
            type="text"
            value={value}
            onChange={(e) => update(e.target.value)}
            placeholder="Например, 01089"
            autoComplete="off"
            autoFocus
          />
          {value && (
            <button
              type="button"
              className="btn-close search-clear"
              aria-label="Очистить"
              onClick={handleClear}
            />
          )}
        </div>
        <button type="submit" className="btn btn-primary">
          Найти
        </button>
      </div>
    </form>
  )
}

export default SearchForm
