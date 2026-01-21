import { renderTos } from './templates/tos.js';
import { renderPrivacyPolicy } from './templates/privacy.js';

export async function getTos(request, reply) {
  return reply.type('text/html').send(renderTos());
}

export async function getPrivacyPolicy(request, reply) {
  return reply.type('text/html').send(renderPrivacyPolicy());
}
