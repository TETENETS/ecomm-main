const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { sendAlert } = require('./n8n');
const { initCronJobs } = require('./cron');
const bcvService = require('./bcvService');
const { sendEmail } = require('./mailer');

dotenv.config();

// Iniciar cronjobs y bcv
initCronJobs();
bcvService.iniciar();

const app = express();
const prisma = new PrismaClient();



const rawOrigins = (process.env.CORS_ORIGIN || '*').replace(/['"]/g, '');
const parsedOrigins = rawOrigins !== '*' 
  ? rawOrigins.split(',').map(o => o.trim()).filter(Boolean) 
  : null;

// Middleware CORS manual — garantiza que las cabeceras lleguen al navegador
// incluso cuando hay un reverse proxy (Traefik/EasyPanel) de por medio.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (!parsedOrigins) {
    // Sin lista → permitir todo
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && parsedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    console.warn(`[CORS] Origen BLOQUEADO: "${origin}"`);
    console.warn(`[CORS] Orígenes permitidos: ${parsedOrigins.join(', ')}`);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Responder inmediatamente a preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Aumentar el límite para soportar imágenes en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- BCV ENDPOINT ---
app.get('/api/bcv', async (req, res) => {
  try {
    const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
    if (manualBcv && manualBcv.value) {
      const rate = parseFloat(manualBcv.value);
      if (rate > 0) {
        return res.json({
          valor: rate,
          fuente: 'MANUAL',
          actualizado: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error fetching manual BCV rate', error);
  }
  
  res.json(bcvService.obtenerInfo());
});
// --- SYSTEM LOGGING MIDDLEWARE ---
app.use(async (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    res.locals.responseBody = body;
    originalSend.call(this, body);
  };

  res.on('finish', async () => {
    // Solo registrar POST, PUT, DELETE si terminan exitosamente o con error
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.path.includes('/api/logs')) {
      const isError = res.statusCode >= 400;
      const isAdmin = req.path.startsWith('/api/') && !req.path.startsWith('/api/public') && !req.path.startsWith('/api/store'); // heurística simple
      
      let actionStr = `${req.method} ${req.path}`;
      if (isError) actionStr = `ERROR: ${actionStr}`;

      try {
        await prisma.systemLog.create({
          data: {
            level: isError ? 'ERROR' : 'INFO',
            source: isAdmin ? 'ADMIN' : 'SYSTEM',
            action: actionStr,
            details: JSON.stringify({
              statusCode: res.statusCode,
              body: req.body,
              query: req.query
            })
          }
        });
        
        // Print to terminal
        const prefix = isError ? '[ERROR]' : '[INFO]';
        console.log(`${prefix} [${isAdmin ? 'ADMIN' : 'SYSTEM'}] ${actionStr} - Body: ${JSON.stringify(req.body)}`);

      } catch (logErr) {
        console.error("Failed to save auto-log", logErr);
      }
    }
  });
  next();
});

// --- STATIC FILES ---
// Uploads persistentes de Easypanel (imágenes de productos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Frontend del admin
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
// Storefront HTML removed for separate service architecture


// --- MULTER CONFIG (Para imágenes de inventario) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


// --- AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
  // Autenticación básica via Headers para el Admin (o token JWT si se prefiere)
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
  
  const token = authHeader.split(' ')[1];
  // Simplificado: comprobamos si el token es "user:pass" en base64
  const decoded = Buffer.from(token, 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).json({ error: 'Invalid credentials' });
  }
};

// --- SETTINGS ROUTES ---
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating settings' });
  }
});

// --- TEST ALERTS ---
app.post('/api/test-alert', authMiddleware, async (req, res) => {
  try {
    const { type, payload } = req.body;
    let message = 'Alerta de prueba';
    
    if (type === 'LOW_STOCK') message = `Alerta, Producto bajo en stock quedan menos de 3 unidades: ${payload.productName}`;
    if (type === 'NEW_ORDER') message = `Nueva orden generada de prueba: ${payload.customer}`;
    if (type === 'ACCOUNT_DUE_SOON') message = `Aviso: En 3 días se cumple la fecha límite de la cuenta por cobrar: ${payload.title}`;
    if (type === 'ACCOUNT_DUE_TODAY') message = `Alerta: Hoy es la fecha límite de la cuenta por cobrar: ${payload.title}`;
    
    await sendAlert(type, message, payload);

    if (type === 'TEST_EMAIL') {
      const { email } = payload;
      if (email) {
        const emailSent = await sendEmail(email, 'Prueba de Conexión SMTP', '<h1>¡Éxito!</h1><p>Las credenciales de correo configuradas están funcionando correctamente.</p>');
        if (!emailSent) {
          return res.status(500).json({ error: 'Error enviando correo de prueba. Verifica las credenciales SMTP en los registros del servidor.' });
        }
        return res.json({ success: true, message: 'Alerta a n8n y correo de prueba enviados.' });
      }
    }

    res.json({ success: true, message: 'Alerta enviada a n8n' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error enviando alerta de prueba' });
  }
});

// --- AUTH ROUTE ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    res.json({ token, success: true });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// --- PUBLIC STOREFRONT ENDPOINTS ---
app.get('/api/public/product-lines', async (req, res) => {
  try {
    const lines = await prisma.productLine.findMany();
    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching product lines' });
  }
});

app.get('/api/public/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { stock: { gt: 0 } },
          { variants: { some: { stock: { gt: 0 } } } }
        ]
      },
      include: { variants: true, category: true, productLine: true }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// --- CATEGORIES ---
app.get('/api/public/categories', async (req, res) => {
  try {
    const cats = await prisma.category.findMany();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const cats = await prisma.category.findMany({ include: { products: true } });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.category.create({ 
      data: { name: req.body.name, description: req.body.description } 
    });
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Error creating category' });
  }
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name, description: req.body.description }
    });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Error updating category' });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// --- PRODUCT LINES ---
app.get('/api/product-lines', authMiddleware, async (req, res) => {
  try {
    const lines = await prisma.productLine.findMany({ include: { products: true } });
    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching product lines' });
  }
});

app.post('/api/product-lines', authMiddleware, upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files.find(f => f.fieldname === 'image');
    const imageUrl = file ? `/uploads/${file.filename}` : null;
    const line = await prisma.productLine.create({ 
      data: { 
        name: req.body.name, 
        description: req.body.description,
        imageUrl: imageUrl
      } 
    });
    res.status(201).json(line);
  } catch (error) {
    res.status(500).json({ error: 'Error creating product line' });
  }
});

app.put('/api/product-lines/:id', authMiddleware, upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files.find(f => f.fieldname === 'image');
    const dataToUpdate = { name: req.body.name, description: req.body.description };
    if (file) {
      dataToUpdate.imageUrl = `/uploads/${file.filename}`;
    }
    const line = await prisma.productLine.update({
      where: { id: parseInt(req.params.id) },
      data: dataToUpdate
    });
    res.json(line);
  } catch (error) {
    res.status(500).json({ error: 'Error updating product line' });
  }
});

app.delete('/api/product-lines/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.productLine.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product line' });
  }
});

