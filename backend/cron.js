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
        include: { order: { include: { items: { include: { product: true, variant: true } } } } }
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
            const itemsListHtml = '<ul>' + order.items.map(i => {
              const vName = i.variant ? ` (${i.variant.name})` : '';
              return `<li>${i.quantity}x ${i.product.name}${vName} - $${Number(i.price).toFixed(2)}</li>`;
            }).join('') + '</ul>';

            const emailHtml = settingsMap.template_payment_due
              .replace(/\{\{customerName\}\}/g, order.customerName)
              .replace(/\{\{customerPhone\}\}/g, order.customerPhone || '')
              .replace(/\{\{locationAddress\}\}/g, order.locationAddress || 'N/A')
              .replace(/\{\{orderId\}\}/g, order.id)
              .replace(/\{\{totalAmount\}\}/g, Number(order.totalAmount).toFixed(2))
              .replace(/\{\{itemsList\}\}/g, itemsListHtml)
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
        include: { order: { include: { items: { include: { product: true, variant: true } } } } }
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
            const itemsListHtml = '<ul>' + order.items.map(i => {
              const vName = i.variant ? ` (${i.variant.name})` : '';
              return `<li>${i.quantity}x ${i.product.name}${vName} - $${Number(i.price).toFixed(2)}</li>`;
            }).join('') + '</ul>';

            const emailHtml = settingsMap.template_payment_due
              .replace(/\{\{customerName\}\}/g, order.customerName)
              .replace(/\{\{customerPhone\}\}/g, order.customerPhone || '')
              .replace(/\{\{locationAddress\}\}/g, order.locationAddress || 'N/A')
              .replace(/\{\{orderId\}\}/g, order.id)
              .replace(/\{\{totalAmount\}\}/g, Number(order.totalAmount).toFixed(2))
              .replace(/\{\{itemsList\}\}/g, itemsListHtml)
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

  // 3. Auto-cancelación de órdenes pendientes con más de 30 minutos de antigüedad (Ejecutar cada 15 minutos)
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Buscando órdenes pendientes vencidas (>30 minutos)...');
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const staleOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: thirtyMinutesAgo
          }
        },
        include: { items: true }
      });

      if (staleOrders.length > 0) {
        console.log(`[CRON] Se encontraron ${staleOrders.length} órdenes para auto-cancelar.`);
        
        for (const order of staleOrders) {
          // Cambiar estado a CANCELED
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELED' }
          });
          
          // Devolver stock
          for (const item of order.items) {
            if (item.productVariantId) {
              await prisma.productVariant.update({
                where: { id: item.productVariantId },
                data: { stock: { increment: item.quantity } }
              });
            } else {
              await prisma.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } }
              });
            }
          }
          console.log(`[CRON] Orden #${order.id} cancelada automáticamente (expirada) y stock restaurado.`);
        }
      }
    } catch (err) {
      console.error('[CRON] Error auto-cancelando órdenes:', err);
    }
  });

  console.log('[SYSTEM] Cron jobs inicializados.');
};

module.exports = { initCronJobs };
