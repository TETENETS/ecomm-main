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
    
    const countEl = document.getElementById('cart-count-badge');
    if (countEl) {
        if (count > 0) {
            countEl.style.display = 'grid';
            countEl.innerText = count;
        } else {
            countEl.style.display = 'none';
        }
    }
    
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
    <header id="site-header" class="sticky top-0 z-40 transition-all duration-300 border-b border-border bg-background/85 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <!-- Mobile menu toggle -->
        <button onclick="document.getElementById('mobile-menu').classList.toggle('max-h-0'); document.getElementById('mobile-menu').classList.toggle('max-h-80');" class="grid h-10 w-10 place-items-center rounded-full text-primary transition-colors hover:bg-secondary md:hidden">
          <i data-lucide="menu" class="h-5 w-5"></i>
        </button>

        <!-- Logo -->
        <a href="index.html" class="flex shrink-0 items-center">
          <img src="img/core-img/logo-kavala.png" alt="Kavala" class="h-10 w-auto md:h-12" onerror="this.onerror=null; this.outerHTML='<h2 class=\\'text-2xl font-heading font-bold text-primary\\'>Kavala</h2>';">
        </a>

        <!-- Desktop nav -->
        <nav class="hidden items-center gap-8 md:flex">
          <a href="#inicio" class="relative text-sm font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:text-primary after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all after:duration-300 hover:after:w-full">Inicio</a>
          <a href="#lineas" class="relative text-sm font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:text-primary after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all after:duration-300 hover:after:w-full">Nuestras Líneas</a>
          <a href="#main-catalog-section" class="relative text-sm font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:text-primary after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all after:duration-300 hover:after:w-full">Destacados</a>
        </nav>

        <!-- Right meta: search + cart -->
        <div class="flex items-center gap-2 md:gap-3">
          <div class="hidden items-center rounded-full border border-border bg-card/60 px-4 py-2 transition-colors focus-within:border-accent lg:flex">
            <i data-lucide="search" class="h-4 w-4 text-muted-foreground"></i>
            <input type="search" placeholder="Buscar fragancias..." class="ml-2 w-44 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          </div>

          <button id="essenceCartBtn" class="relative grid h-10 w-10 place-items-center rounded-full text-primary transition-colors hover:bg-secondary">
            <i data-lucide="shopping-bag" class="h-5 w-5"></i>
            <span id="cart-count-badge" class="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-foreground" style="display:none;">0</span>
          </button>
        </div>
      </div>

      <!-- Mobile nav drawer -->
      <div id="mobile-menu" class="overflow-hidden border-border bg-background/95 backdrop-blur-md transition-[max-height] duration-300 md:hidden max-h-0">
        <nav class="flex flex-col gap-1 px-4 py-3">
          <a href="#inicio" onclick="document.getElementById('mobile-menu').classList.add('max-h-0'); document.getElementById('mobile-menu').classList.remove('max-h-80');" class="rounded-lg px-3 py-2.5 text-sm font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:bg-secondary hover:text-primary">Inicio</a>
          <a href="#lineas" onclick="document.getElementById('mobile-menu').classList.add('max-h-0'); document.getElementById('mobile-menu').classList.remove('max-h-80');" class="rounded-lg px-3 py-2.5 text-sm font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:bg-secondary hover:text-primary">Nuestras Líneas</a>
          <a href="#main-catalog-section" onclick="document.getElementById('mobile-menu').classList.add('max-h-0'); document.getElementById('mobile-menu').classList.remove('max-h-80');" class="rounded-lg px-3 py-2.5 text-sm font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:bg-secondary hover:text-primary">Destacados</a>
        </nav>
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
    <footer id="contacto" class="bg-primary text-primary-foreground">
      <div class="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div class="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
          <!-- Brand -->
          <div class="col-span-2 lg:col-span-2">
            <img src="img/core-img/logo-kavala.png" alt="Kavala" class="h-14 w-auto mb-5" onerror="this.onerror=null; this.outerHTML='<h2 class=\\'text-3xl font-heading font-bold text-primary-foreground\\'>Kavala</h2>';">
            <p class="mt-5 max-w-xs text-pretty text-sm leading-relaxed text-primary-foreground/70">
              Cuidado corporal y fragancias de alta gama inspirados en la belleza del mar. Hecho con amor en Venezuela.
            </p>
            <div class="mt-6 flex items-center gap-3">
                <a href="#" class="grid h-10 w-10 place-items-center rounded-full border border-primary-foreground/20 transition-all duration-300 hover:border-accent hover:bg-accent hover:text-accent-foreground">
                  <i data-lucide="camera" class="h-4 w-4"></i>
                </a>
                <a href="#" class="grid h-10 w-10 place-items-center rounded-full border border-primary-foreground/20 transition-all duration-300 hover:border-accent hover:bg-accent hover:text-accent-foreground">
                  <i data-lucide="message-circle" class="h-4 w-4"></i>
                </a>
                <a href="#" class="grid h-10 w-10 place-items-center rounded-full border border-primary-foreground/20 transition-all duration-300 hover:border-accent hover:bg-accent hover:text-accent-foreground">
                  <i data-lucide="mail" class="h-4 w-4"></i>
                </a>
            </div>
          </div>

          <!-- Link columns -->
          <div>
              <h3 class="font-heading text-xl font-semibold">Tienda</h3>
              <ul class="mt-4 flex flex-col gap-2.5">
                  <li><a href="#" class="text-sm text-primary-foreground/70 transition-colors hover:text-accent">Body Splash</a></li>
                  <li><a href="#" class="text-sm text-primary-foreground/70 transition-colors hover:text-accent">Cremas & Mantecas</a></li>
                  <li><a href="#" class="text-sm text-primary-foreground/70 transition-colors hover:text-accent">Jabones</a></li>
                  <li><a href="#" class="text-sm text-primary-foreground/70 transition-colors hover:text-accent">Lociones</a></li>
              </ul>
          </div>
          <div>
              <h3 class="font-heading text-xl font-semibold">Ayuda</h3>
              <ul class="mt-4 flex flex-col gap-2.5">
                  <li><a href="#" class="text-sm text-primary-foreground/70 transition-colors hover:text-accent">Envíos</a></li>
                  <li><a href="#" class="text-sm text-primary-foreground/70 transition-colors hover:text-accent">Devoluciones</a></li>
                  <li><a href="#" class="text-sm text-primary-foreground/70 transition-colors hover:text-accent">Preguntas frecuentes</a></li>
              </ul>
          </div>

          <!-- Contact -->
          <div>
            <h3 class="font-heading text-xl font-semibold">Contacto</h3>
            <ul class="mt-4 flex flex-col gap-3 text-sm text-primary-foreground/70">
              <li class="flex items-start gap-2.5">
                <i data-lucide="map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-accent"></i>
                Caracas, Venezuela
              </li>
              <li class="flex items-start gap-2.5">
                <i data-lucide="phone" class="mt-0.5 h-4 w-4 shrink-0 text-accent"></i>
                +58 412 000 0000
              </li>
              <li class="flex items-start gap-2.5">
                <i data-lucide="mail" class="mt-0.5 h-4 w-4 shrink-0 text-accent"></i>
                hola@kavala.com
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-14 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/15 pt-8 text-center text-xs text-primary-foreground/60 sm:flex-row sm:text-left">
          <p>© 2026 Kavala. Todos los derechos reservados.</p>
          <div class="flex gap-6">
            <a href="#" class="transition-colors hover:text-accent">Términos</a>
            <a href="#" class="transition-colors hover:text-accent">Privacidad</a>
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
