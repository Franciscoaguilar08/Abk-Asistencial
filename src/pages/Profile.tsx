import { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Save, UserCircle, BriefcaseMedical, Building2, FileText, Phone, Award, ShieldAlert, Calendar, Upload, FileUp, ExternalLink, Trash2, ShieldCheck, Image as ImageIcon, ChevronLeft, MapPin, Stethoscope, Clock, Plus, X, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

interface ProfileProps {
  user: User;
  onProfileUpdate: (user: User) => void;
}

const ZONES = [
  'Palermo, CABA', 'Belgrano, CABA', 'Recoleta, CABA', 'Caballito, CABA', 'Almagro, CABA', 
  'Villa Urquiza, CABA', 'Villa Devoto, CABA', 'Flores, CABA', 'San Telmo, CABA', 'Puerto Madero, CABA',
  'Villa Crespo, CABA', 'Colegiales, CABA', 'Chacarita, CABA', 'Retiro, CABA', 'Barracas, CABA',
  'Paternal, CABA', 'Saavedra, CABA', 'Núñez, CABA', 'Saavedra, CABA',
  'GBA Norte - San Isidro', 'GBA Norte - Vicente López', 'GBA Norte - Olivos', 'GBA Norte - Martínez', 'GBA Norte - Tigre', 'GBA Norte - Pilar',
  'GBA Sur - Avellaneda', 'GBA Sur - Quilmes', 'GBA Sur - Lomas de Zamora', 'GBA Sur - Lanús', 'GBA Sur - Adrogué',
  'GBA Oeste - Ramos Mejía', 'GBA Oeste - Haedo', 'GBA Oeste - Morón', 'GBA Oeste - Castelar', 'GBA Oeste - San Justo'
];

const EXPERIENCE_LEVELS = [
  { value: 'less_than_1', label: 'Menos de 1 año' },
  { value: '1_to_3', label: '1 a 3 años' },
  { value: '3_to_5', label: '3 a 5 años' },
  { value: '5_to_10', label: '5 a 10 años' },
  { value: 'more_than_10', label: 'Más de 10 años' }
];

const SPECIALTIES = [
  'Pediatría', 'Clínica Médica', 'Terapia Intensiva', 'Deportología', 'Ginecología', 
  'Obstetricia', 'Traumatología', 'Cardiología', 'Dermatología', 'Psiquiatría', 
  'Neurología', 'Oftalmología', 'Otorrinolaringología', 'Urología', 'Gastroenterología', 
  'Endocrinología', 'Reumatología', 'Infectología', 'Hematología', 'Oncología', 
  'Nefrología', 'Neumonología', 'Cirugía General', 'Anestesiología', 'Medicina General', 
  'Emergentología', 'Diagnóstico por Imágenes', 'Kinesiología', 'Nutrición',
  'Bioquímica', 'Psicología', 'Odontología', 'Fonoaudiología', 'Otro'
];

export default function Profile({ user, onProfileUpdate }: ProfileProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    bio: user.bio || '',
    linkedin_url: user.linkedin_url || '',
    // Doctor
    dni: user.dni || '',
    license_number: user.license_number || '',
    jurisdiction: user.jurisdiction || '',
    specialty: user.specialty || '',
    secondary_specialties: user.secondary_specialties || [] as string[],
    years_of_experience: user.years_of_experience || '',
    availability: user.availability || '',
    cv_url: user.cv_url || '',
    license_image_url: user.license_image_url || '',
    affidavit_accepted: user.affidavit_accepted || false,
    // Clinic
    cuit: user.cuit === 'N/A' ? '' : (user.cuit || ''),
    no_cuit: user.cuit === 'N/A',
    address: user.address || '',
    institution_type: user.institution_type || '',
    zone: user.zone || '',
    needed_specialties: user.needed_specialties || [] as string[],
    contact_hours: user.contact_hours || '',
    avatar: user.avatar || ''
  });

  // Keep formData in sync if user prop changes
  useEffect(() => {
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      bio: user.bio || '',
      linkedin_url: user.linkedin_url || '',
      dni: user.dni || '',
      license_number: user.license_number || '',
      jurisdiction: user.jurisdiction || '',
      specialty: user.specialty || '',
      secondary_specialties: user.secondary_specialties || [],
      years_of_experience: user.years_of_experience || '',
      availability: user.availability || '',
      cv_url: user.cv_url || '',
      license_image_url: user.license_image_url || '',
      affidavit_accepted: user.affidavit_accepted || false,
      cuit: user.cuit === 'N/A' ? '' : (user.cuit || ''),
      no_cuit: user.cuit === 'N/A',
      address: user.address || '',
      institution_type: user.institution_type || '',
      zone: user.zone || '',
      needed_specialties: user.needed_specialties || [],
      contact_hours: user.contact_hours || '',
      avatar: user.avatar || ''
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {
        name: formData.name || null,
        phone: formData.phone || null,
        bio: formData.bio || null,
        linkedin_url: formData.linkedin_url || null,
        availability: formData.availability || null,
        ...(user.role === 'doctor' ? {
          dni: formData.dni || null,
          license_number: formData.license_number || null,
          jurisdiction: formData.jurisdiction || null,
          specialty: formData.specialty || null,
          secondary_specialties: formData.secondary_specialties || [],
          years_of_experience: formData.years_of_experience || null,
          cv_url: formData.cv_url || null,
          license_image_url: formData.license_image_url || null,
        } : {
          cuit: formData.no_cuit ? 'N/A' : (formData.cuit || null),
          address: formData.address || null,
          institution_type: formData.institution_type || null,
          zone: formData.zone || null,
          needed_specialties: formData.needed_specialties || [],
          contact_hours: formData.contact_hours || null,
          avatar: formData.avatar || null
        }),
        affidavit_accepted: formData.affidavit_accepted,
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
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Error al actualizar el perfil: ${error.message || 'Error desconocido'}`);
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
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, cv_url: publicUrl }));
      toast.success('CV subido correctamente. No olvides guardar los cambios del perfil.');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(`Error al subir el archivo: ${error.message || 'Error desconocido'}`);
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
      const bucket = file.type === 'application/pdf' ? 'cvs' : 'avatars';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error(`El bucket '${bucket}' no existe. Por favor, crealo en el Dashboard de Supabase (Storage -> New Bucket) como público.`);
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, license_image_url: publicUrl }));
      toast.success('Captura de matrícula subida correctamente.');
    } catch (error: any) {
      console.error('Error uploading license:', error);
      toast.error(`Error al subir la captura: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG, PNG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit for logo
      toast.error('La imagen es demasiado grande (máx 2MB)');
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-logo-${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

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
      toast.success('Logo cargado correctamente.');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(`Error al subir el logo: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    if (user.role === 'clinic') {
      setFormData(prev => {
        const current = prev.needed_specialties || [];
        const next = current.includes(specialty)
          ? current.filter(s => s !== specialty)
          : [...current, specialty];
        return { ...prev, needed_specialties: next };
      });
    } else {
      setFormData(prev => {
        const current = prev.secondary_specialties || [];
        const next = current.includes(specialty)
          ? current.filter(s => s !== specialty)
          : [...current, specialty];
        return { ...prev, secondary_specialties: next };
      });
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
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          {/* Avatar Section - Top */}
          <div className="flex flex-col items-center gap-6 pb-8 border-b border-gray-100">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-blue-400 group-hover:bg-blue-50/10">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Foto de perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    {user.role === 'doctor' ? <Camera className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">Subir foto</span>
                  </div>
                )}
                
                {loading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2.5 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-black text-gray-900">{formData.name || 'Tu Nombre'}</h2>
              <div className="flex items-center justify-center gap-4 mt-2">
                {user.role === 'doctor' && (
                  <>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-xs font-bold">
                      <Award className="w-3.5 h-3.5" />
                      {user.rating ? `Rating: ${user.rating.toFixed(1)}` : 'Sin calificación'}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {user.completion_rate ? `${user.completion_rate}% asistencia` : 'Nueva cuenta'}
                    </div>
                  </>
                )}
                {user.role === 'clinic' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-xs font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                    Perfil Institucional
                  </div>
                )}
              </div>
            </div>
          </div>

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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">LinkedIn URL</label>
                <input 
                  type="url" 
                  name="linkedin_url" 
                  value={formData.linkedin_url} 
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/tu-perfil"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Años de Experiencia profesional</label>
                  <select 
                    name="years_of_experience"
                    value={formData.years_of_experience}
                    onChange={handleChange as any}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar experto...</option>
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-gray-500" /> Especialidades Secundarias
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 border",
                          formData.secondary_specialties.includes(spec)
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                            : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                        )}
                      >
                        {spec}
                        {formData.secondary_specialties.includes(spec) ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Section - (Moved to top, hidden legacy code if any) */}
                  <div className="hidden md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo o Imagen de la Institución</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                        {formData.avatar ? (
                          <img src={formData.avatar} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-gray-900">Haz clic para subir</p>
                        <p className="text-gray-500">JPG, PNG (máx 2MB)</p>
                        {formData.avatar && (
                          <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                            className="text-red-500 font-bold hover:underline mt-1"
                          >
                            Eliminar logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Institution Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" /> Tipo de Institución
                    </label>
                    <select 
                      name="institution_type"
                      value={formData.institution_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, institution_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar tipo...</option>
                      <option value="clinica_privada">Clínica privada</option>
                      <option value="geriatrico">Geriátrico</option>
                      <option value="sanatorio">Sanatorio</option>
                      <option value="centro_medico">Centro médico</option>
                      <option value="medicina_laboral">Empresa de medicina laboral</option>
                      <option value="organizador_eventos">Organizador de eventos</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  {/* CUIT */}
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

                  {/* Zone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> Zona / Barrio Principales
                    </label>
                    <select 
                      name="zone"
                      value={formData.zone}
                      onChange={handleChange as any}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar zona...</option>
                      {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>

                  {/* Contact Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> Horario de contacto administrativo
                    </label>
                    <input 
                      type="text" 
                      name="contact_hours" 
                      value={formData.contact_hours} 
                      onChange={handleChange}
                      placeholder="Ej: Lunes a viernes 9 a 18hs"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>

                  {/* Address */}
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

                  {/* Specialties Needed (Multiple Select) */}
                  <div className="md:col-span-2 space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-gray-400" /> Especialidades que más necesitan (Selección múltiple)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALTIES.map(spec => {
                        const isSelected = formData.needed_specialties.includes(spec);
                        return (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => toggleSpecialty(spec)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 border",
                              isSelected 
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                            )}
                          >
                            {spec}
                            {isSelected ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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

            {!user.affidavit_accepted && (
              <div className={cn(
                "rounded-xl p-4 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
                user.role === 'doctor' ? "bg-amber-50 border border-amber-100" : "bg-purple-50 border border-purple-100"
              )}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="affidavit_accepted"
                    checked={formData.affidavit_accepted}
                    onChange={handleChange as any}
                    required
                    className={cn(
                      "mt-1 w-4 h-4 rounded border-gray-300 focus:ring-offset-2",
                      user.role === 'doctor' ? "text-blue-600 focus:ring-blue-500" : "text-purple-600 focus:ring-purple-500"
                    )}
                  />
                  <span className={cn(
                    "text-xs leading-relaxed font-medium",
                    user.role === 'doctor' ? "text-amber-900" : "text-purple-900"
                  )}>
                    <strong>Declaración Jurada:</strong> Declaro bajo juramento que los datos aportados en mi perfil y la documentación adjunta son verídicos. 
                    Entiendo que la falsificación de estos datos puede derivar en la suspensión definitiva de la cuenta y acciones legales correspondientes.
                  </span>
                </label>
              </div>
            )}

            {user.affidavit_accepted && (
              <div className={cn(
                "flex items-center gap-2 text-xs font-semibold px-1 mt-4 transition-colors",
                user.role === 'doctor' ? "text-green-600" : "text-purple-600"
              )}>
                <ShieldCheck className="w-4 h-4" />
                Declaración jurada aceptada con éxito
              </div>
            )}
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
