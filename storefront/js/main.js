import { API_URL, fetchBCV, renderHeader, renderCartArea, renderFooter, updateCartUI, getCart, saveCart, getImageUrl } from './components.js';

let products = [];
let productLines = [];
let categories = [];
let currentLineId = null;
let searchQuery = '';
let filterCategoryId = '';
let slideIntervals = [];

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    
    // Layout Base
    app.innerHTML = `
        <div class="flex min-h-screen flex-col bg-background">
            ${renderHeader()}
            ${renderCartArea()}
            
            <main class="flex-1">
                <!-- Hero Section -->
                <section id="inicio" class="relative -mt-[68px] flex min-h-[88vh] items-center overflow-hidden md:-mt-[80px]">
                  <img src="img/bg-img/bg-1.jpg" class="object-cover absolute inset-0 w-full h-full" alt="" />
                  <div class="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/20"></div>
                  <div class="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
                  <div class="relative mx-auto w-full max-w-7xl px-4 pt-24 pb-16 md:px-8">
                    <div class="max-w-xl">
                      <span class="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-card/50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent backdrop-blur-sm">
                        Edición Costa Dorada
                      </span>
                      <h1 class="mt-6 text-balance font-heading text-5xl font-semibold leading-[1.05] text-primary sm:text-6xl md:text-7xl">
                        El lujo del mar en tu piel
                      </h1>
                      <p class="mt-5 max-w-md text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
                        Fragancias y cuidado corporal de alta gama inspirados en la brisa, la arena y los tesoros del océano. Descubre la colección Kavala.
                      </p>
                      <div class="mt-8 flex flex-wrap items-center gap-4">
                        <a href="#main-catalog-section" class="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-medium uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent hover:shadow-xl hover:shadow-accent/30">
                          Comprar ahora <i data-lucide="arrow-right" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"></i>
                        </a>
                        <a href="#lineas" class="inline-flex items-center gap-2 rounded-full border border-primary/30 px-8 py-4 text-sm font-medium uppercase tracking-widest text-primary transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground">
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
            <div class="row mb-4 mt-4 justify-content-center" style="max-width: 800px; margin: 0 auto;">
                <div class="col-12 d-flex gap-2" style="gap: 10px;">
                    <input type="text" id="storeSearch" class="form-control" placeholder="Buscar productos..." value="${searchQuery}" onkeyup="window.updateFilters()">
                    <select id="storeCategory" class="form-control" onchange="window.updateFilters()">
                        <option value="">Todas las Categorías</option>
                        ${categories.map(c => `<option value="${c.id}" ${filterCategoryId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        if (currentLineId) {
            const line = productLines.find(l => l.id === currentLineId);
            let bannerBg = line && line.imageUrl ? getImageUrl(line.imageUrl) : 'img/bg-img/bg-2.jpg';
            
            headerContainer.innerHTML = `
                <div style="width: 100%; height: 300px; background-image: url(${bannerBg}); background-size: cover; background-position: center; border-radius: 15px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: inset 0 0 0 2000px rgba(0,0,0,0.3);">
                    <div style="padding: 20px 40px; border-radius: 10px;">
                        <h2 style="color: white; margin: 0; font-size: 3rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${line ? line.name : 'Línea de Producto'}</h2>
                    </div>
                </div>
                <button class="btn essence-btn mb-4" onclick="window.showAllProducts()">← Volver al Catálogo Completo</button>
                ${filtersHtml}
            `;
        } else {
            headerContainer.innerHTML = `<h2>Catálogo de Productos</h2> ${filtersHtml}`;
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
                <select id="var-${p.id}" class="form-control mb-2" onchange="window.changeVariant(${p.id})">
                    <option value="" disabled selected>Seleccionar</option>
                    ${p.variants.map(v => `<option value="${v.id}" data-price="${v.price}" data-img="${v.imageUrl || ''}">${v.name} - $${Number(v.price).toFixed(2)}</option>`).join('')}
                </select>
            `;
        }

        let productLineName = '';
        if (p.productLineId) {
            const lineObj = productLines.find(l => l.id === p.productLineId);
            if (lineObj) productLineName = lineObj.name;
        }

        container.innerHTML += `
            <article class="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/50 hover:shadow-xl hover:shadow-primary/10">
              <div class="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                <img id="prod-img-${p.id}" src="${mainImg}" data-main-img="${p.imageUrl ? getImageUrl(p.imageUrl) : 'img/product-img/product-1.jpg'}" alt="" class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105">
                ${productLineName ? `<span class="absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary backdrop-blur-sm">${productLineName}</span>` : ''}
              </div>

              <div class="flex flex-1 flex-col p-5">
                <h3 class="font-heading text-2xl font-semibold leading-tight text-primary">
                  ${p.name}
                </h3>
                <p class="mt-1 text-sm text-muted-foreground" id="price-lbl-${p.id}">
                  ${priceStr}
                </p>

                <div class="mt-4 flex flex-col gap-3 flex-1">
                    ${variantsHtml}
                    
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-muted-foreground">Cantidad:</span>
                        <input type="number" id="qty-${p.id}" class="w-20 rounded-md border border-border bg-background px-3 py-1.5 text-center text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" value="1" min="1">
                    </div>
                </div>

                <button onclick="window.addToCart(${p.id})" class="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-secondary py-3 text-sm font-medium uppercase tracking-widest text-secondary-foreground transition-all duration-300 hover:bg-primary hover:text-primary-foreground">
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
