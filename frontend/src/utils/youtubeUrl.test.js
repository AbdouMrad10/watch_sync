import { describe, it, expect } from 'vitest';
import { extractVideoId } from './youtubeUrl.js';
import { validatePseudo, validateCode, validateMessage } from './validators.js';

// Cas de test T-07 du rapport de conception : 6 formes valides, 5 invalides.
describe('extractVideoId', () => {
  const ID = 'dQw4w9WgXcQ';
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `m.youtube.com/watch?v=${ID}`,
  ])('accepte %s', (url) => expect(extractVideoId(url)).toBe(ID));

  it.each([
    '',
    'bonjour',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=trop_court',
    'https://www.youtube.com/playlist?list=PL123',
  ])('refuse %j', (url) => expect(extractVideoId(url)).toBeNull());
});

describe('validators', () => {
  it('pseudo', () => {
    expect(validatePseudo('Al')).toBeNull();
    expect(validatePseudo('A')).not.toBeNull();
    expect(validatePseudo('a'.repeat(21))).not.toBeNull();
    expect(validatePseudo('<script>')).not.toBeNull();
  });
  it('code', () => {
    expect(validateCode('ab23cd')).toBeNull();
    expect(validateCode('AB23')).not.toBeNull();
  });
  it('message', () => {
    expect(validateMessage('salut')).toBeNull();
    expect(validateMessage('   ')).not.toBeNull();
    expect(validateMessage('x'.repeat(501))).not.toBeNull();
  });
});
