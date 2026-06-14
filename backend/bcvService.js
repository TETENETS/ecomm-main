const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { sendAlert } = require('./n8n');
const { sendEmail } = require('./mailer');

const prisma = new PrismaClient();
const ARCHIVO_JSON = path.join(__dirname, 'bcv.json');
const INTERVALO_MS = 60 * 60 * 1000; // 60 minutos

const FUENTES = [
    {
        nombre: 'pydolarve_bcv',
        url: 'https://pydolarve.org/api/v1/dollar?page=bcv',
        extraer: (json) => {
            const precio = json?.monitors?.usd?.price;
            if (!precio || isNaN(precio)) throw new Error('Campo price no encontrado');
            return parseFloat(precio);
        },
    },
    {
        nombre: 'dolarapi.com',
        url: 'https://ve.dolarapi.com/v1/dolares/oficial',
        extraer: (json) => {
            const precio = json?.promedio || json?.venta;
            if (!precio || isNaN(precio)) throw new Error('Campo promedio/venta no encontrado');
            return parseFloat(precio);
        },
    },
    {
        nombre: 'exchangemonitor',
        url: 'https://exchangemonitor.net/dolar-venezuela-bcv/api',
        extraer: (json) => {
            const precio = json?.price || json?.USD?.price;
            if (!precio || isNaN(precio)) throw new Error('Campo price no encontrado');
            return parseFloat(precio);
        },
    },
    {
        nombre: 'pydolarve_enparalelovzla',
        url: 'https://pydolarve.org/api/v1/dollar?page=enparalelovzla',
        extraer: (json) => {
            const bcv = json?.monitors?.bcv?.price;
            if (!bcv || isNaN(bcv)) throw new Error('Campo price no encontrado en bcv');
            return parseFloat(bcv);
        },
    }
];

let tasaActual = {
    valor: null,
    fuente: null,
    actualizado: null,
};

let intervaloId = null;

function leerJsonLocal() {
    try {
        if (!fs.existsSync(ARCHIVO_JSON)) return null;
        const contenido = JSON.parse(fs.readFileSync(ARCHIVO_JSON, 'utf-8'));
        const edad = Date.now() - new Date(contenido.actualizado).getTime();
        if (contenido.valor && edad < 6 * 60 * 60 * 1000) {
            return contenido;
        }
        console.warn('[BCV] JSON local expirado (>6h), se actualizará.');
        return contenido;
    } catch {
        return null;
    }
}

function guardarJson(datos) {
    try {
        fs.writeFileSync(ARCHIVO_JSON, JSON.stringify(datos, null, 2), 'utf-8');
    } catch (err) {
        console.error('[BCV] Error guardando JSON:', err.message);
    }
}

async function consultarAPI() {
    for (const fuente of FUENTES) {
        try {
            const resp = await axios.get(fuente.url, { timeout: 8000 });
            const valor = fuente.extraer(resp.data);
            if (valor < 1 || valor > 50000) {
                throw new Error(`Valor fuera de rango: ${valor}`);
            }
            return { valor, fuente: fuente.nombre };
        } catch (err) {
            console.warn(`[BCV] ${fuente.nombre} falló: ${err.message}`);
            continue;
        }
    }
    return null;
}

async function actualizar() {
    const resultado = await consultarAPI();
    if (resultado) {
        tasaActual = {
            valor: resultado.valor,
            fuente: resultado.fuente,
            actualizado: new Date().toISOString(),
        };
        guardarJson(tasaActual);
        console.log(`[BCV] ✅ Tasa actualizada: ${resultado.valor} Bs/$ (${resultado.fuente})`);
        return true;
    }
    
    console.error('[BCV] ❌ Todas las fuentes fallaron. Se enviarán alertas.');
    try {
        // Enviar Alerta N8N
        await sendAlert('BCV_API_FAILED', 'ALERTA CRITICA: Todas las fuentes de consulta de tasa BCV han fallado.', { lastKnownRate: tasaActual.valor, lastUpdate: tasaActual.actualizado });
        
        // Enviar Alerta Email
        const setting = await prisma.setting.findUnique({ where: { key: 'alert_emails' } });
        if (setting && setting.value) {
            const emails = setting.value.split(',').map(e => e.trim()).filter(e => e);
            for (const email of emails) {
                await sendEmail(email, 'ALERTA CRÍTICA: Fallo en Consulta de BCV', `
                    <h1>Error de Sincronización de Tasa</h1>
                    <p>El sistema no pudo conectarse a ninguna de las APIs de tasa de cambio.</p>
                    <p>La última tasa conocida es: <b>${tasaActual.valor} Bs/$</b> (${tasaActual.actualizado}).</p>
                    <p>Por favor, ingrese al Panel de Administración y configure una <b>Tasa BCV Manual</b> si es necesario.</p>
                `);
            }
        }
    } catch (alertErr) {
        console.error('[BCV] Error enviando alertas de falla:', alertErr.message);
    }

    return false;
}

async function iniciar() {
    const local = leerJsonLocal();
    if (local?.valor) {
        tasaActual = local;
        console.log(`[BCV] Tasa cargada de JSON: ${local.valor} Bs/$ (${local.fuente}, ${local.actualizado})`);
    }
    await actualizar();
    intervaloId = setInterval(actualizar, INTERVALO_MS);
}

function obtenerInfo() {
    return { ...tasaActual };
}

module.exports = { iniciar, obtenerInfo };
