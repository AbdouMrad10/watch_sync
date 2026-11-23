// Règles de validation identiques à celles du serveur (rapport de conception §6.3 et §8).
// Elles servent uniquement à guider l'utilisateur : le serveur revalide toujours.
export const PSEUDO_RE = /^[\p{L}\p{N} _-]{2,20}$/u;
export const CODE_RE = /^[A-Z2-9]{6}$/;

export function validatePseudo(value) {
  return PSEUDO_RE.test(value.trim()) ? null : 'Le pseudo doit contenir 2 à 20 caractères (lettres, chiffres, espace, tiret, souligné).';
}
export function validateRoomName(value) {
  const n = value.trim().length;
  return n >= 1 && n <= 40 ? null : 'Le nom du salon doit contenir 1 à 40 caractères.';
}
export function validateCode(value) {
  return CODE_RE.test(value.trim().toUpperCase()) ? null : 'Le code du salon contient 6 caractères (lettres et chiffres).';
}
export function validateMessage(value) {
  const n = value.trim().length;
  return n >= 1 && n <= 500 ? null : 'Le message doit contenir 1 à 500 caractères.';
}