// --- PRODUCT ROUTES ---
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { 
        variants: { include: { stockLots: { orderBy: { createdAt: 'desc' } } } }, 
        productLine: true, 
        category: true,
        stockLots: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// Admin Route
app.post('/api/products', authMiddleware, upload.any(), async (req, res) => {
  try {
    const { name, description, price, costPrice, stock, variants, productLineId, categoryId } = req.body;
    let imageUrl = null;
    const mainImgFile = req.files?.find(f => f.fieldname === 'image');
    if (mainImgFile) {
      imageUrl = `/uploads/${mainImgFile.filename}`;
    }

    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    parsedVariants = parsedVariants.map((v, i) => {
      const vImgFile = req.files?.find(f => f.fieldname === `variantImage_${i}`);
      if (vImgFile) v.imageUrl = `/uploads/${vImgFile.filename}`;
      return v;
    });

    const product = await prisma.product.create({
      data: { 
        name, 
        description, 
        price: price ? parseFloat(price) : null, 
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stock: stock ? parseInt(stock) : 0,
        imageUrl,
        productLineId: productLineId ? parseInt(productLineId) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        variants: {
          create: parsedVariants.map(v => ({
            name: v.name,
            price: parseFloat(v.price),
            costPrice: v.costPrice ? parseFloat(v.costPrice) : null,
            stock: parseInt(v.stock || 0),
            imageUrl: v.imageUrl || null
          }))
        }
      },
      include: { variants: true, productLine: true }
    });
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating product' });
  }
}); 
// Editar producto y reponer stock
app.put('/api/products/:id', authMiddleware, upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, costPrice, stock, variants, productLineId, categoryId } = req.body;
    
    const existingProduct = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existingProduct) return res.status(404).json({ error: 'Not found' });

    let imageUrl = existingProduct.imageUrl;
    const mainImgFile = req.files?.find(f => f.fieldname === 'image');
    if (mainImgFile) imageUrl = `/uploads/${mainImgFile.filename}`;

    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    parsedVariants = parsedVariants.map((v, i) => {
      const vImgFile = req.files?.find(f => f.fieldname === `variantImage_${i}`);
      if (vImgFile) v.imageUrl = `/uploads/${vImgFile.filename}`;
      else if (v.existingImageUrl) v.imageUrl = v.existingImageUrl;
      return v;
    });

    // Replace variants
    await prisma.productVariant.deleteMany({ where: { productId: parseInt(id) } });

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name, description, 
        price: price ? parseFloat(price) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stock: stock ? parseInt(stock) : 0,
        imageUrl,
        productLineId: productLineId ? parseInt(productLineId) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        variants: {
          create: parsedVariants.map(v => ({
            name: v.name,
            price: parseFloat(v.price),
            costPrice: v.costPrice ? parseFloat(v.costPrice) : null,
            stock: parseInt(v.stock || 0),
            imageUrl: v.imageUrl || null
          }))
        }
      },
      include: { variants: true, productLine: true, category: true }
    });
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating product' });
  }
}); 

// Add stock to a product/variant
app.post('/api/products/add-stock', authMiddleware, async (req, res) => {
  try {
    const { productId, variantId, quantity, purchasePrice } = req.body;
    const qty = parseInt(quantity);
    const pPrice = parseFloat(purchasePrice);

    if (isNaN(qty) || qty <= 0 || isNaN(pPrice) || pPrice < 0) {
      return res.status(400).json({ error: 'Invalid quantity or purchase price' });
    }

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: parseInt(variantId) } });
      if (!variant) return res.status(404).json({ error: 'Variant not found' });
      
      const oldStock = variant.stock;
      const oldCost = variant.costPrice ? parseFloat(variant.costPrice) : 0;
      const newStock = oldStock + qty;
      const newCost = ((oldStock * oldCost) + (qty * pPrice)) / newStock;

      await prisma.stockLot.create({
        data: {
          productId: parseInt(productId),
          productVariantId: parseInt(variantId),
          quantity: qty,
          purchasePrice: pPrice
        }
      });

      const updated = await prisma.productVariant.update({
        where: { id: parseInt(variantId) },
        data: {
          stock: newStock,
          costPrice: newCost
        }
      });
      res.json(updated);
    } else {
      const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const oldStock = product.stock;
      const oldCost = product.costPrice ? parseFloat(product.costPrice) : 0;
      const newStock = oldStock + qty;
      const newCost = ((oldStock * oldCost) + (qty * pPrice)) / newStock;

      await prisma.stockLot.create({
        data: {
          productId: parseInt(productId),
          quantity: qty,
          purchasePrice: pPrice
        }
      });

      const updated = await prisma.product.update({
        where: { id: parseInt(productId) },
        data: {
          stock: newStock,
          costPrice: newCost
        }
      });
      res.json(updated);
    }
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Error adding stock' });
  }
});

// PUT /api/stock-lots/:id
app.put('/api/stock-lots/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, purchasePrice } = req.body;
    const newQty = parseInt(quantity);
    const newPrice = parseFloat(purchasePrice);

    if (isNaN(newQty) || newQty < 0 || isNaN(newPrice) || newPrice < 0) {
      return res.status(400).json({ error: 'Invalid quantity or purchase price' });
    }

    const lot = await prisma.stockLot.findUnique({ where: { id: parseInt(id) } });
    if (!lot) return res.status(404).json({ error: 'Stock lot not found' });

    const oldQty = lot.quantity;
    const oldPrice = parseFloat(lot.purchasePrice);

    await prisma.stockLot.update({
      where: { id: parseInt(id) },
      data: { quantity: newQty, purchasePrice: newPrice }
    });

    if (lot.productVariantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: lot.productVariantId } });
      const currentStock = variant.stock;
      const currentCost = variant.costPrice ? parseFloat(variant.costPrice) : 0;
      
      const newStock = currentStock - oldQty + newQty;
      const currentTotalValue = currentStock * currentCost;
      const newTotalValue = currentTotalValue - (oldQty * oldPrice) + (newQty * newPrice);
      const newCost = newStock > 0 ? newTotalValue / newStock : 0;

      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: newStock < 0 ? 0 : newStock, costPrice: newCost < 0 ? 0 : newCost }
      });
    } else {
      const product = await prisma.product.findUnique({ where: { id: lot.productId } });
      const currentStock = product.stock;
      const currentCost = product.costPrice ? parseFloat(product.costPrice) : 0;
      
      const newStock = currentStock - oldQty + newQty;
      const currentTotalValue = currentStock * currentCost;
      const newTotalValue = currentTotalValue - (oldQty * oldPrice) + (newQty * newPrice);
      const newCost = newStock > 0 ? newTotalValue / newStock : 0;

      await prisma.product.update({
        where: { id: product.id },
        data: { stock: newStock < 0 ? 0 : newStock, costPrice: newCost < 0 ? 0 : newCost }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating stock lot:', error);
    res.status(500).json({ error: 'Error updating stock lot' });
  }
});

// DELETE /api/stock-lots/:id
app.delete('/api/stock-lots/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await prisma.stockLot.findUnique({ where: { id: parseInt(id) } });
    if (!lot) return res.status(404).json({ error: 'Stock lot not found' });

    const oldQty = lot.quantity;
    const oldPrice = parseFloat(lot.purchasePrice);

    await prisma.stockLot.delete({ where: { id: parseInt(id) } });

    if (lot.productVariantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: lot.productVariantId } });
      const currentStock = variant.stock;
      const currentCost = variant.costPrice ? parseFloat(variant.costPrice) : 0;
      
      const newStock = currentStock - oldQty;
      const currentTotalValue = currentStock * currentCost;
      const newTotalValue = currentTotalValue - (oldQty * oldPrice);
      const newCost = newStock > 0 ? newTotalValue / newStock : 0;

      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: newStock < 0 ? 0 : newStock, costPrice: newCost < 0 ? 0 : newCost }
      });
    } else {
      const product = await prisma.product.findUnique({ where: { id: lot.productId } });
      const currentStock = product.stock;
      const currentCost = product.costPrice ? parseFloat(product.costPrice) : 0;
      
      const newStock = currentStock - oldQty;
      const currentTotalValue = currentStock * currentCost;
      const newTotalValue = currentTotalValue - (oldQty * oldPrice);
      const newCost = newStock > 0 ? newTotalValue / newStock : 0;

      await prisma.product.update({
        where: { id: product.id },
        data: { stock: newStock < 0 ? 0 : newStock, costPrice: newCost < 0 ? 0 : newCost }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stock lot:', error);
    res.status(500).json({ error: 'Error deleting stock lot' });
  }
});


