import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Phone, MapPin, Eye, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, Plus, Search, Filter,
  ShoppingCart, User, CreditCard, MessageCircle, X
} from 'lucide-react';

const api = axios.create({ baseURL: import.meta.env.DEV ? 'http://localhost:3001/api' : '/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('adminToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const STATUS_CONFIG = {
  PENDING:   { label: 'Pendiente',   bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
  COMPLETED: { label: 'Completado',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircle },
  CANCELLED: { label: 'Cancelado',   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    icon: XCircle },
};

// ── Modal: detalle de pedido ──────────────────────────────────────
const OrderModal = ({ order, onClose, onStatusChange }) => {
  const [saving, setSaving] = useState(false);
  if (!order) return null;
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  const changeStatus = async (newStatus) => {
    setSaving(true);
    try {
      await onStatusChange(order.id, newStatus);
    } finally {
      setSaving(false);
    }
  };

  const mapsUrl = order.locationMapLat && order.locationMapLng
    ? `https://www.google.com/maps?q=${order.locationMapLat},${order.locationMapLng}`
    : null;

  const waUrl = `https://wa.me/${order.customerPhone?.replace(/\D/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-800">Pedido #{order.id}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {cfg.label}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Cliente */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Datos del Cliente</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-800">{order.customerName}</p>
                <p className="text-sm text-gray-500">Cédula: {order.customerCedula}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={waUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors">
                <MessageCircle size={16} /> {order.customerPhone}
              </a>
              {order.customerEmail && (
                <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">
                  {order.customerEmail}
                </span>
              )}
            </div>
          </div>

          {/* Ubicación */}
          {(order.locationAddress || mapsUrl) && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dirección de Entrega</h3>
              <p className="text-gray-700 font-medium mb-3">{order.locationAddress || 'Sin dirección textual'}</p>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                  <MapPin size={16} /> Ver en Google Maps
                </a>
              )}
            </div>
          )}

          {/* Comprobante */}
          {order.receiptImageBase64 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Comprobante de Pago</h3>
              <img src={order.receiptImageBase64} alt="Comprobante" className="rounded-xl border border-gray-200 max-h-60 object-contain" />
            </div>
          )}

          {/* Items */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Productos</h3>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">{item.product?.name}</p>
                      {item.variant && <p className="text-xs text-blue-600">{item.variant.name}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">${Number(item.price).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="font-bold text-gray-500">Total</span>
              <span className="text-xl font-black text-gray-800">${Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          {/* Acciones de estado */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cambiar Estado</h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <button
                  key={key}
                  disabled={order.status === key || saving}
                  onClick={() => changeStatus(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
                    ${order.status === key ? `${val.bg} ${val.text} ${val.border}` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <val.icon size={14} />}
                  {val.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal: crear pedido manual ───────────────────────────────────
const NewOrderModal = ({ onClose, onCreated, products }) => {
  const [form, setForm] = useState({ customerName: '', customerCedula: '', customerPhone: '', customerEmail: '', locationAddress: '' });
  const [items, setItems] = useState([{ productId: '', variantId: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { productId: '', variantId: '', quantity: 1 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const n = [...items];
    n[i][field] = val;
    if (field === 'productId') n[i].variantId = '';
    setItems(n);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        items: items.filter(it => it.productId).map(it => ({
          productId: parseInt(it.productId),
          variantId: it.variantId ? parseInt(it.variantId) : null,
          quantity: parseInt(it.quantity)
        }))
      };
      await api.post('/orders', payload);
      onCreated();
      onClose();
    } catch { alert('Error al crear pedido'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Plus size={20} className="text-blue-600" /> Nuevo Pedido Manual</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} className="text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['customerName','Nombre Completo *',true],['customerCedula','Cédula *',true],['customerPhone','Teléfono *',true],['customerEmail','Email',false]].map(([k,l,req]) => (
              <div key={k}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{l}</label>
                <input required={req} value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dirección</label>
            <input value={form.locationAddress} onChange={e => setForm({...form, locationAddress: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Productos</label>
              <button type="button" onClick={addItem} className="text-xs font-bold text-blue-600 hover:underline">+ Añadir</button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => {
                const prod = products.find(p => p.id === parseInt(it.productId));
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={it.productId} onChange={e => updateItem(i,'productId',e.target.value)}
                      className="flex-1 border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                      <option value="">-- Producto --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {prod?.variants?.length > 0 && (
                      <select value={it.variantId} onChange={e => updateItem(i,'variantId',e.target.value)}
                        className="w-36 border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                        <option value="">Variante</option>
                        {prod.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    )}
                    <input type="number" min="1" value={it.quantity} onChange={e => updateItem(i,'quantity',e.target.value)}
                      className="w-16 border border-gray-200 p-2.5 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><X size={16} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-blue-600 text-white font-bold px-7 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Creando...' : 'Crear Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Page principal ────────────────────────────────────────────────
const Orders = ({ openNewOrder }) => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    api.get('/products').then(r => setProducts(r.data)).catch(() => {});
  }, [statusFilter]);

  // Auto-abrir modal si viene desde Dashboard
  useEffect(() => {
    if (location.state?.newOrder || openNewOrder) setShowNewOrder(true);
  }, [location.state, openNewOrder]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders?status=${statusFilter}`);
      setOrders(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => ({ ...prev, status }));
  };

  const filtered = orders.filter(o =>
    o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    String(o.id).includes(search)
  );

  const counts = {
    ALL: orders.length,
    PENDING: orders.filter(o => o.status === 'PENDING').length,
    COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
    CANCELLED: orders.filter(o => o.status === 'CANCELLED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes</h1>
        <button onClick={() => setShowNewOrder(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={20} /> Nuevo Pedido
        </button>
      </div>

      {/* Tabs de estado */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['ALL','Todos'],['PENDING','Pendientes'],['COMPLETED','Completados'],['CANCELLED','Cancelados']].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === val ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${statusFilter === val ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
              {counts[val]}
            </span>
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o ID..."
          className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-xs">
              <tr>
                <th className="p-4 px-6">ID</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Teléfono</th>
                <th className="p-4">Total</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-16 text-gray-400 font-medium">No hay pedidos</td></tr>
              ) : filtered.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                const IconComp = cfg.icon;
                return (
                  <tr key={order.id} className="hover:bg-gray-50/60 transition-colors group cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <td className="p-4 px-6 font-bold text-blue-600">#{order.id}</td>
                    <td className="p-4 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-gray-700">{order.customerName}</td>
                    <td className="p-4">
                      <a href={`https://wa.me/${order.customerPhone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-green-600 font-semibold hover:underline text-xs">
                        <MessageCircle size={13} /> {order.customerPhone}
                      </a>
                    </td>
                    <td className="p-4 font-bold text-gray-800">${Number(order.totalAmount).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <IconComp size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} />
      )}
      {showNewOrder && (
        <NewOrderModal onClose={() => setShowNewOrder(false)} onCreated={fetchOrders} products={products} />
      )}
    </div>
  );
};

export default Orders;
