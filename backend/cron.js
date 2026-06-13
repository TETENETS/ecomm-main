const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendAlert } = require('./n8n');

const prisma = new PrismaClient();

const initCronJobs = () => {
  // 1. Alerta: En 3 días vence (Ejecutar a las 08:00 todos los días)
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Buscando cuentas por cobrar a vencer en 3 días...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 3);
      
      const targetEndDate = new Date(targetDate);
      targetEndDate.setDate(targetEndDate.getDate() + 1);

      const accounts = await prisma.accountTransaction.findMany({
        where: {
          type: 'RECEIVABLE',
          status: 'PENDING',
          dueDate: {
            gte: targetDate,
            lt: targetEndDate
          }
        }
      });

      for (const account of accounts) {
        const msg = `Aviso: En 3 días se cumple la fecha límite de la cuenta por cobrar: ${account.title}`;
        await sendAlert('ACCOUNT_DUE_SOON', msg, {
          accountId: account.id,
          title: account.title,
          amount: account.amount,
          dueDate: account.dueDate,
          description: account.description
        });
      }
    } catch (err) {
      console.error('[CRON] Error revisando cuentas por cobrar (3 días):', err);
    }
  });

  // 2. Alerta: Vence HOY (Ejecutar 3 veces al día: 09:00, 13:00, 17:00)
  cron.schedule('0 9,13,17 * * *', async () => {
    console.log('[CRON] Buscando cuentas por cobrar que vencen HOY...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const accounts = await prisma.accountTransaction.findMany({
        where: {
          type: 'RECEIVABLE',
          status: 'PENDING',
          dueDate: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      for (const account of accounts) {
        const msg = `Alerta: Hoy es la fecha límite de la cuenta por cobrar: ${account.title}`;
        await sendAlert('ACCOUNT_DUE_TODAY', msg, {
          accountId: account.id,
          title: account.title,
          amount: account.amount,
          dueDate: account.dueDate,
          description: account.description
        });
      }
    } catch (err) {
      console.error('[CRON] Error revisando cuentas por cobrar (Hoy):', err);
    }
  });

  console.log('[SYSTEM] Cron jobs inicializados.');
};

module.exports = { initCronJobs };
