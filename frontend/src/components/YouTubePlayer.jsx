import { useEffect, useRef } from 'react';

function YouTubePlayer({ videoId = 'dQw4w9WgXcQ' }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '390',
        width: '640',
        videoId,
        playerVars: {
          playsinline: 1,
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
}

export default YouTubePlayer;