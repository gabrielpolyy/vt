import { emailLayout } from './layout.js';

export function passwordResetEmail({ resetUrl, expiresInMinutes = 60 }) {
  const html = emailLayout({
    title: 'Reset Your Password',
    content: `
      <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #f1f5f9;">
        Reset Your Password
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
        We received a request to reset your password. Click the button below to choose a new password.
      </p>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center">
            <a href="${resetUrl}"
               style="display: inline-block; background-color: #f59e0b; color: #0f172a; font-weight: 600;
                      text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 12px; line-height: 1.6;">
        This link will expire in ${expiresInMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
      <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 8px 0 0; word-break: break-all; color: #94a3b8; font-size: 12px;">
        ${resetUrl}
      </p>
    `,
  });

  const text = `Reset Your Password

We received a request to reset your password for your PitchHighway account.

Reset your password by visiting this link:
${resetUrl}

This link will expire in ${expiresInMinutes} minutes.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} PitchHighway. All rights reserved.`;

  return { html, text, subject: 'Reset Your Password - PitchHighway' };
}
