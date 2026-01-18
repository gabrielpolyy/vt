// Voice profile pitch analysis module
// Implements percentile-based range detection with outlier rejection

import { validateAnalysis } from './validation.js';

const MIN_CONFIDENCE = 0.7;
const CLUSTER_GAP_MS = 150;
const SUSTAINED_DURATION_MS = 300;
const SUSTAINED_MAX_CENTS_VARIANCE = 100;
const PERCENTILE_LOW = 5;
const PERCENTILE_HIGH = 95;
const MAX_OCTAVE_DEVIATION = 2;
const MIN_SUSTAINED_NOTES_PER_SEGMENT = 2;

/**
 * Convert MIDI note difference to cents
 */
function midiToCents(midiDiff) {
  return midiDiff * 100;
}

/**
 * Calculate the Nth percentile of an array
 */
function percentile(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculate median of an array
 */
function median(arr) {
  return percentile(arr, 50);
}

/**
 * Group consecutive samples into temporal clusters
 * Samples within CLUSTER_GAP_MS of each other are grouped together
 */
function clusterSamples(samples) {
  if (samples.length === 0) return [];

  const sorted = [...samples].sort((a, b) => a.timestampMs - b.timestampMs);
  const clusters = [];
  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestampMs - sorted[i - 1].timestampMs;
    if (gap <= CLUSTER_GAP_MS) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
    }
  }
  clusters.push(currentCluster);

  return clusters;
}

/**
 * Find pitch-stable segments within a temporal cluster
 * Groups consecutive samples that stay within 1 semitone of each other
 */
function findPitchSegments(cluster) {
  if (cluster.length === 0) return [];

  const segments = [];
  let currentSegment = [cluster[0]];

  for (let i = 1; i < cluster.length; i++) {
    const sample = cluster[i];
    const segmentMidi = median(currentSegment.map((s) => s.midiNote));

    // If within 1 semitone of segment median, add to current segment
    if (Math.abs(sample.midiNote - segmentMidi) <= 1) {
      currentSegment.push(sample);
    } else {
      // Start new segment
      segments.push(currentSegment);
      currentSegment = [sample];
    }
  }
  segments.push(currentSegment);

  return segments;
}

/**
 * Identify sustained notes from clusters
 * A sustained note is a pitch-stable segment with:
 * - Duration >= SUSTAINED_DURATION_MS
 * - Pitch variance < SUSTAINED_MAX_CENTS_VARIANCE
 */
function identifySustainedNotes(clusters) {
  const sustainedNotes = [];

  for (const cluster of clusters) {
    if (cluster.length < 2) continue;

    // Find pitch-stable segments within this temporal cluster
    const pitchSegments = findPitchSegments(cluster);

    for (const segment of pitchSegments) {
      if (segment.length < 2) continue;

      const startTime = segment[0].timestampMs;
      const endTime = segment[segment.length - 1].timestampMs;
      const duration = endTime - startTime;

      if (duration < SUSTAINED_DURATION_MS) continue;

      const midiValues = segment.map((s) => s.midiNote);
      const medianMidi = median(midiValues);

      // Check variance - all samples should be within threshold of median
      const maxVariance = Math.max(
        ...midiValues.map((m) => Math.abs(midiToCents(m - medianMidi)))
      );

      if (maxVariance <= SUSTAINED_MAX_CENTS_VARIANCE) {
        sustainedNotes.push({
          midiNote: Math.round(medianMidi),
          duration,
          samples: segment,
          segmentId: segment[0].segmentId,
        });
      }
    }
  }

  return sustainedNotes;
}

/**
 * Filter out outliers that are more than MAX_OCTAVE_DEVIATION octaves from median
 */
function rejectOutliers(sustainedNotes) {
  if (sustainedNotes.length === 0) return [];

  const midiValues = sustainedNotes.map((n) => n.midiNote);
  const medianValue = median(midiValues);
  const maxDeviationSemitones = MAX_OCTAVE_DEVIATION * 12;

  return sustainedNotes.filter(
    (note) => Math.abs(note.midiNote - medianValue) <= maxDeviationSemitones
  );
}

/**
 * Main analysis function
 * Takes raw pitch samples and returns computed voice range
 *
 * @param {Array} samples - Array of PitchSample objects
 * @returns {Object} - { lowestMidi, highestMidi, confidence, stats }
 */
