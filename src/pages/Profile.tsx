import { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Save, UserCircle, BriefcaseMedical, Building2, FileText, Phone, Award, ShieldAlert, Calendar, Upload, FileUp, ExternalLink, Trash2, ShieldCheck, Image as ImageIcon, ChevronLeft } from 'lucide-react';
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
    availability: user.availability || '',
    cv_url: user.cv_url || '',
    license_image_url: user.license_image_url || '',
    affidavit_accepted: user.affidavit_accepted || false,
    // Clinic
    cuit: user.cuit === 'N/A' ? '' : (user.cuit || ''),
    no_cuit: user.cuit === 'N/A',
    address: user.address || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        name: formData.name,
        phone: formData.phone,
        bio: formData.bio,
        availability: formData.availability,
        ...(user.role === 'doctor' ? {
          dni: formData.dni,
          license_number: formData.license_number,
          jurisdiction: formData.jurisdiction,
          specialty: formData.specialty,
          cv_url: formData.cv_url,
          license_image_url: formData.license_image_url,
          affidavit_accepted: formData.affidavit_accepted,
        } : {
          cuit: formData.no_cuit ? 'N/A' : formData.cuit,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('El archivo es demasiado grande (máx 5MB)');
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `cvs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, cv_url: publicUrl }));
      toast.success('CV subido correctamente. No olvides guardar los cambios del perfil.');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  const removeCv = () => {
    setFormData(prev => ({ ...prev, cv_url: '' }));
  };

  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Solo se permiten imágenes (JPG, PNG) o PDF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máx 5MB)');
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-license-${Math.random()}.${fileExt}`;
      const filePath = `verifications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cvs') // Reusing cvs bucket for simplicity, or we can suggest creating 'verifications'
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, license_image_url: publicUrl }));
      toast.success('Captura de matrícula subida correctamente.');
    } catch (error) {
      console.error('Error uploading license:', error);
      toast.error('Error al subir la captura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          to="/" 
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>
      </div>

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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" /> Disponibilidad Horaria / Días
                  </label>
                  <input 
                    type="text" 
                    name="availability" 
                    value={formData.availability} 
                    onChange={handleChange}
                    placeholder="Ej: Sábados todo el día, Lunes a Viernes de 18 a 22hs..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>

                {/* Nueva Sección: Validación de Matrícula Digital */}
                <div className="md:col-span-2 space-y-4 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-gray-900">Certificación de Matrícula <span className="text-blue-600 ml-2 text-xs font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Opcional en Beta</span></h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Aunque estamos en <strong>Fase Beta</strong> y tu cuenta ya está activa, podés ir cargando la captura de tu <strong>Matrícula Digital</strong> (app Mi Argentina) para ir completando tu perfil profesional oficial.
                  </p>

                  {formData.license_image_url ? (
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-600 text-white p-2 rounded-lg">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-green-900">Captura de Matrícula Cargada</p>
                          <a href={formData.license_image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline flex items-center gap-1">
                            Ver imagen <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, license_image_url: '' }))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 transition-colors hover:border-blue-200 hover:bg-blue-50/10 group">
                      <input 
                        type="file" 
                        accept="image/*,.pdf"
                        onChange={handleLicenseUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading}
                      />
                      <div className="flex flex-col items-center gap-2 text-center text-gray-500 group-hover:text-blue-600">
                        <ImageIcon className="w-8 h-8 opacity-40 group-hover:opacity-100" />
                        <div>
                          <p className="text-sm font-bold">Subir captura de Mi Argentina</p>
                          <p className="text-xs">Imagen o PDF (máx 5MB)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="affidavit_accepted"
                        checked={formData.affidavit_accepted}
                        onChange={handleChange}
                        required
                        className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-xs text-amber-900 leading-relaxed font-medium">
                        <strong>Declaración Jurada:</strong> Declaro bajo juramento que los datos aportados en mi perfil y la documentación adjunta son verídicos. 
                        Entiendo que la falsificación de estos datos puede derivar en la suspensión definitiva de la cuenta y acciones legales correspondientes.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3 pt-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                    <FileUp className="w-4 h-4 text-gray-500" /> Tu CV en PDF
                  </label>
                  
                  {formData.cv_url ? (
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-900">CV_Cargado.pdf</p>
                          <a href={formData.cv_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            Ver actual <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={removeCv}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-8 transition-colors hover:border-blue-200 hover:bg-blue-50/10 group">
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading}
                      />
                      <div className="flex flex-col items-center gap-2 text-center text-gray-500 group-hover:text-blue-600">
                        <Upload className="w-8 h-8 opacity-40 group-hover:opacity-100" />
                        <div>
                          <p className="text-sm font-bold">Haz clic para subir tu CV</p>
                          <p className="text-xs">Solo formato PDF (máx 5MB)</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">CUIT</label>
                    <label className="flex items-center gap-1.5 text-xs text-blue-600 font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="no_cuit" 
                        checked={formData.no_cuit} 
                        onChange={handleChange} 
                        className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      No aplica
                    </label>
                  </div>
                  <input 
                    type="text" 
                    name="cuit" 
                    value={formData.no_cuit ? '' : formData.cuit} 
                    onChange={handleChange}
                    disabled={formData.no_cuit}
                    placeholder={formData.no_cuit ? "No aplica verificación por CUIT" : "Ej: 30112233445"}
                    className={cn(
                      "w-full px-3 py-2 border rounded-md outline-none transition-all",
                      formData.no_cuit 
                        ? "bg-gray-100 text-gray-400 border-gray-200" 
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    )} 
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
                 {user.role === 'doctor' ? 'Resumen Profesional (Mini-CV)' : 'Descripción de la Institución'}
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
