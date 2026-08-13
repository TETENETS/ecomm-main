import { API_URL, fetchBCV, renderHeader, renderCartArea, renderFooter, updateCartUI, getCart, saveCart, getImageUrl } from './components.js';

let products = [];
let productLines = [];
let categories = [];
let currentLineId = null;
let searchQuery = '';
let filterCategoryId = '';
let slideIntervals = [];

async function loadThemeSettings() {
    try {
        const res = await fetch(`${API_URL}/public/settings`);
        const settings = await res.json();
        if (settings) {
            const root = document.documentElement;
            if (settings.theme_page_bg) root.style.setProperty('--background', settings.theme_page_bg);
            if (settings.theme_card_bg) root.style.setProperty('--card', settings.theme_card_bg);
            if (settings.theme_header_bg) root.style.setProperty('--theme-header-bg', settings.theme_header_bg);
            if (settings.theme_header_text) root.style.setProperty('--theme-header-text', settings.theme_header_text);
            if (settings.theme_hero_title) root.style.setProperty('--theme-hero-title', settings.theme_hero_title);
            if (settings.theme_hero_subtitle) root.style.setProperty('--theme-hero-subtitle', settings.theme_hero_subtitle);
            if (settings.theme_hero_btn_bg) root.style.setProperty('--theme-hero-btn-bg', settings.theme_hero_btn_bg);
            if (settings.theme_hero_btn_text) root.style.setProperty('--theme-hero-btn-text', settings.theme_hero_btn_text);
            if (settings.theme_hero_btn_border) root.style.setProperty('--theme-hero-btn-border', settings.theme_hero_btn_border);
            if (settings.theme_hero_btn2_bg) root.style.setProperty('--theme-hero-btn2-bg', settings.theme_hero_btn2_bg);
            if (settings.theme_hero_btn2_text) root.style.setProperty('--theme-hero-btn2-text', settings.theme_hero_btn2_text);
            if (settings.theme_hero_btn2_border) root.style.setProperty('--theme-hero-btn2-border', settings.theme_hero_btn2_border);
            if (settings.theme_hero_badge_bg) root.style.setProperty('--theme-hero-badge-bg', settings.theme_hero_badge_bg);
            if (settings.theme_hero_badge_text) root.style.setProperty('--theme-hero-badge-text', settings.theme_hero_badge_text);
            if (settings.theme_hero_card_bg) root.style.setProperty('--theme-hero-card-bg', settings.theme_hero_card_bg);
            if (settings.theme_hero_card_border) root.style.setProperty('--theme-hero-card-border', settings.theme_hero_card_border);
            if (settings.theme_hero_overlay_from) root.style.setProperty('--theme-hero-overlay-from', settings.theme_hero_overlay_from);
            if (settings.theme_hero_overlay_via) root.style.setProperty('--theme-hero-overlay-via', settings.theme_hero_overlay_via);
            if (settings.theme_hero_overlay_to) root.style.setProperty('--theme-hero-overlay-to', settings.theme_hero_overlay_to);
            if (settings.theme_hero_overlay_bottom) root.style.setProperty('--theme-hero-overlay-bottom', settings.theme_hero_overlay_bottom);
            if (settings.theme_card_title) root.style.setProperty('--theme-card-title', settings.theme_card_title);
            if (settings.theme_card_price) root.style.setProperty('--theme-card-price', settings.theme_card_price);
            if (settings.theme_btn_cart_bg) root.style.setProperty('--theme-btn-cart-bg', settings.theme_btn_cart_bg);
            if (settings.theme_btn_cart_text) root.style.setProperty('--theme-btn-cart-text', settings.theme_btn_cart_text);
            if (settings.theme_btn_cart_border) root.style.setProperty('--theme-btn-cart-border', settings.theme_btn_cart_border);
            if (settings.theme_input_bg) root.style.setProperty('--theme-input-bg', settings.theme_input_bg);
            if (settings.theme_input_text) root.style.setProperty('--theme-input-text', settings.theme_input_text);
            if (settings.theme_placeholder_text) root.style.setProperty('--theme-placeholder-text', settings.theme_placeholder_text);
            if (settings.theme_footer_bg) root.style.setProperty('--theme-footer-bg', settings.theme_footer_bg);
            if (settings.theme_footer_text) root.style.setProperty('--theme-footer-text', settings.theme_footer_text);
            
            if (settings.theme_hero_bg_image) {
                const bgImgEl = document.getElementById('hero-bg-img');
                if (bgImgEl) bgImgEl.src = getImageUrl(settings.theme_hero_bg_image);
            }
            if (settings.theme_hero_badge_title) {
                const badgeTextEl = document.getElementById('hero-badge-text-content');
                if (badgeTextEl) badgeTextEl.textContent = settings.theme_hero_badge_title;
            }
            
            let styleTag = document.getElementById('dynamic-theme-styles');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'dynamic-theme-styles';
                document.head.appendChild(styleTag);
            }
            styleTag.innerHTML = `
                ::placeholder { color: var(--theme-placeholder-text, #94a3b8) !important; opacity: 1 !important; }
                ::-webkit-input-placeholder { color: var(--theme-placeholder-text, #94a3b8) !important; }
                ::-moz-placeholder { color: var(--theme-placeholder-text, #94a3b8) !important; }
                input, select { background-color: var(--theme-input-bg, #0f1115) !important; color: var(--theme-input-text, #f8fafc) !important; }
            `;
        }
    } catch (err) {
        console.error('Error loading public theme settings:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadThemeSettings();
    const app = document.getElementById('app');
    
    // Layout Base
    app.innerHTML = `
        <div class="flex min-h-screen flex-col bg-background">
            ${renderHeader()}
            ${renderCartArea()}
            
            <main class="flex-1">
                <!-- Hero Section -->
                <section id="inicio" class="relative -mt-[68px] flex min-h-[88vh] items-center overflow-hidden md:-mt-[80px]" style="background-color: var(--theme-page-bg, #0f1115);">
                  <img id="hero-bg-img" src="img/bg-img/bg-1.jpg" class="object-cover absolute inset-0 w-full h-full object-right md:object-center opacity-90 transition-all duration-300" alt="Hero background" />
                  <div id="hero-overlay-horizontal" class="absolute inset-0 pointer-events-none transition-all duration-300" style="background: linear-gradient(to right, var(--theme-hero-overlay-from, #0f1115), var(--theme-hero-overlay-via, rgba(15, 17, 21, 0.9)), var(--theme-hero-overlay-to, rgba(15, 17, 21, 0.2)));"></div>
                  <div id="hero-overlay-vertical" class="absolute inset-0 pointer-events-none transition-all duration-300" style="background: linear-gradient(to top, var(--theme-hero-overlay-bottom, #0f1115), transparent);"></div>
                  <div class="relative mx-auto w-full max-w-7xl px-4 pt-28 pb-16 md:px-8">
                    <div id="hero-glass-card" class="max-w-xl rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl transition-all" style="background-color: var(--theme-hero-card-bg, rgba(2, 6, 23, 0.7)); border: 1px solid var(--theme-hero-card-border, rgba(255, 255, 255, 0.1));">
                      <span id="hero-badge" class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] transition-all" style="background-color: var(--theme-hero-badge-bg, rgba(194, 144, 95, 0.15)); color: var(--theme-hero-badge-text, #c2905f); border: 1px solid var(--theme-hero-badge-text, #c2905f);">
                        <span id="hero-badge-text-content">Edición Costa Dorada</span>
                      </span>
                      <h1 id="hero-title" class="mt-4 font-heading text-4xl font-bold leading-tight sm:text-5xl md:text-6xl drop-shadow transition-colors" style="color: var(--theme-hero-title, #ffffff);">
                        El lujo del mar en tu piel
                      </h1>
                      <p id="hero-subtitle" class="mt-4 max-w-md text-base leading-relaxed md:text-lg transition-colors" style="color: var(--theme-hero-subtitle, #e2e8f0);">
                        Fragancias y cuidado corporal de alta gama inspirados en la brisa, la arena y los tesoros del océano. Descubre la colección Kavala.
                      </p>
                      <div class="mt-8 flex flex-wrap items-center gap-4">
                        <a id="hero-btn-primary" href="#main-catalog-section" class="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs md:text-sm font-bold uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5 shadow-xl cursor-pointer" style="background-color: var(--theme-hero-btn-bg, #c2905f); color: var(--theme-hero-btn-text, #ffffff); border: 1px solid var(--theme-hero-btn-border, #c2905f);">
                          <span>Comprar ahora</span> <i data-lucide="arrow-right" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" style="color: var(--theme-hero-btn-text, #ffffff);"></i>
                        </a>
                        <a id="hero-btn-secondary" href="#lineas" class="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs md:text-sm font-bold uppercase tracking-widest transition-all duration-300 shadow-lg cursor-pointer" style="background-color: var(--theme-hero-btn2-bg, #1e293b); color: var(--theme-hero-btn2-text, #ffffff); border: 1px solid var(--theme-hero-btn2-border, #ffffff);">
                          Ver líneas
                        </a>
                      </div>
                    </div>
                  </div>
                </section>

                <section id="lineas" class="py-24 bg-background">
                    <div class="mx-auto max-w-7xl px-4 md:px-8">
                        <div class="mb-12 flex flex-col items-center justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <h2 class="font-heading text-3xl font-semibold text-primary sm:text-4xl md:text-5xl">Nuestras Líneas</h2>
                                <p class="mt-4 max-w-xl text-foreground/80">Descubre colecciones completas diseñadas para crear rutinas de cuidado perfectas.</p>
                            </div>
                        </div>
                        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" id="product-lines-container"></div>
                    </div>
                </section>

                <section id="main-catalog-section" class="py-24 bg-muted/30">
                    <div class="mx-auto max-w-7xl px-4 md:px-8">
                        <div class="mb-12 flex flex-col items-center justify-between gap-4 md:flex-row md:items-end" id="catalog-header-container">
                            <div>
                                <h2 class="font-heading text-3xl font-semibold text-primary sm:text-4xl md:text-5xl">Productos Destacados</h2>
                                <p class="mt-4 max-w-xl text-foreground/80">Nuestros productos más populares para cuidar tu piel y dejar una estela inolvidable.</p>
                            </div>
                        </div>
                        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" id="product-list-container"></div>
                    </div>
                </section>
            </main>

            ${renderFooter()}
        </div>
    `;

    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

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
    fetchBCV().then(() => loadData());
});

