# Exercise Transposition

Exercises are automatically transposed to fit within each user's vocal range based on their voice profile.

## How It Works

### 1. Voice Profile

Users complete a voice exploration warmup that captures their vocal range:
- `lowest_midi` - The lowest MIDI note they can comfortably sing
- `highest_midi` - The highest MIDI note they can comfortably sing

### 2. Transposition Algorithm

When fetching an exercise (`GET /api/exercises/:slug`), the backend:

1. **Extracts exercise MIDI range** from all notes in the exercise
2. **Calculates midpoints**:
   - Exercise midpoint = `(exerciseMin + exerciseMax) / 2`
   - User's vocal midpoint = `(lowest_midi + highest_midi) / 2`
3. **Computes shift** (rounded to nearest semitone):
   - `shift = round(userMid - exerciseMid)`
4. **Applies shift** to all notes, updating both `pitchTargetMidi` and `pitch` fields

### 3. Example

**User's voice profile:**
- `lowest_midi`: 48 (C3)
- `highest_midi`: 72 (C5)
- Vocal midpoint: 60 (C4)

**Original exercise notes:**
- C4 (60), E4 (64), G4 (67)
- Exercise midpoint: 63.5

**Transposition:**
- Shift = 60 - 63.5 = -3.5 → rounds to -4 semitones

**Transposed exercise notes:**
- G#3 (56), C4 (60), D#4 (63)

The exercise is now centered within the user's comfortable singing range.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No voice profile | Exercise returned unchanged |
| Voice profile incomplete | Exercise returned unchanged |
| Exercise has no notes | Exercise returned unchanged |
| Shift is 0 | Exercise returned unchanged (already centered) |

## API Reference

### Request
```
GET /api/exercises/:slug
Authorization: Bearer <token>
```

### Response
Returns the exercise definition with transposed `pitch` and `pitchTargetMidi` values for each note.

```json
{
  "id": "three_note_intro",
  "name": "Three Note Introduction",
  "steps": [
    {
      "id": "step-1",
      "notes": [
        { "pitch": "G#3", "pitchTargetMidi": 56, ... },
        { "pitch": "C4", "pitchTargetMidi": 60, ... },
        { "pitch": "D#4", "pitchTargetMidi": 63, ... }
      ]
    }
  ]
}
```

## Implementation

See `src/exercises/transposition.js` for the transposition logic.

### Exported Functions

| Function | Description |
|----------|-------------|
| `midiToPitch(midi)` | Convert MIDI number to pitch string (60 → "C4") |
| `getAllMidiFromExercise(definition)` | Extract all MIDI values from exercise |
| `transposeExercise(definition, shift)` | Apply semitone shift to all notes |
| `calculateTranspositionShift(definition, voiceProfile)` | Calculate shift to center exercise |
| `transposeForVoiceProfile(definition, voiceProfile)` | Main function: transpose exercise for user |

	•	Comfort (accuracy matters), or
	•	Stretch (control matters, not cents).
