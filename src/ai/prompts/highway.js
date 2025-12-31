const HIGHWAY_SYSTEM_PROMPT = `You are an expert vocal training exercise designer.
You create highway exercises with pitch cues for voice training applications.
You understand MIDI note numbers and musical notation.
Always respond with valid JSON matching the requested schema.
Ensure all pitch targets are within the user's vocal range.`;

const MIDI_REFERENCE = {
  'C2': 36, 'D2': 38, 'E2': 40, 'F2': 41, 'G2': 43, 'A2': 45, 'B2': 47,
  'C3': 48, 'D3': 50, 'E3': 52, 'F3': 53, 'G3': 55, 'A3': 57, 'B3': 59,
  'C4': 60, 'D4': 62, 'E4': 64, 'F4': 65, 'G4': 67, 'A4': 69, 'B4': 71,
  'C5': 72, 'D5': 74, 'E5': 76, 'F5': 77, 'G5': 79, 'A5': 81, 'B5': 83,
  'C6': 84, 'D6': 86, 'E6': 88, 'F6': 89, 'G6': 91, 'A6': 93, 'B6': 95,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert MIDI number to note name
 * @param {number} midi - MIDI note number
 * @returns {string} Note name (e.g., "C4")
 */
export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

/**
 * Convert MIDI number to frequency in Hz
 * @param {number} midi - MIDI note number
 * @returns {number} Frequency in Hz
 */
export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Build a highway exercise generation prompt
 * @param {Object} options
 * @param {string} options.trackId - Identifier for the track
 * @param {string} options.difficulty - 'beginner', 'intermediate', 'advanced'
 * @param {Object} options.vocalRange - { minMidi, maxMidi } user's vocal range
 * @param {number} [options.durationMs] - Target duration in milliseconds
 * @param {number} [options.cueCount] - Number of cues to generate
 * @param {Object} [options.context] - Additional context (previous performance, etc.)
 * @returns {Array} Messages array for the AI
 */
export function buildHighwayPrompt({
  trackId,
  difficulty,
  vocalRange,
  durationMs = 15000,
  cueCount = 5,
  context = {},
}) {
  let systemContent = HIGHWAY_SYSTEM_PROMPT;

  if (context.recentAccuracy !== undefined) {
    systemContent += `\n\nUser's recent pitch accuracy: ${context.recentAccuracy}%`;
  }
  if (context.strengthNotes?.length) {
    systemContent += `\nUser performs well on notes: ${context.strengthNotes.join(', ')}`;
  }
  if (context.weakNotes?.length) {
    systemContent += `\nUser needs practice on notes: ${context.weakNotes.join(', ')}`;
  }

  const difficultyGuidance = {
    beginner: 'Use simple intervals (2nds, 3rds), longer hold times (2-3 seconds), and more spacing between cues.',
    intermediate: 'Include moderate intervals (up to 5ths), medium hold times (1.5-2.5 seconds), with some faster transitions.',
    advanced: 'Use varied intervals including larger jumps, shorter hold times (1-2 seconds), and quick transitions.',
  };

  const availableNotes = Object.entries(MIDI_REFERENCE)
    .filter(([_, midi]) => midi >= vocalRange.minMidi && midi <= vocalRange.maxMidi)
    .map(([name, midi]) => `${name}: ${midi}`)
    .join(', ');

  const minFreq = Math.round(midiToFrequency(vocalRange.minMidi) * 10) / 10;
  const maxFreq = Math.round(midiToFrequency(vocalRange.maxMidi) * 10) / 10;

  return [
    { role: 'system', content: systemContent },
    {
      role: 'user',
      content: `Create a highway vocal training exercise with these parameters:

Track ID: "${trackId}"
Difficulty: ${difficulty}
Total Duration: ${durationMs}ms
Number of Cues: ${cueCount}

User's Vocal Range:
- Minimum MIDI note: ${vocalRange.minMidi} (${midiToNoteName(vocalRange.minMidi)})
- Maximum MIDI note: ${vocalRange.maxMidi} (${midiToNoteName(vocalRange.maxMidi)})

Difficulty Guidelines: ${difficultyGuidance[difficulty] || difficultyGuidance.beginner}

MIDI Reference (use these exact values):
${availableNotes}

Respond with JSON in this exact format:
{
  "trackId": "${trackId}",
  "language": "english",
  "durationMs": ${durationMs},
  "sampleRate": 44100,
  "pitchModel": "medium",
  "frequencyRange": {
    "min": ${minFreq},
    "max": ${maxFreq}
  },
  "totalCues": ${cueCount},
  "cues": [
    {
      "kind": "voice",
      "text": "<note name like C4, D4>",
      "timeIn": <start time in ms>,
      "timeOut": <end time in ms>,
      "pitchTargetMidi": <MIDI note number>,
      "id": "<unique id like c1, c2>"
    }
  ]
}

Rules:
1. ALL pitchTargetMidi values MUST be between ${vocalRange.minMidi} and ${vocalRange.maxMidi}
2. timeIn must be < timeOut for each cue
3. Cues must not overlap (one cue's timeOut <= next cue's timeIn)
4. First cue should start at least 1000ms into the exercise
5. Last cue should end at least 500ms before durationMs
6. Each cue id must be unique`,
    },
  ];
}
