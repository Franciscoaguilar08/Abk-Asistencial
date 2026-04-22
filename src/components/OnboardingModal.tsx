import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ShieldCheck, ChevronRight, CheckCircle2, FileCheck2, Building2, Clock, Upload, Camera, ImageIcon, Phone, MapPin, Stethoscope, Plus, X, Award, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const ZONES = [
  'Palermo, CABA', 'Belgrano, CABA', 'Recoleta, CABA', 'Caballito, CABA', 'Almagro, CABA', 
  'Villa Urquiza, CABA', 'Villa Devoto, CABA', 'Flores, CABA', 'San Telmo, CABA', 'Puerto Madero, CABA',
  'Villa Crespo, CABA', 'Colegiales, CABA', 'Chacarita, CABA', 'Retiro, CABA', 'Barracas, CABA',
  'Paternal, CABA', 'Saavedra, CABA', 'Núñez, CABA', 
  'GBA Norte - San Isidro', 'GBA Norte - Vicente López', 'GBA Norte - Olivos', 'GBA Norte - Martínez', 'GBA Norte - Tigre', 'GBA Norte - Pilar',
  'GBA Sur - Avellaneda', 'GBA Sur - Quilmes', 'GBA Sur - Lomas de Zamora', 'GBA Sur - Lanús', 'GBA Sur - Adrogué',
  'GBA Oeste - Ramos Mejía', 'GBA Oeste - Haedo', 'GBA Oeste - Morón', 'GBA Oeste - Castelar', 'GBA Oeste - San Justo'
];

const SPECIALTIES = [
  'Pediatría', 'Clínica Médica', 'Terapia Intensiva', 'Deportología', 'Ginecología', 
  'Obstetricia', 'Traumatología', 'Cardiología', 'Dermatología', 'Psiquiatría', 
  'Neurología', 'Oftalmología', 'Otorrinolaringología', 'Urología', 'Gastroenterología', 
  'Endocrinología', 'Reumatología', 'Infectología', 'Hematología', 'Oncología', 
  'Nefrología', 'Neumonología', 'Cirugía General', 'Anestesiología', 'Medicina General', 
  'Emergentología', 'Diagnóstico por Imágenes', 'Kinesiología', 'Nutrición',
  'Bioquímica', 'Psicología', 'Odontología', 'Fonoaudiología'
];

interface OnboardingModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
  onLogout?: () => void;
}

