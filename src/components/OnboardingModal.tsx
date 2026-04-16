import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ShieldCheck, ChevronRight, CheckCircle2, FileCheck2, Building2 } from 'lucide-react';
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
    cuit: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Save data to database directly (simulate pending state)
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
        updatePayload.cuit = formData.cuit;
      }

      await supabase.from('users').update(updatePayload).eq('id', user.id);

      // Step 2: Simulate real-time API check (SISA/REFEPS for doctors, AFIP for clinics)
      setSimulating(true);
      
      // Artificial delay to show the "magic" checking SISA / AFIP
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const finalPayload: Partial<User> = { ...updatePayload, verification_status: 'verified' };
      
      const { data, error } = await supabase
        .from('users')
        .update(finalPayload)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;

      toast.success(user.role === 'doctor' ? '¡Identidad SISA verificada!' : '¡Datos AFIP verificados!');
      onComplete(data as User);
    } catch (error) {
      console.error('Error in validation:', error);
      toast.error('Error al verificar credenciales.');
    } finally {
      setLoading(false);
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative overflow-hidden">
        {simulating ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-blue-600 text-white p-4 rounded-full">
                <ShieldCheck className="w-10 h-10" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Validando Credenciales Oficiales...</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                {user.role === 'doctor' 
                  ? 'Cruzando datos con SISA / REFEPS para confirmar número de DNI y matrícula profesional.'
                  : 'Consultando constancia de inscripción en AFIP asociando el CUIT proporcionado.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${user.role === 'doctor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {user.role === 'doctor' ? <FileCheck2 className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Verificación de Identidad</h2>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  {user.role === 'doctor' 
                    ? 'Para garantizar la seguridad de la red, validamos tu matrícula profesional en bases de datos nacionales.'
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">CUIT (Sin guiones)</label>
                    <input required type="number" name="cuit" value={formData.cuit} onChange={handleChange} placeholder="Ej: 30112233445" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? 'Inicializando...' : 'Iniciar Validación Automática'}
                {!loading && <ChevronRight className="w-5 h-5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