// Borrar producto
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});


// --- FINANCE INVENTORY ---
app.get('/api/finances/inventory', authMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { productLine: true, category: true, variants: true }
    });

    let byLine = {};
    let byCategory = {};
    let byProduct = {};

    products.forEach(p => {
      let stock = p.stock || 0;
      let cost = (p.costPrice ? parseFloat(p.costPrice) : 0) * stock;
      let val = (p.price ? parseFloat(p.price) : 0) * stock;

      if (p.variants && p.variants.length > 0) {
        stock = 0; cost = 0; val = 0;
        p.variants.forEach(v => {
          let vStock = v.stock || 0;
          stock += vStock;
          cost += (v.costPrice ? parseFloat(v.costPrice) : 0) * vStock;
          val += (v.price ? parseFloat(v.price) : 0) * vStock;
        });
      }

      let profit = val - cost;

      let pName = p.name;
      let cName = p.category ? p.category.name : 'Sin Categoría';
      let lName = p.productLine ? p.productLine.name : 'Sin Línea';

      byProduct[pName] = byProduct[pName] || { cost: 0, value: 0, profit: 0 };
      byProduct[pName].cost += cost;
      byProduct[pName].value += val;
      byProduct[pName].profit += profit;

      byCategory[cName] = byCategory[cName] || { cost: 0, value: 0, profit: 0 };
      byCategory[cName].cost += cost;
      byCategory[cName].value += val;
      byCategory[cName].profit += profit;

      byLine[lName] = byLine[lName] || { cost: 0, value: 0, profit: 0 };
      byLine[lName].cost += cost;
      byLine[lName].value += val;
      byLine[lName].profit += profit;
    });

    res.json({ byLine, byCategory, byProduct });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching inventory finances' });
  }
});

// --- FINANCE CATEGORY ROUTES ---
app.get('/api/finance-categories', authMiddleware, async (req, res) => {
  try {
    const cats = await prisma.financeCategory.findMany();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching finance categories' });
  }
});

app.post('/api/finance-categories', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.financeCategory.create({ data: req.body });
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Error creating finance category' });
  }
});

app.put('/api/finance-categories/:id', authMiddleware, async (req, res) => {
  try {
    const cat = await prisma.financeCategory.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Error updating finance category' });
  }
});

app.delete('/api/finance-categories/:id', authMiddleware, async (req, res) => {
  try {
    const catId = parseInt(req.params.id);
    const categoryToDelete = await prisma.financeCategory.findUnique({ where: { id: catId } });
    
    if (categoryToDelete) {
      // Find or create "Otro" category of the same type
      let otroCat = await prisma.financeCategory.findFirst({
        where: { name: 'Otro', type: categoryToDelete.type }
      });
      if (!otroCat) {
        otroCat = await prisma.financeCategory.create({
          data: { name: 'Otro', type: categoryToDelete.type }
        });
      }
      
      // Reassign all expenses to "Otro"
      await prisma.expense.updateMany({
        where: { categoryId: catId },
        data: { categoryId: otroCat.id }
      });

      await prisma.financeCategory.delete({ where: { id: catId } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: 'Error deleting finance category: ' + error.message });
  }
});

// --- EXPENSE ROUTES (Finances) ---
app.get('/api/expenses', authMiddleware, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: { category: true, financeAccount: true },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching expenses' });
  }
});

app.post('/api/expenses', authMiddleware, async (req, res) => {
  try {
    let { title, amount, categoryId, description, financeAccountId, isBs } = req.body;
    
    let catName = 'Sin Categoría';
    if (categoryId) {
      const cat = await prisma.financeCategory.findUnique({ where: { id: parseInt(categoryId) } });
      if (cat) catName = cat.name;
    }

    if (financeAccountId) {
      const accountInfo = await prisma.financeAccount.findUnique({ where: { id: parseInt(financeAccountId) } });
      if (accountInfo) {
        isBs = accountInfo.currency === 'Bs';
      }
    }

    // Default description to category name if missing
    if (!description || description.trim() === '') {
      description = catName;
    }

    const parsedAmount = parseFloat(amount);
    let amountDollar = isBs ? 0 : parsedAmount;
    let amountBs = isBs ? parsedAmount : null;

    let bcvRate = 1;
    if (isBs) {
      // Calculate dollar equivalent if Bs
      const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
      if (manualBcv && manualBcv.value && parseFloat(manualBcv.value) > 0) {
        bcvRate = parseFloat(manualBcv.value);
      } else {
        const info = bcvService.obtenerInfo();
        if (info && info.valor) {
          bcvRate = info.valor;
        }
      }
      amountDollar = parsedAmount / bcvRate;
    }

    const expense = await prisma.expense.create({
      data: { 
        title, 
        amount: amountDollar, 
        amountBs: amountBs,
        categoryId: categoryId ? parseInt(categoryId) : null, 
        description,
        financeAccountId: financeAccountId ? parseInt(financeAccountId) : null
      },
      include: { category: true }
    });

    if (financeAccountId) {
      await prisma.financeAccount.update({
        where: { id: parseInt(financeAccountId) },
        data: { balance: { decrement: parsedAmount } }
      });
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating expense' });
  }
});

// --- ACCOUNT TRANSACTION ROUTES ---
app.get('/api/accounts', authMiddleware, async (req, res) => {
  try {
    const accounts = await prisma.accountTransaction.findMany({ orderBy: { dueDate: 'asc' } });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching accounts' });
  }
});

app.post('/api/accounts', authMiddleware, async (req, res) => {
  try {
    const acc = await prisma.accountTransaction.create({ data: req.body });
    res.status(201).json(acc);
  } catch (error) {
    res.status(500).json({ error: 'Error creating account transaction' });
  }
});

app.put('/api/accounts/:id', authMiddleware, async (req, res) => {
  try {
    const acc = await prisma.accountTransaction.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(acc);
  } catch (error) {
    res.status(500).json({ error: 'Error updating account transaction' });
  }
});

app.delete('/api/accounts/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.accountTransaction.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting account transaction' });
  }
});