export function analyzeRange(samples) {
  if (!samples || samples.length === 0) {
    return {
      lowestMidi: null,
      highestMidi: null,
      confidence: 0,
      stats: { error: 'No samples provided' },
    };
  }

  // Step 1: Filter by confidence threshold
  const confidentSamples = samples.filter((s) => s.confidence >= MIN_CONFIDENCE);

  if (confidentSamples.length === 0) {
    return {
      lowestMidi: null,
      highestMidi: null,
      confidence: 0,
      stats: { error: 'No samples met confidence threshold', totalSamples: samples.length },
    };
  }

  // Step 2: Separate samples by segment
  const goLowSamples = confidentSamples.filter((s) => s.segmentId === 'go_low');
  const goHighSamples = confidentSamples.filter((s) => s.segmentId === 'go_high');

  // Step 3: Cluster and identify sustained notes for each segment
  const goLowClusters = clusterSamples(goLowSamples);
  const goHighClusters = clusterSamples(goHighSamples);

  let goLowSustained = identifySustainedNotes(goLowClusters);
  let goHighSustained = identifySustainedNotes(goHighClusters);

  // Step 4: Reject outliers
  goLowSustained = rejectOutliers(goLowSustained);
  goHighSustained = rejectOutliers(goHighSustained);

  // Step 5: Calculate percentile-based range
  let lowestMidi = null;
  let highestMidi = null;
  let confidence = 0;

  const stats = {
    totalSamples: samples.length,
    confidentSamples: confidentSamples.length,
    goLowSustainedNotes: goLowSustained.length,
    goHighSustainedNotes: goHighSustained.length,
  };

  // Calculate lowest from go_low segment
  if (goLowSustained.length >= MIN_SUSTAINED_NOTES_PER_SEGMENT) {
    const lowMidiValues = goLowSustained.map((n) => n.midiNote);
    lowestMidi = Math.round(percentile(lowMidiValues, PERCENTILE_LOW));
    stats.goLowPercentile = PERCENTILE_LOW;
  } else if (goLowSustained.length > 0) {
    // Fallback: use median if we have some notes but not enough
    const lowMidiValues = goLowSustained.map((n) => n.midiNote);
    lowestMidi = Math.round(median(lowMidiValues));
    stats.goLowFallback = 'median';
  }

  // Calculate highest from go_high segment
  if (goHighSustained.length >= MIN_SUSTAINED_NOTES_PER_SEGMENT) {
    const highMidiValues = goHighSustained.map((n) => n.midiNote);
    highestMidi = Math.round(percentile(highMidiValues, PERCENTILE_HIGH));
    stats.goHighPercentile = PERCENTILE_HIGH;
  } else if (goHighSustained.length > 0) {
    // Fallback: use median if we have some notes but not enough
    const highMidiValues = goHighSustained.map((n) => n.midiNote);
    highestMidi = Math.round(median(highMidiValues));
    stats.goHighFallback = 'median';
  }

  // Calculate overall confidence score (0-1)
  // Based on: number of sustained notes, consistency of readings
  const minExpectedNotes = MIN_SUSTAINED_NOTES_PER_SEGMENT * 2;
  const totalSustained = goLowSustained.length + goHighSustained.length;
  const noteConfidence = Math.min(totalSustained / minExpectedNotes, 1);

  // Range validity check
  const rangeValid = lowestMidi !== null && highestMidi !== null && lowestMidi < highestMidi;
  const rangeConfidence = rangeValid ? 1 : 0.5;

  confidence = Math.round(noteConfidence * rangeConfidence * 100) / 100;

  // Validate the analysis results
  const { valid, reason } = validateAnalysis({ lowestMidi, highestMidi, confidence, stats });

  return {
    lowestMidi,
    highestMidi,
    confidence,
    valid,
    reason,
    stats,
  };
}

export const ANALYSIS_CONFIG = {
  MIN_CONFIDENCE,
  CLUSTER_GAP_MS,
  SUSTAINED_DURATION_MS,
  SUSTAINED_MAX_CENTS_VARIANCE,
  PERCENTILE_LOW,
  PERCENTILE_HIGH,
  MAX_OCTAVE_DEVIATION,
  MIN_SUSTAINED_NOTES_PER_SEGMENT,
};
