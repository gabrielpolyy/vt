#!/usr/bin/env python3
"""
Pitch Generator Script

Detects pitch from a source WAV file using aubiopitch,
then generates pitch-shifted versions for all notes using sox.

Usage:
    python pitch_generator.py <source.wav> [-o output_dir]
"""

import argparse
import math
import subprocess
import sys
from pathlib import Path


# Note names for file naming (sharp = 's')
NOTE_NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

# MIDI note numbers: C2=36, C3=48, C4=60, C5=72, B5=83
# We generate C2 (36) through B5 (83) = 48 notes
START_MIDI = 36  # C2
END_MIDI = 83    # B5


def hz_to_midi(freq: float) -> float:
    """Convert frequency in Hz to MIDI note number."""
    if freq <= 0:
        return 0
    return 69 + 12 * math.log2(freq / 440)


def midi_to_note_name(midi: int) -> str:
    """Convert MIDI note number to note name like 'C2', 'Cs3', etc."""
    octave = (midi // 12) - 1
    note_index = midi % 12
    return f"{NOTE_NAMES[note_index]}{octave}"


def detect_pitch(source_path: Path) -> float:
    """
    Detect the pitch of a WAV file using aubiopitch.
    Returns the median pitch in Hz.
    """
    print(f"Detecting pitch from: {source_path}")

    result = subprocess.run(
        ['aubiopitch', '-p', 'yinfft', str(source_path)],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"Error running aubiopitch: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    # Parse output: each line is "timestamp pitch"
    pitches = []
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 2:
            try:
                pitch = float(parts[1])
                # Filter out silence/noise (pitch = 0 or very low)
                if pitch > 50:  # Minimum reasonable pitch
                    pitches.append(pitch)
            except ValueError:
                continue

    if not pitches:
        print("Error: No valid pitch detected in the audio file", file=sys.stderr)
        sys.exit(1)

    # Use median to filter outliers
    pitches.sort()
    median_pitch = pitches[len(pitches) // 2]

    midi_note = hz_to_midi(median_pitch)
    note_name = midi_to_note_name(round(midi_note))

    print(f"Detected pitch: {median_pitch:.2f} Hz (MIDI {midi_note:.1f}, ~{note_name})")

    return median_pitch


def generate_shifted_notes(source_path: Path, source_pitch_hz: float, output_dir: Path):
    """
    Generate pitch-shifted versions of the source file for all notes C2-B5.
    Organizes output into octave subdirectories (octave_2, octave_3, etc.)
    """
    source_midi = hz_to_midi(source_pitch_hz)

    print(f"\nGenerating {END_MIDI - START_MIDI + 1} pitch-shifted files...")
    print(f"Output directory: {output_dir}")

    for target_midi in range(START_MIDI, END_MIDI + 1):
        note_name = midi_to_note_name(target_midi)
        octave = (target_midi // 12) - 1

        # Create octave subdirectory
        octave_dir = output_dir / f"octave_{octave}"
        octave_dir.mkdir(parents=True, exist_ok=True)

        output_path = octave_dir / f"{note_name}.wav"

        # Calculate semitone difference
        semitone_diff = target_midi - source_midi
        cents = semitone_diff * 100

        # Run sox to pitch shift and trim (0.2s from start, 0.2s from end)
        result = subprocess.run(
            ['sox', str(source_path), str(output_path), 'pitch', str(int(cents)), 'trim', '0.2', '-0.2'],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            print(f"Error generating {note_name}: {result.stderr}", file=sys.stderr)
        else:
            print(f"  Generated: octave_{octave}/{note_name}.wav (shift: {semitone_diff:+.1f} semitones)")

    print(f"\nDone! Generated {END_MIDI - START_MIDI + 1} files in {output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate pitch-shifted WAV files for all notes C2-B5'
    )
    parser.add_argument('source', type=Path, help='Source WAV file')
    parser.add_argument(
        '-o', '--output',
        type=Path,
        default=Path('output'),
        help='Output directory (default: output)'
    )

    args = parser.parse_args()

    if not args.source.exists():
        print(f"Error: Source file not found: {args.source}", file=sys.stderr)
        sys.exit(1)

    # Detect source pitch
    source_pitch = detect_pitch(args.source)

    # Generate all shifted versions
    generate_shifted_notes(args.source, source_pitch, args.output)


if __name__ == '__main__':
    main()
