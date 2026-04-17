import { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Save, UserCircle, BriefcaseMedical, Building2, FileText, Phone, Award, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

interface ProfileProps {
  user: User;
  onProfileUpdate: (user: User) => void;
}

export default function Profile({ user, onProfileUpdate }: ProfileProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    bio: user.bio || '',
    // Doctor
    dni: user.dni || '',
    license_number: user.license_number || '',
    jurisdiction: user.jurisdiction || '',
    specialty: user.specialty || '',
    // Clinic
    cuit: user.cuit || '',
    address: user.address || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        name: formData.name,
        phone: formData.phone,
        bio: formData.bio,
        ...(user.role === 'doctor' ? {
          dni: formData.dni,
          license_number: formData.license_number,
          jurisdiction: formData.jurisdiction,
          specialty: formData.specialty
        } : {
          cuit: formData.cuit,
          address: formData.address
        })
      };

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Perfil actualizado correctamente');
      if (data) {
        onProfileUpdate(data as User);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <UserCircle className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600">
            {user.role === 'doctor' ? 'Completá tu CV para destacar en tus postulaciones' : 'Completá los datos de la institución para dar más confianza a los profesionales'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <UserCircle className="w-5 h-5 text-gray-500" />
              Información Básica
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo / Razón Social *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50 bg-opacity-50" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-xs text-gray-400 font-normal">(No modificable)</span></label>
                <input 
                  type="email" 
                  value={user.email} 
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> Teléfono</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  placeholder="Ej: +54 11 1234 5678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              {user.role === 'doctor' ? <BriefcaseMedical className="w-5 h-5 text-gray-500" /> : <Building2 className="w-5 h-5 text-gray-500" />}
              {user.role === 'doctor' ? 'Datos Profesionales' : 'Datos Institucionales'}
            </h3>
            
            {user.role === 'doctor' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad Principal *</label>
                  <input 
                    type="text" 
                    name="specialty" 
                    value={formData.specialty} 
                    onChange={handleChange}
                    required
                    placeholder="Ej: Pediatría, Med. General"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input 
                    type="text" 
                    name="dni" 
                    value={formData.dni} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Award className="w-3.5 h-3.5 text-gray-500" /> Matrícula Nº</label>
                  <input 
                    type="text" 
                    name="license_number" 
                    value={formData.license_number} 
                    onChange={handleChange}
                    placeholder="Ej: MN 12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdicción (Provincia/Nacional)</label>
                  <input 
                    type="text" 
                    name="jurisdiction" 
                    value={formData.jurisdiction} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                  <input 
                    type="text" 
                    name="cuit" 
                    value={formData.cuit} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección / Link Google Maps</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange}
                    placeholder="Ej: Av. Rivadavia 123, CABA (o enlace a Maps)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>
            )}
            
            <div className="pt-2">
               <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                 <FileText className="w-4 h-4 text-gray-500"/>
                 {user.role === 'doctor' ? 'Tu CV (Añadí tu experiencia académica y laboral aquí)' : 'Descripción de la Institución'}
               </label>
               <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder={user.role === 'doctor' 
                    ? "Presentate brevemente. Ej: Médico especialista en Emergentología egresado de UBA. 5 años de experiencia en servicios de emergencias..." 
                    : "Describe las instalaciones, servicios y tipo de atención que brindan..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
               />
               <p className="text-xs text-gray-500 mt-1">Este texto será clave para que te conozcan en las postulaciones.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
            <button
               type="button"
               onClick={() => navigate(user.role === 'doctor' ? '/doctor' : '/clinic')}
               className="text-gray-600 hover:text-gray-900 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium bg-white transition-colors"
            >
               Volver al Dashboard
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
