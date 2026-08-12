import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Plus, 
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Palette,
  Save,
  CheckCircle,
  RefreshCw,
  Layout,
  Monitor
} from 'lucide-react';

import api from '../api';

const defaultTheme = {
  theme_header_bg: '#0f1115',
  theme_header_text: '#ffffff',
  theme_hero_title: '#ffffff',
  theme_hero_subtitle: '#e2e8f0',
  theme_hero_btn_bg: '#c2905f',
  theme_hero_btn_text: '#ffffff',
  theme_hero_btn_border: '#c2905f',
  theme_hero_btn2_bg: '#1e293b',
  theme_hero_btn2_text: '#ffffff',
  theme_hero_btn2_border: '#ffffff',
  theme_page_bg: '#0f1115',
  theme_card_bg: '#181b21',
  theme_card_title: '#f8fafc',
  theme_card_price: '#c2905f',
  theme_btn_cart_bg: '#c2905f',
  theme_btn_cart_text: '#ffffff',
  theme_btn_cart_border: '#c2905f',
  theme_input_bg: '#0f1115',
  theme_input_text: '#f8fafc',
  theme_placeholder_text: '#94a3b8',
  theme_footer_bg: '#0f1115',
  theme_footer_text: '#94a3b8'
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ totalOrders: 0, totalEarnings: 0, totalExpenses: 0, totalProducts: 0 });
  const [salesByLine, setSalesByLine] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closureSummary, setClosureSummary] = useState(null);
  
  // Theme Color Customization State
  const [theme, setTheme] = useState(defaultTheme);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSavedSuccess, setThemeSavedSuccess] = useState(false);

  // Paginación para órdenes pendientes
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard');
      if (res.data.metrics) {
        setMetrics(res.data.metrics);
        setSalesByLine(res.data.salesByLine || []);
        setPendingOrders(res.data.pendingOrders || []);
      } else {
        setMetrics(res.data);
      }

      const today = new Date().toISOString().split('T')[0];
      const sRes = await api.get(`/closure/summary?date=${today}`);
      setClosureSummary(sRes.data);

      // Fetch theme settings
      const settingsRes = await api.get('/settings');
      if (settingsRes.data) {
        const loadedTheme = { ...defaultTheme };
        Object.keys(defaultTheme).forEach(key => {
          if (settingsRes.data[key]) {
            loadedTheme[key] = settingsRes.data[key];
          }
        });
        setTheme(loadedTheme);
      }
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    }
  };

  const handleColorChange = (key, value) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    setThemeSavedSuccess(false);
    try {
      await api.put('/settings', theme);
      setThemeSavedSuccess(true);
      setTimeout(() => setThemeSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error guardando la configuración de colores.');
    } finally {
      setSavingTheme(false);
    }
  };

  const resetThemeToDefaults = () => {
    if (window.confirm("¿Restablecer los colores del tema a los valores por defecto?")) {
      setTheme(defaultTheme);
    }
  };

  // Lógica de Paginación
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = pendingOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(pendingOrders.length / ordersPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Resumen Dashboard</h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2">
            Mes Actual
          </button>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all">
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Ganancias Brutas</h3>
            <p className="text-3xl font-black text-gray-800">${metrics.totalEarnings.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-green-200 transition-all">
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Total Pedidos</h3>
            <p className="text-3xl font-black text-gray-800">{metrics.totalOrders}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-amber-200 transition-all">
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Total Productos</h3>
            <p className="text-3xl font-black text-gray-800">{metrics.totalProducts}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <Package size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-purple-200 transition-all">
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Gastos Totales</h3>
            <p className="text-3xl font-black text-gray-800">${(metrics.totalExpenses || 0).toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* --- SECCIÓN PERSONALIZACIÓN DE COLORES DE LA TIENDA CON LIVE PREVIEW CUADRADO --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-gray-800">Personalizador de Colores de la Tienda</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Modifica en tiempo real los colores de textos, fondos, barras, botones, bordes y placeholders del cliente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={resetThemeToDefaults} 
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={16} /> Restablecer
            </button>
            <button 
              type="button" 
              onClick={handleSaveTheme} 
              disabled={savingTheme}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              {savingTheme ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {savingTheme ? 'Guardando...' : 'Guardar Colores'}
            </button>
          </div>
        </div>

        {themeSavedSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3 text-sm font-bold">
            <CheckCircle size={20} className="text-green-600 shrink-0" />
            ¡Los colores se han guardado exitosamente y ya están activos en la tienda del cliente!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* PANEL CONTROLES DE COLOR (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Categoría 1: Encabezado y Navegación */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div> 1. Barra de Encabezado (Header)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Fondo del Header</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_header_bg} onChange={e => handleColorChange('theme_header_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_header_bg} onChange={e => handleColorChange('theme_header_bg', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Texto y Enlaces</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_header_text} onChange={e => handleColorChange('theme_header_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_header_text} onChange={e => handleColorChange('theme_header_text', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Categoría 2: Banner Hero */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div> 2. Banner Principal (Hero Section)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Título del Banner</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_hero_title} onChange={e => handleColorChange('theme_hero_title', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_hero_title} onChange={e => handleColorChange('theme_hero_title', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Subtítulo del Banner</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_hero_subtitle} onChange={e => handleColorChange('theme_hero_subtitle', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_hero_subtitle} onChange={e => handleColorChange('theme_hero_subtitle', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Botón Principal (Comprar ahora)</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_hero_btn_bg} onChange={e => handleColorChange('theme_hero_btn_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Fondo" />
                    <input type="color" value={theme.theme_hero_btn_text} onChange={e => handleColorChange('theme_hero_btn_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Texto" />
                    <input type="color" value={theme.theme_hero_btn_border} onChange={e => handleColorChange('theme_hero_btn_border', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Borde" />
                  </div>
                  <span className="text-[10px] text-gray-400">Iconos: Fondo | Texto | Borde</span>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Botón Secundario (Ver líneas)</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_hero_btn2_bg} onChange={e => handleColorChange('theme_hero_btn2_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Fondo" />
                    <input type="color" value={theme.theme_hero_btn2_text} onChange={e => handleColorChange('theme_hero_btn2_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Texto" />
                    <input type="color" value={theme.theme_hero_btn2_border} onChange={e => handleColorChange('theme_hero_btn2_border', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Borde" />
                  </div>
                  <span className="text-[10px] text-gray-400">Iconos: Fondo | Texto | Borde</span>
                </div>
              </div>
            </div>

            {/* Categoría 3: Fondo, Tarjetas de Producto y Botón Carrito */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div> 3. Tarjetas de Producto & Botones
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Fondo de Página</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_page_bg} onChange={e => handleColorChange('theme_page_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_page_bg} onChange={e => handleColorChange('theme_page_bg', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Fondo de Tarjeta</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_card_bg} onChange={e => handleColorChange('theme_card_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_card_bg} onChange={e => handleColorChange('theme_card_bg', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Título del Producto</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_card_title} onChange={e => handleColorChange('theme_card_title', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_card_title} onChange={e => handleColorChange('theme_card_title', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Precio del Producto</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_card_price} onChange={e => handleColorChange('theme_card_price', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_card_price} onChange={e => handleColorChange('theme_card_price', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-600 font-semibold mb-1">Botón "Añadir al Carrito" (Fondo | Texto | Borde)</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_btn_cart_bg} onChange={e => handleColorChange('theme_btn_cart_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Fondo" />
                    <input type="color" value={theme.theme_btn_cart_text} onChange={e => handleColorChange('theme_btn_cart_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Texto" />
                    <input type="color" value={theme.theme_btn_cart_border} onChange={e => handleColorChange('theme_btn_cart_border', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" title="Borde" />
                    <span className="text-xs text-gray-500 self-center">Edita el botón de compra directa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Categoría 4: Inputs y Placeholders */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div> 4. Buscadores, Inputs & Placeholders
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Fondo de Input</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_input_bg} onChange={e => handleColorChange('theme_input_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Texto Digitado</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_input_text} onChange={e => handleColorChange('theme_input_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Relleno Placeholder</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_placeholder_text} onChange={e => handleColorChange('theme_placeholder_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                  </div>
                </div>
              </div>
            </div>

            {/* Categoría 5: Footer */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div> 5. Pie de Página (Footer)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Fondo del Footer</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_footer_bg} onChange={e => handleColorChange('theme_footer_bg', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_footer_bg} onChange={e => handleColorChange('theme_footer_bg', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Texto del Footer</label>
                  <div className="flex gap-2">
                    <input type="color" value={theme.theme_footer_text} onChange={e => handleColorChange('theme_footer_text', e.target.value)} className="w-9 h-9 rounded cursor-pointer border" />
                    <input type="text" value={theme.theme_footer_text} onChange={e => handleColorChange('theme_footer_text', e.target.value)} className="flex-1 bg-white border p-2 rounded-lg font-mono outline-none" />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* VISTA PREVIA EN VIVO (MINI PREVIEW CUADRADO EN TIEMPO REAL - 5 Cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 bg-gray-900 rounded-2xl p-4 shadow-xl border border-gray-800 text-white">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Monitor size={18} className="text-blue-400" />
                  <span className="font-bold text-sm text-gray-200">Vista Previa en Vivo (Cuadrado)</span>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">En Vivo</span>
              </div>

              {/* MINI BROWSER PREVIEW FRAME */}
              <div 
                className="w-full rounded-xl overflow-hidden shadow-inner text-[11px] space-y-3 p-3 transition-colors duration-200 border border-white/10"
                style={{ backgroundColor: theme.theme_page_bg }}
              >
                {/* Mini Header Bar */}
                <div 
                  className="rounded-lg p-2.5 flex items-center justify-between transition-colors shadow"
                  style={{ backgroundColor: theme.theme_header_bg, color: theme.theme_header_text }}
                >
                  <div className="font-bold tracking-wider uppercase text-xs" style={{ color: theme.theme_hero_btn_bg }}>Kavala</div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span>Inicio</span>
                    <span>Líneas</span>
                    <span>Destacados</span>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: theme.theme_hero_btn_bg }}>
                    🛒
                  </div>
                </div>

                {/* Mini Hero Banner */}
                <div className="relative rounded-lg p-4 bg-slate-950/80 border border-white/10 text-center space-y-2">
                  <div className="font-serif font-bold text-base leading-tight drop-shadow" style={{ color: theme.theme_hero_title }}>
                    El lujo del mar en tu piel
                  </div>
                  <p className="text-[10px] max-w-xs mx-auto opacity-90" style={{ color: theme.theme_hero_subtitle }}>
                    Fragancias y cuidado corporal de alta gama.
                  </p>
                  <div className="flex justify-center gap-2 pt-1">
                    <button 
                      className="px-3 py-1 rounded-full font-bold text-[9px] shadow"
                      style={{ 
                        backgroundColor: theme.theme_hero_btn_bg, 
                        color: theme.theme_hero_btn_text,
                        borderColor: theme.theme_hero_btn_border,
                        borderWidth: '1px'
                      }}
                    >
                      Comprar ahora
                    </button>
                    <button 
                      className="px-3 py-1 rounded-full font-bold text-[9px] shadow"
                      style={{ 
                        backgroundColor: theme.theme_hero_btn2_bg, 
                        color: theme.theme_hero_btn2_text,
                        borderColor: theme.theme_hero_btn2_border,
                        borderWidth: '1px'
                      }}
                    >
                      Ver líneas
                    </button>
                  </div>
                </div>

                {/* Mini Product Search & Input */}
                <div className="pt-1">
                  <div 
                    className="w-full p-2 rounded-lg border border-white/10 flex items-center justify-between text-[10px]"
                    style={{ backgroundColor: theme.theme_input_bg }}
                  >
                    <span style={{ color: theme.theme_placeholder_text }}>Buscar productos... (Placeholder)</span>
                    <Search size={12} style={{ color: theme.theme_placeholder_text }} />
                  </div>
                </div>

                {/* Mini Product Card */}
                <div 
                  className="rounded-xl p-3 border border-white/10 shadow space-y-2"
                  style={{ backgroundColor: theme.theme_card_bg }}
                >
                  <div className="h-20 w-full bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 font-bold text-[10px]">
                    Foto de Producto
                  </div>
                  <div className="font-bold text-xs" style={{ color: theme.theme_card_title }}>
                    Body Splash Costa Dorada
                  </div>
                  <div className="font-bold text-xs" style={{ color: theme.theme_card_price }}>
                    $24.00 / Bs. 1.200,00
                  </div>
                  <button 
                    className="w-full py-1.5 rounded-full font-bold text-[10px] text-center shadow"
                    style={{ 
                      backgroundColor: theme.theme_btn_cart_bg, 
                      color: theme.theme_btn_cart_text,
                      borderColor: theme.theme_btn_cart_border,
                      borderWidth: '1px'
                    }}
                  >
                    + Añadir al carrito
                  </button>
                </div>

                {/* Mini Footer */}
                <div 
                  className="rounded-lg p-2.5 text-center text-[9px] border-t border-white/5"
                  style={{ backgroundColor: theme.theme_footer_bg, color: theme.theme_footer_text }}
                >
                  © 2026 Kavala. Todos los derechos reservados.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {closureSummary && Object.keys(closureSummary).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-600" />
            Vista General - Cierre de Caja (Hoy)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(closureSummary).map(([method, data]) => (
              <div key={method} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3">{method}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bruto ($):</span>
                    <span className="font-bold">${data.gross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bruto (Bs):</span>
                    <span className="font-bold">Bs. {data.grossBs.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t mt-1">
                    <span className="text-gray-700 font-bold">Neto ($):</span>
                    <span className="font-black text-green-600">${data.net.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRODUCTOS MÁS VENDIDOS POR LÍNEA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Ventas y Top Productos por Línea</h2>
            <button onClick={() => navigate('/finances', { state: { tab: 'HISTORIAL_CIERRES' } })} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Ver todo</button>
          </div>
          <div className="p-0">
            {salesByLine.length === 0 ? (
              <p className="text-center text-gray-500 py-10">No hay ventas registradas aún.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {salesByLine.map((line, idx) => (
                  <div key={idx} className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Package size={16} />
                        </div>
                        Línea: {line.name}
                      </h3>
                      <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        {line.totalSales} Ventas Totales
                      </span>
                    </div>
                    {line.products.length > 0 && (
                      <table className="w-full text-left text-sm mt-2">
                        <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-xs">
                          <tr>
                            <th className="p-3">Top Producto</th>
                            <th className="p-3 text-center">Ventas</th>
                            <th className="p-3 text-right">Precio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {line.products.map((product, pIdx) => (
                            <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 flex items-center gap-3">
                                <span className="font-bold text-gray-400">#{pIdx + 1}</span>
                                <span className="font-semibold text-gray-700">{product.name}</span>
                              </td>
                              <td className="p-3 text-center font-bold text-gray-600">{product.sales} unid.</td>
                              <td className="p-3 text-right font-semibold text-green-600">${Number(product.price || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Accesos Rápidos</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/orders', { state: { newOrder: true } })} className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors gap-2">
              <Plus size={24} />
              <span className="text-sm font-bold">Añadir Pedido</span>
            </button>
            <button onClick={() => navigate('/orders')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors gap-2">
              <Search size={24} />
              <span className="text-sm font-bold text-center">Ver Pedidos</span>
            </button>
            <button onClick={() => navigate('/finances', { state: { newExpense: true } })} className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors gap-2">
              <FileText size={24} />
              <span className="text-sm font-bold">Añadir Gasto</span>
            </button>
            <button onClick={() => navigate('/products')} className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors gap-2">
              <Package size={24} />
              <span className="text-sm font-bold text-center">Inventario</span>
            </button>
          </div>
        </div>
      </div>

      {/* PEDIDOS PENDIENTES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-yellow-50/30">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              Pedidos Pendientes
            </h2>
            <p className="text-sm text-gray-500">Requieren aprobación o envío</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-xs">
              <tr>
                <th className="p-4 px-6">ID Pedido</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Total</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.map((order) => (
                <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 px-6 font-bold text-blue-600">{order.id}</td>
                  <td className="p-4 text-gray-500">{order.date}</td>
                  <td className="p-4 font-semibold text-gray-700">{order.customer}</td>
                  <td className="p-4 font-bold text-gray-800">${order.total}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalles">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Mostrando {indexOfFirstOrder + 1} a {Math.min(indexOfLastOrder, pendingOrders.length)} de {pendingOrders.length} pedidos
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              {/* Páginas simplificadas */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Lógica simple para mostrar páginas cercanas a la actual
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                
                return (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 border rounded-lg text-sm font-bold transition-colors ${
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
