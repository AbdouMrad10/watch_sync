// Extrait l'identifiant (11 caractères) d'une URL YouTube, ou renvoie null.
// Formes acceptées : youtube.com/watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID, /live/ID.
const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be']);

export function extractVideoId(input) {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (!text) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  let id = null;
  if (url.hostname.toLowerCase() === 'youtu.be') {
    id = url.pathname.split('/')[1];
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else {
    const m = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
    id = m ? m[2] : null;
  }
  return id && ID.test(id) ? id : null;
}