// --- CHECKOUT & ORDER ROUTES ---
app.post('/api/checkout', async (req, res) => {
  try {
    const {
      customerName,
      customerCedula,
      customerPhone,
      customerEmail,
      locationMapLat,
      locationMapLng,
      locationAddress,
      receiptImageBase64,
      paymentMethod,
      items
    } = req.body;

    // items should be [{ productId, variantId, quantity }]
    let totalAmount = 0;
    const orderItemsData = [];

    // Get current BCV rate
    let currentBcvRate = null;
    try {
      const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
      if (manualBcv && manualBcv.value && parseFloat(manualBcv.value) > 0) {
        currentBcvRate = parseFloat(manualBcv.value);
      } else {
        const info = bcvService.obtenerInfo();
        if (info && info.valor) currentBcvRate = info.valor;
      }
    } catch (e) {
      console.error('Error fetching BCV rate for checkout:', e);
    }

    for (const item of items) {
      const product = await prisma.product.findUnique({ 
        where: { id: item.productId },
        include: { variants: true } 
      });
      if (!product) continue;
      
      let price = product.price;
      
      let variant = null;
      if (item.variantId) {
        variant = product.variants.find(v => v.id === item.variantId);
        if (variant) price = variant.price;
      }
      
      totalAmount += parseFloat(price) * item.quantity;
      
      
      // Stock is no longer deducted at checkout; it is deducted when the order is COMPLETED

      orderItemsData.push({
        productId: product.id,
        productVariantId: item.variantId || null,
        quantity: item.quantity,
        price: price
      });
    }

    const order = await prisma.order.create({
      data: {
        customerName,
        customerCedula: customerCedula || "N/A",
        customerPhone,
        customerEmail,
        locationMapLat: locationMapLat !== undefined && locationMapLat !== null ? String(locationMapLat) : null,
        locationMapLng: locationMapLng !== undefined && locationMapLng !== null ? String(locationMapLng) : null,
        locationAddress,
        receiptImageBase64, // Guardar comprobante base64
        paymentMethod: paymentMethod || "Pago Móvil (Bs)",
        totalAmount,
        bcvRate: currentBcvRate,
        totalAmountBs: currentBcvRate ? parseFloat((totalAmount * currentBcvRate).toFixed(2)) : null,
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: { include: { product: true, variant: true } },
        dueDates: true
      }
    });

    const adminHost = req.get('origin') || 'http://localhost';
    const orderLink = `${adminHost}/orders?id=${order.id}`;

    await sendAlert('NEW_ORDER', `Nueva orden generada: ${customerName}`, {
      orderId: order.id,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: customerEmail,
      locationAddress: locationAddress,
      locationMapLat: locationMapLat,
      locationMapLng: locationMapLng,
      totalAmount: (paymentMethod && paymentMethod.includes('(Bs)')) ? `Bs. ${currentBcvRate ? (totalAmount * currentBcvRate).toFixed(2) : 'N/A'}` : `$${Number(totalAmount).toFixed(2)}`,
      link: orderLink,
      items: order.items.map(i => ({
        productName: i.product?.name,
        variantName: i.variant?.name,
        quantity: i.quantity,
        price: i.price
      }))
    });

    const allSettings = await prisma.setting.findMany();
    const settingsMap = {};
    allSettings.forEach(s => settingsMap[s.key] = s.value);

    try {
      // (El correo a los administradores ya se envió arriba mediante sendAlert('NEW_ORDER'))

      if (customerEmail) {
        let emailHtml = '';
        if (settingsMap.enable_template_new_order === 'true' && settingsMap.template_new_order) {
          const itemsListHtml = '<ul>' + order.items.map(i => {
            const vName = i.variant ? ` (${i.variant.name})` : '';
            return `<li>${i.quantity}x ${i.product.name}${vName} - $${Number(i.price).toFixed(2)}</li>`;
          }).join('') + '</ul>';

          emailHtml = settingsMap.template_new_order
            .replace(/\{\{customerName\}\}/g, customerName)
            .replace(/\{\{customerPhone\}\}/g, customerPhone || '')
            .replace(/\{\{locationAddress\}\}/g, locationAddress || 'N/A')
            .replace(/\{\{orderId\}\}/g, order.id)
            .replace(/\$?\s*\{\{totalAmount\}\}/g, (paymentMethod && paymentMethod.includes('(Bs)')) ? `Bs. ${currentBcvRate ? (totalAmount * currentBcvRate).toFixed(2) : 'N/A'}` : `$${Number(totalAmount).toFixed(2)}`)
            .replace(/\{\{totalAmountBs\}\}/g, order.totalAmountBs ? Number(order.totalAmountBs).toFixed(2) : '')
            .replace(/\{\{bcvRate\}\}/g, order.bcvRate ? Number(order.bcvRate).toFixed(2) : '')
            .replace(/\{\{itemsList\}\}/g, itemsListHtml);
        } else {
          emailHtml = `
            <h1>¡Gracias por tu pedido, ${customerName}!</h1>
            <p>Hemos recibido tu pedido correctamente. Tu número de orden es <b>#${order.id}</b>.</p>
            <p>Total a pagar: <b>${(paymentMethod && paymentMethod.includes('(Bs)')) ? 'Bs. ' + (currentBcvRate ? (totalAmount * currentBcvRate).toFixed(2) : 'N/A') : '$' + Number(totalAmount).toFixed(2)}</b></p>
            <p>Nos pondremos en contacto contigo a la brevedad para coordinar la entrega y/o pago.</p>
          `;
        }
        await sendEmail(customerEmail, `Pedido Recibido #${order.id}`, emailHtml);
      }
    } catch (emailError) {
      console.error("Error enviando correos de la orden:", emailError);
      // No hacemos throw para no fallar el checkout
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing checkout' });
  }
});

// Admin Route
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status && status !== 'ALL' ? { status } : {};
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { 
        items: {
          include: { 
            product: {
              include: { category: true, productLine: true }
            }, 
            variant: true 
          }
        },
        dueDates: true,
        movements: { include: { financeAccount: true } }
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// Update order status
app.patch('/api/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, dueDates, paymentMethod } = req.body;
    
    const oldOrder = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!oldOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (oldOrder.status === 'COMPLETED' && status === 'CANCELED') {
      return res.status(400).json({ error: 'No se puede cancelar directamente una orden completada. Debe reversarse primero.' });
    }

    const updateData = { status };
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (req.body.financeAccountId) updateData.financeAccountId = parseInt(req.body.financeAccountId);
    if (req.body.paymentReference) updateData.paymentReference = req.body.paymentReference;

    if (oldOrder.status !== 'COMPLETED' && status === 'COMPLETED') {
      let bcvRate = 1;
      const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
      if (manualBcv && manualBcv.value && parseFloat(manualBcv.value) > 0) {
        bcvRate = parseFloat(manualBcv.value);
      } else {
        const info = bcvService.obtenerInfo();
        if (info && info.valor) bcvRate = info.valor;
      }
      updateData.bcvRate = bcvRate;
      updateData.totalAmountBs = oldOrder.totalAmount * bcvRate;
    }

    if (status === 'PENDING_PAYMENT' && dueDates && Array.isArray(dueDates)) {
      // Create due dates, replacing only the unpaid ones
      updateData.dueDates = {
        deleteMany: { isPaid: false }, 
        create: dueDates.map(date => ({ dueDate: new Date(date), isPaid: false }))
      };
    }

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { items: { include: { product: true, variant: true } }, dueDates: true }
    });

    if (oldOrder.status !== 'COMPLETED' && status === 'COMPLETED') {
      // Add money to finance account and create OrderMovement
      if (updateData.financeAccountId) {
        const accountInfo = await prisma.financeAccount.findUnique({ where: { id: updateData.financeAccountId } });
        const isBsAccount = accountInfo && accountInfo.currency === 'Bs';
        const incrementAmount = isBsAccount ? Number(order.totalAmountBs) : Number(order.totalAmount);

        await prisma.financeAccount.update({
          where: { id: updateData.financeAccountId },
          data: { balance: { increment: incrementAmount } }
        });
        await prisma.orderMovement.create({
          data: {
            orderId: order.id,
            type: 'INCOME',
            amount: order.totalAmount,
            amountBs: order.totalAmountBs || (order.totalAmount * (order.bcvRate || 1)),
            paymentMethod: order.paymentMethod,
            financeAccountId: updateData.financeAccountId
          }
        });
      }
      // De-stock (deduct inventory)
      for (const item of order.items) {
        if (item.productVariantId) {
          await prisma.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { decrement: item.quantity } }
          });
        } else {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      }
    }

    if (status === 'PAID' && order.customerEmail) {
      const allSettings = await prisma.setting.findMany();
      const settingsMap = {};
      allSettings.forEach(s => settingsMap[s.key] = s.value);
      
      if (settingsMap.enable_template_payment_validated === 'true' && settingsMap.template_payment_validated) {
        const itemsListHtml = '<ul>' + order.items.map(i => {
          const vName = i.variant ? ` (${i.variant.name})` : '';
          return `<li>${i.quantity}x ${i.product.name}${vName} - $${Number(i.price).toFixed(2)}</li>`;
        }).join('') + '</ul>';

        const emailHtml = settingsMap.template_payment_validated
          .replace(/\{\{customerName\}\}/g, order.customerName)
          .replace(/\{\{customerPhone\}\}/g, order.customerPhone || '')
          .replace(/\{\{locationAddress\}\}/g, order.locationAddress || 'N/A')
          .replace(/\{\{orderId\}\}/g, order.id)
          .replace(/\$?\s*\{\{totalAmount\}\}/g, (order.paymentMethod && order.paymentMethod.includes('(Bs)')) ? `Bs. ${order.totalAmountBs ? Number(order.totalAmountBs).toFixed(2) : 'N/A'}` : `$${Number(order.totalAmount).toFixed(2)}`)
          .replace(/\{\{itemsList\}\}/g, itemsListHtml);
        
        const { sendEmail } = require('./mailer');
        await sendEmail(order.customerEmail, `Pago Validado - Orden #${order.id}`, emailHtml);
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error updating order status' });
  }
});

