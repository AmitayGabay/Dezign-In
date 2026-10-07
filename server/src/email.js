import nodemailer from 'nodemailer';
import './config/env.js';

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendLeadNotification(lead) {
  const requiredSettings = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_SECURE,
    process.env.SMTP_USER,
    process.env.SMTP_PASSWORD,
    process.env.SMTP_FROM,
    process.env.ADMIN_EMAIL,
  ];

  if (requiredSettings.some((value) => !value)) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, and ADMIN_EMAIL must be configured.');
  }

  if (!Number.isInteger(smtpConfig.port) || smtpConfig.port < 1 || smtpConfig.port > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port.');
  }

  if (!['true', 'false'].includes(process.env.SMTP_SECURE)) {
    throw new Error('SMTP_SECURE must be set to "true" or "false".');
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `New project inquiry: ${lead.service_type}`,
    text: [
      `Name: ${lead.client_name}`,
      `Email: ${lead.client_email}`,
      `Phone: ${lead.phone || 'Not provided'}`,
      `Service: ${lead.service_type}`,
    ].join('\n'),
  });
}
