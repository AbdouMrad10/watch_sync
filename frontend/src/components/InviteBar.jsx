import { useState } from 'react';

export default function InviteBar({ code }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/salon/${code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copiez ce lien pour inviter :', link);
    }
  };
  return (
    <div className="invite">
      <span className="code-pill">Code : <strong>{code}</strong></span>
      <button type="button" className="btn" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
    </div>
  );
}
