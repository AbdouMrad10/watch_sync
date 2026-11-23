import { useState } from 'react';
import { validateCode, validatePseudo, validateRoomName } from '../utils/validators.js';

// Un lien /salon/AB23CD pré-remplit le code du salon.
const codeFromUrl = () => (window.location.pathname.match(/^\/salon\/([A-Za-z0-9]{6})$/)?.[1] ?? '').toUpperCase();

export default function HomePage({ rm, connected }) {
  const [pseudo, setPseudo] = useState('');
  const [roomName, setRoomName] = useState('');
  const [code, setCode] = useState(codeFromUrl());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const run = async (fields, action) => {
    const found = {};
    for (const [k, msg] of Object.entries(fields)) if (msg) found[k] = msg;
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      // Les erreurs du serveur s'affichent près du champ concerné (§6.3).
      const field = { PSEUDO_TAKEN: 'pseudo', PSEUDO_INVALID: 'pseudo', ROOM_NAME_INVALID: 'roomName', ROOM_NOT_FOUND: 'code' }[err.code] ?? 'form';
      setErrors({ [field]: err.message });
    } finally {
      setBusy(false);
    }
  };

  const create = (e) => { e.preventDefault(); run({ pseudo: validatePseudo(pseudo), roomName: validateRoomName(roomName) }, () => rm.createRoom(pseudo, roomName)); };
  const join = (e) => { e.preventDefault(); run({ pseudo: validatePseudo(pseudo), code: validateCode(code) }, () => rm.joinRoom(code, pseudo)); };

  return (
    <main className="home">
      <div className="brand">
        <span className="logo" aria-hidden="true" />
        <h1>synch-watch</h1>
      </div>
      <p className="tagline">Regardez des vidéos ensemble, en temps réel.</p>

      <div className="card">
        <label htmlFor="pseudo">Pseudo</label>
        <input id="pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Ex. : Alice" autoComplete="nickname" aria-invalid={!!errors.pseudo} />
        {errors.pseudo ? <p className="field-error" role="alert">{errors.pseudo}</p> : <p className="hint">2 à 20 caractères</p>}

        <form onSubmit={create}>
          <label htmlFor="roomName">Nom du salon</label>
          <input id="roomName" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Soirée ciné" maxLength={40} aria-invalid={!!errors.roomName} />
          {errors.roomName && <p className="field-error" role="alert">{errors.roomName}</p>}
          <button type="submit" className="btn primary block" disabled={busy || !connected}>Créer un salon</button>
        </form>

        <div className="or"><span>ou</span></div>

        <form onSubmit={join}>
          <label htmlFor="code">Code du salon</label>
          <div className="row">
            <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AB23CD" maxLength={6} aria-invalid={!!errors.code} />
            <button type="submit" className="btn" disabled={busy || !connected}>Rejoindre</button>
          </div>
          {errors.code && <p className="field-error" role="alert">{errors.code}</p>}
        </form>
        {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        {!connected && <p className="field-error" role="status">Connexion au serveur en cours…</p>}
      </div>
    </main>
  );
}
