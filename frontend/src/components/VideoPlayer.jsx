import { useYouTubePlayer } from '../hooks/useYouTubePlayer.js';
import { useVideoSync } from '../hooks/useVideoSync.js';

export default function VideoPlayer({ room, isHost, connected, onError, resyncSignal }) {
  const player = useYouTubePlayer();
  const { autoplayBlocked, activate } = useVideoSync({ player, initialVideo: room.video, isHost, onError, resyncSignal });
  const hasVideo = !!room.video?.videoId;

  return (
    <section className="player-card" aria-label="Lecteur vidéo">
      <div className="player-frame">
        <div ref={player.containerRef} className="player-mount" />
        {!hasVideo && (
          <div className="player-empty">
            <p>Aucune vidéo pour l'instant.</p>
            <p className="muted">Collez un lien YouTube ci-dessous pour démarrer.</p>
          </div>
        )}
        {autoplayBlocked && (
          <button type="button" className="player-overlay" onClick={activate}>
            Cliquez pour activer la lecture
          </button>
        )}
        <span className={`sync-pill ${connected ? 'ok' : 'off'}`}>
          <span className="dot" aria-hidden="true" />
          {connected ? 'Synchronisé' : 'Reconnexion…'}
        </span>
      </div>
    </section>
  );
}
