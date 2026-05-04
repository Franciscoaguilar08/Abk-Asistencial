import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users, Activity, Calendar, ShieldAlert, CheckCircle2,
  XCircle, Clock, Eye, ChevronDown, ChevronUp, Briefcase,
  Building2, Star, TrendingUp
} from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface AdminDashboardProps {
  currentUser: User | null;
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'shifts' | 'metrics'>('pending');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.email === ADMIN_EMAIL) {
      fetchAdminData();
    }
  }, [currentUser]);

  const fetchAdminData = async () => {
    try {
      const [usersRes, shiftsRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('shifts').select('*').order('created_at', { ascending: false }),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (shiftsRes.error) throw shiftsRes.error;
      setUsers(usersRes.data as User[]);
      setShifts(shiftsRes.data as Shift[]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error al cargar datos del panel');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error('No puedes eliminar tu propia cuenta de administrador');
      return;
    }
    if (!confirm('¿Seguro que querés eliminar este usuario? Se borrarán todos sus datos permanentemente.')) return;
    
    try {
      const { data, error } = await supabase.from('users').delete().eq('id', userId).select();
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('No se pudo eliminar el usuario. Verificá los permisos de RLS en Supabase.');
      }
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Usuario eliminado permanentemente');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('No se pudo eliminar el usuario');
    }
  };

  const handleVerify = async (userId: string, action: 'verified' | 'rejected') => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ verification_status: action })
        .eq('id', userId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar el usuario. Verificá los permisos de RLS en Supabase.');
      }

      // Send "Email" Notification (Foundation for future Edge Function/SendGrid integration)
      // In production, this would trigger an email via a Supabase Edge Function or Webhook.
      const user = users.find(u => u.id === userId);
      if (user) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: action === 'verified' ? '¡Cuenta verificada!' : 'Verificación rechazada',
          message: action === 'verified'
            ? 'Tu cuenta fue verificada correctamente. Ya podés empezar a postularte y operar en la red ABK Asistencial.'
            : 'Tu solicitud de verificación fue rechazada por inconsistencias en la documentación. Por favor, revisá tu perfil.',
          type: 'system',
        });
        
        console.log(`[Email Mock] Sending email to ${user.email}: Status ${action}`);
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, verification_status: action } : u));
      toast.success(action === 'verified' ? 'Usuario verificado ✓' : 'Usuario rechazado');
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('¿Seguro que querés eliminar esta guardia?')) return;
    try {
      const { data, error } = await supabase.from('shifts').delete().eq('id', shiftId).select();
      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No se pudo eliminar la guardia. Verificá los permisos de RLS en Supabase.');
      }

      setShifts(prev => prev.filter(s => s.id !== shiftId));
      toast.success('Guardia eliminada');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-500">
        <div className="bg-slate-900 h-24 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="flex gap-4 border-b border-gray-200">
          <Skeleton className="h-10 w-24 rounded-t-lg" />
          <Skeleton className="h-10 w-24 rounded-t-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.verification_status === 'pending');
  const verifiedUsers = users.filter(u => u.verification_status === 'verified');
  const doctors = users.filter(u => u.role === 'doctor');
  const clinics = users.filter(u => u.role === 'clinic');
  const openShifts = shifts.filter(s => s.status === 'open');
  const confirmedShifts = shifts.filter(s => s.status === 'confirmed');
  const completedShifts = shifts.filter(s => s.status === 'completed');
  const totalRevenue = completedShifts.reduce((acc, s) => acc + (s.price || 0), 0);

  const tabs = [
    { id: 'pending', label: 'Pendientes', count: pendingUsers.length, alert: pendingUsers.length > 0 },
    { id: 'users', label: 'Usuarios', count: users.length, alert: false },
    { id: 'shifts', label: 'Guardias', count: shifts.length, alert: false },
    { id: 'metrics', label: 'Métricas', count: null, alert: false },
  ] as const;

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ShieldAlert className="w-10 h-10 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-slate-400 text-sm">ABK Asistencial — vista privada</p>
          </div>
        </div>
        {pendingUsers.length > 0 && (
          <div className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-bold text-sm">
            {pendingUsers.length} esperando verificación
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Usuarios totales', value: users.length, sub: `${doctors.length} médicos · ${clinics.length} clínicas`, icon: Users, color: 'text-blue-500' },
          { label: 'Verificados', value: verifiedUsers.length, sub: `${pendingUsers.length} pendientes`, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Guardias activas', value: openShifts.length, sub: `${confirmedShifts.length} confirmadas`, icon: Calendar, color: 'text-indigo-500' },
          { label: 'Completadas', value: completedShifts.length, sub: `$${totalRevenue.toLocaleString('es-AR')} en guardias`, icon: TrendingUp, color: 'text-emerald-500' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-sm text-gray-500">{label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                tab.alert ? 'bg-yellow-400 text-slate-900' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingUsers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
              <p className="font-medium">No hay usuarios pendientes</p>
              <p className="text-sm">Todos los registros están procesados</p>
            </div>
          ) : (
            pendingUsers.map(u => (
              <div key={u.id} className="bg-white border border-yellow-200 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-yellow-50"
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${u.role === 'doctor' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                      {u.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{u.name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${u.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {u.role === 'doctor' ? 'Médico' : 'Clínica'}
                    </span>
                    <Clock className="w-4 h-4 text-yellow-500" />
                    {expandedUser === u.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {expandedUser === u.id && (
                  <div className="border-t border-yellow-100 p-4 bg-yellow-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                      {u.role === 'doctor' ? (
                        <>
                          <div><p className="text-gray-400 text-xs mb-1">DNI</p><p className="font-medium">{u.dni || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1">Matrícula</p><p className="font-medium">{u.license_number || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1">Jurisdicción</p><p className="font-medium">{u.jurisdiction || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1">Especialidad</p><p className="font-medium">{u.specialty || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1">Teléfono</p><p className="font-medium">{u.phone || '—'}</p></div>
                          <div className="md:col-span-2 mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100 italic text-xs">
                             {u.affidavit_accepted ? (
                               <div className="flex items-center gap-2 text-blue-700 font-bold">
                                 <CheckCircle2 className="w-3.5 h-3.5" /> 
                                 Declaración Jurada Firmada Digitalmente
                               </div>
                             ) : (
                               <div className="flex items-center gap-2 text-red-600 font-bold">
                                 <XCircle className="w-3.5 h-3.5" /> 
                                 Sin Declaración Jurada
                               </div>
                             )}
                          </div>
                          <div className="md:col-span-1 mt-2">
                             <p className="text-gray-400 text-xs mb-1">Matrícula (Mi Argentina)</p>
                             {u.license_image_url ? (
                               <a href={u.license_image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 transition-colors">
                                 <Eye className="w-3.5 h-3.5" /> Ver Captura
                               </a>
                             ) : (
                               <span className="text-xs text-red-500 font-medium italic">Pendiente de carga</span>
                             )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div><p className="text-gray-400 text-xs mb-1">CUIT</p><p className="font-medium">{u.cuit || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1">Dirección</p><p className="font-medium">{u.address || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1">Teléfono</p><p className="font-medium">{u.phone || '—'}</p></div>
                        </>
                      )}
                      <div><p className="text-gray-400 text-xs mb-1">Registrado</p><p className="font-medium">{u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy HH:mm", { locale: es }) : '—'}</p></div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVerify(u.id, 'verified')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleVerify(u.id, 'rejected')}
                        className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ml-auto"
                        title="Borrar definitivamente"
                      >
                        <XCircle className="w-4 h-4" />
                        Borrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Todos los usuarios ({users.length})</span>
            <p className="text-[10px] text-gray-400">Click en el usuario para ver detalles y documentos</p>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className={cn(
                "bg-white border rounded-xl overflow-hidden transition-all",
                expandedUser === u.id ? "border-blue-200 ring-1 ring-blue-50 shadow-sm" : "border-gray-100"
              )}>
                <div 
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.role === 'doctor' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                      {u.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      u.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                      u.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      u.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {u.verification_status === 'verified' ? 'Verificado' :
                       u.verification_status === 'pending' ? 'Pendiente' :
                       u.verification_status === 'rejected' ? 'Rechazado' : 'Sin verificar'}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                      className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                      title="Eliminar usuario definitivamente"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    {expandedUser === u.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {expandedUser === u.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-4 text-sm">
                      {u.role === 'doctor' ? (
                        <>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">DNI</p><p className="font-medium">{u.dni || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">Matrícula</p><p className="font-medium">{u.license_number || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">Jurisdicción</p><p className="font-medium">{u.jurisdiction || '—'}</p></div>
                          <div className="col-span-1">
                             <p className="text-gray-400 text-xs mb-1 font-bold italic">Documentación</p>
                             {u.license_image_url ? (
                               <a href={u.license_image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-[10px] font-black hover:bg-blue-700 transition-colors shadow-sm">
                                 <Eye className="w-3.5 h-3.5" /> VER MATRÍCULA
                               </a>
                             ) : (
                               <span className="text-[10px] text-red-500 font-bold italic uppercase">Matrícula no cargada</span>
                             )}
                          </div>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">Especialidad</p><p className="font-medium">{u.specialty || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">Socio ABK</p><p className="font-medium text-blue-600">{u.affidavit_accepted ? 'SÍ (DJ)' : 'NO'}</p></div>
                        </>
                      ) : (
                        <>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">CUIT</p><p className="font-medium">{u.cuit || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">Dirección</p><p className="font-medium">{u.address || '—'}</p></div>
                          <div><p className="text-gray-400 text-xs mb-1 font-bold">Tipo</p><p className="font-medium">{u.institution_type || '—'}</p></div>
                        </>
                      )}
                      <div><p className="text-gray-400 text-xs mb-1 font-bold">Teléfono</p><p className="font-medium">{u.phone || '—'}</p></div>
                      <div><p className="text-gray-400 text-xs mb-1 font-bold">Registrado</p><p className="font-medium">{u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy", { locale: es }) : '—'}</p></div>
                    </div>
                    
                    {u.verification_status !== 'verified' && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleVerify(u.id, 'verified')}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Aprobar Usuario
                        </button>
                        <button
                          onClick={() => handleVerify(u.id, 'rejected')}
                          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        >
                          <XCircle className="w-4 h-4" /> Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'shifts' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Todas las guardias ({shifts.length})</span>
          </div>
          <div className="divide-y divide-gray-50">
            {shifts.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.specialty} — {s.clinic_name}</p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{s.date ? format(new Date(s.date), "dd/MM/yyyy", { locale: es }) : '—'}</span>
                    <span>{s.start_time} → {s.end_time}</span>
                    <span>{s.zone}</span>
                    <span className="font-medium text-gray-600">${s.price?.toLocaleString('es-AR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{s.applicants?.length || 0} postulantes</span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    s.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    s.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    s.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {s.status}
                  </span>
                  <button
                    onClick={() => handleDeleteShift(s.id)}
                    className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Usuarios por estado
            </h3>
            {[
              { label: 'Verificados', value: verifiedUsers.length, color: 'bg-green-500' },
              { label: 'Pendientes', value: pendingUsers.length, color: 'bg-yellow-400' },
              { label: 'Rechazados', value: users.filter(u => u.verification_status === 'rejected').length, color: 'bg-red-400' },
              { label: 'Sin verificar', value: users.filter(u => !u.verification_status || u.verification_status === 'unverified').length, color: 'bg-gray-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3 mb-3">
                <div className="w-24 text-xs text-gray-500">{label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: users.length ? `${(value / users.length) * 100}%` : '0%' }} />
                </div>
                <div className="w-6 text-xs font-bold text-gray-700 text-right">{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" /> Guardias por estado
            </h3>
            {[
              { label: 'Abiertas', value: openShifts.length, color: 'bg-blue-500' },
              { label: 'Confirmadas', value: confirmedShifts.length, color: 'bg-green-500' },
              { label: 'Completadas', value: completedShifts.length, color: 'bg-gray-400' },
              { label: 'Canceladas', value: shifts.filter(s => s.status === 'cancelled').length, color: 'bg-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3 mb-3">
                <div className="w-24 text-xs text-gray-500">{label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: shifts.length ? `${(value / shifts.length) * 100}%` : '0%' }} />
                </div>
                <div className="w-6 text-xs font-bold text-gray-700 text-right">{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 md:col-span-2">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-500" /> Especialidades más demandadas
            </h3>
            {Object.entries(
              shifts.reduce((acc, s) => {
                acc[s.specialty] = (acc[s.specialty] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([specialty, count]) => (
                <div key={specialty} className="flex items-center gap-3 mb-3">
                  <div className="w-40 text-xs text-gray-500 truncate">{specialty}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(count / shifts.length) * 100}%` }} />
                  </div>
                  <div className="w-6 text-xs font-bold text-gray-700 text-right">{count}</div>
                </div>
              ))}
            {shifts.length === 0 && <p className="text-sm text-gray-400">Sin datos todavía</p>}
          </div>
        </div>
      )}
    </div>
  );
}