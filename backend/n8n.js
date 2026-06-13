const axios = require('axios');
require('dotenv').config();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_WHATSAPP || process.env.N8N_WEBHOOK_URL;

const sendAlert = async (alertType, message, data = {}) => {
  if (!N8N_WEBHOOK_URL) {
    console.warn(`[N8N] No se encontró URL de Webhook para alerta: ${alertType}`);
    return;
  }

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
};

module.exports = {
  sendAlert
};
