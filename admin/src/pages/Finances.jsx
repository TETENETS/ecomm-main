import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Trash2, Loader2, TrendingUp, TrendingDown, DollarSign,
  BarChart3, X, FileText, ShoppingBag, AlertTriangle, Briefcase, Edit, Package, Clock
} from 'lucide-react';

import api from '../api';
import { exportToCSV } from '../utils/csv';

// ── Modal: Categoría ───────────────────────────────────────────
const CategoryModal = ({ onClose, onCreated, existingCategories }) => {
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/finance-categories/${editingId}`, form);
      } else {
        await api.post('/finance-categories', form);
      }
      onCreated();
      setForm({ name: '', type: 'EXPENSE' });
      setEditingId(null);
    } catch { alert('Error al guardar categoría'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta categoría? Sus gastos asociados pasarán a 'Otro'.")) return;
    try {
      await api.delete(`/finance-categories/${id}`);
      onCreated();
    } catch { alert('Error al eliminar categoría'); }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, type: cat.type });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-md font-black text-gray-800">Categorías</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {editingId ? 'Editar Nombre' : 'Nueva Categoría'}
            </label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white border border-gray-200 p-3 rounded-xl outline-none" placeholder="Ej: Publicidad" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-white border border-gray-200 p-3 rounded-xl outline-none">
              <option value="EXPENSE">Gasto</option>
              <option value="INCOME">Ingreso</option>
            </select>
          </div>
          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', type: 'EXPENSE' }); }} className="w-1/3 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl">Cancelar</button>
            )}
            <button type="submit" disabled={saving} className={`${editingId ? 'w-2/3' : 'w-full'} bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700`}>
              {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar Categoría')}
            </button>
          </div>
        </form>

        {/* Lista de Categorías */}
        <div className="p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Categorías Existentes</h3>
          {existingCategories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay categorías.</p>
          ) : (
            <div className="space-y-2">
              {existingCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-700 text-sm">{cat.name}</p>
                    <p className={`text-[10px] font-bold uppercase mt-0.5 ${cat.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                      {cat.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(cat)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-md"><Edit size={16} /></button>
                    {cat.name !== 'Otro' && (
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ── Modal: Gasto/Ingreso ───────────────────────────────────────────
const TransactionModal = ({ onClose, onCreated, categories }) => {
  const [form, setForm] = useState({ title: '', amount: '', categoryId: '', description: '' });
  const [saving, setSaving] = useState(false);

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Si no tiene descripción (título), usamos el nombre de la categoría
    let finalTitle = form.title;
    if (!finalTitle || finalTitle.trim() === '') {
      const selectedCat = expenseCategories.find(c => c.id === parseInt(form.categoryId));
      finalTitle = selectedCat ? selectedCat.name : 'Gasto';
    }

    try {
      await api.post('/expenses', { ...form, title: finalTitle });
      onCreated();
      onClose();
    } catch { alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <TrendingDown size={20} className="text-red-500" /> Registrar Gasto
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción (Opcional)</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Si dejas vacío, usa la categoría" className="w-full bg-gray-50 border p-3 rounded-xl outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto *</label>
              <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
              <select required value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none">
                <option value="">-- Seleccionar --</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nota Adicional</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl h-20 outline-none resize-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600">{saving ? 'Guardando...' : 'Registrar Gasto'}</button>
        </form>
      </div>
    </div>
  );
};

// ── Modal: Cuenta ───────────────────────────────────────────
const AccountModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', amount: '', type: 'PAYABLE', dueDate: '', description: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/accounts', { ...form, dueDate: new Date(form.dueDate).toISOString() });
      onCreated();
      onClose();
    } catch { alert('Error al guardar cuenta'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Briefcase size={20} className="text-purple-500" /> Nueva Cuenta
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título *</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto *</label>
              <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none">
                <option value="PAYABLE">Por Pagar</option>
                <option value="RECEIVABLE">Por Cobrar</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Límite *</label>
            <input required type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700">{saving ? 'Guardando...' : 'Crear Cuenta'}</button>
        </form>
      </div>
    </div>
  );
};

// ── Modal: Finance Account ───────────────────────────────────────────
const FinanceAccountModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', currency: 'Bs' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/finance-accounts', form);
      onCreated();
      onClose();
    } catch { alert('Error al crear cuenta'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Briefcase size={20} className="text-blue-500" /> Nueva Cuenta Bancaria
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre de la Cuenta *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none" placeholder="Ej: Banesco, Zelle, Pago Móvil..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Moneda *</label>
            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl outline-none">
              <option value="Bs">Bolívares (Bs)</option>
              <option value="$">Dólares ($)</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">{saving ? 'Guardando...' : 'Crear Cuenta'}</button>
        </form>
      </div>
    </div>
  );
};

// ── Page principal ────────────────────────────────────────────────
const Finances = ({ openNewExpense }) => {
  const location = useLocation();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [inventory, setInventory] = useState({ byLine: {}, byCategory: {}, byProduct: {} });
  const [financeAccounts, setFinanceAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('RESUMEN');
  
  const [cierreCurrencyTab, setCierreCurrencyTab] = useState('$');
  const [cierreSubTab, setCierreSubTab] = useState('DIARIO');

  const [historyFilterDate, setHistoryFilterDate] = useState('');
  const [historyFilterProduct, setHistoryFilterProduct] = useState('');
  const [historyFilterLine, setHistoryFilterLine] = useState('');
  const [expandedHistoryDate, setExpandedHistoryDate] = useState(null);

  
  const [closureDate, setClosureDate] = useState(new Date().toISOString().split('T')[0]);
  const [closureOrders, setClosureOrders] = useState([]);
  const [closureSummary, setClosureSummary] = useState(null);
  const [closureHistory, setClosureHistory] = useState([]);
  const [savingClosure, setSavingClosure] = useState(false);
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFinanceAccountModal, setShowFinanceAccountModal] = useState(false);
  const [currentBcvRate, setCurrentBcvRate] = useState(1);

  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (location.state?.newExpense || openNewExpense) setShowTransactionModal(true);
    if (location.state?.tab) setActiveTab(location.state.tab);
  }, [location.state, openNewExpense]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [eRes, cRes, oRes, iRes, poRes, faRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/finance-categories'),
        api.get('/orders?status=COMPLETED'),
        api.get('/finances/inventory'),
        api.get('/orders?status=PENDING_PAYMENT'),
        api.get('/finance-accounts')
      ]);
      setExpenses(eRes.data);
      setCategories(cRes.data);
      setOrders(oRes.data);
      setInventory(iRes.data);
      setPendingOrders(poRes.data);
      setFinanceAccounts(faRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchClosureData = async () => {
    try {
      const [oRes, sRes, bRes, hRes] = await Promise.all([
        api.get(`/closure/orders?date=${closureDate}`),
        api.get(`/closure/summary?date=${closureDate}`),
        api.get('/bcv'),
        api.get('/closure/history')
      ]);
      setClosureOrders(oRes.data);
      setClosureSummary(sRes.data);
      setClosureHistory(hRes.data);
      if (bRes.data && bRes.data.valor) {
        setCurrentBcvRate(bRes.data.valor);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'CIERRE') {
      fetchClosureData();
    }
  }, [activeTab, closureDate]);

  const handleSaveClosure = async () => {
    setSavingClosure(true);
    try {
      const updates = closureOrders.map(o => ({
        id: o.id,
        totalAmount: o.totalAmount,
        totalAmountBs: o.totalAmountBs,
        paymentMethod: o.paymentMethod,
        financeAccountId: o.financeAccountId
      }));
      await api.put('/closure/orders', { updates });
      alert('Cierre de caja guardado exitosamente.');
      fetchClosureData();
    } catch (e) {
      alert('Error al guardar el cierre de caja');
    } finally {
      setSavingClosure(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    await api.delete(`/expenses/${id}`);
    fetchAll();
  };

  const handleUpdateAccountStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'PENDING' ? 'PAID' : 'PENDING';
    await api.put(`/accounts/${id}`, { status: newStatus });
    fetchAll();
  };

  // Metrics
  const totalRevenue = orders.reduce((a, o) => a + Number(o.totalAmount), 0);
  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  
  const handleExportCSV = () => {
    if (activeTab === 'RESUMEN') {
      const dataToExport = expenses.map(e => ({
        ID: e.id,
        Fecha: new Date(e.createdAt).toLocaleString(),
        Titulo: e.title,
        Monto: Number(e.amount).toFixed(2),
        Categoria: e.category ? e.category.name : (e.legacyCategory || 'Sin Categoría')
      }));
      exportToCSV(dataToExport, 'gastos.csv');
    } else if (activeTab === 'CUENTAS') {
      const dataToExport = pendingOrders.flatMap(o => 
        o.dueDates && o.dueDates.length > 0 
          ? o.dueDates.map(d => ({
              ID_Orden: o.id,
              Cliente: o.customerName,
              Total_Orden: Number(o.totalAmount).toFixed(2),
              Fecha_Limite: new Date(d.dueDate).toLocaleDateString(),
            }))
          : [{
              ID_Orden: o.id,
              Cliente: o.customerName,
              Total_Orden: Number(o.totalAmount).toFixed(2),
              Fecha_Limite: 'Sin fechas limitadas',
            }]
      );
      exportToCSV(dataToExport, 'cuentas_por_cobrar.csv');
    } else if (activeTab === 'INVENTARIO') {
      const dataToExport = Object.values(inventory.byProduct).map(p => ({
        Producto: p.name,
        Cantidad_Stock: p.count,
        Costo_Total_Inventario: Number(p.cost).toFixed(2),
        Ganancia_Total_Esperada: Number(p.profit).toFixed(2)
      }));
      exportToCSV(dataToExport, 'inventario_esperado.csv');
    } else if (activeTab === 'CIERRE') {
      const dataToExport = [];
      closureHistory.forEach(day => {
        day.orders.forEach(o => {
          let itemsText = o.items ? o.items.map(i => `${i.quantity}x ${i.product?.name || 'Producto'}`).join(' | ') : '';
          dataToExport.push({
            Fecha_Cierre: day.date,
            ID_Orden: o.id,
            Cliente: o.customerName || '',
            Metodo_Pago: o.paymentMethod || '',
            Monto_Dolares: Number(o.totalAmount || 0).toFixed(2),
            Monto_Bs: o.totalAmountBs ? Number(o.totalAmountBs).toFixed(2) : '',
            Tasa_BCV: o.bcvRate || '',
            Productos: itemsText,
            Bruto_Dia: Number(day.bruto).toFixed(2),
            Neto_Dia: Number(day.neto).toFixed(2)
          });
        });
      });
      exportToCSV(dataToExport, 'historial_cierres_caja.csv');
    }
  };
  
  const dynamicSummary = React.useMemo(() => {
    const summary = { '$': {}, 'Bs': {} };
    let totalBrutoDollar = 0;
    let totalCost = 0;

    let totalD = 0;
    let totalBs = 0;

    closureOrders.forEach(o => {
      const pm = o.paymentMethod || '';
      const gross = parseFloat(o.totalAmount || 0);
      const grossBs = parseFloat(o.totalAmountBs || 0);

      const accId = o.financeAccountId || o.financeAccount?.id;
      const accName = financeAccounts.find(a => a.id === Number(accId))?.name || (o.paymentMethod || 'No especificado');
      const currency = financeAccounts.find(a => a.id === Number(accId))?.currency || (o.paymentMethod?.includes('(Bs)') ? 'Bs' : '$');
      const amount = currency === 'Bs' ? grossBs : gross;
      summary[currency][accName] = (summary[currency][accName] || 0) + amount;

      if (currency === '$') totalD += gross;
      if (currency === 'Bs') totalBs += grossBs;

      let cost = 0;
      if (o.items) {
        o.items.forEach(item => {
          let cp = 0;
          if (item.variant && item.variant.costPrice) cp = parseFloat(item.variant.costPrice);
          else if (item.product && item.product.costPrice) cp = parseFloat(item.product.costPrice);
          cost += cp * item.quantity;
        });
      }

      const rate = parseFloat(o.bcvRate) || currentBcvRate || 1;
      let orderBrutoDollar = gross;
      if (pm.includes('(Bs)')) {
        orderBrutoDollar = grossBs / rate;
      }
      totalBrutoDollar += orderBrutoDollar;
      totalCost += cost;
    });

    summary.totalD = totalD;
    summary.totalBs = totalBs;
    summary.bruto = totalBrutoDollar;
    summary.neto = totalBrutoDollar - totalCost;
    return summary;
  }, [closureOrders, financeAccounts, currentBcvRate]);

  const filteredHistory = React.useMemo(() => {
    return closureHistory.map(h => {
      const filteredOrders = h.orders?.filter(o => {
        let matchesProduct = true;
        let matchesLine = true;
        
        if (historyFilterProduct) {
          matchesProduct = o.items && o.items.some(i => i.product?.name.toLowerCase().includes(historyFilterProduct.toLowerCase()));
        }
        if (historyFilterLine) {
          matchesLine = o.items && o.items.some(i => i.product?.productLine?.name?.toLowerCase().includes(historyFilterLine.toLowerCase()));
        }
        return matchesProduct && matchesLine;
      }) || [];
      return { ...h, filteredOrders };
    }).filter(h => {
      if (historyFilterDate && h.date !== historyFilterDate) return false;
      if ((historyFilterProduct || historyFilterLine) && h.filteredOrders.length === 0) return false;
      return true;
    });
  }, [closureHistory, historyFilterDate, historyFilterProduct, historyFilterLine]);

  const byCategory = {};
  for (const e of expenses) {
    const name = e.category ? e.category.name : (e.legacyCategory || 'Sin Categoría');
    byCategory[name] = (byCategory[name] || 0) + Number(e.amount);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Finanzas</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowFinanceAccountModal(true)} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-gray-200 shadow-sm transition-colors">
            <Briefcase size={18} className="mr-1"/> Cuenta
          </button>
          <button onClick={handleExportCSV} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-gray-200 shadow-sm transition-colors">
            Exportar CSV
          </button>
          <button onClick={() => setShowCategoryModal(true)} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-gray-200">
            Categorías
          </button>
          <button onClick={() => setShowTransactionModal(true)} className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:bg-red-600 shadow-sm">
            <Plus size={18} className="mr-1"/> Gasto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Ingresos Brutos</p>
          <div className="flex justify-between items-end">
            <p className="text-3xl font-black text-gray-800">${totalRevenue.toFixed(2)}</p>
            <TrendingUp size={24} className="text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Gastos</p>
          <div className="flex justify-between items-end">
            <p className="text-3xl font-black text-gray-800">-${totalExpenses.toFixed(2)}</p>
            <TrendingDown size={24} className="text-red-500" />
          </div>
        </div>

        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Ganancia Neta</p>
          <div className="flex justify-between items-end">
            <p className={`text-3xl font-black ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>${netProfit.toFixed(2)}</p>
            <DollarSign size={24} className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1"><Package size={14}/> Total Productos</p>
          <div className="flex justify-between items-end">
            <p className="text-3xl font-black text-blue-800">{Object.keys(inventory.byProduct).length}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 gap-6 overflow-x-auto">
        <button onClick={() => setActiveTab('RESUMEN')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'RESUMEN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Resumen Financiero</button>
        <button onClick={() => setActiveTab('CIERRE')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'CIERRE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Cierre de Caja Diario</button>
        <button onClick={() => setActiveTab('HISTORIAL_CIERRES')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'HISTORIAL_CIERRES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Historial de Cierres</button>
        <button onClick={() => setActiveTab('CUENTAS')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'CUENTAS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Cuentas por Cobrar</button>
        <button onClick={() => setActiveTab('ADMIN_CUENTAS')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ADMIN_CUENTAS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Cuentas Bancarias</button>
        <button onClick={() => setActiveTab('INVENTARIO')} className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'INVENTARIO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Inventario Esperado</button>
      </div>

      {activeTab === 'RESUMEN' && (
        <>

        <div className="hidden">

        {/* Gastos por categoría */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-blue-600" /> Gastos por Categoría</h2>
          <div className="space-y-4">
            {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => {
              const pct = totalExpenses > 0 ? (amt / totalExpenses * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">{cat}</span>
                    <span className="text-sm font-black text-red-600">-${amt.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Historial de Gastos */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50"><h2 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} className="text-gray-400"/> Historial de Gastos</h2></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-gray-400 font-bold uppercase text-xs border-b border-gray-100">
            <tr>
              <th className="p-4 px-6">Descripción</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Monto</th>
              <th className="p-4 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 group transition-colors">
                <td className="p-4 px-6 font-semibold text-gray-800">{e.title}</td>
                <td className="p-4"><span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{e.category ? e.category.name : e.legacyCategory}</span></td>
                <td className="p-4 text-gray-500 text-xs font-medium">{new Date(e.createdAt).toLocaleDateString()}</td>
                <td className="p-4 font-black text-red-600">-${Number(e.amount).toFixed(2)}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDeleteExpense(e.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">No hay gastos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {activeTab === 'CIERRE' && (
        <div className="space-y-6">
          <div className="flex border-b border-gray-100 gap-2 mb-2">
            <button onClick={() => setCierreCurrencyTab('$')} className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-colors ${cierreCurrencyTab === '$' ? 'bg-green-100 text-green-700 border-b-2 border-green-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Cierre en Dólares ($)</button>
            <button onClick={() => setCierreCurrencyTab('Bs')} className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-colors ${cierreCurrencyTab === 'Bs' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Cierre en Bolívares (Bs)</button>
          </div>

          <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-600">Fecha del Cierre:</label>
              <input 
                type="date" 
                value={closureDate} 
                onChange={(e) => setClosureDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none font-medium"
              />
            </div>
            <button 
              onClick={handleSaveClosure} 
              disabled={savingClosure}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {savingClosure ? 'Guardando...' : 'Guardar Cierre'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-800">Órdenes del Día Completadas en {cierreCurrencyTab}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100">
                  <tr>
                    <th className="p-3">Cliente / ID</th>
                    {cierreCurrencyTab === '$' ? <th className="p-3">Monto ($)</th> : <th className="p-3">Monto (Bs)</th>}
                    <th className="p-3">Método de Pago</th>
                    <th className="p-3">Cuenta Destino</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {closureOrders.filter(o => o.paymentMethod && o.paymentMethod.includes(`(${cierreCurrencyTab})`)).map((o, index) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-bold">{o.customerName}</div>
                        <div className="text-xs text-gray-500">#{o.id}</div>
                      </td>
                      <td className="p-3">
                        {cierreCurrencyTab === '$' ? (
                          <input 
                            type="number" step="0.01"
                            value={o.totalAmount}
                            onChange={(e) => {
                              const newOrders = [...closureOrders];
                              const orderIndex = closureOrders.findIndex(order => order.id === o.id);
                              newOrders[orderIndex].totalAmount = e.target.value;
                              setClosureOrders(newOrders);
                            }}
                            className="w-24 border rounded p-1 text-sm outline-none focus:border-blue-500"
                          />
                        ) : (
                          <input 
                            type="number" step="0.01"
                            value={o.totalAmountBs || ''}
                            onChange={(e) => {
                              const newOrders = [...closureOrders];
                              const orderIndex = closureOrders.findIndex(order => order.id === o.id);
                              newOrders[orderIndex].totalAmountBs = e.target.value;
                              setClosureOrders(newOrders);
                            }}
                            className="w-24 border rounded p-1 text-sm outline-none focus:border-blue-500"
                          />
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          value={o.paymentMethod || ''}
                          onChange={(e) => {
                            const newOrders = [...closureOrders];
                            const orderIndex = closureOrders.findIndex(order => order.id === o.id);
                            newOrders[orderIndex].paymentMethod = e.target.value;
                            setClosureOrders(newOrders);
                          }}
                          className="border rounded p-1 text-sm outline-none focus:border-blue-500 mb-1"
                        >
                          {cierreCurrencyTab === '$' ? (
                            <>
                              <option value="Transferencia ($)">Transferencia ($)</option>
                              <option value="Efectivo ($)">Efectivo ($)</option>
                            </>
                          ) : (
                            <>
                              <option value="Pago Móvil (Bs)">Pago Móvil (Bs)</option>
                              <option value="Efectivo (Bs)">Efectivo (Bs)</option>
                            </>
                          )}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={o.financeAccountId || o.financeAccount?.id || ''}
                          onChange={(e) => {
                            const newOrders = [...closureOrders];
                            const orderIndex = closureOrders.findIndex(order => order.id === o.id);
                            newOrders[orderIndex].financeAccountId = e.target.value;
                            setClosureOrders(newOrders);
                          }}
                          className="border rounded p-1 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="">-- Sin asignar --</option>
                          {financeAccounts.filter(fa => fa.currency === cierreCurrencyTab).map(fa => (
                            <option key={fa.id} value={fa.id}>{fa.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {closureOrders.filter(o => o.paymentMethod && o.paymentMethod.includes(`(${cierreCurrencyTab})`)).length === 0 && (
                    <tr><td colSpan="3" className="p-6 text-center text-gray-400">No hay órdenes en {cierreCurrencyTab} para esta fecha.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm w-full h-fit">
              <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-wider">Resumen de Caja en {cierreCurrencyTab}</h3>
              
              <div className="space-y-2 text-sm mb-4 pb-4 border-b border-gray-100">
                {Object.entries(dynamicSummary[cierreCurrencyTab] || {}).map(([accName, amount]) => (
                  <div key={accName} className="flex justify-between">
                    <span className="text-gray-600">{accName}:</span>
                    <span className="font-bold">{cierreCurrencyTab === '$' ? '$' : 'Bs. '} {amount.toFixed(2)}</span>
                  </div>
                ))}
                {Object.keys(dynamicSummary[cierreCurrencyTab] || {}).length === 0 && (
                  <div className="text-gray-400">Sin movimientos</div>
                )}
              </div>

              <div className="space-y-2 text-sm mb-4 pb-4 border-b border-gray-100">
                {cierreCurrencyTab === '$' ? (
                  <div className="flex justify-between">
                    <span className="text-gray-800 font-bold">Total $:</span>
                    <span className="font-black text-green-700">
                      ${dynamicSummary.totalD.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-800 font-bold">Total Bs:</span>
                    <span className="font-black text-blue-700">
                      Bs. {dynamicSummary.totalBs.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'HISTORIAL_CIERRES' && (
        <div className="bg-white rounded-xl border shadow-sm w-full flex flex-col h-[600px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-gray-800">Historial de Cierres</h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                  Este mes: {filteredHistory.filter(h => new Date(h.date).getMonth() === new Date().getMonth() && new Date(h.date).getFullYear() === new Date().getFullYear()).length} cierres
                </span>
              </div>
              <button onClick={handleExportCSV} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors">
                Exportar Todo (CSV)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Filtrar por Fecha</label>
                <input type="date" value={historyFilterDate} onChange={e => setHistoryFilterDate(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Filtrar por Producto</label>
                <input type="text" placeholder="Ej: Jabón..." value={historyFilterProduct} onChange={e => setHistoryFilterProduct(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Filtrar por Línea</label>
                <input type="text" placeholder="Ej: Limpieza..." value={historyFilterLine} onChange={e => setHistoryFilterLine(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-white text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-4">Día</th>
                  <th className="p-4">Órdenes</th>
                  <th className="p-4">Bruto ($)</th>
                  <th className="p-4">Neto ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.map(h => (
                  <React.Fragment key={h.date}>
                    <tr onClick={() => setExpandedHistoryDate(expandedHistoryDate === h.date ? null : h.date)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="p-4 font-bold text-blue-600">{h.date}</td>
                      <td className="p-4 text-gray-500">{h.filteredOrders.length}</td>
                      <td className="p-4 font-bold text-gray-800">${Number(h.bruto).toFixed(2)}</td>
                      <td className="p-4 font-black text-green-600">${Number(h.neto).toFixed(2)}</td>
                    </tr>
                    {expandedHistoryDate === h.date && (
                      <tr>
                        <td colSpan="4" className="p-0">
                          <div className="bg-gray-50 p-4 border-b border-gray-100 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm self-start sticky top-4">
                                <h4 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-wider">Desglose por Cuenta Destino</h4>
                                <div className="space-y-2">
                                  {Object.entries(h.filteredOrders.reduce((acc, o) => {
                                    const accName = o.financeAccount ? `${o.financeAccount.name} (${o.financeAccount.currency})` : (o.paymentMethod || 'No especificado');
                                    const amount = (o.financeAccount?.currency === 'Bs' || (!o.financeAccount && o.paymentMethod?.includes('(Bs)'))) ? Number(o.totalAmountBs || 0) : Number(o.totalAmount || 0);
                                    const currency = (o.financeAccount?.currency === 'Bs' || (!o.financeAccount && o.paymentMethod?.includes('(Bs)'))) ? 'Bs' : '$';
                                    const key = `${accName}|${currency}`;
                                    acc[key] = (acc[key] || 0) + amount;
                                    return acc;
                                  }, {})).map(([key, amount]) => {
                                    const [name, curr] = key.split('|');
                                    return (
                                      <div key={key} className="flex justify-between items-center text-sm">
                                        <span className="font-semibold text-gray-600">{name}</span>
                                        <span className="font-bold text-gray-800">{curr === '$' ? '$' : 'Bs. '} {amount.toFixed(2)}</span>
                                      </div>
                                    );
                                  })}
                                  {h.filteredOrders.length === 0 && <p className="text-xs text-gray-400">Sin datos</p>}
                                </div>
                              </div>
                              <div className="flex-[2]">
                                <h4 className="font-bold text-gray-700 mb-3 text-xs uppercase tracking-wider">Órdenes del {h.date}</h4>
                                <div className="space-y-2">
                                  {h.filteredOrders.map(o => (
                                    <div key={o.id} className="bg-white border rounded-lg p-3 text-xs flex justify-between items-center">
                                      <div>
                                        <span className="font-bold text-gray-800">#{o.id} {o.customerName}</span>
                                        <span className="text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full font-semibold">
                                          {o.financeAccount ? `${o.financeAccount.name}` : (o.paymentMethod || 'N/A')}
                                          {o.paymentReference && ` - Ref: ${o.paymentReference}`}
                                        </span>
                                        <div className="text-gray-500 mt-1">
                                          {o.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(', ')}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-gray-800">${Number(o.totalAmount).toFixed(2)}</div>
                                        {o.totalAmountBs && <div className="text-gray-400 font-semibold">Bs. {Number(o.totalAmountBs).toFixed(2)}</div>}
                                      </div>
                                    </div>
                                  ))}
                                  {h.filteredOrders.length === 0 && <p className="text-gray-500">No hay órdenes que coincidan con los filtros.</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredHistory.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay historial que coincida con los filtros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ADMIN_CUENTAS' && (
        <div className="bg-white rounded-xl border shadow-sm w-full flex flex-col h-[600px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Briefcase size={18} className="text-blue-500"/> Cuentas Bancarias</h3>
            <button onClick={() => setShowFinanceAccountModal(true)} className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
              Nueva Cuenta
            </button>
          </div>
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-white text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Nombre de la Cuenta</th>
                  <th className="p-4">Moneda</th>
                  <th className="p-4">Balance Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {financeAccounts.map(fa => (
                  <tr key={fa.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-500 text-xs">#{fa.id}</td>
                    <td className="p-4 font-bold">{fa.name}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${fa.currency === '$' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{fa.currency}</span></td>
                    <td className={`p-4 font-black ${fa.currency === '$' ? 'text-green-600' : 'text-blue-600'}`}>
                      {fa.currency === '$' ? '$' : 'Bs. '}{Number(fa.balance).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {financeAccounts.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay cuentas creadas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'INVENTARIO' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['byLine', 'byCategory', 'byProduct'].map((type, idx) => {
              const titles = ['Por Línea de Producto', 'Por Categoría', 'Por Producto'];
              return (
                <div key={type} className="bg-white rounded-2xl border shadow-sm p-5">
                  <h2 className="text-base font-black text-gray-800 mb-4">{titles[idx]}</h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {Object.entries(inventory[type] || {}).map(([name, data]) => (
                      <div key={name} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50">
                        <p className="font-bold text-gray-700 mb-2 truncate">{name}</p>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-500 font-bold">Costo (Compra):</span>
                          <span className="font-black text-gray-800">${data.cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-500 font-bold">Valor (Venta):</span>
                          <span className="font-black text-gray-800">${data.value.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-100">
                          <span className="text-gray-500 font-bold uppercase">Ganancia Neta:</span>
                          <span className="font-black text-green-600">${data.profit.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'CUENTAS' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={18} className="text-yellow-600"/> Cuentas por Cobrar (Órdenes)</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-400 font-bold uppercase text-xs border-b border-gray-100">
              <tr>
                <th className="p-4 px-6">Orden / Cliente</th>
                <th className="p-4">Fechas Límite</th>
                <th className="p-4">Monto Total</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 px-6">
                    <p className="font-bold text-gray-800">Pedido #{o.id}</p>
                    <p className="text-xs text-gray-500">{o.customerName}</p>
                  </td>
                  <td className="p-4">
                    {o.dueDates && o.dueDates.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {o.dueDates.map((d, i) => (
                          <span key={i} className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded w-max">
                            {new Date(d.dueDate).toLocaleDateString()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Sin fecha asignada</span>
                    )}
                  </td>
                  <td className="p-4 font-black text-gray-800">${Number(o.totalAmount).toFixed(2)}</td>
                  <td className="p-4"><span className="text-[11px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md">Por Cobrar</span></td>
                </tr>
              ))}
              {pendingOrders.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay cuentas por cobrar pendientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showTransactionModal && <TransactionModal onClose={() => setShowTransactionModal(false)} onCreated={fetchAll} categories={categories} />}
      {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} onCreated={fetchAll} existingCategories={categories} />}
      {showFinanceAccountModal && <FinanceAccountModal onClose={() => setShowFinanceAccountModal(false)} onCreated={fetchAll} />}
    </div>
  );
};

export default Finances;
