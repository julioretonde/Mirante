// =============================================================================
//  Músicas (composições originais) — uma por bioma + tema do título.
// -----------------------------------------------------------------------------
//  Notação: cada token é uma semicolcheia (1/16 de compasso).
//    'C5'  nota      '-'  prolonga a nota anterior      '.'  pausa
//  Trilhas com `chords` geram arpejos automaticamente a partir das cifras
//  (1 cifra por compasso). Bateria: k bumbo, s caixa, h chimbal, o prato.
//  wave: 0.125 / 0.25 / 0.5 (ondas de pulso) ou 'triangle'.
// =============================================================================

const bar = (s) => s; // só para deixar os compassos legíveis

export const SONGS = {
  // ----------------------------------------------------------- TÍTULO --------
  title: {
    bpm: 104,
    tracks: [
      {
        wave: 0.25,
        vol: 0.17,
        notes: [
          bar('G4 - - - B4 - D5 - G5 - - - F#5 - E5 -'),
          bar('E5 - - - C5 - - - E5 - - - G5 - - -'),
          bar('F#5 - - - A5 - - - D5 - - - F#5 - E5 -'),
          bar('D5 - - - - - - - B4 - - - - - - -'),
          bar('B4 - - - E5 - - - G5 - - - B5 - - -'),
          bar('C6 - - - B5 - A5 - G5 - - - E5 - - -'),
          bar('F#5 - - - E5 - D5 - A5 - - - F#5 - - -'),
          bar('D5 - - - - - - - A4 - - - D5 - - -'),
        ].join(' '),
      },
      { wave: 'triangle', vol: 0.3, chords: ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'D'], pattern: [0, 2, 0, 2], every: 4, octave: 2, gate: 0.8 },
      { wave: 0.125, vol: 0.05, chords: ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'D'], pattern: [0, 1, 2, 1], every: 2, octave: 4 },
      { kind: 'drum', vol: 0.6, notes: 'k . h . s . h . k . h . s . h .', repeat: 8 },
    ],
  },

  // ---------------------------------------------------------- FLORESTA -------
  forest: {
    bpm: 92,
    tracks: [
      {
        wave: 0.25,
        vol: 0.15,
        notes: [
          bar('E5 - - - G5 - E5 - D5 - C5 - D5 - - -'),
          bar('C5 - - - A4 - - - E5 - - - . . . .'),
          bar('F5 - - - A5 - G5 - F5 - E5 - D5 - C5 -'),
          bar('D5 - - - - - . . G4 - A4 - B4 - D5 -'),
          bar('E5 - - - G5 - C6 - - - B5 - G5 - - -'),
          bar('A5 - - - G5 - E5 - C5 - - - E5 - - -'),
          bar('F5 - E5 - D5 - C5 - A4 - - - C5 - D5 -'),
          bar('B4 - - - - - - - G4 - - - . . . .'),
        ].join(' '),
      },
      { wave: 'triangle', vol: 0.28, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], pattern: [0, 2, 0, 2], every: 4, octave: 2, gate: 0.7 },
      { wave: 0.125, vol: 0.05, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], pattern: [0, 1, 2, 1], every: 2, octave: 4 },
      { kind: 'drum', vol: 0.35, notes: 'k . . . . . h . . . . . . . h .', repeat: 8 },
    ],
  },

  // ------------------------------------------------------------ RUÍNAS -------
  ruins: {
    bpm: 80,
    tracks: [
      {
        wave: 0.5,
        vol: 0.12,
        vibrato: 4,
        notes: [
          bar('A4 - - - - - - - C5 - - - D5 - - -'),
          bar('B4 - - - - - - - . . . . . . . .'),
          bar('F5 - - - E5 - - - D5 - - - C5 - - -'),
          bar('E5 - - - - - - - . . . . G4 - - -'),
          bar('A4 - - - D5 - - - F5 - - - E5 - D5 -'),
          bar('B4 - - - - - D5 - - - - - . . . .'),
          bar('C5 - - - B4 - A4 - G4 - - - A4 - - -'),
          bar('E4 - - - - - - - . . . . . . . .'),
        ].join(' '),
      },
      { wave: 'triangle', vol: 0.28, chords: ['Dm', 'G', 'Dm', 'C', 'Dm', 'G', 'Am', 'C'], pattern: [0, 0], every: 8, octave: 2, gate: 0.95 },
      { wave: 0.125, vol: 0.055, chords: ['Dm7', 'G', 'Dm7', 'C', 'Dm7', 'G', 'Am7', 'C'], pattern: [0, 2, 1, 3, 2, 4, 3, 1], every: 1, octave: 4, gate: 0.6 },
      { kind: 'drum', vol: 0.25, notes: 'k . . . . . . . . . . . h . . .', repeat: 8 },
    ],
  },

  // ----------------------------------------------------------- CASTELO -------
  castle: {
    bpm: 116,
    tracks: [
      {
        wave: 0.25,
        vol: 0.15,
        notes: [
          bar('A4 - - - E5 - - - A5 - G5 - E5 - - -'),
          bar('F5 - - - E5 - D5 - C5 - - - D5 - E5 -'),
          bar('D5 - - - B4 - - - G4 - A4 - B4 - D5 -'),
          bar('C5 - - - B4 - - - A4 - - - - - - -'),
          bar('E5 - - - A5 - - - C6 - B5 - A5 - - -'),
          bar('A5 - - - G5 - F5 - E5 - - - F5 - G5 -'),
          bar('G5 - - - F5 - E5 - D5 - - - E5 - D5 -'),
          bar('B4 - - - - - - - G#4 - - - E4 - - -'),
        ].join(' '),
      },
      { wave: 0.5, vol: 0.1, chords: ['Am', 'F', 'G', 'Am', 'Am', 'F', 'G', 'E'], pattern: [0, 0, 0, 0], every: 2, octave: 2, gate: 0.5 },
      { wave: 0.125, vol: 0.045, chords: ['Am', 'F', 'G', 'Am', 'Am', 'F', 'G', 'E'], pattern: [0, 1, 2, 1], every: 2, octave: 4 },
      {
        kind: 'drum',
        vol: 0.55,
        notes: [
          'k . h . s . h . k . h . s . h .',
          'k . h . s . h . k . h . s . h .',
          'k . h . s . h . k . h . s . h .',
          'k . h . s . h . k . h . s . h .',
          'k . h . s . h . k . h . s . h .',
          'k . h . s . h . k . h . s . h .',
          'k . h . s . h . k . h . s . h .',
          'k . h . s . h . k . s . s s s s',
        ].join(' '),
      },
    ],
  },

  // ---------------------------------------------------------- CATEDRAL -------
  cathedral: {
    bpm: 66,
    tracks: [
      {
        wave: 0.125,
        vol: 0.1,
        vibrato: 5,
        notes: [
          bar('B5 - - - - - - - G5 - - - - - - -'),
          bar('E5 - - - - - - - G5 - - - F#5 - - -'),
          bar('E5 - - - - - - - C5 - - - - - - -'),
          bar('D#5 - - - - - - - F#5 - - - B4 - - -'),
          bar('G5 - - - - - - - B5 - - - - - - -'),
          bar('C6 - - - - - - - B5 - - - A5 - - -'),
          bar('F#5 - - - - - - - D#5 - - - B4 - - -'),
          bar('E5 - - - - - - - - - - - - - - -'),
        ].join(' '),
      },
      // "órgão": três vozes sustentadas levemente desafinadas
      { wave: 0.5, vol: 0.06, gate: 0.98, attack: 0.08, notes: seq16(['E4', 'C4', 'A3', 'B3', 'E4', 'A3', 'B3', 'E4']) },
      { wave: 0.5, vol: 0.05, gate: 0.98, attack: 0.08, detune: 7, notes: seq16(['G4', 'E4', 'C4', 'D#4', 'G4', 'C4', 'D#4', 'G4']) },
      { wave: 0.25, vol: 0.045, gate: 0.98, attack: 0.08, detune: -6, notes: seq16(['B4', 'G4', 'E4', 'F#4', 'B4', 'E4', 'F#4', 'B4']) },
      { wave: 'triangle', vol: 0.3, gate: 0.98, notes: seq16(['E2', 'C2', 'A2', 'B2', 'E2', 'A2', 'B2', 'E2']) },
      { kind: 'drum', vol: 0.3, notes: 'o . . . . . . . . . . . . . . .', repeat: 8 },
    ],
  },

  // ------------------------------------------------------------- CÉU ---------
  sky: {
    bpm: 100,
    tracks: [
      {
        wave: 0.25,
        vol: 0.13,
        notes: [
          bar('A5 - - - - - C6 - - - B5 - - - - -'),
          bar('G5 - - - - - - - D5 - - - E5 - - -'),
          bar('E5 - - - G5 - - - B5 - - - A5 - G5 -'),
          bar('A5 - - - - - - - . . . . . . . .'),
          bar('C6 - - - B5 - A5 - G5 - - - A5 - - -'),
          bar('B5 - - - - - - - D6 - - - B5 - - -'),
          bar('C6 - - - - - - - - - - - G5 - - -'),
          bar('E5 - - - - - - - . . . . . . . .'),
        ].join(' '),
      },
      { wave: 'triangle', vol: 0.26, chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], pattern: [0, 2], every: 8, octave: 2, gate: 0.9 },
      { wave: 0.125, vol: 0.045, chords: ['Fmaj7', 'G', 'Em7', 'Am7', 'Fmaj7', 'G', 'Cmaj7', 'Cmaj7'], pattern: [0, 1, 2, 3, 4, 3, 2, 1], every: 1, octave: 5, gate: 0.5 },
      { kind: 'drum', vol: 0.3, notes: 'k . . . h . . . . . h . h . . .', repeat: 8 },
    ],
  },
};

/** Uma nota sustentada por compasso (16 passos). */
function seq16(notes) {
  return notes.map((n) => n + ' -'.repeat(15)).join(' ');
}
