import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Trash2, Edit, Package, ChevronDown, ChevronRight, Archive, Loader2, Folder, X, Search, CheckCircle } from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return '/placeholder.png';
  if (url.startsWith('http')) return url;
  return import.meta.env.DEV ? `http://localhost:3001${url}` : `${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${url}`;
};

import api from '../api';

const Inventory = () => {
  const [productLines, setProductLines] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [showProductForm, setShowProductForm] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [expandedLines, setExpandedLines] = useState({});
  const [expandedProducts, setExpandedProducts] = useState({});
  
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Product Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState(null);
  const [productLineId, setProductLineId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [variants, setVariants] = useState([]);
  const [existingImage, setExistingImage] = useState('');

  // Add Stock Form State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProductId, setStockProductId] = useState('');
  const [stockVariantId, setStockVariantId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [lineName, setLineName] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineImage, setLineImage] = useState(null);
  const [linePriority, setLinePriority] = useState(1);
  const [editingLineId, setEditingLineId] = useState(null);

  // Stock Lots History State
  const [editingStockLots, setEditingStockLots] = useState([]);
  const [editingStockLotId, setEditingStockLotId] = useState(null);
  const [editingStockLotQty, setEditingStockLotQty] = useState('');
  const [editingStockLotPrice, setEditingStockLotPrice] = useState('');

  // Stock Catalog Search State
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilterCat, setStockFilterCat] = useState('');
  const [stockFilterLine, setStockFilterLine] = useState('');

  // Category Form State
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [linesRes, prodsRes, catRes] = await Promise.all([
        api.get('/product-lines'),
        api.get('/products'),
        api.get('/categories')
      ]);
      setProductLines(linesRes.data);
      setProducts(prodsRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error("Error fetching inventory data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PRODUCT LINE LOGIC ---
  const handleSaveLine = async (e) => {
    e.preventDefault();
    if (!editingLineId && !lineImage) {
      alert('La imagen es obligatoria para las nuevas líneas de producto.');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', lineName);
      formData.append('description', lineDescription);
      formData.append('priority', linePriority);
      if (lineImage) formData.append('image', lineImage);

      if (editingLineId) {
        await api.put(`/product-lines/${editingLineId}`, formData);
      } else {
        await api.post('/product-lines', formData);
      }
      
      setShowLineModal(false);
      setLineName('');
      setLineDescription('');
      setLineImage(null);
      setLinePriority(1);
      setEditingLineId(null);
      fetchData();
    } catch {
      alert('Error guardando línea');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLine = (line) => {
    setEditingLineId(line.id);
    setLineName(line.name);
    setLineDescription(line.description || '');
    setLinePriority(line.priority !== undefined ? line.priority : 1);
    setLineImage(null);
    setShowLineModal(true);
  };

  const handleDeleteLine = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta Línea? Los productos se quedarán sin línea.")) return;
    setDeletingId(`line-${id}`);
    try {
      await api.delete(`/product-lines/${id}`);
      fetchData();
    } catch {
      alert("Error eliminando línea");
    } finally {
      setDeletingId(null);
    }
  };

  // --- CATEGORY LOGIC ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCategoryId) {
        await api.put(`/categories/${editingCategoryId}`, { name: categoryName, description: categoryDescription });
      } else {
        await api.post('/categories', { name: categoryName, description: categoryDescription });
      }
      setCategoryName('');
      setCategoryDescription('');
      setEditingCategoryId(null);
      fetchData();
    } catch {
      alert('Error guardando categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchData();
    } catch {
      alert('Error eliminando categoría');
    }
  };

  // --- PRODUCT LOGIC ---
  const addVariant = () => setVariants([...variants, { name: '', price: '', costPrice: '', stock: '', image: null }]);
  const updateVariant = (index, field, value) => {
    const newVars = [...variants];
    newVars[index][field] = value;
    setVariants(newVars);
  };
  const updateVariantImage = (index, file) => {
    const newVars = [...variants];
    newVars[index].image = file;
    setVariants(newVars);
  };
  const removeVariant = (index) => {
    const newVars = [...variants];
    newVars.splice(index, 1);
    setVariants(newVars);
  };

  const handleEditProduct = (product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(product.price || '');
    setCostPrice(product.costPrice || '');
    setStock(product.stock || '');
    setImage(null);
    setProductLineId(product.productLineId || '');
    setCategoryId(product.categoryId || '');
    setExistingImage(product.imageUrl || '');
    
    const mappedVariants = product.variants ? product.variants.map(v => ({
      name: v.name,
      price: v.price || '',
      costPrice: v.costPrice || '',
      stock: v.stock || '',
      image: null,
      existingImageUrl: v.imageUrl
    })) : [];
    
    let allLots = [...(product.stockLots || [])];
    if (product.variants) {
      product.variants.forEach(v => {
        if (v.stockLots) {
          allLots = [...allLots, ...v.stockLots.map(lot => ({ ...lot, variantName: v.name }))];
        }
      });
    }
    allLots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setEditingStockLots(allLots);
    
    setVariants(mappedVariants);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este producto?")) return;
    setDeletingId(`prod-${id}`);
    try {
      await api.delete(`/products/${id}`);
      fetchData();
    } catch {
      alert("Error al eliminar producto");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if(price) formData.append('price', price);
    if(costPrice) formData.append('costPrice', costPrice);
    if(stock) formData.append('stock', stock);
    if(image) formData.append('image', image);
    if(productLineId) formData.append('productLineId', productLineId);
    if(categoryId) formData.append('categoryId', categoryId);
    
    if(variants.length > 0) {
      const variantsData = variants.map((v, i) => {
        if (v.image) formData.append(`variantImage_${i}`, v.image);
        return { name: v.name, price: v.price, costPrice: v.costPrice, stock: v.stock, existingImageUrl: v.existingImageUrl };
      });
      formData.append('variants', JSON.stringify(variantsData));
    } else {
      formData.append('variants', JSON.stringify([]));
    }

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      resetForm();
      fetchData();
    } catch {
      alert("Error al guardar producto");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowProductForm(false);
    setEditingId(null);
    setName(''); setDescription(''); setPrice(''); setCostPrice(''); setStock(''); setImage(null); setExistingImage(''); setVariants([]); setProductLineId(''); setCategoryId('');
    setEditingStockLots([]); setEditingStockLotId(null);
  };

  const handleUpdateStockLot = async (lotId) => {
    if (!editingStockLotQty || !editingStockLotPrice) return alert('Completa todos los campos');
    setSaving(true);
    try {
      await api.put(`/stock-lots/${lotId}`, {
        quantity: editingStockLotQty,
        purchasePrice: editingStockLotPrice
      });
      setEditingStockLotId(null);
      fetchData();
      setShowProductForm(false);
      alert('Lote actualizado exitosamente. El inventario ha sido recalculado. Vuelve a editar el producto para ver los cambios.');
    } catch {
      alert('Error actualizando lote');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStockLot = async (lotId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este lote? Esto restará el stock ingresado y recalculará el costo.')) return;
    setSaving(true);
    try {
      await api.delete(`/stock-lots/${lotId}`);
      fetchData();
      setShowProductForm(false);
      alert('Lote eliminado exitosamente. Vuelve a editar el producto para ver los cambios.');
    } catch {
      alert('Error eliminando lote');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/products/add-stock', {
        productId: stockProductId,
        variantId: stockVariantId || null,
        quantity: stockQuantity,
        purchasePrice: stockPurchasePrice
      });
      setShowStockModal(false);
      setStockProductId('');
      setStockVariantId('');
      setStockQuantity('');
      setStockPurchasePrice('');
      fetchData();
      alert('Stock agregado exitosamente. El costo unitario se ha actualizado según el promedio ponderado.');
    } catch (error) {
      alert('Error agregando stock');
    } finally {
      setSaving(false);
    }
  };

  // Toggles
  const toggleLine = (id) => setExpandedLines(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleProduct = (id) => setExpandedProducts(prev => ({ ...prev, [id]: !prev[id] }));

  const getMargin = (sale, cost) => {
    const s = Number(sale) || 0;
    const c = Number(cost) || 0;
    if (c === 0) return null;
    return s - c;
  };

  // Filter products for stock catalog
  const stockFilteredProducts = products.filter(p => {
    if (stockFilterCat && p.category?.name !== stockFilterCat) return false;
    if (stockFilterLine && p.productLine?.name !== stockFilterLine) return false;
    if (stockSearch && !p.name.toLowerCase().includes(stockSearch.toLowerCase())) return false;
    return true;
  });

  // Group products by line for the UI sorted by priority (1 to 10) then name
  const sortedProductLines = [...productLines].sort((a, b) => {
    const pA = a.priority !== undefined ? a.priority : 1;
    const pB = b.priority !== undefined ? b.priority : 1;
    if (pA !== pB) return pA - pB;
    return (a.name || '').localeCompare(b.name || '');
  });

  const groupedProducts = sortedProductLines.map(line => ({
    ...line,
    items: products.filter(p => p.productLineId === line.id)
  }));
  const unassignedProducts = products.filter(p => !p.productLineId);
  if (unassignedProducts.length > 0) {
    groupedProducts.push({ id: 'unassigned', name: 'Sin Línea Asignada', items: unassignedProducts });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <div className="flex gap-3">
          <button onClick={() => { setCategoryName(''); setCategoryDescription(''); setEditingCategoryId(null); setShowCategoryModal(true); }} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-sm">
            <Folder size={20} /> Categorías
          </button>
          <button onClick={() => { setEditingLineId(null); setLineName(''); setLineDescription(''); setLineImage(null); setLinePriority(1); setShowLineModal(true); }} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-sm">
            <Folder size={20} /> Nueva Línea
          </button>
          <button onClick={() => { setShowStockModal(true); }} className="bg-green-100 text-green-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-green-200 transition-colors shadow-sm">
            <Plus size={20} /> Añadir Stock
          </button>
          <button onClick={() => { resetForm(); setShowProductForm(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={20} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* --- MODAL LÍNEA DE PRODUCTO --- */}
      {showLineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowLineModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">{editingLineId ? 'Editar Línea' : 'Nueva Línea de Producto'}</h3>
              <button onClick={() => setShowLineModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveLine} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre *</label>
                <input required value={lineName} onChange={e => setLineName(e.target.value)} className="w-full bg-gray-50 border p-3 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridad (1 = Más Importante, 10 = Menos Importante) *</label>
                <select value={linePriority} onChange={e => setLinePriority(parseInt(e.target.value))} className="w-full bg-gray-50 border p-3 rounded-xl outline-none font-bold text-gray-700">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                    <option key={p} value={p}>Prioridad {p} {p === 1 ? '(1 - Máxima Prioridad)' : p === 10 ? '(10 - Mínima Prioridad)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={lineDescription} onChange={e => setLineDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen {!editingLineId ? '*' : '(Opcional)'}</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-all cursor-pointer relative overflow-hidden group h-32">
                  <input type="file" accept="image/*" required={!editingLineId} onChange={e => setLineImage(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  {lineImage ? (
                    <div className="text-blue-600 font-bold flex items-center gap-2"><ImageIcon size={24} /> {lineImage.name}</div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon size={32} className="text-gray-400 mb-2 group-hover:text-blue-500" />
                      <span className="text-sm font-medium">Arrastra una imagen o clic</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving} className="bg-blue-600 text-white font-bold px-7 py-2.5 rounded-xl flex items-center gap-2">{saving && <Loader2 size={15} className="animate-spin" />} Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CATEGORÍA --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-gray-800">Gestionar Categorías</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <form onSubmit={handleSaveCategory} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="font-bold text-sm text-gray-700">{editingCategoryId ? 'Editar Categoría' : 'Añadir Nueva Categoría'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre *</label>
                    <input required value={categoryName} onChange={e => setCategoryName(e.target.value)} className="w-full bg-white border p-2.5 rounded-lg outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                    <input value={categoryDescription} onChange={e => setCategoryDescription(e.target.value)} className="w-full bg-white border p-2.5 rounded-lg outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {editingCategoryId && (
                    <button type="button" onClick={() => {setEditingCategoryId(null); setCategoryName(''); setCategoryDescription('');}} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
                  )}
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm font-bold px-6 py-2 rounded-lg flex items-center gap-2">{saving && <Loader2 size={15} className="animate-spin" />} Guardar</button>
                </div>
              </form>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                    <tr>
                      <th className="p-3 text-left">Nombre</th>
                      <th className="p-3 text-left">Descripción</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 font-bold text-gray-800">{c.name}</td>
                        <td className="p-3 text-gray-500 truncate max-w-[200px]">{c.description || '-'}</td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => { setEditingCategoryId(c.id); setCategoryName(c.name); setCategoryDescription(c.description || ''); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan="3" className="p-6 text-center text-gray-400 italic">No hay categorías</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL AÑADIR STOCK --- */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowStockModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Panel Izquierdo: Formulario de Stock */}
            <div className="w-full md:w-1/2 p-6 h-auto md:max-h-[90vh] md:overflow-y-auto border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-800">Añadir Stock</h2>
                <button onClick={() => setShowStockModal(false)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl"><X size={20} className="text-gray-500" /></button>
              </div>
              <form id="stockForm" onSubmit={handleSaveStock} className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Producto Seleccionado</h3>
                  {!stockProductId ? (
                     <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                       <Search className="text-blue-400" size={20} />
                       <p className="text-sm text-blue-700 font-medium">Selecciona un producto del catálogo (panel derecho).</p>
                     </div>
                  ) : (
                     <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                       <img src={getImageUrl(products.find(p => p.id === stockProductId)?.imageUrl)} className="w-12 h-12 rounded-lg object-cover bg-white" alt="" />
                       <div className="flex-1">
                         <p className="text-sm font-bold text-gray-800">{products.find(p => p.id === stockProductId)?.name}</p>
                         {stockVariantId && <p className="text-xs text-blue-600 font-bold">{products.find(p => p.id === stockProductId)?.variants?.find(v => v.id === stockVariantId)?.name}</p>}
                       </div>
                       <button type="button" onClick={() => {setStockProductId(''); setStockVariantId('');}} className="text-red-400 hover:text-red-600 p-2"><X size={16} /></button>
                     </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantidad *</label>
                    <input type="number" required min="1" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none" placeholder="0" disabled={!stockProductId} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Compra Unit. *</label>
                    <input type="number" step="0.01" required min="0" value={stockPurchasePrice} onChange={e => setStockPurchasePrice(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none" placeholder="0.00" disabled={!stockProductId} />
                  </div>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold flex-1">Cancelar</button>
                <button form="stockForm" type="submit" disabled={saving || !stockProductId} className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60 flex-1 flex justify-center items-center">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Stock'}
                </button>
              </div>
            </div>

            {/* Panel Derecho: Buscador de Productos (Catálogo) */}
            <div className="flex w-full md:w-1/2 bg-gray-50 flex-col p-6 h-auto md:max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-gray-800">Catálogo</h3>
                <button onClick={() => setShowStockModal(false)} className="hidden md:block p-2 hover:bg-gray-200 rounded-xl"><X size={20} className="text-gray-500" /></button>
              </div>

              <div className="space-y-3 mb-4 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input type="text" placeholder="Buscar producto..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white" />
                </div>
                <div className="flex gap-2">
                  <select value={stockFilterCat} onChange={e => setStockFilterCat(e.target.value)} className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs outline-none">
                    <option value="">Todas las Categorías</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={stockFilterLine} onChange={e => setStockFilterLine(e.target.value)} className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs outline-none">
                    <option value="">Todas las Líneas</option>
                    {productLines.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {stockFilteredProducts.map(p => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={getImageUrl(p.imageUrl)} className="w-12 h-12 rounded-xl object-cover bg-gray-100" alt="" />
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                        <p className="text-[10px] text-gray-500">{p.category?.name || 'Sin Categoría'} • {p.productLine?.name || 'Sin Línea'}</p>
                      </div>
                      {!p.variants?.length ? (
                        <button type="button" onClick={() => { setStockProductId(p.id); setStockVariantId(''); }} className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 shrink-0 shadow-sm"><Plus size={16} /></button>
                      ) : null}
                    </div>
                    {p.variants?.length > 0 && (
                      <div className="pl-14 space-y-1">
                        {p.variants.map(v => (
                          <div key={v.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <span className="text-xs font-semibold text-gray-700">{v.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Stock actual: {v.stock}</span>
                              <button type="button" onClick={() => { setStockProductId(p.id); setStockVariantId(v.id); }} className="bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-200 shadow-sm"><Plus size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {stockFilteredProducts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay productos disponibles.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FORMULARIO DE PRODUCTO --- */}
      {showProductForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <Package className="text-blue-600" />
            {editingId ? 'Editar Producto' : 'Añadir Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmitProduct} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Producto *</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none">
                    <option value="">-- Sin Categoría --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Línea de Producto</label>
                  <select value={productLineId} onChange={e => setProductLineId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none">
                    <option value="">-- Sin Línea --</option>
                    {productLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                  <textarea className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl h-24 outline-none resize-none" value={description} onChange={e => setDescription(e.target.value)}></textarea>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Imagen Principal {editingId && '(Opcional: Subir nueva)'}</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-all cursor-pointer relative overflow-hidden group h-32">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setImage(e.target.files[0])} />
                    {image ? (
                      <div className="text-blue-600 font-bold flex items-center gap-2"><ImageIcon size={24} /> {image.name}</div>
                    ) : existingImage ? (
                      <div className="flex flex-col items-center">
                        <ImageIcon size={32} className="text-green-500 mb-2" />
                        <span className="text-sm font-medium text-green-600">Imagen actual guardada. Clic para cambiar.</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon size={32} className="text-gray-400 mb-2 group-hover:text-blue-500" />
                        <span className="text-sm font-medium">Arrastra una imagen o clic</span>
                      </div>
                    )}
                  </div>
                </div>

                {variants.length === 0 && (
                  <div className="grid grid-cols-1 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Precio de Venta *</label>
                      <input type="number" step="0.01" className="w-full bg-gray-50 border p-3 rounded-xl outline-none" value={price} onChange={e => setPrice(e.target.value)} required={variants.length === 0} placeholder="0.00" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VARIANTS */}
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Variaciones</h3>
                  <p className="text-sm text-gray-500">Agrega tallas, colores, etc.</p>
                </div>
                <button type="button" onClick={addVariant} className="bg-white border text-gray-700 font-bold px-4 py-2 rounded-xl text-sm">+ Añadir Variación</button>
              </div>
              
              {variants.length > 0 && (
                <div className="space-y-3">
                  {variants.map((v, i) => (
                    <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex-1 min-w-[150px]">
                        <input placeholder="Ej: Talla M - Rojo" className="w-full bg-gray-50 p-2.5 rounded-lg text-sm outline-none" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} required/>
                      </div>
                      <div className="w-32">
                        <input placeholder="Venta" type="number" step="0.01" className="w-full border border-blue-200 bg-blue-50/30 py-2.5 px-2 rounded-lg text-sm text-blue-700 font-bold outline-none" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} required/>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="relative">
                          <button type="button" className={`p-2 rounded-lg overflow-hidden ${v.image || v.existingImageUrl ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50'}`}><ImageIcon size={17} />
                             <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => updateVariantImage(i, e.target.files[0])} />
                          </button>
                        </div>
                        <button type="button" onClick={() => removeVariant(i)} className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg"><Trash2 size={17} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editingId && editingStockLots.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Historial de Lotes de Stock</h3>
                <div className="space-y-3">
                  <div className="flex px-4 py-2 bg-gray-200/50 rounded-xl text-xs font-bold text-gray-600 uppercase">
                    <div className="flex-1">Fecha</div>
                    <div className="flex-1">Variante</div>
                    <div className="w-24">Cantidad</div>
                    <div className="w-24">Precio Compra</div>
                    <div className="w-20 text-right">Acciones</div>
                  </div>
                  {editingStockLots.map(lot => (
                    <div key={lot.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-sm">
                      <div className="flex-1 text-gray-500 font-medium">{new Date(lot.createdAt).toLocaleDateString()}</div>
                      <div className="flex-1 text-gray-700 font-bold">{lot.variantName || '-'}</div>
                      
                      {editingStockLotId === lot.id ? (
                        <>
                          <div className="w-24">
                            <input type="number" className="w-full bg-gray-50 p-2 rounded-lg outline-none border border-blue-200" value={editingStockLotQty} onChange={e => setEditingStockLotQty(e.target.value)} />
                          </div>
                          <div className="w-24">
                            <input type="number" step="0.01" className="w-full bg-gray-50 p-2 rounded-lg outline-none border border-blue-200" value={editingStockLotPrice} onChange={e => setEditingStockLotPrice(e.target.value)} />
                          </div>
                          <div className="w-20 flex justify-end gap-1">
                            <button type="button" onClick={() => handleUpdateStockLot(lot.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><CheckCircle size={16} /></button>
                            <button type="button" onClick={() => setEditingStockLotId(null)} className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><X size={16} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-24 font-bold text-gray-800">{lot.quantity}</div>
                          <div className="w-24 font-bold text-gray-800">${Number(lot.purchasePrice).toFixed(2)}</div>
                          <div className="w-20 flex justify-end gap-1">
                            <button type="button" onClick={() => { setEditingStockLotId(lot.id); setEditingStockLotQty(lot.quantity); setEditingStockLotPrice(lot.purchasePrice); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                            <button type="button" onClick={() => handleDeleteStockLot(lot.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={resetForm} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-green-600 text-white font-bold px-8 py-2.5 rounded-xl flex items-center gap-2 shadow-sm">
                {saving && <Loader2 size={18} className="animate-spin" />} {saving ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- INVENTORY TREE --- */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {groupedProducts.map(line => (
            <div key={line.id} className="border-b border-gray-100 last:border-0">
              {/* Nivel 1: Línea de Producto */}
              <div className="bg-gray-50/80 p-4 flex items-center justify-between group hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleLine(line.id)} className="p-1.5 rounded-lg bg-white shadow-sm text-gray-500 hover:text-blue-600 transition-colors">
                    {expandedLines[line.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <Folder size={20} className="text-gray-400" />
                  <span className="font-bold text-gray-800 text-base">{line.name}</span>
                  {line.id !== 'unassigned' && (
                    <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                      Prioridad: {line.priority !== undefined ? line.priority : 1}
                    </span>
                  )}
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{line.items.length} prod.</span>
                </div>
                {line.id !== 'unassigned' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleEditLine(line)} className="p-2 text-blue-400 hover:text-blue-600 bg-white shadow-sm hover:bg-blue-50 rounded-lg transition-all" title="Editar Línea">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteLine(line.id)} className="p-2 text-red-400 hover:text-red-600 bg-white shadow-sm hover:bg-red-50 rounded-lg transition-all" title="Eliminar Línea">
                      {deletingId === `line-${line.id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                )}
              </div>

              {expandedLines[line.id] && (
                <div className="bg-white divide-y divide-gray-50 overflow-x-auto">
                  <div className="min-w-[800px] pb-2">
                  <div className="flex p-3 pl-12 py-2 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 shrink-0"></div>
                      <div className="w-10 shrink-0"></div>
                      <div className="flex-1 min-w-[150px]">Producto</div>
                      <div className="w-32 shrink-0">Categoría</div>
                      <div className="w-24 shrink-0">Stock</div>
                      <div className="w-24 shrink-0">Costo</div>
                      <div className="w-24 shrink-0">Venta</div>
                      <div className="w-24 shrink-0">Margen</div>
                      <div className="w-20 shrink-0 text-right">Acciones</div>
                    </div>
                  </div>
                  {line.items.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6 italic">Línea vacía</p>
                  ) : line.items.map(p => {
                    const totalStock = p.variants?.length > 0 ? p.variants.reduce((acc, curr) => acc + curr.stock, 0) : p.stock;
                    const hasVariants = p.variants?.length > 0;
                    const isExpandedProd = expandedProducts[p.id];
                    const margin = !hasVariants ? getMargin(p.price, p.costPrice) : null;

                    return (
                      <div key={p.id}>
                        <div className="p-3 pl-12 flex items-center justify-between hover:bg-blue-50/30 transition-colors group">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-8 shrink-0 flex justify-center">
                              {hasVariants && (
                                <button onClick={() => toggleProduct(p.id)} className="p-1 rounded text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                                  {isExpandedProd ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              )}
                            </div>
                            {p.imageUrl ? 
                              <img src={import.meta.env.DEV ? `http://localhost:3001${p.imageUrl}` : `${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${p.imageUrl}`} className="w-10 h-10 shrink-0 rounded-lg object-cover bg-gray-100 border border-gray-200" alt={p.name} /> 
                              : <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-300"><ImageIcon size={18}/></div>
                            }
                            <div className="flex-1 min-w-[150px]">
                              <span className="font-bold text-gray-700 block">{p.name}</span>
                              {hasVariants && <span className="text-xs text-blue-500 font-semibold">{p.variants.length} variantes</span>}
                            </div>
                            <div className="w-32 shrink-0 text-xs text-gray-500 flex items-center">
                              {p.category?.name || <span className="italic">Sin Categoría</span>}
                            </div>
                            <div className="w-24 shrink-0">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${totalStock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {totalStock} stock
                              </span>
                            </div>
                            <div className="w-24 shrink-0 text-gray-500 text-sm">{hasVariants ? '-' : (p.costPrice ? `$${Number(p.costPrice).toFixed(2)}` : '-')}</div>
                            <div className="w-24 shrink-0 font-bold text-gray-800 text-sm">{hasVariants ? '-' : `$${Number(p.price || 0).toFixed(2)}`}</div>
                            <div className="w-24 shrink-0 text-sm font-semibold">
                              {hasVariants ? '-' : margin !== null ? <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>{margin >= 0 ? '+' : ''}${margin.toFixed(2)}</span> : '-'}
                            </div>
                            
                            <div className="w-20 shrink-0 flex justify-end gap-1 transition-opacity">
                              <button onClick={() => handleEditProduct(p)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Edit size={16}/></button>
                              <button onClick={() => handleDeleteProduct(p.id)} disabled={deletingId === `prod-${p.id}`} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md">
                                {deletingId === `prod-${p.id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16}/>}
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Nivel 3: Variaciones */}
                        {isExpandedProd && hasVariants && (
                          <div className="bg-gray-50/50 pl-28 pr-6 py-3 border-t border-gray-50">
                            <table className="w-full text-sm">
                              <thead className="text-gray-400 text-xs uppercase font-bold border-b border-gray-200">
                                <tr>
                                  <th className="pb-2 text-left font-semibold">Variación</th>
                                  <th className="pb-2 text-left font-semibold">Stock</th>
                                  <th className="pb-2 text-left font-semibold">Costo Unit.</th>
                                  <th className="pb-2 text-left font-semibold">Precio Venta</th>
                                  <th className="pb-2 text-left font-semibold">Ganancia</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.variants.map(v => {
                                  const vMargin = getMargin(v.price, v.costPrice);
                                  return (
                                    <tr key={v.id} className="border-b border-gray-100/50 last:border-0">
                                      <td className="py-2.5 flex items-center gap-3">
                                        {v.imageUrl && <img src={import.meta.env.DEV ? `http://localhost:3001${v.imageUrl}` : `${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${v.imageUrl}`} className="w-7 h-7 rounded object-cover border" alt={v.name} />}
                                        <span className="font-semibold text-gray-700">{v.name}</span>
                                      </td>
                                      <td className="py-2.5 text-gray-600 text-xs">{v.stock}</td>
                                      <td className="py-2.5 text-gray-500 text-xs">{v.costPrice ? `$${Number(v.costPrice).toFixed(2)}` : '-'}</td>
                                      <td className="py-2.5 font-bold text-gray-800 text-xs">${Number(v.price).toFixed(2)}</td>
                                      <td className="py-2.5 text-xs font-bold">
                                        {vMargin !== null ? <span className={vMargin >= 0 ? 'text-green-600' : 'text-red-600'}>{vMargin >= 0 ? '+' : ''}${vMargin.toFixed(2)}</span> : '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inventory;
