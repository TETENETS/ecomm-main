const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_WHATSAPP || process.env.N8N_WEBHOOK_URL;

const generateEmailTemplate = (alertType, message, data) => {
  let subject = '';
  let html = '';

  switch (alertType) {
    case 'LOW_STOCK':
      subject = '⚠️ Alerta de Stock Bajo';
      html = `
        <h2>Alerta de Inventario</h2>
        <p>${message}</p>
        <ul>
          <li><strong>Producto:</strong> ${data.productName || data.name || 'Desconocido'}</li>
          <li><strong>Stock Actual:</strong> ${data.stock !== undefined ? data.stock : 'N/A'}</li>
        </ul>
      `;
      break;
    case 'NEW_ORDER':
      subject = '🛒 Nueva Orden Recibida';
      html = `
        <h2>¡Tienes una nueva orden!</h2>
        <p>${message}</p>
        <ul>
          <li><strong>Orden ID:</strong> #${data.orderId || data.id || 'N/A'}</li>
          <li><strong>Cliente:</strong> ${data.customerName || 'N/A'}</li>
          <li><strong>Total:</strong> $${data.total || data.amount || '0.00'}</li>
        </ul>
      `;
      break;
    case 'ACCOUNT_DUE_SOON':
    case 'ORDER_DUE_SOON':
      subject = '⏳ Aviso de Vencimiento Próximo';
      html = `
        <h2>Aviso de Cobro</h2>
        <p>${message}</p>
        <ul>
          <li><strong>Monto:</strong> $${data.amount || '0.00'}</li>
          <li><strong>Vencimiento:</strong> ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A'}</li>
        </ul>
      `;
      break;
    case 'ACCOUNT_DUE_TODAY':
    case 'ORDER_DUE_TODAY':
      subject = '🚨 Vencimiento de Pago HOY';
      html = `
        <h2>Alerta de Cobro Urgente</h2>
        <p>${message}</p>
        <p><strong>El pago vence HOY.</strong></p>
        <ul>
          <li><strong>Monto:</strong> $${data.amount || '0.00'}</li>
        </ul>
      `;
      break;
    case 'TEST':
    case 'TEST_ALERT':
      subject = '🧪 Alerta de Prueba del Sistema';
      html = `
        <h2>Esta es una prueba de N8N</h2>
        <p>${message}</p>
        <p>Si recibes este correo, la integración con Gmail funciona correctamente.</p>
      `;
      break;
    default:
      subject = '🔔 Notificación del Sistema';
      html = `
        <h2>Alerta: ${alertType}</h2>
        <p>${message}</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
  }

  return { emailSubject: subject, emailHtml: html };
};

const sendAlert = async (alertType, message, data = {}) => {
  // 1. Enviar a N8N (Data cruda)
  if (N8N_WEBHOOK_URL) {
    try {
      const payload = {
        alertType, // 'LOW_STOCK', 'NEW_ORDER', 'ACCOUNT_DUE_SOON', 'ACCOUNT_DUE_TODAY'
        message,
        timestamp: new Date().toISOString(),
        data
      };
      await axios.post(N8N_WEBHOOK_URL, payload);
      console.log(`[N8N] Alerta enviada con éxito: ${alertType}`);
    } catch (error) {
      console.error(`[N8N] Error al enviar alerta (${alertType}) a n8n:`, error.message);
    }
  } else {
    console.warn(`[N8N] No se encontró URL de Webhook para alerta: ${alertType}`);
  }

  // 2. Enviar por SMTP (Nodemailer)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const { emailSubject, emailHtml } = generateEmailTemplate(alertType, message, data);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Sistema E-commerce" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_TO || process.env.SMTP_USER, // Si no hay TO, enviar al mismo correo
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`[SMTP] Correo enviado con éxito: ${alertType}`);
    } catch (error) {
      console.error(`[SMTP] Error al enviar correo (${alertType}):`, error.message);
    }
  } else {
    console.warn(`[SMTP] Faltan variables de entorno SMTP_HOST, SMTP_USER o SMTP_PASS. No se enviará correo.`);
  }
};

module.exports = {
  sendAlert
};
