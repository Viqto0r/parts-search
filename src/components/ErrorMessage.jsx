function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-danger" role="alert">
      <p className={onRetry ? 'mb-2' : 'mb-0'}>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}

export default ErrorMessage
