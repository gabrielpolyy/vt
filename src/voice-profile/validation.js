// Voice profile validation module
// Determines if a warmup session capture was successful

const MIN_SUSTAINED_NOTES_PER_SEGMENT = 1;
const MIN_CONFIDENCE = 0.5;

/**
 * Validate voice profile analysis results
 *
 * @param {Object} analysis - Analysis results from analyzeRange
 * @param {number|null} analysis.lowestMidi
 * @param {number|null} analysis.highestMidi
 * @param {number} analysis.confidence
 * @param {Object} analysis.stats
 * @returns {Object} - { valid: boolean, reason: string|null }
 */
export function validateAnalysis({ lowestMidi, highestMidi, confidence, stats }) {
  const { goLowSustainedNotes = 0, goHighSustainedNotes = 0 } = stats || {};

  if (goLowSustainedNotes < MIN_SUSTAINED_NOTES_PER_SEGMENT) {
    return { valid: false, reason: 'insufficient_low_range_data' };
  }

  if (goHighSustainedNotes < MIN_SUSTAINED_NOTES_PER_SEGMENT) {
    return { valid: false, reason: 'insufficient_high_range_data' };
  }

  if (lowestMidi === null || highestMidi === null || lowestMidi >= highestMidi) {
    return { valid: false, reason: 'invalid_range' };
  }

  if (confidence < MIN_CONFIDENCE) {
    return { valid: false, reason: 'low_confidence' };
  }

  return { valid: true, reason: null };
}

export const VALIDATION_CONFIG = {
  MIN_SUSTAINED_NOTES_PER_SEGMENT,
  MIN_CONFIDENCE,
};
