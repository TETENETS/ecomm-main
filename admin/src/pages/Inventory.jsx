import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Image as ImageIcon, Trash2, Edit, Package, ChevronDown, ChevronUp } from 'lucide-react';

const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState(null);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products", error);
    }
  };

  const addVariant = () => setVariants([...variants, { name: '', price: '', stock: '', image: null }]);
  
  const updateVariant = (index, field, value) => {
    const newVars = [...variants];
    newVars[index][field] = value;
    setVariants(newVars);
  };
  
  const removeVariant = (index) => {
    const newVars = [...variants];
    newVars.splice(index, 1);
    setVariants(newVars);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if(price) formData.append('price', price);
    if(stock) formData.append('stock', stock);
    if(image) formData.append('image', image);
    
    // For variants with images, it would require multiple file uploads. 
    // Simplified: we send variants as JSON, omitting their files for now in this iteration.
    // In a full implementation, you'd append variant images to formData and map them.
    if(variants.length > 0) {
      const variantsData = variants.map(v => ({ name: v.name, price: v.price, stock: v.stock }));
      formData.append('variants', JSON.stringify(variantsData));
    }

    try {
      await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      fetchProducts();
      // Reset form
      setName(''); setDescription(''); setPrice(''); setStock(''); setImage(null); setVariants([]);
    } catch (error) {
      alert("Error al crear producto");
    }
  };

  const toggleExpand = (id) => {
    setExpandedProduct(expandedProduct === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <Package className="text-blue-600" />
            Añadir Nuevo Producto
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Producto *</label>
                  <input required type="text" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Camisa de lino" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                  <textarea className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl h-32 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles del producto..."></textarea>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Imagen Principal</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-all cursor-pointer relative overflow-hidden group h-32">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setImage(e.target.files[0])} />
                    {image ? (
                      <div className="text-blue-600 font-bold flex items-center gap-2">
                        <ImageIcon size={24} /> {image.name}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon size={32} className="text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
                        <span className="text-sm font-medium">Haz clic o arrastra una imagen</span>
                      </div>
                    )}
                  </div>
                </div>

                {variants.length === 0 && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Precio ($) *</label>
                      <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={price} onChange={e => setPrice(e.target.value)} required={variants.length === 0} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Stock General *</label>
                      <input type="number" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={stock} onChange={e => setStock(e.target.value)} required={variants.length === 0} placeholder="0" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Variaciones (Tallas, Colores)</h3>
                  <p className="text-sm text-gray-500">Agrega variaciones si este producto tiene múltiples opciones con diferentes precios o inventarios.</p>
                </div>
                <button type="button" onClick={addVariant} className="bg-white border border-gray-300 text-gray-700 font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors text-sm">
                  + Añadir Variación
                </button>
              </div>
              
              {variants.length > 0 && (
                <div className="space-y-3">
                  {variants.map((v, i) => (
                    <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex-1 min-w-[200px]">
                        <input placeholder="Nombre Variante (Ej: Talla M - Rojo)" className="w-full border-none bg-gray-50 p-2.5 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} required/>
                      </div>
                      <div className="w-32">
                        <input placeholder="Precio ($)" type="number" step="0.01" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} required/>
                      </div>
                      <div className="w-24">
                        <input placeholder="Stock" type="number" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} required/>
                      </div>
                      {/* Placeholder for individual variant image upload */}
                      <button type="button" className="p-2.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors" title="Imagen específica para esta variante">
                         <ImageIcon size={20} />
                      </button>
                      <button type="button" onClick={() => removeVariant(i)} className="p-2.5 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" className="bg-green-600 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-green-700 transition-colors shadow-sm">
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-xs">
            <tr>
              <th className="p-4 px-6 w-12"></th>
              <th className="p-4">Producto</th>
              <th className="p-4">Stock Total</th>
              <th className="p-4">Precio (Venta)</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => {
              const totalStock = p.variants?.length > 0 
                ? p.variants.reduce((acc, curr) => acc + curr.stock, 0)
                : p.stock;
              const hasVariants = p.variants?.length > 0;
              const isExpanded = expandedProduct === p.id;

              return (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 px-6 text-center">
                      {hasVariants && (
                        <button onClick={() => toggleExpand(p.id)} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                          {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </button>
                      )}
                    </td>
                    <td className="p-4 flex items-center gap-4">
                      {p.imageUrl ? 
                        <img src={import.meta.env.DEV ? `http://localhost:3001${p.imageUrl}` : p.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-200" alt={p.name} /> 
                        : <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-300"><ImageIcon size={24}/></div>
                      }
                      <div>
                        <span className="font-bold text-gray-800 text-base">{p.name}</span>
                        {hasVariants && <p className="text-xs text-blue-600 font-semibold">{p.variants.length} Variaciones</p>}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${totalStock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {totalStock} unid.
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-700">
                      {hasVariants ? 'Múltiples' : `$${Number(p.price).toFixed(2)}`}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Variants Row */}
                  {isExpanded && hasVariants && (
                    <tr className="bg-gray-50/50">
                      <td colSpan="5" className="p-0 border-t border-gray-100">
                        <div className="py-4 pl-24 pr-6">
                          <table className="w-full text-sm">
                            <thead className="text-gray-400 text-xs uppercase font-bold border-b border-gray-200">
                              <tr>
                                <th className="pb-2 text-left">Variación</th>
                                <th className="pb-2 text-left">Stock</th>
                                <th className="pb-2 text-left">Precio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.variants.map(v => (
                                <tr key={v.id} className="border-b border-gray-100/50 last:border-0">
                                  <td className="py-3 font-semibold text-gray-700">{v.name}</td>
                                  <td className="py-3 text-gray-600">{v.stock}</td>
                                  <td className="py-3 font-bold text-green-600">${Number(v.price).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
