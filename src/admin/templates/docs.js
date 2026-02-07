import { wideLayout } from './layout.js';

function section(id, title, content) {
  return `
  <section id="${id}" class="mb-10">
    <h2 class="text-xl font-semibold text-slate-200 mb-4 border-b border-brand-elevated pb-2">${title}</h2>
    ${content}
  </section>`;
}

function codeBlock(json) {
  const formatted = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
  return `<div class="relative group">
    <pre class="bg-brand-bg p-4 rounded-lg text-sm text-slate-300 overflow-x-auto whitespace-pre">${formatted}</pre>
    <button onclick="copyCode(this)" class="absolute top-2 right-2 p-1.5 rounded-md bg-brand-elevated/80 text-slate-400 hover:text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    </button>
  </div>`;
}

function inlineCode(text) {
  return `<code class="bg-brand-elevated text-brand-gold px-1.5 py-0.5 rounded text-sm">${text}</code>`;
}

function fieldRow(name, description) {
  return `<div class="flex gap-3 py-1.5 text-sm">
    <span class="shrink-0">${inlineCode(name)}</span>
    <span class="text-slate-400">${description}</span>
  </div>`;
}

function schemaTable(columns) {
  return `
  <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="text-left text-slate-400 border-b border-brand-elevated">
          <th class="py-2 pr-4">Column</th>
          <th class="py-2 pr-4">Type</th>
          <th class="py-2">Notes</th>
        </tr>
      </thead>
      <tbody class="text-slate-300">
        ${columns.map(([col, type, notes]) => `
        <tr class="border-b border-brand-elevated/50">
          <td class="py-2 pr-4 font-mono text-brand-gold">${col}</td>
          <td class="py-2 pr-4 text-slate-400">${type}</td>
          <td class="py-2 text-slate-400">${notes}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderSidebar() {
  return `
  <nav class="sticky top-5 w-48 shrink-0 self-start">
    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide m-0 mb-2">Exercises</h3>
    <ul class="list-none m-0 p-0 mb-5 space-y-1.5">
      <li><a href="#menu-schema" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">Schema</a></li>
      <li><a href="#menu-related" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">Related Tables</a></li>
    </ul>
    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide m-0 mb-2">By Type</h3>
    <ul class="list-none m-0 p-0 space-y-1.5">
      <li><a href="#menu-pitch" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">Pitch</a></li>
      <li><a href="#menu-highway" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">Highway</a></li>
      <li><a href="#menu-highway-audio" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">Highway-Audio</a></li>
      <li><a href="#menu-learn" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">Learn</a></li>
    </ul>
  </nav>`;
}

function renderSchema() {
  return section('menu-schema', 'Database Schema — exercises', `
    <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5">
      <div class="flex items-center gap-2 mb-3">
        <h3 class="text-base font-semibold text-slate-200 m-0">exercises</h3>
        <button onclick="copyTableName(this, 'exercises')" class="p-1 rounded-md text-slate-500 hover:text-brand-gold transition-colors cursor-pointer border-0 bg-transparent" title="Copy table name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
      ${schemaTable([
        ['id', 'UUID', 'Primary key, auto-generated'],
        ['slug', 'VARCHAR(50)', 'Unique identifier, e.g. "three_note_intro"'],
        ['user_id', 'UUID', 'NULL for global exercises, set for user-generated (highway)'],
        ['type', 'VARCHAR(20)', 'One of: pitch, highway, learn'],
        ['category', 'VARCHAR(30)', 'pitch_matching, scale_runs, interval_training, highway, audio, learn'],
        ['name', 'VARCHAR(100)', 'Display name'],
        ['description', 'TEXT', 'Short description shown in exercise list'],
        ['definition', 'JSONB', 'Full exercise data — structure varies by type (see below)'],
        ['is_active', 'BOOLEAN', 'Default TRUE. Inactive exercises hidden from users'],
        ['sort_order', 'INTEGER', 'Controls ordering within lists'],
        ['level', 'INTEGER', 'Skill tree level (1-5)'],
        ['genre', 'VARCHAR(30)', 'For audio/highway: pop, rock, etc.'],
        ['access_level', 'VARCHAR(15)', 'guest, registered, or premium'],
        ['created_at', 'TIMESTAMPTZ', 'Auto-set on insert'],
        ['updated_at', 'TIMESTAMPTZ', 'Auto-updated via trigger'],
      ])}
    </div>
  `);
}

function renderPitch() {
  return section('menu-pitch', 'Pitch Exercises', `
    <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5 space-y-6">

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Categories</h3>
        <div class="space-y-1">
          ${fieldRow('pitch_matching', 'Single notes and simple patterns (levels 1-2)')}
          ${fieldRow('scale_runs', 'Major/minor scales and arpeggios (levels 2-4)')}
          ${fieldRow('interval_training', 'Interval jumps — half steps to octaves (levels 3-5)')}
        </div>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Definition Structure</h3>
        <p class="text-sm text-slate-400 m-0 mb-3">${inlineCode('name')} and ${inlineCode('description')} are stored as DB columns and injected into the API response — they are not part of the definition JSON.</p>
        ${codeBlock(`{
  "id": "string",                    // required — matches slug
  "octaveTolerance": 1,              // optional — nil=any octave, 0=exact, 1=±1 octave
  "steps": [                         // required
    {
      "id": "step-1",               // required
      "instruction": {               // optional — null at level 1
        "text": "string",           // required — instruction text
        "audioFile": "string"       // optional — audio file name (no extension)
      },
      "notes": [                     // required
        {
          "pitch": "C4",            // required — note name + octave
          "pitchTargetMidi": 60,    // required — MIDI note number
          "text": "C",              // required — display label
          "restAfterMs": 300,       // required — ms pause after note (0 = last)
          "toleranceCents": 50,     // required — pitch tolerance in cents
          "minHoldMs": 1800         // required — min hold time in ms
        }
      ]
    }
  ]
}`)}
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Field Reference</h3>
        <div class="space-y-4">
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top-level</div>
            <div class="space-y-1">
              ${fieldRow('id', 'Unique exercise identifier')}
              ${fieldRow('octaveTolerance', '(optional) nil = any octave (pitch-class only), 0 = exact octave, 1 = ±1 octave')}
              ${fieldRow('steps', 'Array of exercise steps')}
            </div>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Step</div>
            <div class="space-y-1">
              ${fieldRow('id', 'Unique step identifier')}
              ${fieldRow('instruction', '(optional) Instruction object — null at level 1')}
              ${fieldRow('instruction.text', 'Instruction text displayed to user')}
              ${fieldRow('instruction.audioFile', '(optional) Audio file name without extension')}
              ${fieldRow('notes', 'Array of notes to sing in sequence')}
            </div>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Note</div>
            <div class="space-y-1">
              ${fieldRow('pitch', 'Note in scientific notation — "C4", "G#4", "Bb3"')}
              ${fieldRow('pitchTargetMidi', 'MIDI note number (60 = C4, 72 = C5)')}
              ${fieldRow('text', 'Display label for the note')}
              ${fieldRow('toleranceCents', 'Acceptable deviation in cents (100 cents = 1 semitone)')}
              ${fieldRow('minHoldMs', 'Minimum time user must hold the note at correct pitch')}
              ${fieldRow('restAfterMs', 'Silence between notes. Last note in a step always has 0')}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Example — ${inlineCode('three_note_intro')}</h3>
        ${codeBlock({
          id: "three_note_intro",
          octaveTolerance: 1,
          steps: [{
            id: "step-1",
            instruction: null,
            notes: [
              { pitch: "C4", pitchTargetMidi: 60, text: "C", restAfterMs: 300, toleranceCents: 50, minHoldMs: 1800 },
              { pitch: "E4", pitchTargetMidi: 64, text: "E", restAfterMs: 300, toleranceCents: 50, minHoldMs: 1800 },
              { pitch: "G4", pitchTargetMidi: 67, text: "G", restAfterMs: 0, toleranceCents: 50, minHoldMs: 1800 },
            ]
          }]
        })}
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Difficulty Progression</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left text-slate-400 border-b border-brand-elevated">
                <th class="py-2 pr-4">Level</th>
                <th class="py-2 pr-4">toleranceCents</th>
                <th class="py-2 pr-4">minHoldMs</th>
                <th class="py-2">Content</th>
              </tr>
            </thead>
            <tbody class="text-slate-300">
              <tr class="border-b border-brand-elevated/50">
                <td class="py-2 pr-4">1</td>
                <td class="py-2 pr-4">45–50</td>
                <td class="py-2 pr-4">1200–2000</td>
                <td class="py-2">Single notes, triads, simple patterns</td>
              </tr>
              <tr class="border-b border-brand-elevated/50">
                <td class="py-2 pr-4">2</td>
                <td class="py-2 pr-4">40</td>
                <td class="py-2 pr-4">900–1200</td>
                <td class="py-2">Major & minor scales (full ascending/descending)</td>
              </tr>
              <tr class="border-b border-brand-elevated/50">
                <td class="py-2 pr-4">3</td>
                <td class="py-2 pr-4">35</td>
                <td class="py-2 pr-4">900–1000</td>
                <td class="py-2">Intervals: half steps, whole steps, thirds, fourths, fifths, octaves</td>
              </tr>
              <tr class="border-b border-brand-elevated/50">
                <td class="py-2 pr-4">4</td>
                <td class="py-2 pr-4">30</td>
                <td class="py-2 pr-4">800–900</td>
                <td class="py-2">Arpeggios and melodic sequences</td>
              </tr>
              <tr>
                <td class="py-2 pr-4">5</td>
                <td class="py-2 pr-4">25</td>
                <td class="py-2 pr-4">700–800</td>
                <td class="py-2">Precision drills and mixed challenges</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `);
}

function renderHighway() {
  return section('menu-highway', 'Highway Exercises', `
    <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5 space-y-6">

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Definition Structure</h3>
        <p class="text-sm text-slate-400 m-0 mb-3">The ${inlineCode('Song')} model is the definition for highway exercises. ${inlineCode('name')} and ${inlineCode('description')} are DB columns injected into the API response — not part of the definition JSON.</p>
        <p class="text-sm text-slate-400 m-0 mb-3">Generated by ${inlineCode('vtworker')} — the processing pipeline runs Demucs (vocal separation), CREPE (pitch extraction), and Whisper (transcription), then assembles cues from the results.</p>
        ${codeBlock(`{
  "trackId": "string",               // required — unique track identifier
  "language": "string",              // optional
  "durationMs": 18000,              // required — total track duration in ms
  "globalPitchStats": {             // required
    "minMidi": 60,                 // required — lowest MIDI note
    "maxMidi": 67                  // required — highest MIDI note
  },
  "octaveTolerance": 1,             // optional — nil=any octave, 0=exact, 1=±1
  "instructions": [                  // optional — timed instructions during gameplay
    {
      "text": "string",             // required
      "timeIn": 0,                  // required — start time in ms
      "timeOut": 3000,              // required — end time in ms
      "audioFile": "string"         // optional
    }
  ],
  "cues": [ ... ]                    // required — array of SongCue
}`)}
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">trackId &amp; Audio Files</h3>
        <p class="text-sm text-slate-400 m-0 mb-2">${inlineCode('trackId')} is the key that connects the exercise definition to its audio files in Cloudflare R2.</p>
        <div class="space-y-1 mb-3">
          ${fieldRow('Format', `${inlineCode('track_{job_id}')} — derived from the vtworker job ID (e.g. ${inlineCode('track_190')})`)}
          ${fieldRow('Bucket', `${inlineCode('highway-audio')} on Cloudflare R2`)}
          ${fieldRow('Vocals key', `${inlineCode('vocals_{numericId}.mp3')} — isolated vocal track (44.1 kHz / 192 kbps)`)}
          ${fieldRow('Backing key', `${inlineCode('non_vocals_{numericId}.mp3')} — instrumental track (44.1 kHz / 128 kbps)`)}
        </div>
        <p class="text-sm text-slate-400 m-0 mb-2">The ${inlineCode('track_')} prefix is stripped to get ${inlineCode('numericId')} — both ${inlineCode('"190"')} and ${inlineCode('"track_190"')} formats are accepted.</p>
        <p class="text-sm text-slate-400 m-0 mb-2"><strong>API flow:</strong> ${inlineCode('GET /api/exercises/:slug/audio')} → extracts ${inlineCode('trackId')} from definition → generates presigned R2 URLs (7-day expiry) → returns ${inlineCode('{ vocalsUrl, backingUrl }')}</p>
        <p class="text-sm text-slate-400 m-0">Mobile downloads both tracks and caches them locally. Playback uses dual-track audio (vocals + backing with independent volume control).</p>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">SongInstruction</h3>
        <p class="text-sm text-slate-400 m-0 mb-2">Timed instructions shown during highway gameplay.</p>
        <div class="space-y-1">
          ${fieldRow('text', 'Instruction message to display')}
          ${fieldRow('timeIn', 'Start time in ms from track start')}
          ${fieldRow('timeOut', 'End time in ms')}
          ${fieldRow('audioFile', '(optional) Audio file to play with instruction')}
        </div>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Cue Types</h3>
        <p class="text-sm text-slate-400 m-0 mb-3">All cues are sorted by ${inlineCode('timeIn')} (subtitle breaks sort after voice cues at the same timestamp) and assigned sequential IDs (${inlineCode('c1')}, ${inlineCode('c2')}, ${inlineCode('c3')}, ...).</p>

        <div class="space-y-5">
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">1. voice — sung/spoken words</div>
            <p class="text-sm text-slate-400 m-0 mb-2">Built from transcription words combined with CREPE pitch frames. Each word gets a median MIDI pitch target.</p>
            ${codeBlock(`{
  "kind": "voice",
  "id": "c1",
  "text": "hello",              // the word/syllable
  "timeIn": 1200,               // ms
  "timeOut": 1800,              // ms
  "pitchTargetMidi": 64,        // median MIDI pitch for this word
  "pitch": "E4",                // note name
  "toleranceCents": 80,         // pitch tolerance
  "holdAccuracyPercent": 0.6    // fraction of duration that must be on-pitch
}`)}
            <div class="space-y-1 mt-2">
              ${fieldRow('id', 'Sequential cue identifier (c1, c2, ...)')}
              ${fieldRow('text', 'Word or syllable to display')}
              ${fieldRow('timeIn', 'Start time in ms from track start')}
              ${fieldRow('timeOut', 'End time in ms')}
              ${fieldRow('pitchTargetMidi', 'Target MIDI note number')}
              ${fieldRow('pitch', 'Note name, e.g. "C4", "E4"')}
              ${fieldRow('toleranceCents', 'Pitch tolerance in cents')}
              ${fieldRow('holdAccuracyPercent', 'Fraction of cue duration user must be on-pitch (0.0–1.0)')}
              ${fieldRow('outsideVad', '(optional) Whether cue falls outside voice activity detection')}
            </div>
          </div>

          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">2. pause — gaps between words</div>
            <p class="text-sm text-slate-400 m-0 mb-2">Generated from gaps between consecutive words that are at least 100 ms long.</p>
            ${codeBlock(`{
  "kind": "pause",
  "id": "c5",
  "text": "",
  "timeIn": 3200,               // ms
  "timeOut": 4500               // ms
}`)}
            <div class="space-y-1 mt-2">
              ${fieldRow('text', 'Always empty string')}
              ${fieldRow('timeIn', 'Start of the gap in ms')}
              ${fieldRow('timeOut', 'End of the gap in ms')}
            </div>
          </div>

          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">3. subtitleLineBreak — display line breaks</div>
            <p class="text-sm text-slate-400 m-0 mb-2">Inserted at phrase boundaries based on subtitle formatting rules (max 9 words or 38 chars per line).</p>
            ${codeBlock(`{
  "kind": "subtitleLineBreak",
  "id": "c10",
  "timeIn": 5000                // ms — no timeOut
}`)}
            <div class="space-y-1 mt-2">
              ${fieldRow('timeIn', 'Timestamp where the line break occurs')}
              ${fieldRow('timeOut', 'Always nil — subtitle breaks are point-in-time markers')}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Cue ID Usage</h3>
        <p class="text-sm text-slate-400 m-0 mb-2">Cue IDs (${inlineCode('c1')}, ${inlineCode('c2')}, ...) are sequential and heavily used by the mobile app:</p>
        <div class="space-y-1">
          ${fieldRow('Deduplication', 'HighwayScene tracks spawned IDs in a Set to prevent re-spawning the same note')}
          ${fieldRow('Merging', 'When consecutive same-pitch cues are merged, the first cue\'s ID is preserved')}
          ${fieldRow('Subtitle tracking', 'SubtitleController maps each word to its cue ID for real-time word highlighting')}
          ${fieldRow('SpriteKit nodes', 'Each note node is named note_{cue.id} for debugging and scene-graph lookup')}
          ${fieldRow('Result submission', 'NoteResult includes the cue ID when posting attempt results — server uses it to match results back to cues')}
        </div>
        <p class="text-xs text-slate-500 mt-2 m-0">Do not change existing cue IDs — it would break result correlation and subtitle tracking on mobile.</p>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Example — ${inlineCode('highway_pitch_intro')} (first 3 cues)</h3>
        ${codeBlock({
          trackId: "pitch_highway_intro",
          language: "english",
          durationMs: 18000,
          globalPitchStats: { minMidi: 60, maxMidi: 67 },
          cues: [
            { id: "c1", kind: "voice", text: "C", timeIn: 1000, timeOut: 2200, pitchTargetMidi: 60, pitch: "C4", toleranceCents: 80, holdAccuracyPercent: 0.6 },
            { id: "c2", kind: "voice", text: "E", timeIn: 3000, timeOut: 4200, pitchTargetMidi: 64, pitch: "E4", toleranceCents: 80, holdAccuracyPercent: 0.6 },
            { id: "c3", kind: "voice", text: "G", timeIn: 5000, timeOut: 6200, pitchTargetMidi: 67, pitch: "G4", toleranceCents: 80, holdAccuracyPercent: 0.6 },
          ]
        })}
        <p class="text-xs text-slate-500 mt-2 m-0">Full exercise has 8 cues. Truncated for readability.</p>
      </div>

    </div>
  `);
}

function renderHighwayAudio() {
  return section('menu-highway-audio', 'Highway-Audio (Songs)', `
    <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5 space-y-6">

      <p class="text-sm text-slate-400 m-0">Real songs with vocals + backing tracks. Users sing along while matching pitch targets. The listing model is ${inlineCode('SongDefinition')}; the actual song data uses the same ${inlineCode('Song')} model as Highway (see above).</p>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">SongDefinition Structure</h3>
        ${codeBlock(`{
  "id": "string",               // required — unique song identifier
  "title": "string",            // required — song title
  "artist": "string",           // required — artist name
  "slug": "string",              // required — exercise slug for API lookup
  "durationMs": 180000,         // optional — total duration in ms
  "isFavorite": false,          // optional — defaults to false
  "accessLevel": "string",      // optional — guest, registered, or premium
  "isLocked": false             // optional — whether locked for current user
}`)}
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Field Reference</h3>
        <div class="space-y-1">
          ${fieldRow('id', 'Unique song identifier')}
          ${fieldRow('title', 'Song title displayed in the UI')}
          ${fieldRow('artist', 'Artist or composer name')}
          ${fieldRow('slug', 'Exercise slug for API lookup (e.g. "highway_pitch_intro")')}
          ${fieldRow('durationMs', '(optional) Total song duration in ms, for display before loading')}
          ${fieldRow('isFavorite', '(optional) Whether user has favorited this song — defaults to false')}
          ${fieldRow('accessLevel', '(optional) Access tier: guest, registered, or premium')}
          ${fieldRow('isLocked', '(optional) Whether the song is locked for the current user')}
        </div>
      </div>

    </div>
  `);
}

function renderLearn() {
  return section('menu-learn', 'Learn Exercises', `
    <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5 space-y-6">

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Definition Structure</h3>
        <p class="text-sm text-slate-400 m-0 mb-3">${inlineCode('name')} and ${inlineCode('description')} are DB columns injected into the API response — not part of the definition JSON.</p>
        ${codeBlock(`{
  "id": "string",                        // required
  "title": "string",                     // required
  "sections": [                          // required
    { "type": "text",  "content": "Markdown string" },
    { "type": "image", "url": "/assets/...", "caption": "string" },
    { "type": "audio", "url": "/assets/...", "label": "Listen: ..." }
  ],
  "estimatedReadTimeSeconds": 90         // optional
}`)}
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Field Reference</h3>
        <div class="space-y-1">
          ${fieldRow('id', 'Unique learn exercise identifier')}
          ${fieldRow('title', 'Display title shown in the UI')}
          ${fieldRow('sections', 'Array of content sections (see types below)')}
          ${fieldRow('estimatedReadTimeSeconds', '(optional) Estimated reading time in seconds')}
        </div>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Section Types</h3>
        <p class="text-sm text-slate-400 m-0 mb-2">Each section has a ${inlineCode('type')} field. The other fields (${inlineCode('content')}, ${inlineCode('url')}, ${inlineCode('caption')}, ${inlineCode('label')}) are all optional at the struct level but expected based on type:</p>
        <div class="space-y-1">
          ${fieldRow('text', `Uses ${inlineCode('content')} — markdown-formatted text. Supports **bold**, lists, etc.`)}
          ${fieldRow('image', `Uses ${inlineCode('url')} + optional ${inlineCode('caption')}. URL relative to assets root`)}
          ${fieldRow('audio', `Uses ${inlineCode('url')} + optional ${inlineCode('label')}. Streamed inline in lesson view`)}
        </div>
      </div>

      <div>
        <h3 class="text-base font-semibold text-slate-200 m-0 mb-2">Example — ${inlineCode('learn_pitch_basics')}</h3>
        ${codeBlock({
          id: "learn_pitch_basics",
          title: "Understanding Pitch",
          sections: [
            { type: "text", content: "**Pitch** is the perceived highness or lowness of a sound. When we sing, pitch is determined by how fast our vocal cords vibrate." },
            { type: "image", url: "/assets/learn/images/learn_pitch_basics/test.png", caption: "Example image" },
            { type: "text", content: "**Higher notes** = faster vibrations\n**Lower notes** = slower vibrations" },
            { type: "audio", url: "/assets/learn/audio/learn_pitch_basics/test.mp3", label: "Listen: Example Audio" },
            { type: "text", content: "In this app, we measure pitch in **semitones** - the distance between adjacent piano keys. There are 12 semitones in an octave." },
            { type: "text", content: "**Tip:** Don't worry about hitting exact notes at first. Focus on relative pitch - going up when the target goes up, and down when it goes down." },
          ],
          estimatedReadTimeSeconds: 90,
        })}
      </div>

    </div>
  `);
}

function renderRelated() {
  return section('menu-related', 'Related Tables', `
    <div class="space-y-6">

      <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <h3 class="text-base font-semibold text-slate-200 m-0">exercise_progress</h3>
          <button onclick="copyTableName(this, 'exercise_progress')" class="p-1 rounded-md text-slate-500 hover:text-brand-gold transition-colors cursor-pointer border-0 bg-transparent" title="Copy table name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <p class="text-sm text-slate-400 m-0 mb-3">Tracks per-user progress on each exercise. One row per user+exercise pair.</p>
        ${schemaTable([
          ['id', 'UUID', 'Primary key'],
          ['user_id', 'UUID', 'FK → users'],
          ['exercise_id', 'UUID', 'FK → exercises'],
          ['completed_count', 'INTEGER', 'Number of completions'],
          ['best_score', 'INTEGER', 'Highest score achieved'],
          ['last_played_at', 'TIMESTAMPTZ', 'Last attempt timestamp'],
          ['created_at', 'TIMESTAMPTZ', ''],
          ['updated_at', 'TIMESTAMPTZ', ''],
        ])}
      </div>

      <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <h3 class="text-base font-semibold text-slate-200 m-0">exercise_attempts</h3>
          <button onclick="copyTableName(this, 'exercise_attempts')" class="p-1 rounded-md text-slate-500 hover:text-brand-gold transition-colors cursor-pointer border-0 bg-transparent" title="Copy table name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <p class="text-sm text-slate-400 m-0 mb-3">Individual attempt history. Each play-through creates one row.</p>
        ${schemaTable([
          ['id', 'UUID', 'Primary key'],
          ['user_id', 'UUID', 'FK → users'],
          ['exercise_id', 'UUID', 'FK → exercises'],
          ['score', 'INTEGER', 'Attempt score'],
          ['completed', 'BOOLEAN', 'Whether the attempt was finished'],
          ['result', 'JSONB', 'Detailed attempt result data'],
          ['created_at', 'TIMESTAMPTZ', ''],
        ])}
      </div>

      <div class="bg-brand-surface border border-brand-elevated rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <h3 class="text-base font-semibold text-slate-200 m-0">favorites</h3>
          <button onclick="copyTableName(this, 'favorites')" class="p-1 rounded-md text-slate-500 hover:text-brand-gold transition-colors cursor-pointer border-0 bg-transparent" title="Copy table name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <p class="text-sm text-slate-400 m-0 mb-3">User-favorited exercises. Unique constraint on user+exercise.</p>
        ${schemaTable([
          ['id', 'UUID', 'Primary key'],
          ['user_id', 'UUID', 'FK → users'],
          ['exercise_id', 'UUID', 'FK → exercises'],
          ['created_at', 'TIMESTAMPTZ', ''],
        ])}
      </div>

    </div>
  `);
}

export function renderDocs() {
  return wideLayout({
    title: 'Technical Docs',
    pageTitle: 'Technical Docs',
    content: `
      <div class="flex gap-8">
        ${renderSidebar()}
        <main class="flex-1 min-w-0">
          ${renderSchema()}
          ${renderPitch()}
          ${renderHighway()}
          ${renderHighwayAudio()}
          ${renderLearn()}
          ${renderRelated()}
        </main>
      </div>
      <script>
      function copyTableName(btn, name) {
        navigator.clipboard.writeText(name).then(() => {
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
          btn.classList.remove('text-slate-500');
          btn.classList.add('text-green-400');
          setTimeout(() => {
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            btn.classList.remove('text-green-400');
            btn.classList.add('text-slate-500');
          }, 1500);
        });
      }
      function copyCode(btn) {
        const pre = btn.parentElement.querySelector('pre');
        navigator.clipboard.writeText(pre.textContent).then(() => {
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
          btn.classList.remove('text-slate-400');
          btn.classList.add('text-green-400');
          setTimeout(() => {
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            btn.classList.remove('text-green-400');
            btn.classList.add('text-slate-400');
          }, 1500);
        });
      }
      </script>
    `,
  });
}
