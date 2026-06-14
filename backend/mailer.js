const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTransporter = async () => {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'smtp_' } }
  });
  
  const config = {};
  settings.forEach(s => {
    config[s.key] = s.value;
  });

  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port) || 587,
    secure: config.smtp_secure === 'true' || parseInt(config.smtp_port) === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.log('SMTP not configured, skipping email.');
      return false;
    }

    const fromSetting = await prisma.setting.findUnique({ where: { key: 'smtp_from' } });
    const from = fromSetting?.value || 'no-reply@ecommerce.com';

    await transporter.sendMail({
      from,
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendEmail, getTransporter };
