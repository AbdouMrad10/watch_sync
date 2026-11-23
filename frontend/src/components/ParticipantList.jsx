export default function ParticipantList({ participants, meId, isHost, controlMode, onKick, onModeChange }) {
  return (
    <section className="panel" aria-labelledby="participants-title">
      <h2 id="participants-title">Participants ({participants.length})</h2>
      <ul className="participants">
        {participants.map((p) => (
          <li key={p.id}>
            <span className="avatar" aria-hidden="true">{p.pseudo.slice(0, 1).toUpperCase()}</span>
            <span className="p-name">{p.pseudo}{p.id === meId ? ' (vous)' : ''}</span>
            {p.isHost && <span className="badge host">hôte</span>}
            {isHost && p.id !== meId && (
              <button type="button" className="icon-btn danger" aria-label={`Exclure ${p.pseudo}`} onClick={() => onKick(p.id)}>✕</button>
            )}
          </li>
        ))}
      </ul>
      <div className="mode">
        <span id="mode-label" className="muted">Contrôle de la lecture</span>
        <div className="segmented" role="group" aria-labelledby="mode-label">
          <button type="button" aria-pressed={controlMode === 'all'} disabled={!isHost} onClick={() => onModeChange('all')}>Tous</button>
          <button type="button" aria-pressed={controlMode === 'host'} disabled={!isHost} onClick={() => onModeChange('host')}>Hôte seul</button>
        </div>
      </div>
    </section>
  );
}