async function loadData() {
    try {
        const [linesRes, prodsRes, catsRes] = await Promise.all([
            fetch(`${API_URL}/public/product-lines`),
            fetch(`${API_URL}/public/products`),
            fetch(`${API_URL}/public/categories`)
        ]);
        productLines = await linesRes.json();
        products = await prodsRes.json();
        categories = await catsRes.json();

        // Sort product lines by priority numerical order (1 = highest priority) then name A-Z
        productLines.sort((a, b) => {
            const pA = a.priority !== undefined ? a.priority : 1;
            const pB = b.priority !== undefined ? b.priority : 1;
            if (pA !== pB) return pA - pB;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Sort products by category A-Z initially
        products.sort((a, b) => {
            const catA = a.category ? a.category.name.toLowerCase() : 'zzz';
            const catB = b.category ? b.category.name.toLowerCase() : 'zzz';
            return catA.localeCompare(catB);
        });

        renderProductLines();
        renderProducts();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

window.updateFilters = function() {
    searchQuery = document.getElementById('storeSearch').value.toLowerCase();
    filterCategoryId = document.getElementById('storeCategory').value;
    renderProducts();
};

function renderProductLines() {
    const container = document.getElementById('product-lines-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Clear old intervals
    slideIntervals.forEach(clearInterval);
    slideIntervals = [];
    
    productLines.forEach((l, idx) => {
        let defaultBg = l.imageUrl ? getImageUrl(l.imageUrl) : 'img/bg-img/bg-' + ((idx % 4) + 2) + '.jpg';
        
        // Gather images for slideshow
        let lineProds = products.filter(p => p.productLineId === l.id);
        let images = [defaultBg];
        lineProds.forEach(p => {
            if (p.imageUrl) images.push(getImageUrl(p.imageUrl));
        });

        let tagline = l.description ? l.description : 'Envuelve tus sentidos en una experiencia única.';
        let colClass = idx === 0 ? "sm:col-span-2 lg:col-span-1" : "";
        container.innerHTML += `
            <a href="javascript:void(0)" id="line-card-${l.id}" onclick="event.preventDefault(); window.showProductLine(${l.id})" class="group relative overflow-hidden rounded-2xl ${colClass}">
                <div class="relative aspect-[4/5] w-full bg-muted bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105" style="background-image: url(${defaultBg});" id="line-card-bg-${l.id}">
                  <div class="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent transition-opacity duration-500 group-hover:from-foreground/90"></div>
                </div>
                <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 pointer-events-none">
                  <div>
                    <h3 class="font-heading text-3xl font-semibold text-background">${l.name}</h3>
                    <p class="mt-1 max-w-[18rem] text-sm leading-relaxed text-background/80">${tagline}</p>
                  </div>
                  <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-background/90 text-primary transition-all duration-300 group-hover:bg-accent group-hover:text-accent-foreground">
                    <i data-lucide="arrow-up-right" class="h-5 w-5"></i>
                  </span>
                </div>
            </a>
        `;
    });

    // Start slideshow intervals
    productLines.forEach(l => {
        let defaultBg = l.imageUrl ? getImageUrl(l.imageUrl) : null;
        let lineProds = products.filter(p => p.productLineId === l.id);
        let images = [];
        if (defaultBg) images.push(defaultBg);
        lineProds.forEach(p => {
            if (p.imageUrl) images.push(getImageUrl(p.imageUrl));
        });

        if (images.length > 1) {
            let imgIdx = 0;
            const cardEl = document.getElementById(`line-card-bg-${l.id}`);
            const interval = setInterval(() => {
                imgIdx = (imgIdx + 1) % images.length;
                if (cardEl) {
                    cardEl.style.backgroundImage = `url(${images[imgIdx]})`;
                }
            }, 3000);
            slideIntervals.push(interval);
        }
    });
}

let lastRenderedLineId = undefined;

function renderProducts() {
    const container = document.getElementById('product-list-container');
    const headerContainer = document.getElementById('catalog-header-container');
    if (!container || !headerContainer) return;

    if (lastRenderedLineId !== currentLineId) {
        let filtersHtml = `
            <div class="flex flex-col sm:flex-row gap-3 w-full max-w-2xl mx-auto my-6">
                <div class="relative flex-1">
                    <input type="text" id="storeSearch" class="w-full rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 placeholder-slate-400 focus:border-[#c2905f] focus:outline-none focus:ring-1 focus:ring-[#c2905f] shadow-inner" placeholder="Buscar productos..." value="${searchQuery}" onkeyup="window.updateFilters()">
                </div>
                <div class="w-full sm:w-64">
                    <select id="storeCategory" class="w-full rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 focus:border-[#c2905f] focus:outline-none focus:ring-1 focus:ring-[#c2905f] shadow-inner" onchange="window.updateFilters()">
                        <option value="" class="bg-slate-900 text-slate-100">Todas las Categorías</option>
                        ${categories.map(c => `<option value="${c.id}" ${filterCategoryId == c.id ? 'selected' : ''} class="bg-slate-900 text-slate-100">${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        if (currentLineId) {
            const line = productLines.find(l => l.id === currentLineId);
            let bannerBg = line && line.imageUrl ? getImageUrl(line.imageUrl) : 'img/bg-img/bg-2.jpg';
            
            headerContainer.innerHTML = `
                <div class="w-full flex flex-col items-center mb-6">
                    <div style="width: 100%; min-height: 250px; background-image: url(${bannerBg}); background-size: cover; background-position: center; border-radius: 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;" class="shadow-2xl">
                        <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,17,21,0.9), rgba(15,17,21,0.4));"></div>
                        <div style="position: relative; z-index: 10; text-align: center; padding: 30px 20px;">
                            <h2 class="font-heading text-4xl sm:text-5xl font-bold text-white tracking-wide drop-shadow-md">${line ? line.name : 'Línea de Producto'}</h2>
                            ${line && line.description ? `<p class="mt-2 text-slate-200 text-sm max-w-lg mx-auto leading-relaxed">${line.description}</p>` : ''}
                        </div>
                    </div>
                    <button class="inline-flex items-center gap-2 rounded-full bg-[#c2905f] hover:bg-[#d4a373] text-white px-7 py-3 text-xs md:text-sm font-semibold uppercase tracking-widest transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer mb-2" onclick="window.showAllProducts()">
                        <i data-lucide="arrow-left" class="h-4 w-4"></i> Volver al Catálogo Completo
                    </button>
                    ${filtersHtml}
                </div>
            `;
        } else {
            headerContainer.innerHTML = `
                <div class="w-full text-center md:text-left mb-4">
                    <h2 class="font-heading text-3xl font-semibold text-slate-100 sm:text-4xl md:text-5xl">Catálogo de Productos</h2>
                    <p class="mt-2 text-slate-300 text-sm md:text-base">Explora nuestra colección exclusiva de fragancias y cuidado personal.</p>
                </div>
                ${filtersHtml}
            `;
        }
        lastRenderedLineId = currentLineId;
    }

    let filteredProducts = products.filter(p => p.stock > 0);
    if (currentLineId) {
        filteredProducts = filteredProducts.filter(p => p.productLineId === currentLineId);
    }
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchQuery));
    }
    if (filterCategoryId) {
        filteredProducts = filteredProducts.filter(p => p.categoryId == filterCategoryId);
    }

    container.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No se encontraron productos con estos filtros.</p></div>';
    }

    filteredProducts.forEach(p => {
        let mainImg = p.imageUrl ? getImageUrl(p.imageUrl) : 'img/product-img/product-1.jpg';
        let priceUsd = p.price ? Number(p.price) : 0;
        let priceStr = p.price ? `$${priceUsd.toFixed(2)} / Bs. ${(priceUsd * window.tasaBCV).toFixed(2)}` : '';
        let hasVariants = p.variants && p.variants.length > 0;
        
        let variantsHtml = '';
        if (hasVariants) {
            priceUsd = Number(p.variants[0].price);
            priceStr = `$${priceUsd.toFixed(2)} / Bs. ${(priceUsd * window.tasaBCV).toFixed(2)}`;
            variantsHtml = `
                <select id="var-${p.id}" class="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-[#c2905f] focus:outline-none mb-2" onchange="window.changeVariant(${p.id})">
                    <option value="" disabled selected class="bg-slate-900 text-slate-400">Seleccionar variante...</option>
                    ${p.variants.map(v => `<option value="${v.id}" data-price="${v.price}" data-img="${v.imageUrl || ''}" class="bg-slate-900 text-slate-100">${v.name} - $${Number(v.price).toFixed(2)}</option>`).join('')}
                </select>
            `;
        }

        let productLineName = '';
        if (p.productLineId) {
            const lineObj = productLines.find(l => l.id === p.productLineId);
            if (lineObj) productLineName = lineObj.name;
        }

        container.innerHTML += `
            <article class="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#181b21] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#c2905f]/50 hover:shadow-xl hover:shadow-[#c2905f]/10">
              <div class="relative aspect-[4/5] w-full overflow-hidden bg-slate-900">
                <img id="prod-img-${p.id}" src="${mainImg}" data-main-img="${p.imageUrl ? getImageUrl(p.imageUrl) : 'img/product-img/product-1.jpg'}" alt="" class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105">
                ${productLineName ? `<span class="absolute left-3 top-3 rounded-full bg-slate-900/90 border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c2905f] backdrop-blur-md shadow">${productLineName}</span>` : ''}
              </div>

              <div class="flex flex-1 flex-col p-5">
                <h3 class="font-heading text-2xl font-semibold leading-tight text-slate-100">
                  ${p.name}
                </h3>
                <p class="mt-1 text-sm font-medium text-[#c2905f]" id="price-lbl-${p.id}">
                  ${priceStr}
                </p>

                <div class="mt-4 flex flex-col gap-3 flex-1">
                    ${variantsHtml}
                    
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Cantidad:</span>
                        <input type="number" id="qty-${p.id}" class="w-20 rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-center text-sm font-bold text-slate-100 focus:border-[#c2905f] focus:outline-none" value="1" min="1">
                    </div>
                </div>

                <button onclick="window.addToCart(${p.id})" class="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#c2905f] hover:bg-[#d4a373] py-3 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
                  <i data-lucide="plus" class="h-4 w-4"></i>
                  Añadir al carrito
                </button>
              </div>
            </article>
        `;
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

window.addToCart = function(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    let variantId = null;
    let variantName = 'Default';
    let finalPrice = parseFloat(prod.price) || 0;

    let maxStock = prod.stock || 0;

    if (prod.variants && prod.variants.length > 0) {
        const select = document.getElementById(`var-${prod.id}`);
        if (!select.value) {
            alert("Por favor selecciona una variante (ej. talla/color).");
            return;
        }
        variantId = parseInt(select.value);
        const opt = select.options[select.selectedIndex];
        variantName = opt.text.split(' - ')[0];
        finalPrice = parseFloat(opt.getAttribute('data-price'));
        
        const variantObj = prod.variants.find(v => v.id === variantId);
        maxStock = variantObj ? variantObj.stock : 0;
    }

    const qtyInput = document.getElementById(`qty-${prod.id}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

    const cart = getCart();
    
    // Check if item already exists in cart with same variant
    const existingIndex = cart.findIndex(i => i.productId === prod.id && i.variantId === variantId);
    const existingQuantity = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    if (existingQuantity + quantity > maxStock) {
        alert(`¡Stock insuficiente! Sólo quedan ${maxStock} unidades disponibles de este producto/variante.`);
        return;
    }
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
        cart[existingIndex].maxStock = maxStock;
    } else {
        cart.push({
            productId: prod.id,
            variantId: variantId,
            productName: prod.name,
            variantName: variantName,
            price: finalPrice,
            quantity: quantity,
            maxStock: maxStock,
            imageUrl: prod.imageUrl ? getImageUrl(prod.imageUrl) : 'img/product-img/product-1.jpg'
        });
    }

    saveCart(cart);
    
    // Auto open cart
    if (typeof jQuery !== 'undefined') {
        jQuery('.right-side-cart-area').addClass('cart-on');
    }
};

window.changeVariant = function(productId) {
    const select = document.getElementById(`var-${productId}`);
    const imgEl = document.getElementById(`prod-img-${productId}`);
    const priceLbl = document.getElementById(`price-lbl-${productId}`);
    if (!select || !imgEl) return;
    
    const opt = select.options[select.selectedIndex];
    const varImg = opt.getAttribute('data-img');
    const mainImg = imgEl.getAttribute('data-main-img');
    const varPrice = parseFloat(opt.getAttribute('data-price'));
    
    if (varImg) {
        imgEl.src = getImageUrl(varImg);
    } else {
        imgEl.src = mainImg;
    }
    
    if (priceLbl && !isNaN(varPrice)) {
        priceLbl.innerText = `$${varPrice.toFixed(2)} / Bs. ${(varPrice * window.tasaBCV).toFixed(2)}`;
    }
};

window.showProductLine = function(lineId) {
    currentLineId = lineId;
    const linesContainer = document.querySelector('.top_catagory_area');
    if (linesContainer) linesContainer.style.display = 'none';
    
    renderProducts();
    
    // Scroll to catalog
    document.getElementById('main-catalog-section').scrollIntoView({ behavior: 'smooth' });
};

window.showAllProducts = function() {
    currentLineId = null;
    const linesContainer = document.querySelector('.top_catagory_area');
    if (linesContainer) linesContainer.style.display = 'block';
    
    renderProducts();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
