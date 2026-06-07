/**
 * mapa-form.js — Lógica para el formulario de instalación y mapa interactivo
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuración de coordenadas predeterminadas
    const coordenadas = {
        mayorquin: { lat: 10.120270, lng: -64.647798 },
        casitas: { lat: 10.137475, lng: -64.708984 }
    };

    // 2. Elementos del DOM
    const selectLocalidad = document.getElementById('localidad');
    const seccionMapa = document.getElementById('seccion-mapa');
    const contenedorMapa = document.getElementById('contenedor-mapa');
    
    const latInput = document.getElementById('latInput');
    const lngInput = document.getElementById('lngInput');
    
    const btnBloquear = document.getElementById('btnBloquearMapa');
    const btnDesbloquear = document.getElementById('btnDesbloquearMapa');
    const btnSubmit = document.getElementById('btnSubmitFinal');
    
    const formHeader = document.getElementById('form-header');
    const form = document.getElementById('formInstalacion');
    const errorMsg = document.getElementById('error-msg');
    const successContainer = document.getElementById('success-container');

    // Estado
    let map;
    let mapaBloqueado = false;

    // 3. Inicialización del Mapa
    function inicializarMapa(lat, lng) {
        if (map) {
            map.setView([lat, lng], 17);
            actualizarInputs(lat, lng);
            return;
        }

        map = L.map('mapa').setView([lat, lng], 17);

        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '&copy; Google Maps'
        }).addTo(map);

        // Actualizar coordenadas al mover el mapa
        map.on('move', () => {
            if (!mapaBloqueado) {
                const center = map.getCenter();
                actualizarInputs(center.lat, center.lng);
            }
        });

        actualizarInputs(lat, lng);
    }

    function actualizarInputs(lat, lng) {
        latInput.value = lat.toFixed(6);
        lngInput.value = lng.toFixed(6);
    }

    // 4. Evento: Cambio de Localidad
    selectLocalidad.addEventListener('change', (e) => {
        const loc = e.target.value;
        if (coordenadas[loc]) {
            seccionMapa.classList.remove('hidden');
            setTimeout(() => { seccionMapa.classList.remove('opacity-0'); }, 50);

            inicializarMapa(coordenadas[loc].lat, coordenadas[loc].lng);
            desbloquearMapa();
        }
    });

    // 5. Botones de Bloqueo/Desbloqueo
    function bloquearMapa() {
        mapaBloqueado = true;
        
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();

        contenedorMapa.classList.add('mapa-bloqueado');
        latInput.readOnly = false;
        lngInput.readOnly = false;

        btnBloquear.classList.add('hidden');
        btnDesbloquear.classList.remove('hidden');
    }

    function desbloquearMapa() {
        if(!map) return; 
        
        mapaBloqueado = false;

        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();

        contenedorMapa.classList.remove('mapa-bloqueado');
        latInput.readOnly = true;
        lngInput.readOnly = true;

        btnDesbloquear.classList.add('hidden');
        btnBloquear.classList.remove('hidden');
    }

    btnBloquear.addEventListener('click', bloquearMapa);
    btnDesbloquear.addEventListener('click', desbloquearMapa);

    [latInput, lngInput].forEach(input => {
        input.addEventListener('blur', () => {
            if (mapaBloqueado && latInput.value && lngInput.value) {
                const newLat = parseFloat(latInput.value);
                const newLng = parseFloat(lngInput.value);
                if (!isNaN(newLat) && !isNaN(newLng)) {
                    map.setView([newLat, newLng], map.getZoom());
                }
            }
        });
    });

// Lógica para mostrar/ocultar el campo del cupón
    const radioCuponSi = document.getElementById('cupon_si');
    const radioCuponNo = document.getElementById('cupon_no');
    const contenedorCupon = document.getElementById('contenedor_cupon');
    const inputCupon = document.getElementById('codigo_cupon');

    function toggleCupon() {
        if (radioCuponSi.checked) {
            contenedorCupon.classList.remove('hidden');
            inputCupon.focus(); // Ubica el cursor automáticamente
        } else {
            contenedorCupon.classList.add('hidden');
            inputCupon.value = ''; // Limpia el texto si se arrepienten y marcan "No"
        }
    }

    radioCuponSi.addEventListener('change', toggleCupon);
    radioCuponNo.addEventListener('change', toggleCupon);



    // 6. Envío del Formulario al Backend
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.classList.add('hidden');
        
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner"></span> Procesando...';

        try {
            const API_BASE_URL = window.TETENET_CONFIG?.API_BASE_URL || '';
            const formData = new FormData(form);

            const response = await fetch(`${API_BASE_URL}/instalacion-request`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // OCULTAR FORMULARIO Y MOSTRAR PANTALLA DE ÉXITO
                formHeader.classList.add('hidden');
                form.classList.add('hidden');
                
                successContainer.classList.remove('hidden');
                successContainer.classList.add('flex'); // Mostrar en formato flex-col
            } else {
                throw new Error(result.error || 'Error al enviar la solicitud');
            }

        } catch (error) {
            console.error('Error enviando formulario:', error);
            errorMsg.textContent = error.message || 'Error de conexión. Intenta nuevamente.';
            errorMsg.classList.remove('hidden');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
    });
});

