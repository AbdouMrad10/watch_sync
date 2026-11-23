export default function PlaylistPanel({ playlist, onRemove, onReorder }) {
  const { items, currentIndex } = playlist;
  return (
    <section className="panel" aria-labelledby="playlist-title">
      <h2 id="playlist-title">Playlist ({items.length})</h2>
      {items.length === 0 ? (
        <p className="muted">La playlist est vide. Ajoutez un lien YouTube pour préparer la suite.</p>
      ) : (
        <ol className="playlist">
          {items.map((item, i) => (
            <li key={item.id} className={i === currentIndex ? 'current' : ''}>
              <span className="pl-title">{item.title || item.videoId}</span>
              {i === currentIndex && <span className="badge">En cours</span>}
              <span className="pl-by muted">{item.addedBy}</span>
              <span className="pl-actions">
                <button type="button" className="icon-btn" aria-label={`Monter ${item.title || item.videoId}`} disabled={i === 0} onClick={() => onReorder(item.id, i - 1)}>↑</button>
                <button type="button" className="icon-btn" aria-label={`Descendre ${item.title || item.videoId}`} disabled={i === items.length - 1} onClick={() => onReorder(item.id, i + 1)}>↓</button>
                <button type="button" className="icon-btn danger" aria-label={`Retirer ${item.title || item.videoId}`} onClick={() => onRemove(item.id)}>✕</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
