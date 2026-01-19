import { insertJob } from './repository.js';
import { uploadAudioToR2 } from '../utils/r2.js';

export async function createGenerateHighwayJob(request, reply) {
  let mp3Url;
  let name;

  const parts = request.parts();
  let fileBuffer = null;
  let filename = null;

  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'file') {
      fileBuffer = await part.toBuffer();
      filename = part.filename;
    } else if (part.fieldname === 'name') {
      name = part.value;
    } else if (part.fieldname === 'url') {
      mp3Url = part.value;
    }
  }

  if (!name) {
    return reply.code(400).send({ error: 'name is required' });
  }
  if (!mp3Url && !fileBuffer) {
    return reply.code(400).send({ error: 'Either url or file is required' });
  }
  if (mp3Url && fileBuffer) {
    return reply.code(400).send({ error: 'Provide url or file, not both' });
  }

  if (fileBuffer) {
    mp3Url = await uploadAudioToR2(fileBuffer, filename, 'admin');
  }

  const payload = {
    type: 'generate_highway',
    mp3_url: mp3Url,
    name,
    user_id: null,
    description: null,
    sort_order: 0,
    download_max_retries: 3,
    transcription_method: 'gpt4o-ctc',
    pitch_model: 'medium',
    step_size: 10,
    fmin: 60.0,
    fmax: 700.0,
    pitch_min_confidence: 0.3,
    pitch_confidence_threshold: 0.3,
    viterbi: true,
    min_pause_duration_ms: 100,
  };

  const jobId = await insertJob(payload);
  return reply.code(201).send({ jobId, status: 'pending' });
}
