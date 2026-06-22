import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csv';
import api from '../api';
import {
  Package, Phone, MapPin, Eye, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, Plus, Search, Filter,
  ShoppingCart, User, CreditCard, MessageCircle, X, Truck, RotateCcw, Link as LinkIcon, Edit
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const STATUS_CONFIG = {
  PENDING_DELIVERY: { label: 'Entrega pendiente', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Truck },
  PENDING_PAYMENT: { label: 'Por cobrar', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
  COMPLETED: { label: 'Completado', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  REFUNDED: { label: 'Devolución', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: RotateCcw },
  PENDING: { label: 'Pendiente', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: Clock },
};

const getImageUrl = (url) => {
  if (!url) return '/placeholder.png';
  if (url.startsWith('http')) return url;
  return import.meta.env.DEV ? `http://localhost:3001${url}` : `${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${url}`;
};

const LocationSelector = ({ lat, lng, onChange }) => {
  const defaultCenter = [10.2144, -64.6300];
  const center = lat && lng ? [parseFloat(lat), parseFloat(lng)] : defaultCenter;
  
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        onChange(e.latlng.lat.toString(), e.latlng.lng.toString());
      }
    });
    return null;
  };

  return (
    <div className="h-48 w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />
        {lat && lng && <Marker position={[parseFloat(lat), parseFloat(lng)]} />}
      </MapContainer>
    </div>
  );
};

