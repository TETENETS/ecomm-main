import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Trash2, Loader2, TrendingUp, TrendingDown, DollarSign,
  BarChart3, X, Calendar, Tag, FileText, ShoppingBag
} from 'lucide-react';

const api = axios.create({ baseURL: import.meta.env.DEV ? 'http://localhost:3001/api' : '/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('adminToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const EXPENSE_CATEGORIES = ['GENERAL', 'COMPRA_INVENTARIO', 'MARKETING', 'ENVIOS', 'INFRAESTRUCTURA', 'NOMINA', 'OTRO'];
const CATEGORY_LABELS = {
  GENERAL: 'General', COMPRA_INVENTARIO: 'Inventario', MARKETING: 'Marketing',
  ENVIOS: 'Envíos', INFRAESTRUCTURA: 'Infraestructura', NOMINA: 'Nómina', OTRO: 'Otro'
};
const CATEGORY_COLORS = {
  GENERAL: 'bg-gray-100 text-gray-600', COMPRA_INVENTARIO: 'bg-blue-100 text-blue-700',
  MARKETING: 'bg-purple-100 text-purple-700', ENVIOS: 'bg-orange-100 text-orange-700',
  INFRAESTRUCTURA: 'bg-teal-100 text-teal-700', NOMINA: 'bg-pink-100 text-pink-700',
  OTRO: 'bg-yellow-100 text-yellow-700'
};

// ── Modal: añadir gasto ───────────────────────────────────────────
const NewExpenseModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', amount: '', category: 'GENERAL', description: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/expenses', form);
      onCreated();
      onClose();
    } catch { alert('Error al guardar gasto'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <TrendingDown size={20} className="text-red-500" /> Registrar Gasto
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Descripción *</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="Ej: Compra de telas, Publicidad Facebook..."
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 p-3 pl-8 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nota (opcional)</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Detalles adicionales..."
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm resize-none h-20" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm">Cancelar</button>
            <button type="submit" disabled={saving}
              className="bg-red-500 text-white font-bold px-7 py-2.5 rounded-xl hover:bg-red-600 flex items-center gap-2 disabled:opacity-60 text-sm">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Guardando...' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Page principal ────────────────────────────────────────────────
const Finances = ({ openNewExpense }) => {
  const location = useLocation();
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-abrir modal si viene desde Dashboard
  useEffect(() => {
    if (location.state?.newExpense || openNewExpense) setShowNewExpense(true);
  }, [location.state, openNewExpense]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [eRes, oRes, pRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/orders?status=COMPLETED'),
        api.get('/products')
      ]);
      setExpenses(eRes.data);
      setOrders(oRes.data);
      setProducts(pRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } finally { setDeletingId(null); }
  };

  // ── Cálculos de métricas ──────────────────────────────────────
  const totalRevenue = orders.reduce((a, o) => a + Number(o.totalAmount), 0);
  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Gastos por categoría
  const byCategory = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  }

  // Margen por producto del inventario (costo vs precio venta)
  const productMargins = products.map(p => {
    if (p.variants?.length > 0) {
      const withCost = p.variants.filter(v => v.costPrice);
      if (withCost.length === 0) return null;
      const avgMargin = withCost.reduce((a, v) => a + (Number(v.price) - Number(v.costPrice)), 0) / withCost.length;
      return { name: p.name, margin: avgMargin, hasVariants: true };
    }
    if (!p.costPrice) return null;
    return { name: p.name, margin: Number(p.price) - Number(p.costPrice), hasVariants: false };
  }).filter(Boolean).sort((a, b) => b.margin - a.margin);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Finanzas</h1>
        <button onClick={() => setShowNewExpense(true)}
          className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-600 transition-colors shadow-sm">
          <Plus size={20} /> Añadir Gasto
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-green-200 transition-all">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ingresos Brutos</p>
            <p className="text-3xl font-black text-gray-800">${totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{orders.length} pedidos completados</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp size={22} className="text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Gastos</p>
            <p className="text-3xl font-black text-gray-800">${totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{expenses.length} registros</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingDown size={22} className="text-red-500" />
          </div>
        </div>
        <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between group transition-all ${netProfit >= 0 ? 'bg-green-50 border-green-200 hover:border-green-400' : 'bg-red-50 border-red-200 hover:border-red-400'}`}>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ganancia Neta</p>
            <p className={`text-3xl font-black ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ingresos − Gastos</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <DollarSign size={22} className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gastos por categoría */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-600" /> Gastos por Categoría
          </h2>
          {Object.keys(byCategory).length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">Sin gastos registrados</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => {
                const pct = totalExpenses > 0 ? (amt / totalExpenses * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span className="text-sm font-bold text-gray-700">${amt.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Márgenes por producto */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-blue-600" /> Margen de Ganancia por Producto
          </h2>
          {productMargins.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">Define el "Precio de Compra" en el Inventario para ver los márgenes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productMargins.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">{i+1}</div>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">{p.name}</p>
                      {p.hasVariants && <p className="text-xs text-blue-500">Promedio variaciones</p>}
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${p.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {p.margin >= 0 ? '+' : ''}${p.margin.toFixed(2)} / unid.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial de gastos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-gray-500" /> Historial de Gastos
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-400" /></div>
        ) : expenses.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">No hay gastos registrados</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-400 font-bold uppercase text-xs">
              <tr>
                <th className="p-4 px-6">Descripción</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Monto</th>
                <th className="p-4 text-center">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 px-6">
                    <p className="font-semibold text-gray-700">{e.title}</p>
                    {e.description && <p className="text-xs text-gray-400 mt-0.5">{e.description}</p>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORY_LABELS[e.category] || e.category}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">{new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 font-bold text-red-600">-${Number(e.amount).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}
                      className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50">
                      {deletingId === e.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNewExpense && <NewExpenseModal onClose={() => setShowNewExpense(false)} onCreated={fetchAll} />}
    </div>
  );
};

export default Finances;
