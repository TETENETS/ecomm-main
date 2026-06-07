import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  LogOut, 
  Plus, 
  Upload, 
  Image as ImageIcon 
} from 'lucide-react';

// API Config http://localhoost:
const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- COMPONENTS ---

const Login = ({ setAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { username, password });
      if (res.data.success) {
        localStorage.setItem('adminToken', res.data.token);
        setAuth(true);
        navigate('/');
      }
    } catch (err) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96 border-t-4 border-blue-600">
        <h2 className="text-2xl font-black text-center mb-6 text-gray-800">Panel de Control</h2>
        {error && <div className="bg-red-100 text-red-600 p-2 text-sm rounded mb-4">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Usuario</label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border p-2 rounded focus:border-blue-500 outline-none" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full bg-gray-50 border p-2 rounded focus:border-blue-500 outline-none" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({ onLogout }) => {
  const location = useLocation();
  const links = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Inventario', path: '/products', icon: <Package size={20} /> },
    { name: 'Órdenes', path: '/orders', icon: <ShoppingCart size={20} /> },
    { name: 'Finanzas', path: '/finances', icon: <DollarSign size={20} /> },
  ];

  return (
    <div className="w-64 bg-blue-700 text-white min-h-screen flex flex-col shadow-xl">
      <div className="p-6 font-black text-2xl tracking-wider flex items-center gap-2 border-b border-blue-600">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-700">
          <Package size={18} />
        </div>
        ADMIN
      </div>
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {links.map(link => (
          <Link 
            key={link.path} 
            to={link.path} 
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition ${location.pathname === link.path ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-600 hover:text-white'}`}
          >
            {link.icon}
            {link.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-blue-600">
        <button onClick={onLogout} className="flex items-center gap-3 p-3 w-full rounded-lg text-blue-200 hover:bg-blue-600 hover:text-white font-semibold transition">
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

// --- PAGES ---

const Dashboard = () => {
  const [metrics, setMetrics] = useState({ totalOrders: 0, totalEarnings: 0, totalExpenses: 0, totalProducts: 0 });

  useEffect(() => {
    api.get('/dashboard').then(res => setMetrics(res.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Total Ganancias</h3>
          <p className="text-2xl font-black text-gray-800">${metrics.totalEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <h3 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">Total Órdenes</h3>
          <p className="text-2xl font-black text-gray-800">{metrics.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
          <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Total Gastos</h3>
          <p className="text-2xl font-black text-gray-800">${metrics.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-teal-500">
          <h3 className="text-xs font-bold text-teal-500 uppercase tracking-wider mb-1">Productos</h3>
          <p className="text-2xl font-black text-gray-800">{metrics.totalProducts}</p>
        </div>
      </div>
    </div>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState(null);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  const addVariant = () => setVariants([...variants, { name: '', price: '', stock: '' }]);
  const updateVariant = (index, field, value) => {
    const newVars = [...variants];
    newVars[index][field] = value;
    setVariants(newVars);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if(price) formData.append('price', price);
    if(stock) formData.append('stock', stock);
    if(image) formData.append('image', image);
    if(variants.length > 0) formData.append('variants', JSON.stringify(variants));

    try {
      await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      fetchProducts();
      // Reset form
      setName(''); setDescription(''); setPrice(''); setStock(''); setImage(null); setVariants([]);
    } catch (error) {
      alert("Error al crear producto");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">Añadir Nuevo Producto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nombre</label>
                <input required type="text" className="w-full bg-gray-50 border p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Imagen (Se guardará en Easypanel)</label>
                <input type="file" accept="image/*" className="w-full bg-gray-50 border p-1 rounded" onChange={e => setImage(e.target.files[0])} />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
              <textarea className="w-full bg-gray-50 border p-2 rounded h-20" value={description} onChange={e => setDescription(e.target.value)}></textarea>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-bold text-blue-800 mb-2">Variantes (Tallas, Colores)</h3>
              <p className="text-xs text-blue-600 mb-4">Si añades variantes, los clientes elegirán una al comprar. Si no, usa el precio/stock general abajo.</p>
              
              {variants.map((v, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input placeholder="Nombre Variante (Ej: Talla S)" className="flex-1 border p-2 rounded text-sm" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} required/>
                  <input placeholder="Precio" type="number" className="w-24 border p-2 rounded text-sm" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} required/>
                  <input placeholder="Stock" type="number" className="w-24 border p-2 rounded text-sm" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} required/>
                </div>
              ))}
              <button type="button" onClick={addVariant} className="text-sm font-bold text-blue-600 mt-2 hover:underline">+ Añadir Variante</button>
            </div>

            {variants.length === 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Precio General</label>
                  <input type="number" className="w-full bg-gray-50 border p-2 rounded" value={price} onChange={e => setPrice(e.target.value)} required={variants.length === 0} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Stock General</label>
                  <input type="number" className="w-full bg-gray-50 border p-2 rounded" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button type="submit" className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700">Guardar Producto</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-bold">
            <tr>
              <th className="p-4">Producto</th>
              <th className="p-4">Precio Base</th>
              <th className="p-4">Variantes</th>
              <th className="p-4">Creado</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-4 flex items-center gap-3">
                  {p.imageUrl ? 
                    <img src={import.meta.env.DEV ? `http://localhost/${p.imageUrl}` : p.imageUrl} className="w-10 h-10 rounded object-cover bg-gray-100" /> 
                    : <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon size={20}/></div>
                  }
                  <span className="font-bold">{p.name}</span>
                </td>
                <td className="p-4">${p.price || '-'}</td>
                <td className="p-4">{p.variants?.length || 0} variantes</td>
                <td className="p-4 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- APP ENTRY ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      {/* Si NO está autenticado, mostramos SOLO la pantalla de Login dentro del Router */}
      {!isAuthenticated ? (
        <Routes>
          <Route path="*" element={<Login setAuth={setIsAuthenticated} />} />
        </Routes>
      ) : (
        /* Si SÍ está autenticado, mostramos todo el panel de administración */
        <div className="flex min-h-screen bg-gray-100">
          <Sidebar onLogout={handleLogout} />
          <div className="flex-1 flex flex-col">
            <header className="bg-white h-16 shadow-sm flex items-center justify-end px-6 border-b border-gray-200">
              <span className="font-bold text-gray-600">Admin</span>
            </header>
            <main className="p-8 flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                {/* Redirecciona cualquier ruta extraña al inicio */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;