// Reverse a completed order
app.post('/api/orders/:id/reverse', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    });
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'COMPLETED') return res.status(400).json({ error: 'Solo se pueden reversar órdenes completadas.' });

    // 1. Subtract money from finance account and create Reversal movement
    if (order.financeAccountId) {
      const accountInfo = await prisma.financeAccount.findUnique({ where: { id: order.financeAccountId } });
      const isBsAccount = accountInfo && accountInfo.currency === 'Bs';
      const decrementAmount = isBsAccount ? Number(order.totalAmountBs) : Number(order.totalAmount);

      await prisma.financeAccount.update({
        where: { id: order.financeAccountId },
        data: { balance: { decrement: decrementAmount } }
      });
      await prisma.orderMovement.create({
        data: {
          orderId: order.id,
          type: 'REVERSAL',
          amount: isBsAccount ? 0 : -Number(order.totalAmount),
          amountBs: isBsAccount ? -Number(order.totalAmountBs) : 0,
          paymentMethod: order.paymentMethod,
          financeAccountId: order.financeAccountId
        }
      });
    }

    // 2. Return stock to inventory
    for (const item of order.items) {
      if (item.productVariantId) {
        await prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { increment: item.quantity } }
        });
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }

    // 3. Set status back to PENDING and remove financeAccountId to allow editing
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PENDING', financeAccountId: null },
      include: { items: { include: { product: true, variant: true } }, dueDates: true }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error reversing order' });
  }
});

// Register partial payment (abono) for an order
app.post('/api/orders/:id/abono', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, currency, financeAccountId, paymentMethod, date } = req.body;
    
    if (!amount || !financeAccountId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { movements: true }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Get BCV rate
    let bcvRate = 1;
    const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
    if (manualBcv && manualBcv.value && parseFloat(manualBcv.value) > 0) {
      bcvRate = parseFloat(manualBcv.value);
    } else {
      const info = bcvService.obtenerInfo();
      if (info && info.valor) bcvRate = info.valor;
    }

    const parsedAmount = parseFloat(amount);
    const amountUsd = currency === '$' ? parsedAmount : parsedAmount / bcvRate;
    const amountBs = currency === 'Bs' ? parsedAmount : parsedAmount * bcvRate;

    const existingMovements = await prisma.orderMovement.findMany({ where: { orderId: order.id } });
    const currentAbonado = existingMovements.reduce((sum, m) => sum + (parseFloat(m.amount) || parseFloat(m.amountBs) / bcvRate), 0);
    
    if (currentAbonado + amountUsd > parseFloat(order.totalAmount) + 0.5) {
      return res.status(400).json({ error: 'El abono excede el monto restante de la orden' });
    }

    // Increment finance account balance
    await prisma.financeAccount.update({
      where: { id: parseInt(financeAccountId) },
      data: { balance: { increment: currency === 'Bs' ? amountBs : amountUsd } }
    });

    // Create OrderMovement
    const movement = await prisma.orderMovement.create({
      data: {
        orderId: order.id,
        type: 'INCOME', // Treating abonos as INCOME so they appear in closing
        amount: amountUsd,
        amountBs: amountBs,
        paymentMethod: paymentMethod || order.paymentMethod || 'Abono',
        financeAccountId: parseInt(financeAccountId),
        createdAt: date ? new Date(date) : undefined
      }
    });

    const dueDates = await prisma.orderDueDate.findMany({
      where: { orderId: order.id },
      orderBy: { dueDate: 'asc' }
    });

    const allMovements = await prisma.orderMovement.findMany({ where: { orderId: order.id } });
    const totalAbonadoUsd = allMovements.reduce((sum, m) => sum + (parseFloat(m.amount) || parseFloat(m.amountBs) / (order.bcvRate || bcvRate || 1)), 0);
    
    const sortedDueDates = [...dueDates].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    let paid = totalAbonadoUsd;
    let remainingDatesCount = sortedDueDates.length;
    let currentRemaining = parseFloat(order.totalAmount);
    
    for (const date of sortedDueDates) {
      const quota = currentRemaining / remainingDatesCount;
      if (paid >= quota - 0.01) {
        await prisma.orderDueDate.update({ where: { id: date.id }, data: { isPaid: true } });
        paid -= quota;
        currentRemaining -= quota;
        remainingDatesCount--;
      } else {
        await prisma.orderDueDate.update({ where: { id: date.id }, data: { isPaid: false } });
      }
    }

    allMovements = await prisma.orderMovement.findMany({
      where: { orderId: order.id }
    });
    
    const totalAbonado = allMovements.reduce((sum, m) => sum + (parseFloat(m.amount) || parseFloat(m.amountBs) / (order.bcvRate || bcvRate || 1)), 0);
    
    let updateData = {};
    if (totalAbonado >= parseFloat(order.totalAmount) - 0.01) { // -0.01 for floating point safety
      updateData = { 
        status: 'COMPLETED', 
        paymentMethod: paymentMethod || order.paymentMethod || 'Abono',
        bcvRate: bcvRate,
        totalAmountBs: parseFloat(order.totalAmount) * bcvRate
      };

      // De-stock (deduct inventory) when auto-completing
      for (const item of order.items) {
        if (item.productVariantId) {
          await prisma.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { decrement: item.quantity } }
          });
        } else {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
      include: { items: { include: { product: { include: { category: true, productLine: true } }, variant: true } }, dueDates: true, movements: { include: { financeAccount: true } } }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registering payment' });
  }
});

