import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './db.js';
import authPlugin from './auth/index.js';
import voiceProfilePlugin from './voice-profile/index.js';
import exercisesPlugin from './exercises/index.js';
import adminPlugin from './admin/index.js';
import dashboardPlugin from './dashboard/index.js';
import journeyPlugin from './journey/index.js';
import jobsPlugin from './jobs/index.js';
import { buildLoggerOptions, registerLoggingHooks } from './logging/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: buildLoggerOptions(),
  disableRequestLogging: true,
});

// Register custom request/response logging
registerLoggingHooks(fastify);

// Serve static files from public/
fastify.register(fastifyStatic, {
  root: join(__dirname, '../public'),
  prefix: '/',
});

// Rate limiting
fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Cookie support
fastify.register(fastifyCookie);

// Form body parsing
fastify.register(fastifyFormbody);

// Multipart support for file uploads
fastify.register(fastifyMultipart);

// Auth plugin
fastify.register(authPlugin);

// Voice profile plugin
fastify.register(voiceProfilePlugin);

// Exercises plugin
fastify.register(exercisesPlugin);

// Admin plugin (logs, highway generator, etc.)
fastify.register(adminPlugin);

// Dashboard plugin
fastify.register(dashboardPlugin);

// Journey plugin
fastify.register(journeyPlugin);

// Jobs plugin
fastify.register(jobsPlugin);

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Example: test DB connection
fastify.get('/api/db-check', async () => {
  try {
    const result = await db.query('SELECT NOW()');
    return { connected: true, time: result.rows[0].now };
  } catch (err) {
    return { connected: false, error: err.message };
  }
});

const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    fastify.log.info(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

