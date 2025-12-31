import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './db.js';
import authPlugin from './auth/index.js';
import aiPlugin from './ai/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({ logger: true });

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

// Auth plugin
fastify.register(authPlugin);

// AI plugin
fastify.register(aiPlugin);

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
    console.log(`🚀 Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

