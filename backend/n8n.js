const axios = require('axios');
const { sendEmail } = require('./mailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_WHATSAPP || process.env.N8N_WEBHOOK_URL;

const generateEmailTemplate = (alertType, message, data, settingsMap = {}) => {
  let subject = '';
  let html = '';

  const replaceVars = (template, defaults) => {
    if (!template) return defaults;
    return template
      .replace(/\{\{alertMessage\}\}/g, message)
      .replace(/\{\{productName\}\}/g, data.productName || data.name || 'Desconocido')
      .replace(/\{\{stock\}\}/g, data.stock !== undefined ? data.stock : (data.remaining !== undefined ? data.remaining : 'N/A'))
      .replace(/\{\{orderId\}\}/g, data.orderId || data.id || 'N/A')
      .replace(/\{\{customerName\}\}/g, data.customerName || 'N/A')
      .replace(/\{\{total\}\}/g, data.total || data.amount || data.totalAmount || '0.00')
      .replace(/\{\{amount\}\}/g, data.amount || data.total || data.totalAmount || '0.00')
      .replace(/\{\{dueDate\}\}/g, data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A');
  };

  switch (alertType) {
    case 'LOW_STOCK':
      subject = '⚠️ Alerta de Stock Bajo';
      html = replaceVars(settingsMap.template_admin_low_stock, `
        <h2>Alerta de Inventario</h2>
        <p>${message}</p>
        <ul>
          <li><strong>Producto:</strong> ${data.productName || data.name || 'Desconocido'}</li>
          <li><strong>Stock Actual:</strong> ${data.stock !== undefined ? data.stock : (data.remaining !== undefined ? data.remaining : 'N/A')}</li>
        </ul>
      `);
      break;
    case 'NEW_ORDER':
      subject = '🛒 Nueva Orden Recibida';
      html = replaceVars(settingsMap.template_admin_new_order, `
        <h2>¡Tienes una nueva orden!</h2>
        <p>${message}</p>
        <ul>
          <li><strong>Orden ID:</strong> #${data.orderId || data.id || 'N/A'}</li>
          <li><strong>Cliente:</strong> ${data.customerName || 'N/A'}</li>
          <li><strong>Total:</strong> ${data.totalAmount || ('$' + (data.total || data.amount || '0.00'))}</li>
        </ul>
      `);
      break;
    case 'ACCOUNT_DUE_SOON':
    case 'ORDER_DUE_SOON':
      subject = '⏳ Aviso de Vencimiento Próximo';
      html = replaceVars(settingsMap.template_admin_due_soon, `
        <h2>Aviso de Cobro</h2>
        <p>${message}</p>
        <ul>
          <li><strong>Monto:</strong> $${data.amount || '0.00'}</li>
          <li><strong>Vencimiento:</strong> ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A'}</li>
        </ul>
      `);
      break;
    case 'ACCOUNT_DUE_TODAY':
    case 'ORDER_DUE_TODAY':
      subject = '🚨 Vencimiento de Pago HOY';
      html = replaceVars(settingsMap.template_admin_due_today, `
        <h2>Alerta de Cobro Urgente</h2>
        <p>${message}</p>
        <p><strong>El pago vence HOY.</strong></p>
        <ul>
          <li><strong>Monto:</strong> $${data.amount || '0.00'}</li>
        </ul>
      `);
      break;
    case 'TEST':
    case 'TEST_ALERT':
      subject = '🧪 Alerta de Prueba del Sistema';
      html = `
        <h2>Esta es una prueba de Alerta</h2>
        <p>${message}</p>
        <p>Si recibes este correo, la integración de envío simultáneo de alertas funciona correctamente.</p>
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

  // 2. Enviar por SMTP a los correos configurados en el panel de control
  try {
    const allSettings = await prisma.setting.findMany();
    const settingsMap = {};
    allSettings.forEach(s => settingsMap[s.key] = s.value);
    
    if (settingsMap.alert_emails) {
      const emails = settingsMap.alert_emails.split(',').map(e => e.trim()).filter(e => e);
      
      if (emails.length > 0) {
        const { emailSubject, emailHtml } = generateEmailTemplate(alertType, message, data, settingsMap);
        
        for (const email of emails) {
          const success = await sendEmail(email, emailSubject, emailHtml);
          if (success) {
            console.log(`[SMTP] Alerta enviada con éxito a: ${email}`);
          }
        }
      }
    } else {
      console.log(`[SMTP] No hay correos configurados (alert_emails) en el panel para recibir alertas.`);
    }
  } catch (error) {
    console.error(`[SMTP] Error intentando enviar correos de alerta:`, error.message);
  }
};

module.exports = {
  sendAlert
};
