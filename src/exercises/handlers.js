import { getExerciseBySlug, getAllExercises, getExercisesByType } from './repository.js';
import { getVoiceProfile } from '../voice-profile/repository.js';
import { transposeForVoiceProfile, getTranspositionDetails, midiToPitch } from './transposition.js';
import { logTransposition } from '../logging/index.js';

// GET /api/exercises - List all exercises
export async function listExercises(request, reply) {
  const { type } = request.query;

  const exercises = type
    ? await getExercisesByType(type)
    : await getAllExercises();

  return reply.send({ exercises });
}

// GET /api/exercises/:slug - Get exercise by slug
export async function getExercise(request, reply) {
  const { slug } = request.params;
  const userId = request.user.id;

  const exercise = await getExerciseBySlug(slug);

  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
  }

  // Get user's voice profile and transpose exercise
  const voiceProfile = await getVoiceProfile(userId);

  // Attach transposition details for logging
  if (voiceProfile) {
    const { shift, noteChanges, stretchNotes } = getTranspositionDetails(exercise.definition, voiceProfile);
    request.transpositionLog = {
      timestamp: new Date().toISOString(),
      exercise: {
        id: exercise.id,
        slug: exercise.slug,
        name: exercise.name,
        description: exercise.description,
        type: exercise.type,
      },
      voiceProfile: {
        low: midiToPitch(voiceProfile.lowest_midi),
        lowMidi: voiceProfile.lowest_midi,
        high: midiToPitch(voiceProfile.highest_midi),
        highMidi: voiceProfile.highest_midi,
      },
      shift,
      noteChanges,
      stretchNotes,
    };

    // Log to dedicated transpositions.log file
    logTransposition(request.transpositionLog);
  }

  const definition = transposeForVoiceProfile(exercise.definition, voiceProfile);

  return reply.send(definition);
}
