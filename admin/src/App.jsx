import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Finances from './pages/Finances';
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

// --- PRODUCTS REPLACED BY INVENTORY PAGE ---


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
                <Route path="/products" element={<Inventory />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/finances" element={<Finances />} />
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