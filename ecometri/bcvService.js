// src/services/bcvService.js
// Obtiene la tasa BCV del dólar desde APIs externas.
// - Al arrancar: lee JSON local si existe, luego intenta actualizar.
// - Cada N minutos: refresca desde la API y guarda en JSON.
// - Sirve siempre desde memoria (0 latencia).

const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');

const ARCHIVO_JSON = path.join(__dirname, '..', '..', 'data', 'tasa_bcv.json');
const INTERVALO_MS = parseInt(env('BCV_INTERVALO_MIN', '60')) * 60 * 1000;

// ==========================================
// APIs de tasa BCV (en orden de prioridad)
// Si una falla, intenta la siguiente.
// ==========================================
const FUENTES = [
    {
        nombre: 'pydolarve',
        url: 'https://pydolarve.org/api/v2/dollar?page=bcv',
        extraer: (json) => {
            // Estructura: { monitors: { usd: { price: 36.50 } } }
            const precio = json?.monitors?.usd?.price;
            if (!precio || isNaN(precio)) throw new Error('Campo price no encontrado');
            return parseFloat(precio);
        },
    },
    {
        nombre: 'dolarapi.com',
        url: 'https://ve.dolarapi.com/v1/dolares/oficial',
        extraer: (json) => {
            // Estructura: { promedio: 36.50 } o { venta: 36.50 }
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
];

// Estado en memoria
let tasaActual = {
    valor: null,
    fuente: null,
    actualizado: null,
};

let intervaloId = null;

// ==========================================
// LEER JSON LOCAL (arranque rápido)
// ==========================================
function leerJsonLocal() {
    try {
        if (!fs.existsSync(ARCHIVO_JSON)) return null;
        const contenido = JSON.parse(fs.readFileSync(ARCHIVO_JSON, 'utf-8'));
        
        // Válido si tiene valor y no tiene más de 6 horas
        const edad = Date.now() - new Date(contenido.actualizado).getTime();
        if (contenido.valor && edad < 6 * 60 * 60 * 1000) {
            return contenido;
        }
        console.warn('[BCV] JSON local expirado (>6h), se actualizará.');
        return contenido; // Devolver aunque esté viejo como fallback
    } catch {
        return null;
    }
}

// ==========================================
// GUARDAR JSON LOCAL
// ==========================================
function guardarJson(datos) {
    try {
        const dir = path.dirname(ARCHIVO_JSON);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ARCHIVO_JSON, JSON.stringify(datos, null, 2), 'utf-8');
    } catch (err) {
        console.error('[BCV] Error guardando JSON:', err.message);
    }
}

// ==========================================
// CONSULTAR APIs EXTERNAS (con fallback)
// ==========================================
async function consultarAPI() {
    for (const fuente of FUENTES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const resp = await fetch(fuente.url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json', 'User-Agent': 'TETENET-API/2.0' },
            });
            clearTimeout(timeout);

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            
            const json = await resp.json();
            const valor = fuente.extraer(json);

            // Validación de rango razonable (anti-datos basura)
            if (valor < 1 || valor > 50000) {
                throw new Error(`Valor fuera de rango: ${valor}`);
            }

            return { valor, fuente: fuente.nombre };

        } catch (err) {
            console.warn(`[BCV] ${fuente.nombre} falló: ${err.message}`);
            continue;
        }
    }
    return null; // Todas fallaron
}

// ==========================================
// ACTUALIZAR TASA (llamada periódica)
// ==========================================
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

    console.error('[BCV] ❌ Todas las fuentes fallaron. Se mantiene la última tasa conocida.');
    return false;
}

// ==========================================
// INICIAR SERVICIO (llamar al arrancar)
// ==========================================
async function iniciar() {
    // 1. Cargar desde JSON local (arranque inmediato)
    const local = leerJsonLocal();
    if (local?.valor) {
        tasaActual = local;
        console.log(`[BCV] Tasa cargada de JSON: ${local.valor} Bs/$ (${local.fuente}, ${local.actualizado})`);
    }

    // 2. Intentar actualizar desde API
    await actualizar();

    // 3. Si tras todo no hay tasa, error crítico
    if (!tasaActual.valor) {
        console.error('[BCV] ⚠️ SIN TASA DISPONIBLE. Las consultas de facturas fallarán hasta que se obtenga una tasa.');
    }

    // 4. Programar actualización periódica
    intervaloId = setInterval(actualizar, INTERVALO_MS);
    console.log(`[BCV] Próxima actualización en ${INTERVALO_MS / 60000} minutos.`);
}

// ==========================================
// GETTERS
// ==========================================
function obtenerTasa() {
    if (!tasaActual.valor) {
        throw new Error('Tasa BCV no disponible. Intente en unos minutos.');
    }
    return tasaActual.valor;
}

function obtenerInfo() {
    return { ...tasaActual };
}

// Forzar actualización manual (para el endpoint de health o admin)
async function forzarActualizacion() {
    return await actualizar();
}

function detener() {
    if (intervaloId) {
        clearInterval(intervaloId);
        intervaloId = null;
    }
}

module.exports = { iniciar, obtenerTasa, obtenerInfo, forzarActualizacion, detener };
