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

dotenv.config();

// Iniciar cronjobs y bcv
initCronJobs();
bcvService.iniciar();

const app = express();
const prisma = new PrismaClient();



const allowedOrigins = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigins.includes(',') ? allowedOrigins.split(',') : allowedOrigins
}));
// Aumentar el límite para soportar imágenes en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- BCV ENDPOINT ---
app.get('/api/bcv', (req, res) => {
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
      include: { variants: true }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' });
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
      include: { variants: true, productLine: true },
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
    const { name, description, price, costPrice, stock, variants, productLineId } = req.body;
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
    const { name, description, price, costPrice, stock, variants, productLineId } = req.body;
    
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
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating product' });
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
      include: { category: true },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching expenses' });
  }
});

app.post('/api/expenses', authMiddleware, async (req, res) => {
  try {
    let { title, amount, categoryId, description } = req.body;
    
    let catName = 'Sin Categoría';
    if (categoryId) {
      const cat = await prisma.financeCategory.findUnique({ where: { id: parseInt(categoryId) } });
      if (cat) catName = cat.name;
    }

    // Default description to category name if missing
    if (!description || description.trim() === '') {
      description = catName;
    }

    const expense = await prisma.expense.create({
      data: { title, amount: parseFloat(amount), categoryId: categoryId ? parseInt(categoryId) : null, description },
      include: { category: true }
    });
    res.status(201).json(expense);
  } catch (error) {
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
      items
    } = req.body;

    // items should be [{ productId, variantId, quantity }]
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ 
        where: { id: item.productId },
        include: { variants: true } 
      });
      if (!product) continue;
      
      let price = product.price;
      
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (variant) price = variant.price;
      }
      
      totalAmount += parseFloat(price) * item.quantity;
      
      
      // Stock deduction
      const currentStock = item.variantId && variant ? variant.stock : product.stock;
      const newStock = Math.max(0, currentStock - item.quantity);
      
      if (item.variantId && variant) {
        await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: newStock } });
      } else {
        await prisma.product.update({ where: { id: product.id }, data: { stock: newStock } });
      }
      
      if (newStock < 3) {
        const pName = variant ? `${product.name} - ${variant.name}` : product.name;
        await sendAlert('LOW_STOCK', `Alerta, Producto bajo en stock quedan menos de 3 unidades: ${pName}`, {
          productId: product.id,
          productName: pName,
          remaining: newStock
        });
      }

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
        customerCedula,
        customerPhone,
        customerEmail,
        locationMapLat,
        locationMapLng,
        locationAddress,
        receiptImageBase64, // Guardar comprobante base64
        totalAmount,
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: { include: { product: true, variant: true } }
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
      totalAmount: totalAmount,
      link: orderLink,
      items: order.items.map(i => ({
        productName: i.product?.name,
        variantName: i.variant?.name,
        quantity: i.quantity,
        price: i.price
      }))
    });

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
          include: { product: true, variant: true }
        } 
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
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status },
      include: { items: { include: { product: true, variant: true } } }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error updating order status' });
  }
});

// Create manual order (admin)
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const {
      customerName, customerCedula, customerPhone, customerEmail,
      locationAddress, items, notes
    } = req.body;

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

      // Stock deduction
      const currentStock = variant ? variant.stock : product.stock;
      const newStock = Math.max(0, currentStock - item.quantity);
      
      if (item.variantId && variant) {
        await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: newStock } });
      } else {
        await prisma.product.update({ where: { id: product.id }, data: { stock: newStock } });
      }
      
      if (newStock < 3) {
        const pName = variant ? `${product.name} - ${variant.name}` : product.name;
        await sendAlert('LOW_STOCK', `Alerta, Producto bajo en stock quedan menos de 3 unidades: ${pName}`, {
          productId: product.id,
          productName: pName,
          remaining: newStock
        });
      }

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
        totalAmount,
        status: 'PENDING',
        items: { create: orderItemsData }
      },
      include: { items: { include: { product: true, variant: true } } }
    });
    
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
      totalAmount: totalAmount,
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
    
    const orders = await prisma.order.findMany();
    const totalEarnings = orders.reduce((acc, order) => acc + Number(order.totalAmount), 0);
    
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
    
    const totalProducts = await prisma.product.count();

    // Sales by Product Line & Top Products grouped
    const products = await prisma.product.findMany({
      include: { orderItems: true, productLine: true }
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
