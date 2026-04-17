import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { Users, Activity, Calendar, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminDashboardProps {
  currentUser: User | null;
}

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Reemplaza esto con tu correo exacto de administrador
  const ADMIN_EMAIL = 'franciscoaguilar008@gmail.com';

  useEffect(() => {
    if (currentUser?.email === ADMIN_EMAIL) {
      fetchAdminData();
    }
  }, [currentUser]);

  const fetchAdminData = async () => {
    try {
      const [usersResponse, shiftsResponse] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('shifts').select('*').order('created_at', { ascending: false })
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (shiftsResponse.error) throw shiftsResponse.error;

      setUsers(usersResponse.data as User[]);
      setShifts(shiftsResponse.data as Shift[]);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
    // Si no es el admin, lo pateamos al inicio sin decirle que existe esta ruta
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div className="py-12 text-center">Cargando panel de Dios...</div>;
  }

  const doctors = users.filter(u => u.role === 'doctor');
  const clinics = users.filter(u => u.role === 'clinic');
  const activeShifts = shifts.filter(s => s.status === 'open');
  const confirmedShifts = shifts.filter(s => s.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex items-center gap-4">
        <ShieldAlert className="w-10 h-10 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold">Modo Desarrollador (God Mode)</h1>
          <p className="text-slate-400">Vista global del sistema. Invisible para usuarios normales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-700">Total Usuarios</h3>
          </div>
          <p className="text-3xl font-bold">{users.length}</p>
          <p className="text-sm text-gray-500 mt-1">{doctors.length} Profesionales | {clinics.length} Clínicas</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-700">Total Guardias</h3>
          </div>
          <p className="text-3xl font-bold">{shifts.length}</p>
          <p className="text-sm text-gray-500 mt-1">Histórico completo</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-700">Buscando Profesional</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{activeShifts.length}</p>
          <p className="text-sm text-gray-500 mt-1">En estado "open"</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-700">Guardias "Match"</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">{confirmedShifts.length}</p>
          <p className="text-sm text-gray-500 mt-1">Con profesional asignado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">Últimos Registros (Base de datos)</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {users.slice(0, 50).map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full ${u.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla de Guardias */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">Movimiento de Guardias</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {shifts.slice(0, 50).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{s.specialty} en {s.clinic_name}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                    <span>{format(new Date(s.date), "dd/MM/yyyy")}</span>
                    <span>•</span>
                    <span>Postulantes: {s.applicants?.length || 0}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full ${s.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
