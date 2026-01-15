// Note names for MIDI conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Stretch zone configuration
const STRETCH_SEMITONES = 3;        // Max semitones outside range to keep
const STRETCH_TOLERANCE_CENTS = 80; // Higher tolerance for stretch notes

// Convert MIDI note to pitch string (e.g., 60 -> "C4")
export function midiToPitch(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// Get pitch class (note name without octave, e.g., 60 -> "C")
export function midiToPitchClass(midi) {
  const noteIndex = midi % 12;
  return NOTE_NAMES[noteIndex];
}

// Extract all MIDI values from exercise definition (supports pitch and highway)
export function getAllMidiFromExercise(definition) {
  const midis = [];

  // Pitch exercises: steps with notes
  if (definition.steps) {
    for (const step of definition.steps) {
      if (step.notes) {
        for (const note of step.notes) {
          if (note.pitchTargetMidi != null) {
            midis.push(note.pitchTargetMidi);
          }
        }
      }
    }
  }

  // Highway exercises: cues array
  if (definition.cues) {
    for (const cue of definition.cues) {
      if (cue.pitchTargetMidi != null) {
        midis.push(cue.pitchTargetMidi);
      }
    }
  }

  return midis;
}

// Transpose exercise definition by semitone shift (supports pitch and highway)
export function transposeExercise(definition, shift) {
  if (shift === 0) return definition;

  const transposed = JSON.parse(JSON.stringify(definition)); // Deep clone

  // Pitch exercises: steps with notes
  if (transposed.steps) {
    for (const step of transposed.steps) {
      if (step.notes) {
        for (const note of step.notes) {
          if (note.pitchTargetMidi != null) {
            note.pitchTargetMidi += shift;
            note.pitch = midiToPitch(note.pitchTargetMidi);
            note.text = midiToPitchClass(note.pitchTargetMidi);
          }
        }
      }
    }
  }

  // Highway exercises: cues array
  if (transposed.cues) {
    for (const cue of transposed.cues) {
      if (cue.pitchTargetMidi != null) {
        cue.pitchTargetMidi += shift;
        cue.pitch = midiToPitch(cue.pitchTargetMidi);
        cue.text = midiToPitchClass(cue.pitchTargetMidi);
      }
    }

    // Update globalPitchStats if present
    if (transposed.globalPitchStats) {
      if (transposed.globalPitchStats.minMidi != null) {
        transposed.globalPitchStats.minMidi += shift;
      }
      if (transposed.globalPitchStats.maxMidi != null) {
        transposed.globalPitchStats.maxMidi += shift;
      }
    }
  }

  return transposed;
}

// Calculate semitone shift to center exercise within user's vocal range
export function calculateTranspositionShift(definition, voiceProfile) {
  if (!voiceProfile || voiceProfile.lowest_midi == null || voiceProfile.highest_midi == null) {
    return 0;
  }

  const exerciseMidis = getAllMidiFromExercise(definition);
  if (exerciseMidis.length === 0) {
    return 0;
  }

  const exerciseMin = Math.min(...exerciseMidis);
  const exerciseMax = Math.max(...exerciseMidis);
  const exerciseMid = (exerciseMin + exerciseMax) / 2;

  const userMid = (voiceProfile.lowest_midi + voiceProfile.highest_midi) / 2;

  return Math.round(userMid - exerciseMid);
}

// Fit exercise to voice profile by adjusting tolerance for stretch notes and dropping notes too far outside
// Supports both pitch exercises (steps/notes) and highway exercises (cues)
export function fitExerciseToVoiceProfile(definition, voiceProfile) {
  if (!voiceProfile || voiceProfile.lowest_midi == null || voiceProfile.highest_midi == null) {
    return definition;
  }

  const { lowest_midi, highest_midi } = voiceProfile;
  const fitted = JSON.parse(JSON.stringify(definition)); // Deep clone

  // Pitch exercises: steps with notes
  if (fitted.steps) {
    fitted.steps = fitted.steps
      .map(step => {
        if (!step.notes) {
          return step;
        }

        const fittedNotes = step.notes
          .filter(note => {
            if (note.pitchTargetMidi == null) {
              return true; // Keep notes without pitch target
            }
            const midi = note.pitchTargetMidi;
            // Drop notes beyond stretch zone
            if (midi < lowest_midi - STRETCH_SEMITONES || midi > highest_midi + STRETCH_SEMITONES) {
              return false;
            }
            return true;
          })
          .map(note => {
            if (note.pitchTargetMidi == null) {
              return note;
            }
            const midi = note.pitchTargetMidi;
            // Apply stretch tolerance if outside range but within stretch zone
            if (midi < lowest_midi || midi > highest_midi) {
              return { ...note, toleranceCents: STRETCH_TOLERANCE_CENTS };
            }
            return note;
          });

        // Return step with filtered notes (may be empty)
        return { ...step, notes: fittedNotes };
      })
      .filter(step => step.notes && step.notes.length > 0); // Remove empty steps

    // If all steps removed, return original to avoid empty exercise
    if (fitted.steps.length === 0) {
      return definition;
    }
  }

  // Highway exercises: cues array
  if (fitted.cues) {
    fitted.cues = fitted.cues
      .filter(cue => {
        if (cue.pitchTargetMidi == null || cue.kind !== 'voice') {
          return true; // Keep non-voice cues (pauses, line breaks) and cues without pitch
        }
        const midi = cue.pitchTargetMidi;
        // Drop cues beyond stretch zone
        if (midi < lowest_midi - STRETCH_SEMITONES || midi > highest_midi + STRETCH_SEMITONES) {
          return false;
        }
        return true;
      })
      .map(cue => {
        if (cue.pitchTargetMidi == null || cue.kind !== 'voice') {
          return cue;
        }
        const midi = cue.pitchTargetMidi;
        // Apply stretch tolerance if outside range but within stretch zone
        if (midi < lowest_midi || midi > highest_midi) {
          return { ...cue, toleranceCents: STRETCH_TOLERANCE_CENTS };
        }
        return cue;
      });

    // Update globalPitchStats based on remaining cues
    const remainingMidis = fitted.cues
      .filter(cue => cue.pitchTargetMidi != null && cue.kind === 'voice')
      .map(cue => cue.pitchTargetMidi);

    if (remainingMidis.length > 0 && fitted.globalPitchStats) {
      fitted.globalPitchStats.minMidi = Math.min(...remainingMidis);
      fitted.globalPitchStats.maxMidi = Math.max(...remainingMidis);
    }

    // If all voice cues removed, return original to avoid empty exercise
    const voiceCues = fitted.cues.filter(cue => cue.kind === 'voice');
    if (voiceCues.length === 0) {
      return definition;
    }
  }

  return fitted;
}

// Transpose exercise to fit user's vocal range
export function transposeForVoiceProfile(definition, voiceProfile) {
  const shift = calculateTranspositionShift(definition, voiceProfile);
  const transposed = transposeExercise(definition, shift);
  return fitExerciseToVoiceProfile(transposed, voiceProfile);
}
