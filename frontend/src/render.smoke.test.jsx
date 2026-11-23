import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import HomePage from './pages/HomePage.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import PlaylistPanel from './components/PlaylistPanel.jsx';
import ParticipantList from './components/ParticipantList.jsx';
import ErrorToast from './components/ErrorToast.jsx';

// Test de fumée : les composants s'affichent sans erreur et le texte du chat est échappé (NF06, T-18).
globalThis.window = { location: { pathname: '/salon/AB23CD' } };

describe('rendu des composants', () => {
  it("l'accueil pré-remplit le code depuis l'URL", () => {
    expect(renderToString(<HomePage rm={{}} connected />)).toContain('value="AB23CD"');
  });
  it('le chat échappe le HTML', () => {
    const html = renderToString(<ChatPanel mePseudo="A" onSend={() => {}} messages={[{ id: 1, pseudo: 'B', text: '<img src=x onerror=alert(1)>', time: 0 }]} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
  it('la playlist et les participants se rendent', () => {
    expect(renderToString(<PlaylistPanel playlist={{ items: [{ id: 1, videoId: 'dQw4w9WgXcQ', title: 'A', addedBy: 'B' }], currentIndex: 0 }} onRemove={() => {}} onReorder={() => {}} />)).toContain('En cours');
    expect(renderToString(<ParticipantList participants={[{ id: 'a', pseudo: 'Alice', isHost: true }]} meId="a" isHost controlMode="all" onKick={() => {}} onModeChange={() => {}} />)).toContain('hôte');
    expect(renderToString(<ErrorToast toasts={[{ id: 1, message: 'Oups', kind: 'error' }]} onDismiss={() => {}} />)).toContain('Oups');
  });
});
