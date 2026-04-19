import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ShieldCheck, ChevronRight, CheckCircle2, FileCheck2, Building2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export default function OnboardingModal({ user, onComplete }: OnboardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    dni: '',
    license_number: '',
    jurisdiction: '',
    specialty: '',
    cuit: user.cuit || '',
    no_cuit: user.cuit === 'N/A',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatePayload: Partial<User> = {
        name: formData.name,
        verification_status: 'pending',
      };

      if (user.role === 'doctor') {
        updatePayload.dni = formData.dni;
        updatePayload.license_number = formData.license_number;
        updatePayload.jurisdiction = formData.jurisdiction;
        updatePayload.specialty = formData.specialty;
      } else {
        updatePayload.cuit = formData.no_cuit ? 'N/A' : formData.cuit;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;

      toast.success('¡Datos enviados correctamente! Tu perfil está siendo revisado.');
      onComplete(data as User);
    } catch (error) {
      console.error('Error submitting data:', error);
      toast.error('Error al enviar los datos para revisión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4 text-gray-900">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative overflow-hidden">
        {user.verification_status === 'pending' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="bg-yellow-100 text-yellow-600 p-4 rounded-full">
              <Clock className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Perfil en Revisión</h3>
              <p className="text-gray-600 leading-relaxed">
                Gracias por completar tus datos. {user.role === 'doctor' 
                  ? `Tu matrícula (${user.license_number})` 
                  : user.cuit === 'N/A' 
                    ? 'Tu perfil institucional' 
                    : `Tu CUIT (${user.cuit})`} está siendo verificado manualmente por nuestro equipo de seguridad. 
              </p>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-500 mt-4">
                Recibirás una notificación en tu correo cuando tu perfil sea aprobado para empezar a {user.role === 'doctor' ? 'postularte a guardias' : 'publicar oportunidades'}.
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="text-sm text-blue-600 font-semibold hover:underline"
            >
              Actualizar estado
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${user.role === 'doctor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
            {user.role === 'doctor' ? <FileCheck2 className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-xl font-bold">Validación de Datos</h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed text-left">
              {user.role === 'doctor' 
                ? 'Para garantizar la seguridad de la red, un administrador revisará tu matrícula profesional manualmente antes de permitirte postularte.'
                : 'Para publicar guardias, validamos la existencia legal de tu institución.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {user.role === 'doctor' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input required type="number" name="dni" value={formData.dni} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                  <input required type="text" name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Ej: Clínica Médica" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula (M.N. / M.P.)</label>
                  <input required type="text" name="license_number" value={formData.license_number} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdicción</label>
                  <select required name="jurisdiction" value={formData.jurisdiction} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Seleccionar...</option>
                    <option value="Nacional">Nacional (M.N.)</option>
                    <option value="Buenos Aires">Provincia de Buenos Aires</option>
                    <option value="CABA">CABA</option>
                    <option value="Cordoba">Córdoba</option>
                    <option value="Santa Fe">Santa Fe</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social o Nombre Público</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">CUIT (Sin guiones)</label>
                  <label className="flex items-center gap-1.5 text-xs text-blue-600 font-medium cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="no_cuit" 
                      checked={formData.no_cuit} 
                      onChange={handleChange} 
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    No aplico / No tengo
                  </label>
                </div>
                <input 
                  required={!formData.no_cuit} 
                  disabled={formData.no_cuit}
                  type="text" 
                  name="cuit" 
                  value={formData.no_cuit ? '' : formData.cuit} 
                  onChange={handleChange} 
                  placeholder={formData.no_cuit ? "No aplica verificación por CUIT" : "Ej: 30112233445"}
                  className={`w-full px-4 py-2 border rounded-xl outline-none transition-all ${formData.no_cuit ? 'bg-gray-50 text-gray-400 border-gray-200' : 'focus:ring-2 focus:ring-blue-500'}`} 
                />
              </div>
            </>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar para Revisión'}
              {!loading && <ChevronRight className="w-5 h-5" />}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-3 uppercase tracking-wider">Tus datos serán revisados manualmente por el equipo de ABK</p>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
