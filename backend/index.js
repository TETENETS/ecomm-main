const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
// Aumentar el límite para soportar imágenes en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- STATIC FILES ---
// Uploads persistentes de Easypanel (imágenes de productos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Frontend del admin
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
// Storefront HTML
app.use('/', express.static(path.join(__dirname, 'public/store')));


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


// --- PRODUCT ROUTES (Inventory) ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { variants: true }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// Admin Route
app.post('/api/products', authMiddleware, upload.any(), async (req, res) => {
  try {
    const { name, description, price, costPrice, stock, variants } = req.body;
    let imageUrl = null;
    
    const mainImageFile = req.files?.find(f => f.fieldname === 'image');
    if (mainImageFile) {
      imageUrl = `/uploads/${mainImageFile.filename}`;
    }

    // Parse variants if provided as string
    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    parsedVariants = parsedVariants.map((v, i) => {
      const vImgFile = req.files?.find(f => f.fieldname === `variantImage_${i}`);
      if (vImgFile) {
        v.imageUrl = `/uploads/${vImgFile.filename}`;
      }
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
      include: { variants: true }
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
    const { name, description, price, costPrice, stock, variants } = req.body;
    
    const existingProduct = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existingProduct) return res.status(404).json({ error: 'Not found' });

    let imageUrl = existingProduct.imageUrl;
    const mainImageFile = req.files?.find(f => f.fieldname === 'image');
    if (mainImageFile) {
      imageUrl = `/uploads/${mainImageFile.filename}`;
    }

    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    parsedVariants = parsedVariants.map((v, i) => {
      const vImgFile = req.files?.find(f => f.fieldname === `variantImage_${i}`);
      if (vImgFile) {
        v.imageUrl = `/uploads/${vImgFile.filename}`;
      }
      return v;
    });

    // Delete old variants and recreate for simplicity
    await prisma.productVariant.deleteMany({ where: { productId: parseInt(id) } });

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { 
        name, 
        description, 
        price: price ? parseFloat(price) : null, 
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stock: stock ? parseInt(stock) : 0,
        imageUrl,
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
      include: { variants: true }
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


// --- EXPENSE ROUTES (Finances) ---
app.get('/api/expenses', authMiddleware, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching expenses' });
  }
});

app.post('/api/expenses', authMiddleware, async (req, res) => {
  try {
    const { title, amount, category, description } = req.body;
    const expense = await prisma.expense.create({
      data: { title, amount, category, description }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error creating expense' });
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

    // --- ENVIAR A WEBHOOK N8N (WHATSAPP/EMAIL) ---
    const webhookUrl = process.env.N8N_WEBHOOK_WHATSAPP;
    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, { order });
        await prisma.order.update({ where: { id: order.id }, data: { n8nStatus: 'SENT' } });
      } catch (err) {
        console.error("Error enviando a n8n:", err.message);
        await prisma.order.update({ where: { id: order.id }, data: { n8nStatus: 'FAILED' } });
      }
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
    const orders = await prisma.order.findMany({
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


// --- DASHBOARD METRICS ---
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const totalOrders = await prisma.order.count();
    
    const orders = await prisma.order.findMany();
    const totalEarnings = orders.reduce((acc, order) => acc + Number(order.totalAmount), 0);
    
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
    
    const totalProducts = await prisma.product.count();

    // Top Products (calculate from OrderItem or just send some products for now)
    const products = await prisma.product.findMany({
      include: { orderItems: true },
      take: 5
    });
    
    const topProducts = products.map(p => {
      const sales = p.orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
      return {
        id: p.id,
        name: p.name,
        price: p.price || 0,
        stock: p.stock,
        sales: sales
      };
    }).sort((a, b) => b.sales - a.sales);

    // Recent Pending Orders
    const pendingOrdersRaw = await prisma.order.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50 // We want up to 50 for the paginated table (client handles pagination)
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
      topProducts,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