app.put('/api/orders/:id/abono/:abonoId', authMiddleware, async (req, res) => {
  try {
    const { id, abonoId } = req.params;
    const { amount, currency, date } = req.body;
    
    if (!amount) return res.status(400).json({ error: 'Missing amount' });

    const movement = await prisma.orderMovement.findUnique({
      where: { id: parseInt(abonoId) },
      include: { financeAccount: true, order: true }
    });

    if (!movement || movement.orderId !== parseInt(id)) {
      return res.status(404).json({ error: 'Abono no encontrado' });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { dueDates: true }
    });

    let bcvRate = order.bcvRate || 1;
    if (!order.bcvRate) {
      const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
      if (manualBcv && manualBcv.value && parseFloat(manualBcv.value) > 0) bcvRate = parseFloat(manualBcv.value);
      else {
        const info = bcvService.obtenerInfo();
        if (info && info.valor) bcvRate = info.valor;
      }
    }

    const parsedAmount = parseFloat(amount);
    const newAmountUsd = currency === '$' ? parsedAmount : parsedAmount / bcvRate;
    const newAmountBs = currency === 'Bs' ? parsedAmount : parsedAmount * bcvRate;

    const allOtherMovements = await prisma.orderMovement.findMany({ where: { orderId: order.id, id: { not: parseInt(abonoId) } } });
    const currentAbonadoOther = allOtherMovements.reduce((sum, m) => sum + (parseFloat(m.amount) || parseFloat(m.amountBs) / bcvRate), 0);
    
    if (currentAbonadoOther + newAmountUsd > parseFloat(order.totalAmount) + 0.5) {
      return res.status(400).json({ error: 'El abono excede el monto restante de la orden' });
    }

    const oldAmountUsd = parseFloat(movement.amount || 0);
    const oldAmountBs = parseFloat(movement.amountBs || 0);

    const diffUsd = newAmountUsd - oldAmountUsd;
    const diffBs = newAmountBs - oldAmountBs;

    if (movement.financeAccountId) {
      await prisma.financeAccount.update({
        where: { id: movement.financeAccountId },
        data: { balance: { increment: movement.financeAccount.currency === 'Bs' ? diffBs : diffUsd } }
      });
    }

    await prisma.orderMovement.update({
      where: { id: movement.id },
      data: {
        amount: newAmountUsd,
        amountBs: newAmountBs,
        createdAt: date ? new Date(date) : undefined
      }
    });

    // Recalculate isPaid for all dueDates
    const allMovements = await prisma.orderMovement.findMany({ where: { orderId: order.id } });
    const totalAbonadoUsd = allMovements.reduce((sum, m) => sum + (parseFloat(m.amount) || parseFloat(m.amountBs) / bcvRate), 0);
    
    const sortedDueDates = [...order.dueDates].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    let paid = totalAbonadoUsd;
    let remainingDatesCount = sortedDueDates.length;
    let currentRemaining = parseFloat(order.totalAmount);
    
    for (const date of sortedDueDates) {
      const quota = currentRemaining / remainingDatesCount;
      if (paid >= quota - 0.01) {
        await prisma.orderDueDate.update({ where: { id: date.id }, data: { isPaid: true } });
        paid -= quota;
        currentRemaining -= quota;
        remainingDatesCount--;
      } else {
        await prisma.orderDueDate.update({ where: { id: date.id }, data: { isPaid: false } });
      }
    }

    // Re-check completion status
    let updateData = {};
    if (totalAbonadoUsd >= parseFloat(order.totalAmount) - 0.01 && order.status !== 'COMPLETED') {
      updateData = { status: 'COMPLETED' };
      // De-stock (deduct inventory)
      const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of orderItems) {
        if (item.productVariantId) await prisma.productVariant.update({ where: { id: item.productVariantId }, data: { stock: { decrement: item.quantity } } });
        else await prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }
    } else if (totalAbonadoUsd < parseFloat(order.totalAmount) - 0.01 && order.status === 'COMPLETED') {
      updateData = { status: 'PENDING_PAYMENT' };
      // Re-stock
      const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of orderItems) {
        if (item.productVariantId) await prisma.productVariant.update({ where: { id: item.productVariantId }, data: { stock: { increment: item.quantity } } });
        else await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
      include: { items: { include: { product: true, variant: true } }, dueDates: true, movements: { include: { financeAccount: true } } }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating abono' });
  }
});

// Create manual order (admin)
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const {
      customerName, customerCedula, customerPhone, customerEmail,
      locationAddress, paymentMethod, items, notes, status, dueDates
    } = req.body;

    let totalAmount = 0;
    const orderItemsData = [];

    // Get current BCV rate
    let currentBcvRate = null;
    try {
      const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
      if (manualBcv && manualBcv.value && parseFloat(manualBcv.value) > 0) {
        currentBcvRate = parseFloat(manualBcv.value);
      } else {
        const info = bcvService.obtenerInfo();
        if (info && info.valor) currentBcvRate = info.valor;
      }
    } catch (e) {
      console.error('Error fetching BCV rate for checkout:', e);
    }

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true }
      });
      if (!product) continue;
      let price = product.price;
      let variant = null;
      if (item.variantId) {
        variant = product.variants.find(v => v.id === item.variantId);
        if (variant) price = variant.price;
      }
      totalAmount += parseFloat(price) * item.quantity;

      // Stock is no longer deducted immediately upon order creation. It is deducted when marked COMPLETED.

      orderItemsData.push({
        productId: product.id,
        productVariantId: item.variantId || null,
        quantity: item.quantity,
        price
      });
    }

    const order = await prisma.order.create({
      data: {
        customerName, customerCedula, customerPhone,
        customerEmail: customerEmail || null,
        locationAddress: locationAddress || null,
        paymentMethod: paymentMethod || "Pago Móvil (Bs)",
        totalAmount,
        bcvRate: currentBcvRate,
        totalAmountBs: currentBcvRate ? parseFloat((totalAmount * currentBcvRate).toFixed(2)) : null,
        status: status || 'PENDING',
        items: { create: orderItemsData },
        ...(status === 'PENDING_PAYMENT' && dueDates && Array.isArray(dueDates) ? {
          dueDates: {
            create: dueDates.map(date => ({ dueDate: new Date(date) }))
          }
        } : {})
      },
      include: { items: { include: { product: true, variant: true } }, dueDates: true }
    });

    if (status === 'COMPLETED') {
      for (const item of order.items) {
        if (item.productVariantId) {
          await prisma.productVariant.update({ where: { id: item.productVariantId }, data: { stock: { decrement: item.quantity } } });
        } else {
          await prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        }
      }
      if (req.body.financeAccountId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { financeAccountId: parseInt(req.body.financeAccountId) }
        });
        await prisma.financeAccount.update({
          where: { id: parseInt(req.body.financeAccountId) },
          data: { balance: { increment: (order.paymentMethod && order.paymentMethod.includes('(Bs)')) ? Number(order.totalAmountBs) : Number(order.totalAmount) } }
        });
      }
    }
    
    const adminHost = req.get('origin') || 'http://localhost';
    const orderLink = `${adminHost}/orders?id=${order.id}`;

    await sendAlert('NEW_ORDER', `Nueva orden generada manual: ${customerName}`, {
      orderId: order.id,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: customerEmail || null,
      locationAddress: locationAddress || null,
      locationMapLat: null,
      locationMapLng: null,
      totalAmount: (paymentMethod && paymentMethod.includes('(Bs)')) ? `Bs. ${currentBcvRate ? (totalAmount * currentBcvRate).toFixed(2) : 'N/A'}` : `$${Number(totalAmount).toFixed(2)}`,
      link: orderLink,
      items: order.items.map(i => ({
        productName: i.product?.name,
        variantName: i.variant?.name,
        quantity: i.quantity,
        price: i.price
      }))
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating order' });
  }
});

