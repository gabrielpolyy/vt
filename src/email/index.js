import { verifySmtpConnection, sendEmail, isEmailEnabled } from './service.js';

export default async function emailPlugin(fastify) {
  try {
    await verifySmtpConnection();
    fastify.log.info('SMTP connection verified');
  } catch (err) {
    fastify.log.warn({ err }, 'SMTP connection failed - email functionality disabled');
  }

  fastify.decorate('sendEmail', sendEmail);
  fastify.decorate('isEmailEnabled', isEmailEnabled);
}

export { sendEmail, isEmailEnabled };
