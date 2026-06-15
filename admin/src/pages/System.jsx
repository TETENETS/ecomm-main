import React, { useState, useEffect } from 'react';
import { Save, Mail, Loader2, Server, Activity, LayoutTemplate, CheckCircle, XCircle } from 'lucide-react';
import api from '../api';
import Logs from './Logs';

const System = () => {
  const [systemTab, setSystemTab] = useState('SMTP');
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: 'no-reply@mi-tienda.com',
    alert_emails: '',
    enable_template_new_order: 'false',
    template_new_order: '<h1>¡Gracias por tu pedido, {{customerName}}!</h1>\\n<p>Tu orden <b>#{{orderId}}</b> está siendo procesada.</p>\\n<p>Total: <b>\${{totalAmount}}</b></p>',
    enable_template_payment_due: 'false',
    template_payment_due: '<h1>Aviso de Vencimiento</h1>\\n<p>Hola {{customerName}}, te recordamos que el pago de <b>\${{amount}}</b> vence el {{dueDate}}.</p>',
    enable_template_payment_validated: 'false',
    template_payment_validated: '<h1>¡Pago Confirmado!</h1>\\n<p>Hola {{customerName}}, hemos validado el pago de tu orden <b>#{{orderId}}</b>.</p>',
    manual_bcv_rate: '',
  });
  
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data && Object.keys(res.data).length > 0) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (e) {
      console.error('Error fetching settings', e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      alert('Configuraciones guardadas exitosamente.');
    } catch (e) {
      alert('Error al guardar configuraciones.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return alert('Por favor ingresa un correo para la prueba.');
    setLoading(true);
    try {
      const res = await api.post('/test-alert', {
        type: 'TEST_EMAIL',
        payload: { email: testEmail }
      });
      alert(res.data.message || 'Correo de prueba enviado.');
    } catch (e) {
      alert('Error enviando correo de prueba. Revisa los registros.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Server className="text-blue-600" /> Sistema
        </h1>
      </div>

      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button onClick={() => setSystemTab('SMTP')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${systemTab === 'SMTP' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <div className="flex items-center gap-2"><Mail size={16} /> Servidor SMTP</div>
        </button>
        <button onClick={() => setSystemTab('LOGS')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${systemTab === 'LOGS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <div className="flex items-center gap-2"><Activity size={16} /> Registros y Alertas</div>
        </button>
        <button onClick={() => setSystemTab('TEMPLATES')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${systemTab === 'TEMPLATES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <div className="flex items-center gap-2"><LayoutTemplate size={16} /> Plantillas HTML</div>
        </button>
      </div>

      {systemTab === 'SMTP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SMTP CONFIGURATION */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Mail size={18} className="text-blue-500" /> Servidor de Correo (SMTP)
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Host SMTP</label>
                  <input required value={settings.smtp_host} onChange={e => setSettings({...settings, smtp_host: e.target.value})} placeholder="smtp.gmail.com" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Puerto</label>
                  <input required type="number" value={settings.smtp_port} onChange={e => setSettings({...settings, smtp_port: e.target.value})} placeholder="587" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seguridad (SSL/TLS)</label>
                <select value={settings.smtp_secure} onChange={e => setSettings({...settings, smtp_secure: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none">
                  <option value="false">Falso (STARTTLS/Puerto 587)</option>
                  <option value="true">Verdadero (SSL/Puerto 465)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuario</label>
                  <input required type="text" value={settings.smtp_user} onChange={e => setSettings({...settings, smtp_user: e.target.value})} placeholder="usuario@gmail.com" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña</label>
                  <input required type="password" value={settings.smtp_pass} onChange={e => setSettings({...settings, smtp_pass: e.target.value})} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email de Remitente (From)</label>
                <input required type="email" value={settings.smtp_from} onChange={e => setSettings({...settings, smtp_from: e.target.value})} placeholder="ventas@mitienda.com" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emails para Alertas del Sistema</label>
                <p className="text-xs text-gray-400 mb-2">Ingresa los correos que recibirán notificaciones (separados por coma)</p>
                <input type="text" value={settings.alert_emails || ''} onChange={e => setSettings({...settings, alert_emails: e.target.value})} placeholder="admin@tienda.com, ventas@tienda.com" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tasa BCV Manual (Emergencia)</label>
                <p className="text-xs text-gray-400 mb-2">Ingresa un valor para forzar la tasa de cambio en toda la tienda. Deja en blanco o "0" para usar las APIs automáticas de BCV.</p>
                <input type="number" step="0.01" value={settings.manual_bcv_rate || ''} onChange={e => setSettings({...settings, manual_bcv_rate: e.target.value})} placeholder="Ej: 50.00" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={saving} className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar Credenciales
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* PROBAR CONEXIÓN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              Prueba de Conexión
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Envía un correo de prueba para verificar que las credenciales SMTP estén funcionando correctamente.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email de Destino</label>
              <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="tu-correo@gmail.com" className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none" />
            </div>
            <button onClick={handleTestEmail} disabled={loading || !testEmail} className="w-full bg-gray-100 text-gray-700 font-bold px-5 py-2.5 rounded-xl hover:bg-gray-200 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Enviar Correo de Prueba
            </button>
          </div>
        </div>
        </div>
      )}

      {systemTab === 'TEMPLATES' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <LayoutTemplate size={18} className="text-purple-500" /> Plantillas de Correos a Clientes
            </h2>
            <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 text-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar Plantillas
            </button>
          </div>
          <div className="p-6 space-y-8">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
              <p className="font-bold mb-2">Variables disponibles (puedes copiarlas y pegarlas en cualquier plantilla):</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code>{`{{customerName}}`}</code> - Nombre del cliente</li>
                <li><code>{`{{customerPhone}}`}</code> - Teléfono del cliente</li>
                <li><code>{`{{locationAddress}}`}</code> - Dirección de envío</li>
                <li><code>{`{{orderId}}`}</code> - Número de orden</li>
                <li><code>{`{{totalAmount}}`}</code> - Total de la orden ($)</li>
                <li><code>{`{{totalAmountBs}}`}</code> - Total de la orden (Bs)</li>
                <li><code>{`{{bcvRate}}`}</code> - Tasa de cambio BCV aplicada al momento de la compra</li>
                <li><code>{`{{itemsList}}`}</code> - Lista de productos y variantes comprados (en formato HTML)</li>
                <li><code>{`{{amount}}`}</code> - Monto a pagar (solo para Aviso de Vencimiento)</li>
                <li><code>{`{{dueDate}}`}</code> - Fecha de vencimiento (solo para Aviso de Vencimiento)</li>
              </ul>
              <p className="mt-2 text-xs opacity-80">El sistema reemplazará automáticamente estas variables por los datos reales al enviar el correo.</p>
            </div>

            {/* Template: Nueva Orden */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800">Confirmación de Nueva Orden</h3>
                <button onClick={() => setSettings({...settings, enable_template_new_order: settings.enable_template_new_order === 'true' ? 'false' : 'true'})} 
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${settings.enable_template_new_order === 'true' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {settings.enable_template_new_order === 'true' ? <><CheckCircle size={14}/> Activada</> : <><XCircle size={14}/> Desactivada</>}
                </button>
              </div>
              <textarea value={settings.template_new_order || ''} onChange={e => setSettings({...settings, template_new_order: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-700" placeholder="Código HTML..."></textarea>
            </div>

            {/* Template: Aviso de Vencimiento */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800">Recordatorio de Pago Pendiente (Cuentas por Cobrar)</h3>
                <button onClick={() => setSettings({...settings, enable_template_payment_due: settings.enable_template_payment_due === 'true' ? 'false' : 'true'})} 
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${settings.enable_template_payment_due === 'true' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {settings.enable_template_payment_due === 'true' ? <><CheckCircle size={14}/> Activada</> : <><XCircle size={14}/> Desactivada</>}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">Variables útiles: <code>{`{{customerName}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{dueDate}}`}</code></p>
              <textarea value={settings.template_payment_due || ''} onChange={e => setSettings({...settings, template_payment_due: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-700" placeholder="Código HTML..."></textarea>
            </div>

            {/* Template: Pago Validado */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800">Pago Validado</h3>
                <button onClick={() => setSettings({...settings, enable_template_payment_validated: settings.enable_template_payment_validated === 'true' ? 'false' : 'true'})} 
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${settings.enable_template_payment_validated === 'true' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {settings.enable_template_payment_validated === 'true' ? <><CheckCircle size={14}/> Activada</> : <><XCircle size={14}/> Desactivada</>}
                </button>
              </div>
              <textarea value={settings.template_payment_validated || ''} onChange={e => setSettings({...settings, template_payment_validated: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-700" placeholder="Código HTML..."></textarea>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <LayoutTemplate size={18} className="text-orange-500" /> Plantillas de Alertas del Sistema (Administrador)
              </h2>
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-sm text-orange-800 mb-6">
                <p className="font-bold mb-2">Variables disponibles para alertas:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code>{`{{alertMessage}}`}</code> - Mensaje de la alerta enviado por el sistema</li>
                  <li><code>{`{{productName}}`}</code> - Nombre del producto (Solo Stock)</li>
                  <li><code>{`{{stock}}`}</code> - Cantidad de stock (Solo Stock)</li>
                  <li><code>{`{{orderId}}`}</code> - Número de orden (Solo Órdenes)</li>
                  <li><code>{`{{customerName}}`}</code> - Nombre del cliente</li>
                  <li><code>{`{{total}}`}</code> o <code>{`{{amount}}`}</code> - Monto</li>
                  <li><code>{`{{dueDate}}`}</code> - Fecha de vencimiento (Solo Cobros)</li>
                </ul>
              </div>

              {/* Template Admin: Stock Bajo */}
              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-gray-800 mb-3">Alerta de Stock Bajo</h3>
                <textarea value={settings.template_admin_low_stock || ''} onChange={e => setSettings({...settings, template_admin_low_stock: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-700" placeholder="Deja vacío para usar la plantilla por defecto. Código HTML..."></textarea>
              </div>

              {/* Template Admin: Nueva Orden */}
              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-gray-800 mb-3">Alerta de Nueva Orden Recibida</h3>
                <textarea value={settings.template_admin_new_order || ''} onChange={e => setSettings({...settings, template_admin_new_order: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-700" placeholder="Deja vacío para usar la plantilla por defecto. Código HTML..."></textarea>
              </div>

              {/* Template Admin: Vencimiento Próximo */}
              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-gray-800 mb-3">Alerta de Vencimiento Próximo</h3>
                <textarea value={settings.template_admin_due_soon || ''} onChange={e => setSettings({...settings, template_admin_due_soon: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-700" placeholder="Deja vacío para usar la plantilla por defecto. Código HTML..."></textarea>
              </div>

              {/* Template Admin: Vencimiento Hoy */}
              <div className="border border-gray-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-gray-800 mb-3">Alerta de Vencimiento de Pago HOY</h3>
                <textarea value={settings.template_admin_due_today || ''} onChange={e => setSettings({...settings, template_admin_due_today: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-700" placeholder="Deja vacío para usar la plantilla por defecto. Código HTML..."></textarea>
              </div>
            </div>

          </div>
        </div>
      )}

      {systemTab === 'LOGS' && (
        <Logs isEmbedded={true} />
      )}
    </div>
  );
};

export default System;
