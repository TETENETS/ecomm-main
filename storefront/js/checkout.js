import { API_URL, fetchBCV, renderHeader, renderCartArea, renderFooter, updateCartUI, getCart, saveCart } from './components.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        ${renderHeader()}
        ${renderCartArea()}
        
        <div class="checkout_area section-padding-80">
            <div class="container">
                <div class="row">
                    <div class="col-12 col-md-6">
                        <div class="checkout_details_area mt-50 clearfix">
                            <div class="cart-page-heading mb-30">
                                <h5>Dirección de Facturación</h5>
                            </div>
                            <form id="checkoutForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="customerName">Nombre Completo <span>*</span></label>
                                        <input type="text" class="form-control" id="customerName" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="customerCedulaNum">Cédula <span>*</span></label>
                                        <div class="d-flex">
                                            <select class="form-control" id="cedulaType" style="width: 70px; padding: 0 10px; border-right: none; border-radius: 0;">
                                                <option value="V-">V-</option>
                                                <option value="E-">E-</option>
                                                <option value="J-">J-</option>
                                            </select>
                                            <input type="text" class="form-control" id="customerCedulaNum" required minlength="6" maxlength="9" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="border-left: none; border-radius: 0;">
                                        </div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label>Teléfono <span>*</span></label>
                                        <div class="d-flex">
                                            <select class="form-control" id="phoneCountry" style="width: 80px; padding: 0 10px; border-right: none; border-radius: 0;">
                                                <option value="+58">+58</option>
                                            </select>
                                            <select class="form-control" id="phoneArea" style="width: 100px; padding: 0 10px; border-radius: 0;">
                                                <option value="414">414</option>
                                                <option value="424">424</option>
                                                <option value="412">412</option>
                                                <option value="416">416</option>
                                                <option value="426">426</option>
                                                <option value="422">422</option>
                                            </select>
                                            <input type="text" class="form-control" id="phoneNum" placeholder="1234567" required minlength="7" maxlength="7" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="border-left: none; border-radius: 0;">
                                        </div>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="customerEmail">Correo Electrónico</label>
                                        <input type="email" class="form-control" id="customerEmail">
                                    </div>
                                    <div class="col-12 mb-3 mt-2">
                                        <label for="paymentMethod">Método de Pago <span>*</span></label>
                                        <select class="form-control" id="paymentMethod" required>
                                            <option value="">Seleccione un método de pago...</option>
                                            <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                                            <option value="Transferencia ($)">Transferencia ($)</option>
                                            <option value="Efectivo (Bs)">Efectivo (Bs)</option>
                                            <option value="Efectivo ($)">Efectivo ($)</option>
                                        </select>
                                    </div>
                                    <div class="col-12 mb-3">
                                        <label for="locationAddress">Dirección de Entrega <span>*</span></label>
                                        <input type="text" class="form-control" id="locationAddress" required>
                                    </div>
                                    
                                    <div class="col-12 mb-3 mt-4">
                                        <h5>Ubica tu dirección en el mapa</h5>
                                        <p class="text-sm text-gray-500 mb-2">Mueve el mapa para centrar el puntero rojo sobre tu casa y presiona "Fijar Ubicación".</p>
                                        <div id="contenedor-mapa">
                                            <div id="mapa"></div>
                                            <img id="puntero-central" src="data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e74c3c'%3e%3cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3e%3c/svg%3e" alt="Puntero">
                                        </div>
                                        <div class="row mt-3">
                                            <div class="col-6">
                                                <label>Latitud</label>
                                                <input type="text" id="locationMapLat" class="form-control" readonly required>
                                            </div>
                                            <div class="col-6">
                                                <label>Longitud</label>
                                                <input type="text" id="locationMapLng" class="form-control" readonly required>
                                            </div>
                                        </div>
                                        <div class="row mt-3">
                                            <div class="col-12 d-flex">
                                                <button type="button" id="btnBloquearMapa" class="btn btn-primary w-100 mr-2" style="color: white; border-radius: 0;">Fijar Ubicación</button>
                                                <button type="button" id="btnDesbloquearMapa" class="btn btn-danger w-100 d-none" style="color: white; border-radius: 0;">Modificar Ubicación</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="col-12 col-md-6 col-lg-5 ml-lg-auto">
                        <div class="order-details-confirmation">
                            <div class="cart-page-heading">
                                <h5>Tu Pedido</h5>
                                <p>Detalles</p>
                            </div>
                            <ul class="order-details-form mb-4" id="checkout-cart-list">
                                <!-- Order items generated by JS -->
                            </ul>
                            <button id="btnSubmitOrder" class="btn essence-btn w-100">Realizar Pedido</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        ${renderFooter()}
    `;

    // Initialize UI plugins for cart (from ecometri template)
    if (typeof jQuery !== 'undefined') {
        const $ = jQuery;
        $('#essenceCartBtn').on('click', function () {
            $('.right-side-cart-area').addClass('cart-on');
        });
        $('#rightSideCart').on('click', function () {
            $('.right-side-cart-area').removeClass('cart-on');
        });
    }

    updateCartUI();
    initMapLogic();
    
    const paymentMethodEl = document.getElementById('paymentMethod');
    if (paymentMethodEl) {
        paymentMethodEl.addEventListener('change', () => {
            renderCheckoutOrder();
        });
    }
    
    fetchBCV().then(() => {
        renderCheckoutOrder();
        // re-render cart UI in case it was rendered before BCV was fetched
        updateCartUI();
    });
});

function renderCheckoutOrder() {
    const list = document.getElementById('checkout-cart-list');
    if (!list) return;

    const paymentMethodEl = document.getElementById('paymentMethod');
    const isBs = paymentMethodEl && paymentMethodEl.value.includes('(Bs)');

    const cart = getCart();
    list.innerHTML = `<li><span>Producto</span> <span>Total</span></li>`;
    
    let total = 0;
    cart.forEach((item, index) => {
        const itemPrice = Number(item.price) || 0;
        const itemTotal = itemPrice * item.quantity;
        total += itemTotal;
        const totalBs = itemTotal * window.tasaBCV;
        
        let priceHtml = '';
        if (isBs) {
            priceHtml = `Bs. ${totalBs.toFixed(2)}<br><small>$${itemTotal.toFixed(2)}</small>`;
        } else {
            priceHtml = `$${itemTotal.toFixed(2)}<br><small>Bs. ${totalBs.toFixed(2)}</small>`;
        }
        
        list.innerHTML += `
            <li style="display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; line-height: 1.2;">
                <img src="${item.imageUrl || 'img/bg-img/bg-1.jpg'}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;">
                <div style="flex-grow: 1; display: flex; justify-content: space-between; align-items: center;">
                    <div style="max-width: 60%;">
                        <span style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px;">${item.productName}</span>
                        ${item.variantName ? `<span style="font-size: 12px; color: #888; display: block; margin-bottom: 2px;">Var: ${item.variantName}</span>` : ''}
                        <div style="display: flex; align-items: center; margin-top: 5px;">
                            <button type="button" onclick="window.updateCheckoutQuantity(${index}, -1)" style="border: 1px solid #ccc; background: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 3px; font-weight: bold; font-size: 14px; line-height: 1; padding: 0;">-</button>
                            <span style="font-size: 12px; margin: 0 10px; font-weight: bold; color: #333;">${item.quantity}</span>
                            <button type="button" onclick="window.updateCheckoutQuantity(${index}, 1)" style="border: 1px solid #ccc; background: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 3px; font-weight: bold; font-size: 14px; line-height: 1; padding: 0;">+</button>
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 14px;">
                        ${priceHtml}
                    </div>
                </div>
            </li>
        `;
    });

    const totalBsAll = total * window.tasaBCV;
    let subtotalHtml = '';
    let totalHtml = '';
    
    if (isBs) {
        subtotalHtml = `Bs. ${totalBsAll.toFixed(2)}<br><small>$${total.toFixed(2)}</small>`;
        totalHtml = `Bs. ${totalBsAll.toFixed(2)}<br><small>$${total.toFixed(2)}</small>`;
    } else {
        subtotalHtml = `$${total.toFixed(2)}<br><small>Bs. ${totalBsAll.toFixed(2)}</small>`;
        totalHtml = `$${total.toFixed(2)}<br><small>Bs. ${totalBsAll.toFixed(2)}</small>`;
    }

    list.innerHTML += `
        <li><span>Subtotal</span> <span style="text-align: right;">${subtotalHtml}</span></li>
        <li style="border-top: 1px solid #ebebeb; padding-top: 10px; margin-top: 10px;"><span>Total</span> <span style="text-align: right; font-weight: bold;">${totalHtml}</span></li>
    `;
}

function initMapLogic() {
    const latInput = document.getElementById('locationMapLat');
    const lngInput = document.getElementById('locationMapLng');
    const btnBloquear = document.getElementById('btnBloquearMapa');
    const btnDesbloquear = document.getElementById('btnDesbloquearMapa');
    const btnSubmit = document.getElementById('btnSubmitOrder');
    const form = document.getElementById('checkoutForm');

    let map;
    let mapaBloqueado = false;
    let latInicial = 10.120270;
    let lngInicial = -64.647798;

    setTimeout(() => {
        map = L.map('mapa').setView([latInicial, lngInicial], 17);
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '&copy; Google Maps'
        }).addTo(map);

        map.on('move', () => {
            if (!mapaBloqueado) {
                const center = map.getCenter();
                latInput.value = center.lat.toFixed(6);
                lngInput.value = center.lng.toFixed(6);
            }
        });

        latInput.value = latInicial.toFixed(6);
        lngInput.value = lngInicial.toFixed(6);

        // Try to get user's location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                latInicial = position.coords.latitude;
                lngInicial = position.coords.longitude;
                map.setView([latInicial, lngInicial], 17);
                if (!mapaBloqueado) {
                    latInput.value = latInicial.toFixed(6);
                    lngInput.value = lngInicial.toFixed(6);
                }
            }, (error) => {
                console.warn("Geolocation denied or error:", error);
            });
        }
    }, 500);

    btnBloquear.addEventListener('click', () => {
        if(!map) return;
        mapaBloqueado = true;
        const center = map.getCenter();
        latInput.value = center.lat.toFixed(6);
        lngInput.value = center.lng.toFixed(6);
        map.dragging.disable(); map.touchZoom.disable(); map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable(); map.boxZoom.disable(); map.keyboard.disable();
        document.getElementById('contenedor-mapa').classList.add('mapa-bloqueado');
        btnBloquear.classList.add('d-none');
        btnDesbloquear.classList.remove('d-none');
    });

    btnDesbloquear.addEventListener('click', () => {
        if(!map) return; 
        mapaBloqueado = false;
        map.dragging.enable(); map.touchZoom.enable(); map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable(); map.boxZoom.enable(); map.keyboard.enable();
        document.getElementById('contenedor-mapa').classList.remove('mapa-bloqueado');
        btnDesbloquear.classList.add('d-none');
        btnBloquear.classList.remove('d-none');
    });

    btnSubmit.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if(!form.checkValidity()) return form.reportValidity();

        const emailInput = document.getElementById('customerEmail').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput || !emailRegex.test(emailInput)) {
            return alert("Por favor, ingresa un correo electrónico válido.");
        }

        if(!mapaBloqueado) return alert("Por favor, fija tu ubicación en el mapa antes de continuar.");
        
        const cart = getCart();
        if(cart.length === 0) return alert("Tu carrito está vacío.");

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Procesando...';

        try {
            const finalCenter = map ? map.getCenter() : null;
            const finalLat = finalCenter ? parseFloat(finalCenter.lat.toFixed(6)) : parseFloat(latInput.value);
            const finalLng = finalCenter ? parseFloat(finalCenter.lng.toFixed(6)) : parseFloat(lngInput.value);

            const payload = {
                customerName: document.getElementById('customerName').value,
                customerCedula: `${document.getElementById('cedulaType').value}${document.getElementById('customerCedulaNum').value}`,
                customerPhone: `${document.getElementById('phoneCountry').value.replace(/\D/g, '')}${document.getElementById('phoneArea').value.replace(/\D/g, '')}${document.getElementById('phoneNum').value.replace(/\D/g, '')}`,
                customerEmail: document.getElementById('customerEmail').value,
                paymentMethod: document.getElementById('paymentMethod').value,
                locationAddress: document.getElementById('locationAddress').value,
                locationMapLat: finalLat,
                locationMapLng: finalLng,
                items: cart.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, price: i.price }))
            };

            const response = await fetch(`${API_URL}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.success) {
                alert('¡Pedido realizado con éxito!');
                localStorage.removeItem('cart');
                window.location.href = 'index.html';
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error al procesar el pedido');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Place Order';
        }
    });
}

window.updateCheckoutQuantity = function(index, change) {
    const cart = getCart();
    if (cart[index]) {
        const newQty = cart[index].quantity + change;
        if (change > 0 && cart[index].maxStock !== undefined && newQty > cart[index].maxStock) {
            alert(`¡Stock insuficiente! Sólo quedan ${cart[index].maxStock} unidades disponibles de este producto/variante.`);
            return;
        }
        cart[index].quantity = newQty;
        if (cart[index].quantity < 1) {
            cart.splice(index, 1);
        }
        saveCart(cart);
        renderCheckoutOrder();
    }
};
