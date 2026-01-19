import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_S3_ENDPOINT_EU,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_S3_SECRET_ACCESS_KEY,
  },
});

export async function uploadAudioToR2(buffer, originalFilename, userId) {
  const ext = originalFilename.split('.').pop() || 'mp3';
  const key = `user-uploads/${userId}/${randomUUID()}.${ext}`;

  await r2Client.send(new PutObjectCommand({
    Bucket: 'audio',
    Key: key,
    Body: buffer,
    ContentType: `audio/${ext}`,
  }));

  // Generate presigned URL (24 hours expiry)
  const presignedUrl = await getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: 'audio', Key: key }),
    { expiresIn: 24 * 60 * 60 }
  );

  return presignedUrl;
}

export async function getHighwayAudioUrls(trackId, expiresIn = 7 * 24 * 60 * 60) {
  // Extract numeric ID from trackId (handles both "3" and "track_3" formats)
  const numericId = trackId.startsWith('track_') ? trackId.slice(6) : trackId;

  const vocalsUrl = await getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: 'highway-audio', Key: `vocals_${numericId}.mp3` }),
    { expiresIn }
  );
  const backingUrl = await getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: 'highway-audio', Key: `non_vocals_${numericId}.mp3` }),
    { expiresIn }
  );
  return { vocalsUrl, backingUrl };
}
