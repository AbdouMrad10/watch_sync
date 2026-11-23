# synch-watch – client (front-end)

Interface React + Vite de synch-watch : accueil, salon, lecteur YouTube synchronisé, chat, participants, playlist.
Ce dossier correspond à `client/` dans la structure du dépôt (rapport de conception, §2.3). Responsable : DELMADJI (C), tâches T06 et T11.

## Démarrage

```bash
npm install
npm run mock      # terminal 1 : serveur SIMULÉ sur http://localhost:3000
npm run dev       # terminal 2 : front sur http://localhost:5173
npm test          # tests unitaires et tests de rendu
npm run build     # compilation de production (dossier dist/)
```

Pour tester la synchronisation, ouvrez **deux onglets** (ou deux navigateurs) sur http://localhost:5173 :
créez un salon dans le premier, rejoignez-le dans le second avec le code (ou le lien copié), puis lancez une vidéo.

Quand le vrai serveur de l'équipe back est prêt, arrêtez `npm run mock` : il écoute sur le même port (3000) et Vite redirige `/socket.io` vers lui (voir `vite.config.js`).
Pour viser un serveur sur une autre machine : `VITE_SERVER_URL=http://192.168.1.20:3000 npm run dev`.

## Organisation du code

```
src/
  main.jsx, App.jsx           point d'entrée, choix de la page
  pages/                      HomePage (accueil), RoomPage (salon)
  components/                 VideoPlayer, LoadVideoBar, PlaylistPanel, ParticipantList,
                              ChatPanel, InviteBar, ErrorToast
  hooks/
    useSocket.js              connexion Socket.IO, abonnement aux événements
    useRoom.js                état du salon + actions (create, join, chat, playlist, host…)
    useYouTubePlayer.js       encapsule l'IFrame Player API
    useVideoSync.js           algorithme de synchronisation (§7 du rapport)
  services/socketClient.js    socket unique + emitAck(event, données) qui renvoie une promesse
  utils/                      youtubeUrl.js (extraction d'identifiant), validators.js
mock-server/server.js         serveur simulé qui respecte le contrat du §6
```

## Correspondance avec le rapport de conception

| Rapport | Où dans le code |
|---|---|
| §6.1 / §6.2 contrat d'événements | `useRoom.js` (salon, chat, playlist, hôte), `useVideoSync.js` (`video:*`, `sync:*`) |
| §6.3 codes d'erreur | messages affichés près des champs (`HomePage.jsx`) ou en bandeau (`ErrorToast.jsx`) |
| §7.3 application d'un état | `applyState` dans `useVideoSync.js` |
| §7.4 anti-boucle (500 ms) | `applyingUntil` (1 s de garde) dans `useVideoSync.js` |
| §7.5 détection des seeks | intervalle de 500 ms dans `useVideoSync.js` |
| §7.6 reconnexion | `useRoom.js` (`room:join` automatique) + `resyncSignal` |
| §7.6 autoplay bloqué | bandeau « Cliquez pour activer la lecture » dans `VideoPlayer.jsx` |
| §8 sécurité (XSS) | texte du chat affiché comme texte ; aucun `dangerouslySetInnerHTML` |
| T-07, T-16, T-18 | `src/utils/youtubeUrl.test.js`, `src/render.smoke.test.jsx` |

## Points à valider avec l'équipe back (A et B)

1. **Forme de `state`** dans les ack de `room:create` / `room:join` : le rapport ne la détaille pas. Proposition (celle du serveur simulé) :
   `{ code, name, controlMode, hostId, you: {id, pseudo}, video: {videoId, status, position, referenceTime, serverTime, version}, participants: [{id, pseudo, isHost}], playlist: {items, currentIndex}, messages }`. Mettre à jour le §6 une fois décidé.
2. **Fin de vidéo** : le client de l'hôte envoie `playlist:next` quand le lecteur signale la fin. Le rapport (§7.6) dit que le serveur passe à la suivante : à préciser (le serveur ne voit pas la fin de lecture).
3. **Contrôles YouTube natifs** : le lecteur affiche ses propres contrôles (lecture, pause, barre de progression) ; les actions de l'utilisateur sont détectées et envoyées (`video:play`, `video:pause`, `video:seek`). Les contrôles personnalisés de la maquette pourront venir plus tard.
4. **Version des états** : un `sync:tick` porte la même `version` que le dernier `video:state`. Le client ignore donc uniquement les versions **strictement inférieures** (le pseudo-code du §7.3 du rapport écrit `<=` : à corriger en `<`).

## Conventions

Branches `feat/T06-<sujet>`, commits `type(portée): description` (`feat`, `fix`, `test`, `docs`, `refactor`), mention **[LLM]** si une IA a servi. Notez vos heures dans le document de suivi.

## À faire ensuite (T06)

- Tester à 3 participants sur Chrome, Firefox et Edge (T11), y compris l'autoplay bloqué.
- Affiner l'interface d'après les maquettes (contrôles personnalisés, états de chargement).
- Brancher sur le vrai serveur dès que A et B ont publié leurs modules.
