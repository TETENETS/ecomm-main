const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Asegurarnos de usar axios en caso de que node sea viejo

const ARCHIVO_JSON = path.join(__dirname, 'bcv.json');
const INTERVALO_MS = 60 * 60 * 1000; // 60 minutos

const FUENTES = [
    {
        nombre: 'pydolarve',
        url: 'https://pydolarve.org/api/v2/dollar?page=bcv',
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
    console.error('[BCV] ❌ Todas las fuentes fallaron. Se mantiene la última tasa conocida.');
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
