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
  FileText
} from 'lucide-react';

import api from '../api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ totalOrders: 0, totalEarnings: 0, totalExpenses: 0, totalProducts: 0 });
  const [salesByLine, setSalesByLine] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closureSummary, setClosureSummary] = useState(null);
  
  // Paginación para órdenes pendientes
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  useEffect(() => {
    // Simulamos la obtención de datos completos para el dashboard
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
        // Fallback for older backend
        setMetrics(res.data);
      }

      // Fetch Vista General / Cierre
      const today = new Date().toISOString().split('T')[0];
      const sRes = await api.get(`/closure/summary?date=${today}`);
      setClosureSummary(sRes.data);
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
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
            <h3 className="text-sm font-bold text-gray-500 mb-1">Pedidos Totales</h3>
            <p className="text-3xl font-black text-gray-800">{metrics.totalOrders}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-red-200 transition-all">
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Gastos / Compras</h3>
            <p className="text-3xl font-black text-gray-800">${metrics.totalExpenses.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} className="rotate-180" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-teal-200 transition-all">
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Prod. en Almacén</h3>
            <p className="text-3xl font-black text-gray-800">{metrics.totalProducts}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
            <Package size={24} />
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
