import nodemailer from 'nodemailer';

let emailEnabled = false;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function verifySmtpConnection() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured');
  }
  await transporter.verify();
  emailEnabled = true;
}

export function isEmailEnabled() {
  return emailEnabled;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!emailEnabled) {
    throw new Error('Email service is not available');
  }

  const mailOptions = {
    from: 'PitchHighway <no-reply@pitchhighway.com>',
    to,
    subject,
    html,
    text,
  };

  return transporter.sendMail(mailOptions);
}