// ── Modal: detalle de pedido ──────────────────────────────────────
const OrderModal = ({ order, onClose, onStatusChange, financeAccounts, onEdit }) => {
  const [saving, setSaving] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(order?.paymentMethod || 'Pago Móvil (Bs)');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState(order?.paymentReference || '');
  const [editDueDates, setEditDueDates] = useState(
    order?.dueDates?.length > 0 ? order.dueDates.map(d => d.dueDate.split('T')[0]) : ['']
  );
  if (!order) return null;
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const selectedAccount = financeAccounts?.find(acc => acc.id === Number(selectedAccountId));
  const isEfectivo = selectedPaymentMethod.includes('Efectivo') || (selectedAccount?.name || '').toLowerCase().includes('efectivo');

  const changeStatus = async (newStatus) => {
    if (newStatus === 'COMPLETED' && (!showPaymentPrompt || !selectedAccountId || (!isEfectivo && !paymentReference))) {
      if (!showPaymentPrompt) {
        setShowPaymentPrompt(true);
        return;
      }
      if (!selectedAccountId) {
        alert('Debe seleccionar una cuenta a la cual acreditar el pago.');
        return;
      }
      if (!isEfectivo && (!paymentReference || paymentReference.length !== 6)) {
        alert('Debe ingresar un número de referencia válido de 6 dígitos.');
        return;
      }
    }
    setSaving(true);
    try {
      await onStatusChange(
        order.id, 
        newStatus, 
        newStatus === 'PENDING_PAYMENT' ? editDueDates.filter(d => d) : undefined,
        newStatus === 'COMPLETED' ? selectedPaymentMethod : undefined,
        newStatus === 'COMPLETED' ? selectedAccountId : undefined,
        newStatus === 'COMPLETED' ? (!isEfectivo ? paymentReference : undefined) : undefined
      );
      setShowPaymentPrompt(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReverse = async () => {
    if (!window.confirm("¿Estás seguro de que deseas reversar esta orden? Los productos regresarán al inventario y se descontará el dinero de la cuenta (Movimiento en negativo). La orden pasará a estado Pendiente para su edición.")) return;
    setSaving(true);
    try {
      await api.post(`/orders/${order.id}/reverse`);
      window.location.reload(); 
    } catch (e) {
      alert(e.response?.data?.error || 'Error reversando orden');
    } finally {
      setSaving(false);
    }
  };

  const saveDueDates = async () => {
    setSaving(true);
    try {
      await onStatusChange(order.id, order.status, editDueDates.filter(d => d));
    } finally {
      setSaving(false);
    }
  };

  const [newDueDate, setNewDueDate] = useState('');

  const handleAddNewDueDate = () => {
    if (newDueDate) {
      setEditDueDates([...editDueDates, newDueDate]);
      setNewDueDate('');
    }
  };

  const removeEditDueDate = (i) => setEditDueDates(editDueDates.filter((_, idx) => idx !== i));

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
            {order.status !== 'COMPLETED' && order.status !== 'CANCELED' && (
              <button
                onClick={() => onEdit(order)}
                className="p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-xl transition-colors font-bold flex items-center gap-2 text-sm"
                title="Editar Orden"
              >
                <Edit size={16} /> <span className="hidden sm:block">Editar</span>
              </button>
            )}
            <button 
              onClick={() => {
                const url = window.location.origin + '/orders?id=' + order.id;
                navigator.clipboard.writeText(url);
                alert('Enlace directo copiado al portapapeles');
              }}
              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors font-bold flex items-center gap-2 text-sm"
              title="Copiar enlace directo"
            >
              <LinkIcon size={16} /> <span className="hidden sm:block">Copiar Enlace</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{order.customerName}</h3>
                <p className="text-sm text-gray-500">Cédula: {order.customerCedula}</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90">
                  <MessageCircle size={16}/> {order.customerPhone}
                </a>
                {order.customerEmail && (
                  <div className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold">
                    {order.customerEmail}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-2 mt-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Método de Pago:</label>
                <select
                  value={order.paymentMethod || ''}
                  onChange={async (e) => {
                    const newMethod = e.target.value;
                    setSaving(true);
                    try {
                      await onStatusChange(order.id, order.status, undefined, newMethod);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="p-1 rounded border border-gray-200 text-sm font-semibold text-gray-700 bg-white outline-none focus:border-blue-500"
                >
                  <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                  <option value="Transferencia ($)">Transferencia ($)</option>
                  <option value="Efectivo (Bs)">Efectivo (Bs)</option>
                  <option value="Efectivo ($)">Efectivo ($)</option>
                </select>
              </div>
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
              <div className="flex flex-col">
                <span className="font-bold text-gray-500">Total</span>
                {order.bcvRate && <span className="text-xs text-gray-400">Tasa BCV Aplicada: {Number(order.bcvRate).toFixed(2)} Bs/$</span>}
              </div>
              <div className="text-right">
                {order.paymentMethod && order.paymentMethod.includes('(Bs)') ? (
                  <>
                    <span className="text-xl font-black text-gray-800 block">Bs. {order.totalAmountBs ? Number(order.totalAmountBs).toFixed(2) : (Number(order.totalAmount) * (order.bcvRate||1)).toFixed(2)}</span>
                    <span className="text-sm font-bold text-gray-500">${Number(order.totalAmount).toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-black text-gray-800 block">${Number(order.totalAmount).toFixed(2)}</span>
                    {order.totalAmountBs && <span className="text-sm font-bold text-gray-500">Bs. {Number(order.totalAmountBs).toFixed(2)}</span>}
                  </>
                )}
              </div>
            </div>
          </div>

          {order.status === 'PENDING_PAYMENT' && (
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-4">
              <div>
                <label className="text-xs font-bold text-yellow-700 uppercase block mb-2">Añadir nueva fecha límite</label>
                <div className="flex gap-2">
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="flex-1 p-2 rounded-lg border border-yellow-300 text-sm outline-none bg-white" />
                  <button type="button" onClick={handleAddNewDueDate} className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-700 transition-colors">Agregar</button>
                </div>
              </div>

              {editDueDates.length > 0 && (
                <div className="pt-2 border-t border-yellow-200/50">
                  <label className="text-xs font-bold text-yellow-700 uppercase block mb-2">Fechas Agregadas</label>
                  <div className="space-y-2">
                    {editDueDates.map((d, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-yellow-200 shadow-sm">
                        <span className="text-sm font-semibold text-gray-700">{new Date(d + 'T12:00:00Z').toLocaleDateString()}</span>
                        <button type="button" onClick={() => removeEditDueDate(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><X size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-2 border-t border-yellow-200/50">
                <button onClick={saveDueDates} disabled={saving} className="bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* Acciones de estado */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cambiar Estado</h3>
            
            {order.status === 'CANCELED' ? (
              <p className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                Esta orden está cancelada y no puede ser modificada.
              </p>
            ) : order.status === 'COMPLETED' ? (
              <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center space-y-4">
                <p className="text-sm font-bold text-green-700">Esta orden está completada. El inventario fue descontado y el dinero ingresó a la cuenta destino.</p>
                <button
                  onClick={handleReverse}
                  disabled={saving}
                  className="w-full bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-60 flex justify-center items-center gap-2 transition-colors"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  Reversar Orden
                </button>
              </div>
            ) : showPaymentPrompt ? (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-4 mb-4">
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase block mb-2">Confirmar Método de Pago</label>
                  <select 
                    value={selectedPaymentMethod} 
                    onChange={e => setSelectedPaymentMethod(e.target.value)} 
                    className="w-full p-2.5 rounded-lg border border-blue-300 text-sm outline-none bg-white font-medium text-gray-700 mb-3"
                  >
                    <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                    <option value="Transferencia ($)">Transferencia ($)</option>
                    <option value="Efectivo (Bs)">Efectivo (Bs)</option>
                    <option value="Efectivo ($)">Efectivo ($)</option>
                  </select>

                  <label className="text-xs font-bold text-blue-700 uppercase block mb-2">Cuenta Destino</label>
                  <select
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-blue-300 text-sm outline-none bg-white font-medium text-gray-700 mb-3"
                  >
                    <option value="">-- Seleccione una cuenta --</option>
                    {financeAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                    ))}
                  </select>

                  {!isEfectivo && (
                    <>
                      <label className="text-xs font-bold text-blue-700 uppercase block mb-2">Referencia de Pago (6 dígitos)</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Ej: 123456"
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full p-2.5 rounded-lg border border-blue-300 text-sm outline-none bg-white font-medium text-gray-700 mb-2"
                      />
                    </>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowPaymentPrompt(false)} className="w-1/3 bg-white text-gray-600 border border-gray-300 font-bold px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => changeStatus('COMPLETED')} disabled={saving} className="w-2/3 bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 flex justify-center items-center gap-2 transition-colors">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null} Marcar Completada
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                  if (key === 'COMPLETED') {
                    return (
                      <button
                        key={key}
                        disabled={order.status === key || saving}
                        onClick={() => changeStatus(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-green-50 text-green-700 border-green-200 hover:bg-green-100`}
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <val.icon size={14} />}
                        Completar
                      </button>
                    );
                  }
                  if (key === 'CANCELED') {
                    return (
                      <button
                        key={key}
                        disabled={order.status === key || saving}
                        onClick={() => changeStatus(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-red-50 text-red-700 border-red-200 hover:bg-red-100`}
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <val.icon size={14} />}
                        Cancelar
                      </button>
                    );
                  }
                  return (
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal: crear o editar pedido ───────────────────────────────────
const OrderFormModal = ({ onClose, onCreated, products, initialOrder = null }) => {
  const [form, setForm] = useState({ 
    customerName: '', customerCedula: '', 
    phoneCountry: '+58', phoneArea: '414', phoneNum: '', 
    customerEmail: '', locationAddress: '', locationMapLat: '', locationMapLng: '', status: 'PENDING', paymentMethod: 'Pago Móvil (Bs)' 
  });
  const [items, setItems] = useState([]);
  const [dueDates, setDueDates] = useState([]);
  const [newDueDate, setNewDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterLine, setFilterLine] = useState('');

  useEffect(() => {
    if (initialOrder) {
      let country = '+58', area = '414', num = '';
      if (initialOrder.customerPhone) {
        const phone = initialOrder.customerPhone.replace(/\D/g, '');
        if (phone.length >= 10) {
          num = phone.slice(-7);
          area = phone.slice(-10, -7);
        } else {
          num = phone;
        }
      }
      setForm({
        customerName: initialOrder.customerName || '',
        customerCedula: initialOrder.customerCedula || '',
        phoneCountry: country,
        phoneArea: area,
        phoneNum: num,
        customerEmail: initialOrder.customerEmail || '',
        locationAddress: initialOrder.locationAddress || '',
        locationMapLat: initialOrder.locationMapLat || '',
        locationMapLng: initialOrder.locationMapLng || '',
        status: initialOrder.status || 'PENDING',
        paymentMethod: initialOrder.paymentMethod || 'Pago Móvil (Bs)'
      });
      if (initialOrder.items) {
        setItems(initialOrder.items.map(it => ({
          productId: it.productId,
          variantId: it.productVariantId || null,
          quantity: it.quantity,
          p: it.product,
          variant: it.variant
        })));
      }
    }
  }, [initialOrder]);

  const AREA_CODES = ['414','424','412','416','426','212'];

  const categories = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
  const lines = [...new Set(products.map(p => p.productLine?.name).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category?.name !== filterCat) return false;
    if (filterLine && p.productLine?.name !== filterLine) return false;
    if (p.stock <= 0 && (!p.variants || p.variants.every(v => v.stock <= 0))) return false;
    return true;
  });

  const addItem = (p, variant = null) => {
    const existing = items.find(i => i.productId === p.id && i.variantId === variant?.id);
    if (existing) {
      setItems(items.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { productId: p.id, variantId: variant?.id, quantity: 1, p, variant }]);
    }
  };

  const updateItemQty = (i, qty) => {
    const n = [...items];
    n[i].quantity = Math.max(1, parseInt(qty) || 1);
    setItems(n);
  };
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const handleAddNewDueDate = () => {
    if (newDueDate) {
      setDueDates([...dueDates, newDueDate]);
      setNewDueDate('');
    }
  };
  const removeDueDate = (i) => setDueDates(dueDates.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) return alert('Debes ingresar el nombre del cliente');
    if (!form.customerEmail.trim()) return alert('Debes ingresar el email del cliente');
    if (items.length === 0) return alert('Debes agregar al menos un producto al pedido');
    setSaving(true);
    try {
      const payload = {
        customerName: form.customerName,
        customerCedula: form.customerCedula,
        customerPhone: `${form.phoneCountry}${form.phoneArea}${form.phoneNum}`,
        customerEmail: form.customerEmail,
        locationAddress: form.locationAddress,
        locationMapLat: form.locationMapLat,
        locationMapLng: form.locationMapLng,
        status: form.status,
        paymentMethod: form.paymentMethod,
        dueDates: form.status === 'PENDING_PAYMENT' ? dueDates.filter(d => d) : undefined,
        items: items.map(it => ({
          productId: parseInt(it.productId),
          variantId: it.variantId ? parseInt(it.variantId) : null,
          quantity: parseInt(it.quantity)
        }))
      };
      if (initialOrder) {
        await api.put(`/orders/${initialOrder.id}`, payload);
      } else {
        await api.post('/orders', payload);
      }
      onCreated();
      onClose();
    } catch { alert('Error al guardar pedido'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
        
        {/* Panel Izquierdo: Formulario */}
        <div className="w-full md:w-1/2 p-6 h-auto md:max-h-[90vh] md:overflow-y-auto border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
              {initialOrder ? <Plus size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />} 
              {initialOrder ? `Editar Pedido #${initialOrder.id}` : 'Nuevo Pedido'}
            </h2>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
          </div>
          
          <form id="orderForm" onSubmit={handleSubmit} className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo *</label>
                <input required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cédula *</label>
                <input required value={form.customerCedula} onChange={e => setForm({...form, customerCedula: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono *</label>
              <div className="flex gap-2">
                <select value={form.phoneCountry} onChange={e => setForm({...form, phoneCountry: e.target.value})} className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none">
                  <option value="+58">+58</option>
                </select>
                <select value={form.phoneArea} onChange={e => setForm({...form, phoneArea: e.target.value})} className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none">
                  {AREA_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input required type="text" placeholder="Ej: 1234567" value={form.phoneNum} onChange={e => setForm({...form, phoneNum: e.target.value.replace(/\D/g,'')})} className="flex-1 bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email *</label>
                <input required type="email" value={form.customerEmail} onChange={e => setForm({...form, customerEmail: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none">
                  <option value="PENDING">Pendiente</option>
                  <option value="PENDING_PAYMENT">Por Cobrar</option>
                  <option value="COMPLETED">Completado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección (Texto)</label>
              <input value={form.locationAddress} onChange={e => setForm({...form, locationAddress: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método de Pago</label>
              <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none">
                <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                <option value="Transferencia ($)">Transferencia ($)</option>
                <option value="Efectivo (Bs)">Efectivo (Bs)</option>
                <option value="Efectivo ($)">Efectivo ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ubicación en el Mapa (Opcional)</label>
              <LocationSelector 
                lat={form.locationMapLat} 
                lng={form.locationMapLng} 
                onChange={(lat, lng) => setForm({...form, locationMapLat: lat, locationMapLng: lng})} 
              />
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => setForm({...form, locationMapLat: '10.2144', locationMapLng: '-64.6300'})} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <MapPin size={12}/> Usar Coordenadas Default (Puerto la Cruz)
                </button>
              </div>
            </div>

            {form.status === 'PENDING_PAYMENT' && (
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-4">
                <div>
                  <label className="text-xs font-bold text-yellow-700 uppercase block mb-2">Añadir nueva fecha límite</label>
                  <div className="flex gap-2">
                    <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="flex-1 p-2 rounded-lg border border-yellow-300 text-sm outline-none bg-white" />
                    <button type="button" onClick={handleAddNewDueDate} className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-700 transition-colors">Agregar</button>
                  </div>
                </div>

                {dueDates.length > 0 && (
                  <div className="pt-2 border-t border-yellow-200/50">
                    <label className="text-xs font-bold text-yellow-700 uppercase block mb-2">Fechas Agregadas</label>
                    <div className="space-y-2">
                      {dueDates.map((d, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-yellow-200 shadow-sm">
                          <span className="text-sm font-semibold text-gray-700">{new Date(d + 'T12:00:00Z').toLocaleDateString()}</span>
                          <button type="button" onClick={() => removeDueDate(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><X size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Productos Seleccionados ({items.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {items.length === 0 ? <p className="text-sm text-gray-400">No has seleccionado productos.</p> : items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <img src={getImageUrl(it.variant?.imageUrl || it.p.imageUrl)} className="w-10 h-10 rounded-lg object-cover bg-white" alt="" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-gray-700 truncate">{it.p.name}</p>
                      {it.variant && <p className="text-[10px] text-blue-600 font-bold">{it.variant.name}</p>}
                    </div>
                    <input type="number" min="1" value={it.quantity} onChange={e => updateItemQty(i, e.target.value)} className="w-16 border border-gray-200 p-1 rounded-lg text-sm text-center" />
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-1"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold flex-1">Cancelar</button>
            <button form="orderForm" type="submit" disabled={saving} className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex-1 flex justify-center items-center">
              {saving ? <Loader2 className="animate-spin mx-auto" /> : (initialOrder ? 'Guardar Cambios' : 'Generar Pedido')}
            </button>
          </div>
        </div>

        {/* Panel Derecho: Buscador de Productos */}
        <div className="flex w-full md:w-1/2 bg-gray-50 flex-col p-6 h-auto md:max-h-[90vh]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-gray-800">Catálogo</h3>
            <button onClick={onClose} className="hidden md:block p-2 hover:bg-gray-200 rounded-xl"><X size={20} className="text-gray-500" /></button>
          </div>

          <div className="space-y-3 mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none" />
            </div>
            <div className="flex gap-2">
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs outline-none">
                <option value="">Todas las Categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs outline-none">
                <option value="">Todas las Líneas</option>
                {lines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={getImageUrl(p.imageUrl)} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                    <p className="text-[10px] text-gray-500">{p.category?.name || 'Sin Categoría'} • {p.productLine?.name || 'Sin Línea'}</p>
                  </div>
                  {!p.variants?.length ? (
                    <button type="button" onClick={() => addItem(p)} className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 shrink-0"><Plus size={16} /></button>
                  ) : null}
                </div>
                {p.variants?.length > 0 && (
                  <div className="pl-14 space-y-1">
                    {p.variants.filter(v => v.stock > 0).map(v => (
                      <div key={v.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className="text-xs font-semibold text-gray-700">{v.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">${v.price} (Stock: {v.stock})</span>
                          <button type="button" onClick={() => addItem(p, v)} className="bg-gray-200 text-gray-700 p-1 rounded hover:bg-gray-300"><Plus size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filteredProducts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay productos disponibles.</p>}
          </div>
        </div>

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
  const [editingOrder, setEditingOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [products, setProducts] = useState([]);
  const [financeAccounts, setFinanceAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-abrir modal si viene desde Dashboard
  useEffect(() => {
    if (location.state?.newOrder || openNewOrder) setShowNewOrder(true);
  }, [location.state, openNewOrder]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [oRes, pRes, fRes] = await Promise.all([
        api.get('/orders?status=ALL'), 
        api.get('/products'),
        api.get('/finance-accounts')
      ]);
      setOrders(oRes.data);
      setProducts(pRes.data);
      setFinanceAccounts(fRes.data);

      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('id');
      if (orderId) {
        const found = oRes.data.find(o => o.id === parseInt(orderId));
        if (found) {
           setSelectedOrder(found);
           // Eliminar param para no re-abrir si el user cierra el modal
           window.history.replaceState({}, '', window.location.pathname);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };


  const handleStatusChange = async (id, status, dueDates, paymentMethod, financeAccountId, paymentReference) => {
    const payload = { status };
    if (dueDates) payload.dueDates = dueDates;
    if (paymentMethod) payload.paymentMethod = paymentMethod;
    if (financeAccountId) payload.financeAccountId = financeAccountId;
    if (paymentReference) payload.paymentReference = paymentReference;
    const res = await api.patch(`/orders/${id}/status`, payload);
    setOrders(prev => prev.map(o => o.id === id ? res.data : o));
    if (selectedOrder?.id === id) setSelectedOrder(res.data);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(null);
    setEditingOrder(order);
  };

  const filtered = orders.filter(o =>
    (statusFilter === 'ALL' || o.status === statusFilter) &&
    (o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    String(o.id).includes(search))
  );

  const counts = {
    ALL: orders.length,
    PENDING_DELIVERY: orders.filter(o => o.status === 'PENDING_DELIVERY').length,
    PENDING_PAYMENT: orders.filter(o => o.status === 'PENDING_PAYMENT').length,
    COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
    CANCELLED: orders.filter(o => o.status === 'CANCELLED').length,
    REFUNDED: orders.filter(o => o.status === 'REFUNDED').length,
  };

  const handleExportCSV = () => {
    const dataToExport = filtered.map(o => ({
      ID: o.id,
      Fecha: new Date(o.createdAt).toLocaleString(),
      Cliente: o.customerName,
      Cedula: o.customerCedula,
      Telefono: o.customerPhone,
      Email: o.customerEmail || '',
      Total: Number(o.totalAmount).toFixed(2),
      Estado: STATUS_CONFIG[o.status]?.label || o.status,
      Direccion: o.locationAddress || '',
      Productos: o.items?.map(i => `${i.product?.name} x${i.quantity}`).join(' | ') || ''
    }));
    exportToCSV(dataToExport, 'ordenes.csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes</h1>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-sm">
            Exportar CSV
          </button>
          <button onClick={() => setShowNewOrder(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={20} /> Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Tabs de estado */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['ALL', 'PENDING_DELIVERY', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED', 'REFUNDED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all
              ${statusFilter === s ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
          >
            {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s].label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusFilter === s ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {counts[s]}
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
                    <td className="p-4 font-bold text-gray-800">
                      {order.paymentMethod && order.paymentMethod.includes('(Bs)') ? (
                        <span>Bs. {order.totalAmountBs ? Number(order.totalAmountBs).toFixed(2) : (Number(order.totalAmount) * (order.bcvRate||1)).toFixed(2)}</span>
                      ) : (
                        <span>${Number(order.totalAmount).toFixed(2)}</span>
                      )}
                    </td>
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
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} financeAccounts={financeAccounts} onEdit={handleEditOrder} />
      )}
      {showNewOrder && (
        <OrderFormModal onClose={() => setShowNewOrder(false)} onCreated={fetchData} products={products} />
      )}
      {editingOrder && (
        <OrderFormModal onClose={() => setEditingOrder(null)} onCreated={fetchData} products={products} initialOrder={editingOrder} />
      )}
    </div>
  );
};

export default Orders;
