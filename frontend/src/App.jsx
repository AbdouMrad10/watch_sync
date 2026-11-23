import { useSocket } from './hooks/useSocket.js';
import { useRoom } from './hooks/useRoom.js';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import ErrorToast from './components/ErrorToast.jsx';

export default function App() {
  const { connected } = useSocket();
  const rm = useRoom();
  return (
    <>
      {rm.room ? <RoomPage rm={rm} connected={connected} /> : <HomePage rm={rm} connected={connected} />}
      <ErrorToast toasts={rm.toasts} onDismiss={rm.dismissToast} />
    </>
  );
}
