import { API_URL, BACKEND_URL, getImageUrl } from './api.js';
export { API_URL, BACKEND_URL, getImageUrl };
window.tasaBCV = 1;

export async function fetchBCV() {
    try {
        const res = await fetch(`${API_URL}/bcv`);
        const data = await res.json();
        if (data && data.valor) window.tasaBCV = parseFloat(data.valor);
    } catch (err) {
        console.error('Error fetching BCV:', err);
    }
}

export function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

export function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

export function updateCartUI() {
    const cart = getCart();
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const amount = cart.reduce((acc, item) => acc + ((Number(item.price) || 0) * item.quantity), 0);
    
    const countEl = document.getElementById('essenceCartBtn');
    if (countEl) countEl.innerHTML = `<img src="img/core-img/bag.svg" alt=""> <span>${count}</span>`;
    
    const cartListEl = document.getElementById('cart-list');
    if (cartListEl) {
        cartListEl.innerHTML = '';
        cart.forEach((item, index) => {
            const itemPrice = Number(item.price) || 0;
            cartListEl.innerHTML += `
                <div class="single-cart-item">
                    <a href="#" class="product-image">
                        <img src="${item.imageUrl}" class="cart-thumb" alt="">
                        <div class="cart-item-desc">
                            <span class="product-remove" onclick="window.removeFromCart(${index})"><i class="fa fa-close" aria-hidden="true"></i></span>
                            <h6>${item.productName}</h6>
                            <p class="size">Variante: ${item.variantName}</p>
                            <p class="price">$${itemPrice.toFixed(2)} / Bs. ${(itemPrice * window.tasaBCV).toFixed(2)} x ${item.quantity}</p>
                        </div>
                    </a>
                </div>
            `;
        });
        
        const summaryEl = document.getElementById('cart-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <li><span>Subtotal:</span> <span>$${amount.toFixed(2)} / Bs. ${(amount * window.tasaBCV).toFixed(2)}</span></li>
                <li><span>Envío:</span> <span>Gratis</span></li>
                <li><span>Total:</span> <span>$${amount.toFixed(2)} / Bs. ${(amount * window.tasaBCV).toFixed(2)}</span></li>
            `;
        }
    }
}

export function renderHeader() {
    return `
    <header class="header_area">
        <div class="classy-nav-container breakpoint-off d-flex align-items-center justify-content-between">
            <nav class="classy-navbar" id="essenceNav">
                <a class="nav-brand" href="index.html"><h2>Kavala</h2></a>
            </nav>
            <div class="header-meta d-flex clearfix justify-content-end">
                <div class="cart-area">
                    <a href="#" id="essenceCartBtn"><img src="img/core-img/bag.svg" alt=""> <span>0</span></a>
                </div>
            </div>
        </div>
    </header>
    `;
}

export function renderCartArea() {
    return `
    <div class="right-side-cart-area">
        <div class="cart-button">
            <a href="#" id="rightSideCart"><img src="img/core-img/bag.svg" alt=""> <span>0</span></a>
        </div>
        <div class="cart-content d-flex">
            <div class="cart-list" id="cart-list"></div>
            <div class="cart-amount-summary">
                <h2>Resumen</h2>
                <ul class="summary-table" id="cart-summary"></ul>
                <div class="checkout-btn mt-100">
                    <a href="checkout.html" class="btn essence-btn">Finalizar Compra</a>
                </div>
            </div>
        </div>
    </div>
    `;
}

export function renderFooter() {
    return `
    <footer class="footer_area clearfix">
        <div class="container">
            <div class="row">
                <div class="col-12 text-center mt-50">
                    <p>Derechos de Autor ©kavala 2026 Todos los derechos reservados</p>
                </div>
            </div>
        </div>
    </footer>
    `;
}

window.removeFromCart = function(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
};
