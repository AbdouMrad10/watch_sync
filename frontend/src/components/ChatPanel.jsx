import { useEffect, useRef, useState } from 'react';
import { validateMessage } from '../utils/validators.js';

const fmtTime = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function ChatPanel({ messages, mePseudo, onSend }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    if (validateMessage(text)) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <section className="panel chat" aria-labelledby="chat-title">
      <h2 id="chat-title">Chat</h2>
      <ul className="messages" aria-live="polite">
        {messages.map((m) => m.system ? (
          // Le texte est toujours affiché comme texte (jamais en HTML) : protection XSS, NF06.
          <li key={m.id} className="sys">{m.text}</li>
        ) : (
          <li key={m.id} className={m.pseudo === mePseudo ? 'bubble mine' : 'bubble'}>
            <span className="meta">{m.pseudo} · {fmtTime(m.time)}</span>
            <span>{m.text}</span>
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ul>
      <form className="chat-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-input">Message</label>
        <input id="chat-input" type="text" maxLength={500} autoComplete="off" placeholder="Écrire un message" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn primary" disabled={!!validateMessage(text)}>Envoyer</button>
      </form>
    </section>
  );
}