// Update an existing order (only allowed if not COMPLETED or CANCELED)
app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName, customerCedula, customerPhone, customerEmail,
      locationAddress, paymentMethod, items
    } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
    if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELED') {
      return res.status(400).json({ error: 'No se pueden editar órdenes que ya están Completadas o Canceladas.' });
    }

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true }
      });
      if (!product) continue;
      
      let price = product.price;
      let variant = null;
      if (item.variantId) {
        variant = product.variants.find(v => v.id === item.variantId);
        if (variant) price = variant.price;
      }
      totalAmount += parseFloat(price) * item.quantity;

      orderItemsData.push({
        productId: product.id,
        productVariantId: item.variantId || null,
        quantity: item.quantity,
        price
      });
    }

    // Since it's not completed, no stock deduction occurs here.
    // We update the order fields and replace the items.
    
    // First, delete existing items
    await prisma.orderItem.deleteMany({
      where: { orderId: existingOrder.id }
    });

    const bcvRate = existingOrder.bcvRate || null;
    const totalAmountBs = bcvRate ? parseFloat((totalAmount * parseFloat(bcvRate)).toFixed(2)) : null;

    const updatedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        customerName,
        customerCedula,
        customerPhone,
        customerEmail: customerEmail || null,
        locationAddress: locationAddress || null,
        paymentMethod: paymentMethod || "Pago Móvil (Bs)",
        totalAmount,
        totalAmountBs,
        items: {
          create: orderItemsData
        }
      },
      include: { items: { include: { product: true, variant: true } }, dueDates: true }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating order' });
  }
});

// --- CIERRE DE CAJA ---

// GET /api/closure/orders
app.get('/api/closure/orders', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    let start, end;
    if (date) {
      start = new Date(`${date}T00:00:00.000Z`);
      end = new Date(`${date}T23:59:59.999Z`);
    } else {
      const today = new Date();
      start = new Date(today.setHours(0,0,0,0));
      end = new Date(today.setHours(23,59,59,999));
    }
    const movements = await prisma.orderMovement.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      include: { 
        order: { include: { items: { include: { product: true, variant: true } } } },
        financeAccount: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    const expensesRaw = await prisma.expense.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      include: {
        category: true,
        financeAccount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const expenses = expensesRaw.filter(ex => 
      ex.category?.name !== 'Transferencia Saliente' && 
      ex.category?.name !== 'Transferencia Entrante'
    );

    res.json({ movements, expenses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching closure orders' });
  }
});

// PUT /api/closure/orders
app.put('/api/closure/orders', authMiddleware, async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, totalAmount, totalAmountBs, paymentMethod, financeAccountId, orderId }]
    for (const u of updates) {
      const movement = await prisma.orderMovement.findUnique({ where: { id: u.id } });
      if (!movement) continue;
      
      const updateDataMovement = {
        paymentMethod: u.paymentMethod,
        financeAccountId: u.financeAccountId ? parseInt(u.financeAccountId) : null
      };

      await prisma.orderMovement.update({
        where: { id: u.id },
        data: updateDataMovement
      });

      if (movement.orderId) {
        await prisma.order.update({
          where: { id: movement.orderId },
          data: updateDataMovement
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating closure orders' });
  }
});

// DELETE /api/closure/movements/:id
app.delete('/api/closure/movements/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.orderMovement.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting movement' });
  }
});

// GET /api/closure/summary
app.get('/api/closure/summary', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    let start, end;
    if (date) {
      start = new Date(`${date}T00:00:00.000Z`);
      end = new Date(`${date}T23:59:59.999Z`);
    } else {
      const today = new Date();
      start = new Date(today.setHours(0,0,0,0));
      end = new Date(today.setHours(23,59,59,999));
    }

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end }
      },
      include: { items: { include: { product: true, variant: true } } }
    });

    const summary = {};
    for (const o of orders) {
      const pm = o.paymentMethod || 'No especificado';
      if (!summary[pm]) summary[pm] = { gross: 0, net: 0, grossBs: 0 };
      
      const gross = parseFloat(o.totalAmount || 0);
      const grossBs = parseFloat(o.totalAmountBs || 0);
      
      let cost = 0;
      for (const item of o.items) {
        let cp = 0;
        if (item.variant && item.variant.costPrice) cp = parseFloat(item.variant.costPrice);
        else if (item.product && item.product.costPrice) cp = parseFloat(item.product.costPrice);
        cost += cp * item.quantity;
      }
      
      summary[pm].gross += gross;
      summary[pm].net += (gross - cost);
      summary[pm].grossBs += grossBs;
    }

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error calculating closure summary' });
  }
});

// GET /api/closure/history
app.get('/api/closure/history', authMiddleware, async (req, res) => {
  try {
    const movements = await prisma.orderMovement.findMany({
      include: { 
        financeAccount: true, 
        order: { include: { items: { include: { product: { include: { productLine: true } }, variant: true } } } } 
      },
      orderBy: { createdAt: 'desc' }
    });

    const historyMap = {};

    for (const m of movements) {
      const dateStr = new Date(m.createdAt).toISOString().split('T')[0];
      if (!historyMap[dateStr]) {
        historyMap[dateStr] = { date: dateStr, orders: [], expenses: [], bruto: 0, neto: 0, totalCost: 0 };
      }
      historyMap[dateStr].orders.push(m);

      const pm = m.paymentMethod || '';
      const gross = parseFloat(m.amount || 0);
      const grossBs = parseFloat(m.amountBs || 0);
      const rate = parseFloat(m.order?.bcvRate) || 1; 

      let cost = 0;
      if (m.order?.items) {
        for (const item of m.order.items) {
          let cp = 0;
          if (item.variant && item.variant.costPrice) cp = parseFloat(item.variant.costPrice);
          else if (item.product && item.product.costPrice) cp = parseFloat(item.product.costPrice);
          cost += cp * item.quantity;
        }
      }

      if (m.type === 'REVERSAL') {
        cost = -cost; // Deduct cost on reversal
      }

      let orderBrutoDollar = gross;
      if (pm.includes('(Bs)')) {
        orderBrutoDollar = grossBs / rate;
      }
      
      historyMap[dateStr].bruto += orderBrutoDollar;
      historyMap[dateStr].totalCost += cost;
      historyMap[dateStr].neto += (orderBrutoDollar - cost);
    }

    const allExpensesRaw = await prisma.expense.findMany({
      include: { category: true, financeAccount: true },
      orderBy: { createdAt: 'desc' }
    });

    const allExpenses = allExpensesRaw.filter(ex => 
      ex.category?.name !== 'Transferencia Saliente' && 
      ex.category?.name !== 'Transferencia Entrante'
    );

    for (const ex of allExpenses) {
      const dateStr = new Date(ex.createdAt).toISOString().split('T')[0];
      if (!historyMap[dateStr]) {
        historyMap[dateStr] = { date: dateStr, orders: [], expenses: [], bruto: 0, neto: 0, totalCost: 0 };
      }
      historyMap[dateStr].expenses.push(ex);

      const exAmount = parseFloat(ex.amount || 0);
      const type = ex.category?.type || 'EXPENSE';
      
      if (type === 'EXPENSE') {
        historyMap[dateStr].neto -= exAmount;
      } else {
        historyMap[dateStr].neto += exAmount;
        historyMap[dateStr].bruto += exAmount; // Ingresos también suman al bruto? Sí, o solo al neto. Lo sumaré a ambos.
      }
    }

    const historyList = Object.values(historyMap).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(historyList);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching closure history' });
  }
});

// Delete expense
app.delete('/api/expenses/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting expense' });
  }
});




