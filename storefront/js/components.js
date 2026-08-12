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
        
        if (cart.length === 0) {
            cartListEl.innerHTML = `
                <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground gap-4">
                    <i data-lucide="shopping-bag" class="h-12 w-12 opacity-20"></i>
                    <p>Tu carrito está vacío.</p>
                </div>
            `;
        } else {
            cart.forEach((item, index) => {
                const itemPrice = Number(item.price) || 0;
                cartListEl.innerHTML += `
                    <div class="flex gap-4">
                        <div class="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <img src="${item.imageUrl}" alt="${item.productName}" class="absolute inset-0 h-full w-full object-cover">
                        </div>
                        <div class="flex flex-1 flex-col justify-between">
                            <div class="flex items-start justify-between gap-2">
                                <div>
                                    <h4 class="font-heading text-lg font-semibold text-primary">${item.productName}</h4>
                                    <p class="text-xs text-muted-foreground uppercase tracking-wider">${item.variantName}</p>
                                </div>
                                <button onclick="window.removeFromCart(${index})" class="text-muted-foreground transition-colors hover:text-destructive">
                                    <i data-lucide="x" class="h-4 w-4"></i>
                                </button>
                            </div>
                            <div class="flex items-end justify-between">
                                <div class="flex items-center rounded-md border border-border">
                                    <span class="px-3 py-1 text-sm font-medium">${item.quantity}</span>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm font-semibold text-foreground">$${itemPrice.toFixed(2)}</p>
                                    <p class="text-[10px] text-muted-foreground">Bs. ${(itemPrice * window.tasaBCV).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        // Ensure Lucide icons are instantiated in the new HTML
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        const subtotalUsdEl = document.getElementById('cart-subtotal-usd');
        const subtotalBsEl = document.getElementById('cart-subtotal-bs');
        if (subtotalUsdEl) subtotalUsdEl.innerText = `$${amount.toFixed(2)}`;
        if (subtotalBsEl) subtotalBsEl.innerText = `Bs. ${(amount * window.tasaBCV).toFixed(2)}`;
    }
}

export function renderHeader() {
    return `
    <header id="site-header" class="sticky top-0 z-40 transition-all duration-300 border-b border-white/10 backdrop-blur-md shadow-lg" style="background-color: var(--theme-header-bg, #0f1115); color: var(--theme-header-text, #ffffff);">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <!-- Mobile menu toggle -->
        <button onclick="document.getElementById('mobile-menu').classList.toggle('max-h-0'); document.getElementById('mobile-menu').classList.toggle('max-h-80');" class="grid h-10 w-10 place-items-center rounded-full bg-slate-800 transition-colors hover:opacity-80 md:hidden" style="color: var(--theme-header-text, #ffffff);" aria-label="Abrir Menú">
          <i data-lucide="menu" class="h-5 w-5"></i>
        </button>

        <!-- Logo -->
        <a href="index.html" class="flex shrink-0 items-center">
          <img src="img/core-img/logo-kavala.png" alt="Kavala" class="h-10 w-auto md:h-12" onerror="this.onerror=null; this.outerHTML='<h2 class=\\'text-2xl font-heading font-bold\\' style=\\'color: var(--theme-hero-btn-bg, #c2905f)\\'>Kavala</h2>';">
        </a>

        <!-- Desktop nav -->
        <nav class="hidden items-center gap-8 md:flex">
          <a href="#inicio" class="relative text-xs md:text-sm font-semibold uppercase tracking-widest transition-opacity hover:opacity-80 py-1" style="color: var(--theme-header-text, #ffffff);">Inicio</a>
          <a href="#lineas" class="relative text-xs md:text-sm font-semibold uppercase tracking-widest transition-opacity hover:opacity-80 py-1" style="color: var(--theme-header-text, #ffffff);">Nuestras Líneas</a>
          <a href="#main-catalog-section" class="relative text-xs md:text-sm font-semibold uppercase tracking-widest transition-opacity hover:opacity-80 py-1" style="color: var(--theme-header-text, #ffffff);">Destacados</a>
        </nav>

        <!-- Right meta: search + cart -->
        <div class="flex items-center gap-3">
          <div class="hidden items-center rounded-full border border-white/15 px-4 py-2 transition-colors lg:flex" style="background-color: var(--theme-input-bg, #0f1115);">
            <i data-lucide="search" class="h-4 w-4 opacity-60" style="color: var(--theme-placeholder-text, #94a3b8);"></i>
            <input type="search" placeholder="Buscar fragancias..." onkeyup="if(event.key==='Enter'){ window.location.hash='#main-catalog-section'; const el = document.getElementById('storeSearch'); if(el){ el.value=this.value; window.updateFilters(); } }" class="ml-2 w-44 bg-transparent text-sm focus:outline-none" style="color: var(--theme-input-text, #f8fafc);" />
          </div>

          <button id="essenceCartBtn" aria-label="Ver Carrito" class="relative grid h-10 w-10 place-items-center rounded-full transition-all hover:opacity-90 shadow" style="background-color: var(--theme-btn-cart-bg, #c2905f); color: var(--theme-btn-cart-text, #ffffff);" onclick="document.getElementById('rightSideCart').classList.remove('translate-x-full'); document.getElementById('cartBackdrop').classList.remove('hidden'); setTimeout(() => document.getElementById('cartBackdrop').classList.remove('opacity-0'), 10);">
            <i data-lucide="shopping-bag" class="h-5 w-5"></i>
            <span id="cart-count-badge" class="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white shadow" style="background-color: var(--theme-hero-btn_bg, #c2905f); display:none;">0</span>
          </button>
        </div>
      </div>

      <!-- Mobile nav drawer -->
      <div id="mobile-menu" class="overflow-hidden border-t border-white/10 backdrop-blur-md transition-[max-height] duration-300 md:hidden max-h-0" style="background-color: var(--theme-header-bg, #0f1115); color: var(--theme-header-text, #ffffff);">
        <nav class="flex flex-col gap-1 px-4 py-3">
          <a href="#inicio" onclick="document.getElementById('mobile-menu').classList.add('max-h-0'); document.getElementById('mobile-menu').classList.remove('max-h-80');" class="rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-80" style="color: var(--theme-header-text, #ffffff);">Inicio</a>
          <a href="#lineas" onclick="document.getElementById('mobile-menu').classList.add('max-h-0'); document.getElementById('mobile-menu').classList.remove('max-h-80');" class="rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-80" style="color: var(--theme-header-text, #ffffff);">Nuestras Líneas</a>
          <a href="#main-catalog-section" onclick="document.getElementById('mobile-menu').classList.add('max-h-0'); document.getElementById('mobile-menu').classList.remove('max-h-80');" class="rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-80" style="color: var(--theme-header-text, #ffffff);">Destacados</a>
        </nav>
      </div>
    </header>
    `;
}

export function renderCartArea() {
    return `
    <!-- Cart Backdrop -->
    <div id="cartBackdrop" class="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm hidden transition-opacity duration-300 opacity-0" onclick="document.getElementById('rightSideCart').classList.add('translate-x-full'); this.classList.add('hidden', 'opacity-0');"></div>
    
    <!-- Cart Drawer -->
    <div id="rightSideCart" class="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 translate-x-full">
      <div class="flex items-center justify-between border-b border-border p-6">
        <h2 class="font-heading text-2xl font-semibold text-primary">Tu Carrito</h2>
        <button class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" onclick="document.getElementById('rightSideCart').classList.add('translate-x-full'); document.getElementById('cartBackdrop').classList.add('hidden', 'opacity-0');">
          <i data-lucide="x" class="h-5 w-5"></i>
        </button>
      </div>
      
      <!-- Cart Items List -->
      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6" id="cart-list">
         <!-- Items will be injected here by JS -->
      </div>
      
      <!-- Cart Summary -->
      <div class="border-t border-border bg-muted/30 p-6">
        <div class="mb-4 flex items-center justify-between">
          <span class="text-sm font-medium text-foreground">Subtotal</span>
          <div class="text-right">
            <p class="font-heading text-lg font-semibold text-primary" id="cart-subtotal-usd">$0.00</p>
            <p class="text-xs text-muted-foreground" id="cart-subtotal-bs">Bs. 0.00</p>
          </div>
        </div>
        <a href="checkout.html" class="flex w-full items-center justify-center rounded-full bg-primary py-4 text-sm font-medium uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90">
          Finalizar Compra
        </a>
        <p class="mt-4 text-center text-xs text-muted-foreground">Envío gratis en compras superiores a $50</p>
      </div>
    </div>
    `;
}

export function renderFooter() {
    return `
    <footer id="contacto" class="shadow-inner" style="background-color: var(--theme-footer-bg, #0f1115); color: var(--theme-footer-text, #94a3b8);">
      <div class="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div class="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
          <!-- Brand -->
          <div class="col-span-2 lg:col-span-2">
            <img src="img/core-img/logo-kavala.png" alt="Kavala" class="h-14 w-auto mb-5" onerror="this.onerror=null; this.outerHTML='<h2 class=\\'text-3xl font-heading font-bold\\' style=\\'color: var(--theme-hero-btn-bg, #c2905f)\\'>Kavala</h2>';">
            <p class="mt-5 max-w-xs text-pretty text-sm leading-relaxed opacity-80">
              Cuidado corporal y fragancias de alta gama inspirados en la belleza del mar. Hecho con amor en Venezuela.
            </p>
          </div>

          <!-- Link columns -->
          <div>
              <h3 class="font-heading text-xl font-semibold opacity-100">Tienda</h3>
              <ul class="mt-4 flex flex-col gap-2.5 opacity-80">
                  <li><a href="#" class="text-sm transition-colors hover:opacity-100">Body Splash</a></li>
                  <li><a href="#" class="text-sm transition-colors hover:opacity-100">Cremas & Mantecas</a></li>
                  <li><a href="#" class="text-sm transition-colors hover:opacity-100">Jabones</a></li>
                  <li><a href="#" class="text-sm transition-colors hover:opacity-100">Lociones</a></li>
              </ul>
          </div>
          <div>
              <h3 class="font-heading text-xl font-semibold opacity-100">Ayuda</h3>
              <ul class="mt-4 flex flex-col gap-2.5 opacity-80">
                  <li><a href="#" class="text-sm transition-colors hover:opacity-100">Envíos</a></li>
                  <li><a href="#" class="text-sm transition-colors hover:opacity-100">Devoluciones</a></li>
                  <li><a href="#" class="text-sm transition-colors hover:opacity-100">Preguntas frecuentes</a></li>
              </ul>
          </div>

          <!-- Contact -->
          <div>
            <h3 class="font-heading text-xl font-semibold opacity-100">Contacto</h3>
            <ul class="mt-4 flex flex-col gap-3 text-sm opacity-80">
              <li class="flex items-start gap-2.5">
                Caracas, Venezuela
              </li>
              <li class="flex items-start gap-2.5">
                +58 412 000 0000
              </li>
              <li class="flex items-start gap-2.5">
                hola@kavala.com
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-xs opacity-70 sm:flex-row sm:text-left">
          <p>© 2026 Kavala. Todos los derechos reservados.</p>
          <div class="flex gap-6">
            <a href="#" class="transition-colors hover:opacity-100">Términos</a>
            <a href="#" class="transition-colors hover:opacity-100">Privacidad</a>
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
