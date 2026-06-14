import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Finances from './pages/Finances';
import Logs from './pages/Logs';
import System from './pages/System';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  LogOut, 
  Activity,
  Menu,
  X,
  Server
} from 'lucide-react';

import api from './api';

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
      }
    } catch (err) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg w-full max-w-sm border-t-4 border-blue-600">
        <h2 className="text-2xl font-black text-center mb-6 text-gray-800">Panel de Control</h2>
        {error && <div className="bg-red-100 text-red-600 p-3 text-sm rounded-lg mb-4 font-semibold">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Usuario</label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border p-3 rounded-lg focus:border-blue-500 outline-none transition-colors" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Contraseña</label>
            <input 
              type="password" 
              className="w-full bg-gray-50 border p-3 rounded-lg focus:border-blue-500 outline-none transition-colors" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md mt-2">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({ onLogout, isOpen, setIsOpen }) => {
  const location = useLocation();
  const links = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Inventario', path: '/products', icon: <Package size={20} /> },
    { name: 'Órdenes', path: '/orders', icon: <ShoppingCart size={20} /> },
    { name: 'Finanzas', path: '/finances', icon: <DollarSign size={20} /> },
    { name: 'Sistema', path: '/system', icon: <Server size={20} /> },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-blue-700 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 font-black text-2xl tracking-wider flex items-center justify-between border-b border-blue-600/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-700 shadow-sm">
              <Package size={18} />
            </div>
            <span>ADMIN</span>
          </div>
          {/* Botón cerrar en móvil */}
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 bg-blue-800 rounded-md text-blue-200 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-2">Menú Principal</p>
          {links.map(link => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                onClick={() => setIsOpen(false)} // Cierra en móvil al hacer click
                className={`flex items-center gap-3 p-3 rounded-xl font-semibold transition-all ${isActive ? 'bg-white text-blue-700 shadow-md translate-x-1' : 'text-blue-100 hover:bg-blue-600 hover:text-white hover:translate-x-1'}`}
              >
                {link.icon}
                {link.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-blue-600/50">
          <button onClick={onLogout} className="flex items-center justify-center gap-2 p-3 w-full bg-blue-800 rounded-xl text-blue-100 hover:bg-blue-900 hover:text-white font-bold transition-colors shadow-inner">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};

// --- APP ENTRY ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bcvRate, setBcvRate] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/bcv').then(res => {
        if(res.data && res.data.valor) setBcvRate(res.data.valor);
      }).catch(err => console.error("Error fetching BCV", err));
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="*" element={<Login setAuth={setIsAuthenticated} />} />
        </Routes>
      ) : (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header / Topbar */}
            <header className="bg-white h-16 shadow-sm flex items-center justify-between px-4 lg:px-6 z-10 relative">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)} 
                  className="lg:hidden p-2 -ml-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu size={24} />
                </button>
                <h2 className="font-bold text-gray-800 hidden sm:block">Panel de Administración</h2>
              </div>
              <div className="flex items-center gap-3">
                {bcvRate && (
                  <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                    <span className="text-xs font-bold text-green-600">BCV</span>
                    <span className="text-sm font-black text-green-700">{Number(bcvRate).toFixed(2)} Bs</span>
                  </div>
                )}
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border-2 border-blue-200">
                  A
                </div>
                <span className="font-bold text-gray-600 text-sm hidden sm:block">Admin</span>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
              <div className="max-w-7xl mx-auto pb-20 lg:pb-0">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<Inventory />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/finances" element={<Finances />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/system" element={<System />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;