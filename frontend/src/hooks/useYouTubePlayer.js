import { useEffect, useMemo, useRef, useState } from 'react';

// États renvoyés par l'IFrame Player API.
export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

let apiPromise = null;
function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previous) previous();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiPromise;
}

// Encapsule le lecteur YouTube. Le composant qui l'utilise rend <div ref={containerRef} />.
// Les actions sont sans effet tant que `ready` est faux.
export function useYouTubePlayer() {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const handlers = useRef({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // YT.Player remplace son élément : on lui donne un nœud à part pour ne pas gêner React.
    const mount = document.createElement('div');
    containerRef.current.appendChild(mount);
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(mount, {
        width: '100%',
        height: '100%',
        playerVars: { controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => handlers.current.onStateChange?.(e.data),
          onError: (e) => handlers.current.onError?.(e.data),
        },
      });
    });
    return () => {
      cancelled = true;
      setReady(false);
      try { playerRef.current?.destroy(); } catch { /* lecteur déjà détruit */ }
      playerRef.current = null;
      mount.remove();
    };
  }, []);

  const api = useMemo(() => ({
    load: (videoId, start = 0) => playerRef.current?.loadVideoById({ videoId, startSeconds: Math.max(0, start) }),
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds) => playerRef.current?.seekTo(Math.max(0, seconds), true),
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
    getState: () => playerRef.current?.getPlayerState?.() ?? YT_STATE.UNSTARTED,
    setHandlers: (h) => { handlers.current = h; },
  }), []);

  return { containerRef, ready, ...api };
}
