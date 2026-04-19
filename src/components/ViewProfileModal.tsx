import { X, UserCircle, Phone, Mail, Award, MapPin, Building2, BriefcaseMedical, Calendar, FileText, ExternalLink, Activity } from 'lucide-react';
import { User, Shift } from '../types';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ViewProfileModalProps {
  user: User;
  onClose: () => void;
}

export default function ViewProfileModal({ user, onClose }: ViewProfileModalProps) {
  const [clinicShifts, setClinicShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  useEffect(() => {
    if (user.role === 'clinic') {
      fetchClinicShifts();
    }
  }, [user.id]);

  const fetchClinicShifts = async () => {
    setLoadingShifts(true);
    try {
      const { data } = await supabase
        .from('shifts')
        .select('*')
        .eq('clinic_id', user.id)
        .eq('status', 'open')
        .order('date', { ascending: true });
      
      if (data) setClinicShifts(data as Shift[]);
    } catch (err) {
      console.error("Error fetching clinic shifts:", err);
    } finally {
      setLoadingShifts(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            {user.role === 'doctor' ? <BriefcaseMedical className="w-5 h-5 text-blue-600" /> : <Building2 className="w-5 h-5 text-purple-600" />}
            Perfil {user.role === 'doctor' ? 'Profesional' : 'Institucional'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="flex items-start gap-4 mb-6">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
            ) : (
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${user.role === 'doctor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                <UserCircle className="w-10 h-10" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              {user.specialty && <p className="text-blue-700 font-medium text-sm">{user.specialty}</p>}
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                {user.rating ? (
                  <span className="text-yellow-600 font-medium flex items-center gap-1">★ {user.rating.toFixed(1)}</span>
                ) : (
                  <span className="text-gray-400 font-medium flex items-center gap-1">★ Nuevo</span>
                )}
                {user.completion_rate && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">{user.completion_rate}% Cumplimiento</span>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {user.bio && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Acerca de</h3>
                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                  {user.bio}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {user.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>
                </div>
              )}
              {user.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                  </div>
                </div>
              )}
              {user.role === 'doctor' && user.license_number && (
                <div className="flex items-start gap-2">
                  <Award className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Matrícula</p>
                    <p className="text-sm font-medium text-gray-900">{user.license_number} {user.jurisdiction && `(${user.jurisdiction})`}</p>
                  </div>
                </div>
              )}
              {user.role === 'clinic' && user.address && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Dirección</p>
                    <p className="text-sm font-medium text-gray-900">{user.address}</p>
                  </div>
                </div>
              )}
              {user.role === 'clinic' && user.cuit && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">CUIT</p>
                    <p className="text-sm font-medium text-gray-900">{user.cuit === 'N/A' ? 'No aplica' : user.cuit}</p>
                  </div>
                </div>
              )}
              {user.availability && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Disponibilidad</p>
                    <p className="text-sm font-medium text-gray-900">{user.availability}</p>
                  </div>
                </div>
              )}
            </div>

            {user.role === 'doctor' && user.cv_url && (
              <div className="pt-4 mt-4 border-t border-gray-100">
                <a 
                  href={user.cv_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  <FileText className="w-5 h-5" />
                  Ver CV completo (PDF)
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {user.role === 'clinic' && (
              <div className="pt-4 mt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Propuestas Activas</h3>
                {loadingShifts ? (
                  <p className="text-sm text-gray-400">Cargando propuestas...</p>
                ) : clinicShifts.length > 0 ? (
                  <div className="space-y-3">
                    {clinicShifts.map(s => (
                      <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-gray-900">{s.specialty}</p>
                          <span className="text-xs font-bold text-blue-600">${s.price.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 text-xs mt-2">
                           <span className="flex items-center gap-1 capitalize"><Calendar className="w-3 h-3" /> {format(new Date(s.date), 'dd/MM', { locale: es })}</span>
                           <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.zone}</span>
                           <span className="flex items-center gap-1 opacity-75">{s.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Esta institución no tiene propuestas abiertas actualmente.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
