import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, Filter, Loader2, AlertCircle, Info, AlertTriangle, 
  ChevronRight, Calendar, Server, MonitorSmartphone, ShieldAlert, ChevronDown,
  Play, CheckCircle, Package, DollarSign
} from 'lucide-react';
import api from '../api';

const Logs = () => {
  const [activeTab, setActiveTab] = useState('LOGS');
  
  // Logs State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [expandedLog, setExpandedLog] = useState(null);

  // Tests State
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [testProduct, setTestProduct] = useState('');
  const [testAccount, setTestAccount] = useState('');
  const [testOrder, setTestOrder] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchTestData();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/logs');
      setLogs(res.data);
    } catch (error) {
      console.error('Error fetching logs', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestData = async () => {
    try {
      const [pRes, aRes, oRes] = await Promise.all([
        api.get('/products'),
        api.get('/accounts'),
        api.get('/orders')
      ]);
      setProducts(pRes.data);
      setAccounts(aRes.data.filter(a => a.type === 'RECEIVABLE' && a.status === 'PENDING'));
      setOrdersList(oRes.data);
    } catch (e) { console.error('Error fetching test data', e); }
  };

  const sendTestAlert = async (type) => {
    setTesting(true);
    try {
      let payload = {};
      if (type === 'LOW_STOCK') {
        if (!testProduct) return alert('Selecciona un producto o variante primero');
        
        let targetName = '';
        let targetStock = 0;
        let productId = null;

        if (testProduct.startsWith('variant-')) {
          const [, pId, vId] = testProduct.split('-');
          const prod = products.find(p => p.id === parseInt(pId));
          const variant = prod.variants.find(v => v.id === parseInt(vId));
          targetName = `${prod.name} - ${variant.name}`;
          targetStock = variant.stock;
          productId = prod.id;
        } else {
          const [, pId] = testProduct.split('-');
          const prod = products.find(p => p.id === parseInt(pId));
          targetName = prod.name;
          targetStock = prod.stock;
          productId = prod.id;
        }

        payload = { productId, productName: targetName, remaining: targetStock };
      }
      if (type === 'NEW_ORDER') {
        if (!testOrder) return alert('Selecciona una orden primero');
        const order = ordersList.find(o => o.id === parseInt(testOrder));
        
        // Simular el payload de orden real como se pide
        payload = {
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          totalAmount: order.totalAmount,
          locationAddress: order.locationAddress,
          locationMapLat: order.locationMapLat,
          locationMapLng: order.locationMapLng,
          link: `${window.location.origin}/orders?id=${order.id}`,
          items: order.items.map(i => ({
            productName: i.product?.name,
            variantName: i.variant?.name,
            quantity: i.quantity,
            price: i.price
          }))
        };
      }
      if (type.includes('ACCOUNT_DUE')) {
        if (!testAccount) return alert('Selecciona una cuenta primero');
        const acc = accounts.find(a => a.id === parseInt(testAccount));
        payload = { accountId: acc.id, title: acc.title, amount: acc.amount, dueDate: acc.dueDate };
      }

      await api.post('/test-alert', { type, payload });
      alert('Alerta enviada correctamente a n8n. Revisa tu panel o chat.');
    } catch (e) {
      alert('Error enviando alerta');
    } finally {
      setTesting(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (filterSource !== 'ALL' && log.source !== filterSource) return false;
    return true;
  });

  const getLevelIcon = (level) => {
    switch(level) {
      case 'ERROR': return <AlertCircle size={16} className="text-red-500" />;
      case 'WARN': return <AlertTriangle size={16} className="text-yellow-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getLevelBadge = (level) => {
    switch(level) {
      case 'ERROR': return 'bg-red-100 text-red-700';
      case 'WARN': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getSourceIcon = (source) => {
    switch(source) {
      case 'SYSTEM': return <Server size={14} className="text-gray-500" />;
      case 'STOREFRONT': return <MonitorSmartphone size={14} className="text-purple-500" />;
      case 'ADMIN': return <ShieldAlert size={14} className="text-orange-500" />;
      default: return <Activity size={14} className="text-gray-500" />;
    }
  };

  const getActionTitle = (action) => {
    if (!action) return 'Acción Desconocida';
    if (!action.includes('/api/')) return action;

    const parts = action.split(' ');
    let method = parts[0];
    let path = parts[1];
    
    if (method === 'ERROR:') {
      method = parts[1];
      path = parts[2];
    }

    if (path.includes('/api/products')) {
      if (method === 'POST') return 'Agregar Producto';
      if (method === 'PUT') return 'Actualizar Producto';
      if (method === 'DELETE') return 'Eliminar Producto';
    }
    if (path.includes('/api/expenses')) {
      if (method === 'POST') return 'Agregar Gasto';
      if (method === 'DELETE') return 'Eliminar Gasto';
    }
    if (path.includes('/api/finance-categories')) {
      if (method === 'POST') return 'Crear Categoría Financiera';
      if (method === 'PUT') return 'Actualizar Categoría Financiera';
      if (method === 'DELETE') return 'Eliminar Categoría Financiera';
    }
    if (path.includes('/api/product-lines')) {
      if (method === 'POST') return 'Crear Línea de Producto';
      if (method === 'PUT') return 'Actualizar Línea de Producto';
      if (method === 'DELETE') return 'Eliminar Línea de Producto';
    }
    if (path.includes('/api/accounts')) {
      if (method === 'POST') return 'Registrar Cuenta';
      if (method === 'PUT') return 'Actualizar Estado de Cuenta';
      if (method === 'DELETE') return 'Eliminar Cuenta';
    }
    if (path.includes('/api/orders')) {
      if (method === 'POST') return 'Crear Orden';
      if (method === 'PUT') return 'Actualizar Estado de Orden';
    }
    if (path.includes('/api/checkout')) {
      if (method === 'POST') return 'Checkout desde Tienda';
    }
    if (path.includes('/api/login')) {
      if (method === 'POST') return 'Inicio de Sesión (Admin)';
    }
    if (path.includes('/api/test-alert')) return 'Alerta de Prueba a n8n';
    
    return action;
  };

  const renderDetails = (detailsStr) => {
    if (!detailsStr) return <p className="text-gray-500 text-sm">Sin detalles adicionales.</p>;
    
    try {
      const parsed = JSON.parse(detailsStr);
      const body = parsed.body || {};
      
      const entries = Object.entries(body).filter(([key]) => key !== 'id');
      if (entries.length === 0) {
        return (
           <div className="bg-gray-900 rounded-xl p-3 overflow-x-auto">
             <pre className="text-xs text-green-400 font-mono">{detailsStr}</pre>
           </div>
        );
      }

      return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mt-2">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-50">
              {entries.map(([key, value]) => (
                <tr key={key} className="hover:bg-gray-50/50">
                  <td className="p-3 font-bold text-gray-500 w-1/3 bg-gray-50/30 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                  <td className="p-3 text-gray-800 font-medium">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } catch {
      return (
        <div className="bg-gray-900 rounded-xl p-3 overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono">{detailsStr}</pre>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Sistema</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('LOGS')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'LOGS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Registros
          </button>
          <button 
            onClick={() => setActiveTab('TESTS')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'TESTS' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Play size={16} /> Pruebas
          </button>
        </div>
      </div>

      {activeTab === 'LOGS' && (
        <>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none text-sm font-semibold text-gray-700 cursor-pointer">
                  <option value="ALL">Todos los Niveles</option>
                  <option value="INFO">Información</option>
                  <option value="WARN">Advertencias</option>
                  <option value="ERROR">Errores</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none text-sm font-semibold text-gray-700 cursor-pointer">
                  <option value="ALL">Todos los Orígenes</option>
                  <option value="SYSTEM">Sistema (Backend)</option>
                  <option value="ADMIN">Panel de Admin</option>
                  <option value="STOREFRONT">Tienda (Storefront)</option>
                </select>
              </div>
            </div>
            <button onClick={fetchLogs} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm text-sm">
              <Activity size={16} /> Refrescar
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                <Activity size={48} className="mb-4 opacity-50" />
                <p>No se encontraron registros con los filtros actuales.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                {filteredLogs.map(log => {
                  const isExpanded = expandedLog === log.id;
                  
                  return (
                    <div key={log.id} className="hover:bg-gray-50/50 transition-colors flex flex-col">
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              {getLevelIcon(log.level)}
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${getLevelBadge(log.level)}`}>
                                {log.level}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {getSourceIcon(log.source)} {log.source}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                                <Calendar size={12} /> {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                          </div>
                          <p className="font-bold text-gray-800 text-sm ml-7">{getActionTitle(log.action)}</p>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 sm:px-11 pb-4">
                          {renderDetails(log.details)}
                          <div className="mt-3 flex justify-between">
                            <p className="text-[10px] text-gray-400 font-mono">Petición Técnica: {log.action}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'TESTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta Alerta Stock */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
              <Package size={24} />
            </div>
            <h2 className="text-lg font-black text-gray-800 mb-2">Alerta: Bajo Stock</h2>
            <p className="text-sm text-gray-500 mb-6">Simula que un producto se quedó con menos de 3 unidades en el inventario.</p>
            
            <div className="space-y-4">
              <select 
                value={testProduct} 
                onChange={e => setTestProduct(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none text-sm"
              >
                <option value="">-- Selecciona un Producto --</option>
                {products.map(p => {
                  if (p.variants?.length > 0) {
                    return p.variants.map(v => (
                      <option key={`v-${v.id}`} value={`variant-${p.id}-${v.id}`}>
                        {p.name} - {v.name}
                      </option>
                    ));
                  }
                  return <option key={`p-${p.id}`} value={`product-${p.id}`}>{p.name}</option>;
                })}
              </select>
              <button 
                disabled={testing}
                onClick={() => sendTestAlert('LOW_STOCK')}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition disabled:opacity-50"
              >
                {testing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Enviar Prueba
              </button>
            </div>
          </div>

          {/* Tarjeta Alerta Nueva Orden */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Activity size={24} />
            </div>
            <h2 className="text-lg font-black text-gray-800 mb-2">Info: Nueva Orden</h2>
            <p className="text-sm text-gray-500 mb-6">Simula la alerta enviando los datos reales de una orden existente de tu historial.</p>
            
            <div className="space-y-4">
              <select 
                value={testOrder} 
                onChange={e => setTestOrder(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none text-sm"
              >
                <option value="">-- Selecciona una Orden --</option>
                {ordersList.map(o => <option key={o.id} value={o.id}>Orden #{o.id} - {o.customerName}</option>)}
              </select>
              <button 
                disabled={testing}
                onClick={() => sendTestAlert('NEW_ORDER')}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50"
              >
                {testing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Enviar Prueba
              </button>
            </div>
          </div>

          {/* Tarjetas Cuentas por Cobrar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2">
            <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center mb-4">
              <DollarSign size={24} />
            </div>
            <h2 className="text-lg font-black text-gray-800 mb-2">Alertas: Cuentas por Cobrar</h2>
            <p className="text-sm text-gray-500 mb-6">Simula las alertas programadas del cron job eligiendo una cuenta de tu historial.</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <select 
                  value={testAccount} 
                  onChange={e => setTestAccount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none text-sm"
                >
                  <option value="">-- Selecciona una Cuenta --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.title} (${a.amount})</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={testing}
                  onClick={() => sendTestAlert('ACCOUNT_DUE_SOON')}
                  className="flex-1 sm:flex-none px-4 py-3 bg-yellow-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-700 transition disabled:opacity-50 text-sm"
                >
                  Prueba 3 Días
                </button>
                <button 
                  disabled={testing}
                  onClick={() => sendTestAlert('ACCOUNT_DUE_TODAY')}
                  className="flex-1 sm:flex-none px-4 py-3 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition disabled:opacity-50 text-sm"
                >
                  Prueba Vence Hoy
                </button>
              </div>
            </div>
            {accounts.length === 0 && (
              <p className="text-xs text-red-500 font-bold mt-2">No tienes cuentas por cobrar pendientes. Crea una primero.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default Logs;
