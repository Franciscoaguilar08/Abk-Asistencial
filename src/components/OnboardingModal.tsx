import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ShieldCheck, ChevronRight, CheckCircle2, FileCheck2, Building2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
  onLogout?: () => void;
}

export default function OnboardingModal({ user, onComplete, onLogout }: OnboardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    dni: '',
    license_number: '',
    jurisdiction: '',
    specialty: '',
    cuit: user.cuit || '',
    no_cuit: user.cuit === 'N/A',
    bio: '',
    linkedin_url: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatePayload: any = {
        name: formData.name || null,
        bio: formData.bio || null,
        linkedin_url: formData.linkedin_url || null,
        verification_status: 'verified', // Auto-verify in Beta Phase for now
      };

      if (user.role === 'doctor') {
        updatePayload.dni = formData.dni || null;
        updatePayload.license_number = formData.license_number || null;
        updatePayload.jurisdiction = formData.jurisdiction || null;
        updatePayload.specialty = formData.specialty || null;
      } else {
        updatePayload.cuit = formData.no_cuit ? 'N/A' : (formData.cuit || null);
      }

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;

      toast.success('¡Perfil activado! Ya podés acceder a la plataforma.');
      onComplete(data as User);
    } catch (error: any) {
      console.error('Error submitting data:', error);
      toast.error(`Error al enviar los datos del perfil: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-[100] px-4 text-gray-900">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-lg relative border border-gray-100">
        <div className="mb-8 flex gap-5 items-start">
          <div className={`p-4 rounded-2xl shrink-0 ${user.role === 'doctor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
            {user.role === 'doctor' ? <FileCheck2 className="w-10 h-10" /> : <Building2 className="w-10 h-10" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Completá tu perfil</h2>
            <p className="text-gray-500 mt-2 leading-relaxed text-sm">
              {user.role === 'doctor' 
                ? 'Necesitamos tus datos profesionales para que las instituciones puedan contratarte de forma segura.'
                : 'Identificá tu institución para poder publicar y gestionar tus búsquedas médicas.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {user.role === 'doctor' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Nombre Completo</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">DNI</label>
                  <input required type="number" name="dni" value={formData.dni} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Especialidad</label>
                  <input required type="text" name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Ej: Pediatría" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Matrícula (M.N. / M.P.)</label>
                  <input required type="text" name="license_number" value={formData.license_number} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Jurisdicción</label>
                  <select required name="jurisdiction" value={formData.jurisdiction} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow">
                    <option value="">Seleccionar...</option>
                    <option value="Nacional">Nacional (M.N.)</option>
                    <option value="Buenos Aires">Provincia de Buenos Aires</option>
                    <option value="CABA">CABA</option>
                    <option value="Cordoba">Córdoba</option>
                    <option value="Santa Fe">Santa Fe</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">LinkedIn (Opcional)</label>
                <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/tu-perfil" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                  {user.role === 'doctor' ? 'Resumen Profesional (Mini-CV)' : 'Descripción de la Institución'}
                </label>
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  placeholder={user.role === 'doctor' ? "Ej: Médico especialista con 5 años de experiencia..." : "Ej: Clínica de atención primaria..."}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow min-h-[100px]"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Razón Social o Nombre Público</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="block text-sm font-semibold text-gray-700">CUIT (Sin guiones)</label>
                  <label className="flex items-center gap-1.5 text-xs text-blue-600 font-bold cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="no_cuit" 
                      checked={formData.no_cuit} 
                      onChange={handleChange} 
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    No tengo CUIT
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
                  className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${formData.no_cuit ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'}`} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">LinkedIn o Web (Opcional)</label>
                <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/company/tu-institucion" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Descripción de la Institución</label>
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  placeholder="Describe brevemente la institución..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow min-h-[100px]"
                />
              </div>
            </>
          )}

          <div className="pt-6 space-y-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Completar perfil y entrar'}
              {!loading && <ChevronRight className="w-5 h-5" />}
            </button>

            {onLogout && (
              <button 
                type="button" 
                onClick={onLogout}
                className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