// --- DASHBOARD METRICS ---
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const totalOrders = await prisma.order.count();
    
    // Only count completed orders for earnings
    const completedOrders = await prisma.order.findMany({
      where: { status: 'COMPLETED' }
    });
    const totalEarnings = completedOrders.reduce((acc, order) => acc + Number(order.totalAmount), 0);
    
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
    
    const totalProducts = await prisma.product.count();

    // Sales by Product Line & Top Products grouped
    const products = await prisma.product.findMany({
      include: { 
        orderItems: {
          where: { order: { status: 'COMPLETED' } }
        }, 
        productLine: true 
      }
    });
    
    const salesByLineMap = {};
    const topProductsRaw = [];

    for (const p of products) {
      const sales = p.orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
      const lineName = p.productLine?.name || 'Sin Línea';
      
      // Accumulate sales by line
      if (!salesByLineMap[lineName]) salesByLineMap[lineName] = { name: lineName, totalSales: 0, products: [] };
      salesByLineMap[lineName].totalSales += sales;
      salesByLineMap[lineName].products.push({
        id: p.id,
        name: p.name,
        price: p.price || 0,
        stock: p.stock,
        sales: sales
      });
    }

    // Sort the products inside each line
    const salesByLine = Object.values(salesByLineMap).map(line => ({
      ...line,
      products: line.products.sort((a, b) => b.sales - a.sales).slice(0, 5) // Top 5 per line
    })).sort((a, b) => b.totalSales - a.totalSales);

    // Recent Pending Orders
    const pendingOrdersRaw = await prisma.order.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    const pendingOrders = pendingOrdersRaw.map(o => ({
      id: `ORD-${o.id}`,
      realId: o.id,
      date: o.createdAt.toLocaleDateString(),
      customer: o.customerName,
      total: Number(o.totalAmount).toFixed(2),
      status: o.status
    }));

    res.json({
      metrics: {
        totalOrders,
        totalEarnings,
        totalExpenses,
        totalProducts
      },
      salesByLine,
      pendingOrders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching metrics' });
  }
});

// Fallback routing for React Admin
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// --- FINANCE ACCOUNTS ---
app.post('/api/finance-accounts/transfer', authMiddleware, async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount } = req.body;
    
    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ error: 'Faltan datos para la transferencia' });
    }

    const fromAccount = await prisma.financeAccount.findUnique({ where: { id: parseInt(fromAccountId) } });
    const toAccount = await prisma.financeAccount.findUnique({ where: { id: parseInt(toAccountId) } });

    if (!fromAccount || !toAccount) {
      return res.status(404).json({ error: 'Cuentas no encontradas' });
    }

    const parsedAmount = parseFloat(amount);

    // Get BCV rate
    let bcvRate = 1;
    const manualBcv = await prisma.setting.findUnique({ where: { key: 'manual_bcv_rate' } });
    if (manualBcv && manualBcv.value && parseFloat(manualBcv.value) > 0) {
      bcvRate = parseFloat(manualBcv.value);
    } else {
      const info = bcvService.obtenerInfo();
      if (info && info.valor) bcvRate = info.valor;
    }

    // Amount conversions
    let sourceDollarAmount = parsedAmount;
    if (fromAccount.currency === 'Bs') {
      sourceDollarAmount = parsedAmount / bcvRate;
    }

    let targetAmount = parsedAmount;
    if (fromAccount.currency === '$' && toAccount.currency === 'Bs') {
      targetAmount = parsedAmount * bcvRate;
    } else if (fromAccount.currency === 'Bs' && toAccount.currency === '$') {
      targetAmount = parsedAmount / bcvRate;
    }

    // Find or create categories
    let expenseCat = await prisma.financeCategory.findFirst({ where: { name: 'Transferencia Saliente' } });
    if (!expenseCat) {
      expenseCat = await prisma.financeCategory.create({ data: { name: 'Transferencia Saliente', type: 'EXPENSE', color: '#EF4444' } });
    }

    let incomeCat = await prisma.financeCategory.findFirst({ where: { name: 'Transferencia Entrante' } });
    if (!incomeCat) {
      incomeCat = await prisma.financeCategory.create({ data: { name: 'Transferencia Entrante', type: 'INCOME', color: '#10B981' } });
    }

    // Create Expense for source (Transferencia Saliente)
    await prisma.expense.create({
      data: {
        title: `Transferencia a ${toAccount.name}`,
        amount: sourceDollarAmount,
        amountBs: sourceDollarAmount * bcvRate,
        categoryId: expenseCat.id,
        description: 'Transferencia entre cuentas',
        financeAccountId: fromAccount.id
      }
    });

    // Create Expense (Income) for target (Transferencia Entrante)
    // NOTE: For income, Expense model uses negative amounts in this system to represent income
    await prisma.expense.create({
      data: {
        title: `Transferencia de ${fromAccount.name}`,
        amount: -sourceDollarAmount,
        amountBs: -(sourceDollarAmount * bcvRate),
        categoryId: incomeCat.id,
        description: 'Transferencia entre cuentas',
        financeAccountId: toAccount.id
      }
    });

    // Update balances
    await prisma.financeAccount.update({
      where: { id: fromAccount.id },
      data: { balance: { decrement: parsedAmount } }
    });

    await prisma.financeAccount.update({
      where: { id: toAccount.id },
      data: { balance: { increment: targetAmount } }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in transfer:', error);
    res.status(500).json({ error: 'Error processing transfer' });
  }
});

app.get('/api/finance-accounts', authMiddleware, async (req, res) => {
  try {
    const accounts = await prisma.financeAccount.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching accounts' });
  }
});

app.post('/api/finance-accounts', authMiddleware, async (req, res) => {
  try {
    const { name, currency } = req.body;
    const account = await prisma.financeAccount.create({ data: { name, currency } });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Error creating account' });
  }
});

app.put('/api/finance-accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, currency } = req.body;
    const account = await prisma.financeAccount.update({
      where: { id: parseInt(id) },
      data: { name, currency }
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Error updating account' });
  }
});

app.delete('/api/finance-accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.financeAccount.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting account' });
  }
});

// --- DAILY CLOSING ENDPOINTS ---
app.get('/api/daily-closings', authMiddleware, async (req, res) => {
  try {
    const closings = await prisma.dailyClosing.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(closings);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching daily closings' });
  }
});

app.post('/api/daily-closings', authMiddleware, async (req, res) => {
  try {
    const { currency, totalAmount, orderCount, ordersInfo } = req.body;
    const closing = await prisma.dailyClosing.create({
      data: {
        currency,
        totalAmount,
        orderCount,
        ordersInfo
      }
    });
    res.status(201).json(closing);
  } catch (error) {
    console.error('Error saving daily closing', error);
    res.status(500).json({ error: 'Error saving daily closing' });
  }
});

// --- LOGGING ENDPOINTS ---
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200 // limit to last 200 for performance
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching logs' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { level, source, action, details } = req.body;
    const log = await prisma.systemLog.create({
      data: {
        level: level || 'INFO',
        source: source || 'STOREFRONT',
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details)
      }
    });

    // Print to terminal
    const prefix = level === 'ERROR' ? '[ERROR]' : (level === 'WARN' ? '[WARN]' : '[INFO]');
    console.log(`${prefix} [${source || 'STOREFRONT'}] ${action} - Detalles: ${JSON.stringify(details || {})}`);

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Error saving log' });
  }
});

//console.log(`cors:${allowedOrigins}`)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('--- CORS Configuration ---');
  if (parsedOrigins === '*') {
    console.log('CORS is fully open (Allowed for all origins: *)');
  } else {
    console.log('Allowed CORS Origins:');
    parsedOrigins.forEach(origin => console.log(` - ${origin}`));
  }
  console.log('--------------------------');
});
