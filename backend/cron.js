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

      // 1. Account Transactions
      const accounts = await prisma.accountTransaction.findMany({
        where: { type: 'RECEIVABLE', status: 'PENDING', dueDate: { gte: targetDate, lt: targetEndDate } }
      });
      for (const account of accounts) {
        const msg = `Aviso: En 3 días se cumple la fecha límite de la cuenta por cobrar: ${account.title}`;
        await sendAlert('ACCOUNT_DUE_SOON', msg, { accountId: account.id, title: account.title, amount: account.amount, dueDate: account.dueDate, description: account.description });
      }

      // 2. Order Due Dates
      const orderDueDates = await prisma.orderDueDate.findMany({
        where: { dueDate: { gte: targetDate, lt: targetEndDate }, order: { status: 'PENDING_PAYMENT' } },
        include: { order: true }
      });

      if (orderDueDates.length > 0) {
        const allSettings = await prisma.setting.findMany();
        const settingsMap = {};
        allSettings.forEach(s => settingsMap[s.key] = s.value);
        const { sendEmail } = require('./mailer');

        for (const odd of orderDueDates) {
          const order = odd.order;
          await sendAlert('ORDER_DUE_SOON', `Aviso: En 3 días vence el pago de la orden #${order.id} de ${order.customerName}`, { orderId: order.id, customerName: order.customerName, amount: order.totalAmount, dueDate: odd.dueDate });
          
          if (order.customerEmail && settingsMap.enable_template_payment_due === 'true' && settingsMap.template_payment_due) {
            const emailHtml = settingsMap.template_payment_due
              .replace(/\{\{customerName\}\}/g, order.customerName)
              .replace(/\{\{amount\}\}/g, Number(order.totalAmount).toFixed(2))
              .replace(/\{\{dueDate\}\}/g, new Date(odd.dueDate).toLocaleDateString());
            await sendEmail(order.customerEmail, `Recordatorio de Pago - Orden #${order.id}`, emailHtml);
          }
        }
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

      // 1. Account Transactions
      const accounts = await prisma.accountTransaction.findMany({
        where: { type: 'RECEIVABLE', status: 'PENDING', dueDate: { gte: today, lt: tomorrow } }
      });
      for (const account of accounts) {
        const msg = `Alerta: Hoy es la fecha límite de la cuenta por cobrar: ${account.title}`;
        await sendAlert('ACCOUNT_DUE_TODAY', msg, { accountId: account.id, title: account.title, amount: account.amount, dueDate: account.dueDate, description: account.description });
      }

      // 2. Order Due Dates
      const orderDueDates = await prisma.orderDueDate.findMany({
        where: { dueDate: { gte: today, lt: tomorrow }, order: { status: 'PENDING_PAYMENT' } },
        include: { order: true }
      });

      if (orderDueDates.length > 0) {
        const allSettings = await prisma.setting.findMany();
        const settingsMap = {};
        allSettings.forEach(s => settingsMap[s.key] = s.value);
        const { sendEmail } = require('./mailer');

        for (const odd of orderDueDates) {
          const order = odd.order;
          await sendAlert('ORDER_DUE_TODAY', `Alerta: Hoy vence el pago de la orden #${order.id} de ${order.customerName}`, { orderId: order.id, customerName: order.customerName, amount: order.totalAmount, dueDate: odd.dueDate });
          
          if (order.customerEmail && settingsMap.enable_template_payment_due === 'true' && settingsMap.template_payment_due) {
            const emailHtml = settingsMap.template_payment_due
              .replace(/\{\{customerName\}\}/g, order.customerName)
              .replace(/\{\{amount\}\}/g, Number(order.totalAmount).toFixed(2))
              .replace(/\{\{dueDate\}\}/g, new Date(odd.dueDate).toLocaleDateString());
            // Send the exact same reminder or maybe a slightly modified subject
            await sendEmail(order.customerEmail, `¡URGENTE! Vencimiento de Pago - Orden #${order.id}`, emailHtml);
          }
        }
      }

    } catch (err) {
      console.error('[CRON] Error revisando cuentas por cobrar (Hoy):', err);
    }
  });

  console.log('[SYSTEM] Cron jobs inicializados.');
};

module.exports = { initCronJobs };