export default function OnboardingModal({ user, onComplete, onLogout }: OnboardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: '',
    dni: '',
    license_number: '',
    jurisdiction: '',
    specialty: '',
    availability: '',
    cuit: user.cuit === 'N/A' ? '' : (user.cuit || ''),
    no_cuit: user.cuit === 'N/A',
    address: '',
    institution_type: '',
    zone: '',
    needed_specialties: [] as string[],
    contact_hours: '',
    bio: '',
    linkedin_url: '',
    avatar: user.avatar || '',
    affidavit_accepted: false,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => {
      const current = prev.needed_specialties || [];
      const next = current.includes(specialty)
        ? current.filter(s => s !== specialty)
        : [...current, specialty];
      return { ...prev, needed_specialties: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatePayload: any = {
        name: formData.name || null,
        phone: formData.phone || null,
        bio: formData.bio || null,
        linkedin_url: formData.linkedin_url || null,
        avatar: formData.avatar || null,
        verification_status: 'pending', // Set to pending for admin verification
      };

      if (user.role === 'doctor') {
        updatePayload.dni = formData.dni || null;
        updatePayload.license_number = formData.license_number || null;
        updatePayload.jurisdiction = formData.jurisdiction || null;
        updatePayload.specialty = formData.specialty || null;
        updatePayload.availability = formData.availability || null;
        updatePayload.affidavit_accepted = formData.affidavit_accepted;
      } else {
        updatePayload.cuit = formData.no_cuit ? 'N/A' : (formData.cuit || null);
        updatePayload.address = formData.address || null;
        updatePayload.institution_type = formData.institution_type || null;
        updatePayload.zone = formData.zone || null;
        updatePayload.needed_specialties = formData.needed_specialties || [];
        updatePayload.contact_hours = formData.contact_hours || null;
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG, PNG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máx 2MB)');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-avatar-${Math.random()}.${fileExt}`;
      const filePath = `onboarding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error("El bucket 'avatars' no existe. Por favor, crealo en el Dashboard de Supabase (Storage -> New Bucket) como público.");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar: publicUrl }));
      toast.success('Imagen cargada correctamente.');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(`Error al subir la imagen: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] overflow-y-auto overflow-x-hidden pt-4 pb-12 px-4 text-gray-900 flex items-start justify-center font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative border border-gray-100 my-auto animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
        {/* Header Section */}
        <div className={cn(
          "p-8 text-white relative overflow-hidden",
          user.role === 'doctor' ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-purple-600 to-purple-800'
        )}>
          <div className="relative z-10 flex gap-5 items-center">
            <div className="p-4 bg-white/20 backdrop-blur-xl rounded-2xl shadow-inner text-white">
              {user.role === 'doctor' ? <FileCheck2 className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight leading-tight">¡Bienvenido a ABK!</h2>
              <p className="text-white/80 font-medium text-sm">Completá tu registro profesional para comenzar.</p>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Image Upload Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("w-1.5 h-6 rounded-full", user.role === 'doctor' ? "bg-blue-600" : "bg-purple-600")}></span>
              <h3 className="text-lg font-bold text-gray-900">Foto de Perfil / Logo</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group shrink-0">
                <div className="w-28 h-28 rounded-3xl bg-white border-2 border-dashed border-gray-200 shadow-sm flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={cn(
                      "w-full h-full flex flex-col items-center justify-center gap-1",
                      user.role === 'doctor' ? "bg-blue-50 text-blue-300" : "bg-purple-50 text-purple-300"
                    )}>
                      {user.role === 'doctor' ? <Camera className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">Subir foto</span>
                    </div>
                  )}
                  
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                  <Upload className="w-4 h-4" />
                </div>
              </div>
              <div className="text-center sm:text-left space-y-1">
                <p className="font-black text-gray-900 text-lg">Imagen de Identidad</p>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[240px]">Los perfiles con foto real reciben un 80% más de interés en la plataforma.</p>
                {formData.avatar && (
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded-full mt-2 transition-colors">Eliminar imagen</button>
                )}
              </div>
            </div>
          </section>

          {/* Form Fields Section */}
          <div className="space-y-8">
            {user.role === 'doctor' ? (
              <>
                {/* Doctor Section: Basic Info */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    <h3 className="text-lg font-bold text-gray-900">Información Personal</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                      <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp / Teléfono</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Ej: 11 1234 5678" className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">LinkedIn URL</label>
                        <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Doctor Section: Professional Info */}
                <section className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    <h3 className="text-lg font-bold text-gray-900">Datos Profesionales</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">DNI (Sin puntos)</label>
                        <input required type="number" name="dni" value={formData.dni} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Especialidad</label>
                        <input required type="text" name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Ej: Clínica Médica" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Matrícula (Nº)</label>
                        <input required type="text" name="license_number" value={formData.license_number} onChange={handleChange} placeholder="Ej: MN 12345" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Escala / Jurisdicción</label>
                        <select required name="jurisdiction" value={formData.jurisdiction} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all">
                          <option value="">Seleccionar...</option>
                          <option value="Nacional">Nacional (M.N.)</option>
                          <option value="Buenos Aires">Bs. As. (M.P.)</option>
                          <option value="CABA">CABA</option>
                          <option value="Cordoba">Córdoba</option>
                          <option value="Santa Fe">Santa Fe</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Disponibilidad para guardias</label>
                      <input type="text" name="availability" value={formData.availability} onChange={handleChange} placeholder="Ej: Fines de semana, o Lunes a Viernes de 18 a 22hs" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Biografía / CV Resumido</label>
                      <textarea 
                        name="bio" 
                        value={formData.bio} 
                        onChange={handleChange} 
                        placeholder="Contale a las clínicas sobre tu formación y experiencia..."
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[140px] resize-none"
                      />
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Institution Section: Basic Info */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                    <h3 className="text-lg font-bold text-gray-900">Identidad de la Institución</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre o Razón Social</label>
                      <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all shadow-sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">CUIT</label>
                          <label className="flex items-center gap-1.5 text-[9px] text-purple-600 font-black cursor-pointer bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                            <input 
                              type="checkbox" 
                              name="no_cuit" 
                              checked={formData.no_cuit} 
                              onChange={handleChange} 
                              className="w-3 h-3 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            NO APLICA
                          </label>
                        </div>
                        <input 
                          required={!formData.no_cuit} 
                          disabled={formData.no_cuit}
                          type="text" 
                          name="cuit" 
                          value={formData.no_cuit ? '' : formData.cuit} 
                          onChange={handleChange} 
                          placeholder={formData.no_cuit ? "S/C" : "30-12345678-9"}
                          className={`w-full px-5 py-4 border rounded-2xl outline-none transition-all ${formData.no_cuit ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-gray-50 border-gray-100 focus:ring-2 focus:ring-purple-500 focus:bg-white shadow-sm'}`} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Institución</label>
                        <select 
                          name="institution_type"
                          required
                          value={formData.institution_type}
                          onChange={handleChange as any}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none shadow-sm transition-all"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="clinica_privada">Clínica privada</option>
                          <option value="geriatrico">Geriátrico</option>
                          <option value="sanatorio">Sanatorio</option>
                          <option value="centro_medico">Centro médico</option>
                          <option value="medicina_laboral">Medicina Laboral</option>
                          <option value="organizador_eventos">Organizador de Eventos</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Institution Section: Contact & Location */}
                <section className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                    <h3 className="text-lg font-bold text-gray-900">Ubicación y Contacto</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Zona Operativa</label>
                        <select 
                          name="zone"
                          required
                          value={formData.zone}
                          onChange={handleChange as any}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none shadow-sm transition-all"
                        >
                          <option value="">Elegir zona...</option>
                          {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Horario Administrativo</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" name="contact_hours" value={formData.contact_hours} onChange={handleChange} placeholder="Ej: Lun a Vie 9-18hs" className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none shadow-sm transition-all" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp / Teléfono de contacto</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Ej: 11 1234 5678" className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none shadow-sm transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Dirección Exacta</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Calle, Número, Localidad" className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none shadow-sm transition-all" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Institution Section: Needs */}
                <section className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                    <h3 className="text-lg font-bold text-gray-900">Especialidades que más solicitás</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1 text-gray-500">Tocá las especialidades para seleccionarlas</label>
                      <div className="flex flex-wrap gap-2">
                        {SPECIALTIES.map(spec => {
                          const isSelected = formData.needed_specialties.includes(spec);
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => toggleSpecialty(spec)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 border shadow-sm",
                                isSelected 
                                  ? "bg-purple-600 border-purple-600 text-white" 
                                  : "bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600"
                              )}
                            >
                              {spec}
                              {isSelected ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Resumen / Propuesta de Valor</label>
                      <textarea 
                        name="bio" 
                        value={formData.bio} 
                        onChange={handleChange} 
                        placeholder="Contanos brevemente sobre la institución..."
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all min-h-[140px] resize-none shadow-sm"
                      />
                    </div>
                  </div>
                </section>
              </>
            )}

            <div className={cn(
              "border rounded-3xl p-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
              user.role === 'doctor' ? "bg-amber-50 border-amber-100" : "bg-purple-50 border-purple-100"
            )}>
              <label className="flex items-start gap-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="affidavit_accepted"
                  checked={formData.affidavit_accepted}
                  onChange={handleChange as any}
                  required
                  className={cn(
                    "mt-1 w-5 h-5 focus:ring-offset-2 border-gray-300 rounded-lg",
                    user.role === 'doctor' ? "text-blue-600 focus:ring-blue-500" : "text-purple-600 focus:ring-purple-500"
                  )}
                />
                <span className={cn(
                  "text-xs leading-relaxed font-bold",
                  user.role === 'doctor' ? "text-amber-900" : "text-purple-900"
                )}>
                  <strong>Declaración Jurada:</strong> Declaro bajo juramento que los datos aportados en mi perfil y la documentación adjunta son verídicos. 
                  Entiendo que la falsificación de estos datos puede derivar en la suspensión definitiva de la cuenta y acciones legales correspondientes.
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-8 space-y-4 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={loading}
              className={cn(
                "w-full py-5 text-white rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50",
                user.role === 'doctor' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
              )}
            >
              {loading ? (
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Finalizar Registro
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
            </button>

            {onLogout && (
              <button 
                type="button" 
                onClick={onLogout}
                className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
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
