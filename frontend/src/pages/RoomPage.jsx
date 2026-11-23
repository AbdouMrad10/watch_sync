import VideoPlayer from '../components/VideoPlayer.jsx';
import LoadVideoBar from '../components/LoadVideoBar.jsx';
import PlaylistPanel from '../components/PlaylistPanel.jsx';
import ParticipantList from '../components/ParticipantList.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import InviteBar from '../components/InviteBar.jsx';

export default function RoomPage({ rm, connected }) {
  const { room, isHost } = rm;
  return (
    <div className="room">
      <header className="room-header">
        <div className="brand small"><span className="logo" aria-hidden="true" /><span>synch-watch</span></div>
        <h1>{room.name}</h1>
        <InviteBar code={room.code} />
        <span className="me">{room.you.pseudo}{isHost ? ' (hôte)' : ''}</span>
        <button type="button" className="btn" onClick={rm.leaveRoom}>Quitter</button>
      </header>
      <main className="room-grid">
        <div className="room-main">
          <VideoPlayer room={room} isHost={isHost} connected={connected} onError={rm.reportError} resyncSignal={rm.rejoinCount} />
          <LoadVideoBar onLaunch={rm.loadVideo} onAdd={rm.addToPlaylist} />
          <PlaylistPanel playlist={room.playlist} onRemove={rm.removeFromPlaylist} onReorder={rm.reorderPlaylist} />
        </div>
        <aside className="room-side">
          <ParticipantList participants={room.participants} meId={room.you.id} isHost={isHost} controlMode={room.controlMode} onKick={rm.kick} onModeChange={rm.setControlMode} />
          <ChatPanel messages={room.messages} mePseudo={room.you.pseudo} onSend={rm.sendChat} />
        </aside>
      </main>
    </div>
  );
}
