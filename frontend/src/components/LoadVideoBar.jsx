import { useState } from 'react';
import { extractVideoId } from '../utils/youtubeUrl.js';

export default function LoadVideoBar({ onLaunch, onAdd }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const valid = !!extractVideoId(url);

  const run = (fn) => (e) => {
    e.preventDefault();
    if (!valid) { setError("Ce lien n'est pas une vidéo YouTube valide."); return; }
    setError('');
    fn(url.trim());
    setUrl('');
  };

  return (
    <form className="load-bar" onSubmit={run(onLaunch)}>
      <label className="sr-only" htmlFor="video-url">Lien YouTube</label>
      <input id="video-url" type="url" inputMode="url" placeholder="Collez un lien YouTube" value={url}
        onChange={(e) => { setUrl(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'video-url-err' : undefined} />
      <button type="submit" className="btn primary" disabled={!url.trim()}>Lancer</button>
      <button type="button" className="btn" disabled={!url.trim()} onClick={run(onAdd)}>Ajouter à la playlist</button>
      {error && <p id="video-url-err" className="field-error" role="alert">{error}</p>}
    </form>
  );
}
