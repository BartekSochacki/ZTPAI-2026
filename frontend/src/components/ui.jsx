export function ErrorMessage({ error }) {
  if (!error) {
    return null;
  }
  return (
    <div className="alert error">
      {error.message}
      {error.details?.length > 0 && (
        <ul>
          {error.details.map((d, i) => (
            <li key={i}>
              {d.field ? `${d.field}: ` : ''}
              {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SuccessMessage({ message }) {
  if (!message) {
    return null;
  }
  return <div className="alert success">{message}</div>;
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) {
    return null;
  }
  return (
    <div className="pagination">
      <button className="secondary" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        Poprzednia
      </button>
      <span>
        Strona {meta.page} z {meta.totalPages} (razem: {meta.total})
      </span>
      <button className="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onChange(meta.page + 1)}>
        Następna
      </button>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon" onClick={onClose} aria-label="Zamknij">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
