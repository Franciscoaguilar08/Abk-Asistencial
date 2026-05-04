import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shift } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Users, Calendar, Clock, DollarSign, MapPin, CheckCircle2, XCircle, UserCircle, Activity, ExternalLink, Star, MessageSquare, BriefcaseMedical, LayoutDashboard, Globe, Building2, Loader2, Settings, ShieldCheck, MapPinned, Users2, LayoutList, Search, PlusCircle } from 'lucide-react';
import { Location, ClinicStaff } from '../types';
import { toast } from 'sonner';
import { cn, areShiftsOverlapping } from '../lib/utils';
import ChatModal from '../components/ChatModal';
import ViewProfileModal from '../components/ViewProfileModal';
import ShiftCard from '../components/ShiftCard';
import { Skeleton, ShiftCardSkeleton } from '../components/Skeleton';

interface ClinicDashboardProps {
  user: User;
}

export default function ClinicDashboard({ user }: ClinicDashboardProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ shiftId: string; receiverId: string; receiverName: string } | null>(null);
  const [viewedProfileData, setViewedProfileData] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'guardia' | 'evento' | 'empleo' | 'suplencia' | 'traslado'>('guardia');

  const fetchProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error) throw error;
      setViewedProfileData(data as User);
    } catch (err) {
      toast.error('No se pudo cargar el perfil');
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchLocations();
    
    // Subscribe to shifts table for this specific clinic
    const channel = supabase
      .channel(`shifts-clinic-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'shifts',
          filter: `clinic_id=eq.${user.id}`
        },
        () => {
          fetchShifts();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('clinic_id', user.id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setShifts(data as Shift[]);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('clinic_id', user.id);
      if (error) throw error;
      setLocations(data as Location[]);
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const handleCreateShift = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const price = Number(formData.get('price'));
    const dateStr = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const locationId = formData.get('locationId') as string;
    const serviceName = formData.get('serviceName') as string;

    // 1. Validate Price
    if (price <= 0) {
      toast.error('El honorario debe ser mayor a 0');
      return;
    }

    // 2. Validate Date (not in the past) - skip for Empleo
    let selectedDate: Date | null = null;
    if (formData.get('category') !== 'empleo' && dateStr) {
      selectedDate = new Date(dateStr + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        toast.error('La fecha no puede ser en el pasado');
        return;
      }
    }

    // 3. Validate Times - skip for Empleo
    if (formData.get('category') !== 'empleo') {
      if (!startTime || !endTime) {
        toast.error('Debes ingresar horario de inicio y fin');
        return;
      }

      if (startTime === endTime) {
        toast.error('El horario de inicio y fin no pueden ser iguales');
        return;
      }
    }

    const newShift = {
      clinic_id: user.id,
      clinic_name: user.name,
      clinic_avatar: user.avatar,
      category: formData.get('category') as any,
      job_duration: formData.get('job_duration') as any || null,
      specialty: formData.get('specialty') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      price: price,
      is_negotiable: formData.get('is_negotiable') === 'on',
      date: dateStr || (formData.get('category') === 'empleo' ? format(new Date(), 'yyyy-MM-dd') : ''),
      start_time: startTime || '00:00',
      end_time: endTime || '00:00',
      zones: formData.getAll('zones') as string[],
      location: (formData.get('location') as string) || user.address || 'Ubicación de sede',
      requirements: (formData.get('requirements') as string)?.split(',').map(s => s.trim()).filter(Boolean) || [],
      equipment_available: (formData.get('equipmentAvailable') as string)?.split(',').map(s => s.trim()).filter(Boolean) || [],
      contact_person: formData.get('contactPerson') as string || user.email || 'Admin',
      status: 'open',
      applicants: [],
      location_id: locationId || null,
      service_name: serviceName || null
    };

    try {
      const { data: newShiftResult, error } = await supabase.from('shifts').insert([newShift]).select().single();
      if (error) throw error;
      
      setIsModalOpen(false);
      toast.success('Oportunidad publicada exitosamente');
      fetchShifts();

      // Notify doctors via email (background-like process)
      try {
        // Fetch all doctors to get their emails
        const { data: doctors } = await supabase
          .from('users')
          .select('email')
          .eq('role', 'doctor');

        if (doctors && doctors.length > 0) {
          const recipientEmails = doctors.map(d => d.email).filter(Boolean);
          
          if (recipientEmails.length > 0) {
            await fetch('/api/notify-new-shift', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shiftData: {
                  ...newShift,
                  date: format(new Date(newShift.date), 'dd/MM/yyyy', { locale: es })
                },
                recipients: recipientEmails
              })
            });
          }
        }
      } catch (err) {
        console.error("Non-blocking error sending notifications:", err);
      }
    } catch (error: any) {
      console.error("Error creating shift:", error);
      toast.error(`Error al publicar la oportunidad: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleAssign = async (shiftId: string, doctorId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      // Verificar si el médico ya tiene otra guardia confirmada que se superpone
      // Buscamos en TODAS las guardias de la plataforma para ese médico
      const { data: otherShifts, error: fetchError } = await supabase
        .from('shifts')
        .select('*')
        .eq('assigned_doctor_id', doctorId)
        .eq('status', 'confirmed');

      if (fetchError) throw fetchError;

      const overlappingShift = (otherShifts as Shift[]).find(s => areShiftsOverlapping(s, shift));
      
      if (overlappingShift) {
        toast.error(`Conflicto de agenda: El profesional ya tiene una guardia confirmada en ese horario (${overlappingShift.clinic_name}). No puedes asignarlo.`);
        return;
      }

      const { error } = await supabase
        .from('shifts')
        .update({
          assigned_doctor_id: doctorId,
          status: 'confirmed'
        })
        .eq('id', shiftId);
        
      if (error) throw error;
      
      // Optimitic update
      setShifts(prevShifts => 
        prevShifts.map(s => 
          s.id === shiftId 
            ? { ...s, assigned_doctor_id: doctorId, status: 'confirmed' } 
            : s
        )
      );

      // Crear notificación para el profesional
      await supabase.from('notifications').insert({
        user_id: doctorId,
        title: '¡Guardia Confirmada!',
        message: `${user.name} te ha asignado a la guardia del ${format(new Date(shift.date), 'dd/MM')} - ${shift.type}`,
        type: 'assignment',
        shift_id: shiftId
      });

      const { data: doctorData } = await supabase.from('users').select('email, name').eq('id', doctorId).single();
      if (doctorData?.email) {
        fetch('/api/notify-assignment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doctorEmail: doctorData.email, doctorName: doctorData.name, shiftData: shift })
        }).catch(console.error);
      }

      toast.success('Profesional asignado exitosamente');
      fetchShifts();
    } catch (error) {
      console.error("Error assigning doctor:", error);
      toast.error("Error al asignar profesional.");
    }
  };

  const handleCancel = async (shiftId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const isConfirmed = shift.status === 'confirmed';
      const newStatus = isConfirmed ? 'cancelled_by_clinic' : 'cancelled';

      const { error } = await supabase
        .from('shifts')
        .update({ status: newStatus })
        .eq('id', shiftId);

      if (error) throw error;

      // Notify doctor if shift was confirmed
      if (isConfirmed && shift.assigned_doctor_id) {
        await supabase.from('notifications').insert({
          user_id: shift.assigned_doctor_id,
          title: 'Guardia Cancelada',
          message: `${user.name} ha cancelado la guardia de ${shift.specialty} a la que te habías comprometido. Tu historial no será afectado.`,
          type: 'shift_status',
          shift_id: shiftId
        });
      }

      // Si estaba confirmada, penalizar a la clínica (incremetar contador de cancelaciones)
      if (isConfirmed) {
        const currentCount = user.cancellation_count || 0;
        await supabase.from('users').update({ 
          cancellation_count: currentCount + 1 
        }).eq('id', user.id);
        
        toast.warning('Guardia cancelada. Al ser una guardia confirmada, esto queda registrado en tu historial de confiabilidad.');
      } else {
        toast.success('Publicación eliminada exitosamente');
      }
      
      fetchShifts();
    } catch (error) {
      console.error("Error cancelling shift:", error);
      toast.error("Error al eliminar la publicación.");
    }
  };

  const handleMarkNoShow = async (shiftId: string, doctorId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({ status: 'noshow' })
        .eq('id', shiftId);

      if (error) throw error;

      // Penalizar al médico en su completion_rate de forma simulada
      const { data: doctor } = await supabase.from('users').select('completion_rate').eq('id', doctorId).single();
      if (doctor) {
        const currentRate = doctor.completion_rate || 100;
        const newRate = Math.max(0, currentRate - 5); // Baja 5 puntos por cada no-show
        await supabase.from('users').update({ completion_rate: newRate }).eq('id', doctorId);
      }

      toast.error('Se ha registrado la inasistencia del profesional.');
      fetchShifts();
    } catch (error) {
      console.error("Error marking no-show:", error);
      toast.error("Error al registrar inasistencia.");
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;
      toast.success('Publicación eliminada definitivamente.');
      setShifts(prev => prev.filter(s => s.id !== shiftId));
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast.error('No se pudo eliminar la publicación.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 italic transition-all hover:shadow-md">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-12 w-48 rounded-xl" />
        </div>
        <div className="space-y-6">
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Building2 className="w-32 h-32 rotate-12" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight">Publicar Nueva Oportunidad</h1>
          <p className="text-slate-400 mt-1 font-medium italic">Publicá guardias, eventos o búsquedas laborales.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-blue-900/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            <PlusCircle className="w-5 h-5" />
            Nueva Oportunidad
          </button>
        </div>
      </div>

      {/* Shifts Section */}
      <div className="space-y-6">
        {user.verification_status !== 'verified' && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-black text-purple-900 text-lg">Perfil Institucional en Revisión</h3>
              <p className="text-purple-700 mt-0.5 font-medium leading-relaxed">
                Estamos validando la información de tu institución. Podés publicar oportunidades, 
                pero para asignar profesionales y concretar coberturas necesitamos completar tu certificación ABK.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          {shifts.length > 0 ? (
            shifts.map(shift => (
              <div key={shift.id} className="relative">
                <ClinicShiftCard 
                  shift={shift} 
                  onAssign={handleAssign}
                  onCancel={() => handleCancel(shift.id)}
                  onRefresh={fetchShifts}
                  onOpenChat={(docId, docName) => setActiveChat({ shiftId: shift.id, receiverId: docId, receiverName: docName })}
                  onViewProfile={fetchProfileData}
                  onMarkNoShow={handleMarkNoShow}
                  onDelete={() => handleDeleteShift(shift.id)}
                />
                {(shift.location_id || shift.service_name) && (
                  <div className="absolute top-4 right-4 flex gap-2">
                     {shift.location_id && (
                       <span className="px-2 py-1 bg-slate-800 text-white text-[9px] font-black rounded uppercase tracking-widest border border-slate-700">
                         {locations.find(l => l.id === shift.location_id)?.name || 'SEDE'}
                       </span>
                     )}
                     {shift.service_name && (
                       <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase tracking-widest border border-blue-200">
                         {shift.service_name}
                       </span>
                     )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No tenés publicaciones activas</h3>
              <p className="text-gray-500 mt-1 max-w-sm mx-auto">Comenzá publicando una nueva guardia o servicio para el plantel de ABK.</p>
            </div>
          )}
        </div>
      </div>

      {viewedProfileData && (
        <ViewProfileModal user={viewedProfileData} onClose={() => setViewedProfileData(null)} />
      )}

      {/* Basic Modal for Creating Shift */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Publicar Nueva Oportunidad</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Tipo de Oportunidad</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className={cn(
                      "flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                      selectedCategory === 'guardia' ? "border-blue-600 bg-blue-50 text-blue-700 font-bold" : "border-gray-200 hover:bg-gray-50"
                    )}>
                      <input type="radio" name="category" value="guardia" checked={selectedCategory === 'guardia'} onChange={() => setSelectedCategory('guardia')} className="sr-only" />
                      <span>Guardia</span>
                    </label>
                    <label className={cn(
                      "flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                      selectedCategory === 'evento' ? "border-purple-600 bg-purple-50 text-purple-700 font-bold" : "border-gray-200 hover:bg-gray-50"
                    )}>
                      <input type="radio" name="category" value="evento" checked={selectedCategory === 'evento'} onChange={() => setSelectedCategory('evento')} className="sr-only" />
                      <span>Evento</span>
                    </label>
                    <label className={cn(
                      "flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                      selectedCategory === 'empleo' ? "border-green-600 bg-green-50 text-green-700 font-bold" : "border-gray-200 hover:bg-gray-50"
                    )}>
                      <input type="radio" name="category" value="empleo" checked={selectedCategory === 'empleo'} onChange={() => setSelectedCategory('empleo')} className="sr-only" />
                      <span>Empleo</span>
                    </label>
                    <label className={cn(
                      "flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                      selectedCategory === 'suplencia' ? "border-orange-600 bg-orange-50 text-orange-700 font-bold" : "border-gray-200 hover:bg-gray-50"
                    )}>
                      <input type="radio" name="category" value="suplencia" checked={selectedCategory === 'suplencia'} onChange={() => setSelectedCategory('suplencia')} className="sr-only" />
                      <span>Suplencia</span>
                    </label>
                    <label className={cn(
                      "flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                      selectedCategory === 'traslado' ? "border-red-600 bg-red-50 text-red-700 font-bold" : "border-gray-200 hover:bg-gray-50"
                    )}>
                      <input type="radio" name="category" value="traslado" checked={selectedCategory === 'traslado'} onChange={() => setSelectedCategory('traslado')} className="sr-only" />
                      <span>Traslado</span>
                    </label>
                  </div>
                </div>

                {(selectedCategory === 'empleo' || selectedCategory === 'suplencia') && (
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Frecuencia / Duración</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="job_duration" value="tiempo_completo" defaultChecked className="text-blue-600" />
                        <span>Tiempo Completo</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="job_duration" value="semanal" className="text-blue-600" />
                        <span>Por Semana</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="job_duration" value="3_meses" className="text-blue-600" />
                        <span>Por 3 Meses</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="job_duration" value="otro" className="text-blue-600" />
                        <span>Otro / A convenir</span>
                      </label>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Unidad / Sede de Trabajo</label>
                  <select name="locationId" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Usar ubicación de perfil --</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1 italic">Si es para una sede distinta a la principal, seleccionala acá.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Sector / Área</label>
                  <input type="text" name="serviceName" placeholder="Ej: Adultos, UTI 2, Traslados" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad / Rol requerido</label>
                  <input type="text" name="specialty" required placeholder="Ej: Pediatría, Kinesiología, Odontología..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Honorarios ($ ARS)</label>
                  <input type="number" name="price" required min="1" placeholder="Ej: 150000" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  
                  <label className="flex items-center gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="is_negotiable" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    Apto a negociación (los postulantes pueden hacer ofertas)
                  </label>
                </div>
                <div className={selectedCategory === 'empleo' ? 'hidden' : 'block'}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Fecha de la Oportunidad</label>
                  <input type="date" name="date" required={selectedCategory !== 'empleo'} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-bold">Zonas de Cobertura (Multizona)</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                    {['CABA', 'GBA Norte', 'GBA Sur', 'GBA Oeste', 'La Plata', 'Interior'].map(z => (
                      <label key={z} className="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-600 transition-colors">
                        <input type="checkbox" name="zones" value={z} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="font-medium">{z}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium italic">Seleccioná todas las zonas donde este puesto es válido.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección exacta (Opcional)</label>
                  <input type="text" name="location" placeholder="Ej: Av. Rivadavia 1234" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-[10px] text-gray-500 mt-1 italic">Si no especificás una, se usará la de tu perfil institucional.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo / Descripción breve</label>
                  <input type="text" name="type" required placeholder="Ej: Guardia 24hs, Cobertura Torneo..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción detallada</label>
                  <textarea name="description" placeholder="Describa los detalles de la oferta. Ej: Se necesita cubrir guardia en sector pediatría de baja complejidad. 10 camas..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"></textarea>
                  <p className="text-xs text-gray-500 mt-1">Acá podés dar importancia y explicar bien de qué trata la propuesta.</p>
                </div>
              </div>
              
              <div className={cn("border-t border-gray-200 pt-4 mt-2 space-y-4", selectedCategory === 'empleo' ? 'hidden' : 'block')}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Hora Inicio</label>
                    <input type="time" name="startTime" required={selectedCategory !== 'empleo'} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Hora Fin</label>
                    <input type="time" name="endTime" required={selectedCategory !== 'empleo'} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-gray-900 mt-4">Detalles Adicionales</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos del Profesional</label>
                  <textarea name="requirements" placeholder="Ej: Matrícula Nacional, Especialidad completa, Seguro de mala praxis..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                  <p className="text-xs text-gray-500 mt-1">Separe los requisitos con comas.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipamiento Disponible</label>
                  <textarea name="equipmentAvailable" placeholder="Ej: Ecógrafo portátil, Laboratorio 24hs, Rayos X..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                  <p className="text-xs text-gray-500 mt-1">Separe el equipamiento con comas.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datos de Contacto (Privado)</label>
                  <input type="text" name="contactPerson" placeholder="Ej: Dr. Juan Pérez (WhatsApp: 11-1234-5678)" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-500 mt-1">Este dato solo será visible para el profesional una vez que lo asignes a la guardia.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeChat && (
        <ChatModal 
          shiftId={activeChat.shiftId}
          currentUserId={user.id}
          receiverId={activeChat.receiverId}
          receiverName={activeChat.receiverName}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}

function ClinicShiftCard({ shift, onAssign, onCancel, onRefresh, onOpenChat, onViewProfile, onMarkNoShow, onDelete }: { shift: Shift, onAssign: (shiftId: string, doctorId: string) => void, onCancel: () => void, onRefresh: () => void, onOpenChat: (docId: string, docName: string) => void, onViewProfile: (userId: string) => void, onMarkNoShow: (sId: string, dId: string) => void, onDelete: () => void }) {
  const isConfirmed = shift.status === 'confirmed' || shift.status === 'completed' || shift.status === 'noshow';
  const isTerminal = shift.status === 'completed' || shift.status === 'noshow' || shift.status === 'cancelled_by_clinic' || shift.status === 'cancelled';
  const isCancelled = shift.status === 'cancelled';
  const [assignedDoctor, setAssignedDoctor] = useState<User | null>(null);

  if (isCancelled) return null; // Or render a cancelled state if preferred
  const [applicants, setApplicants] = useState<User[]>([]);

  const [ratingVal, setRatingVal] = useState(0);
  const [reviewTxt, setReviewTxt] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleConfirmCompletionAndPay = async () => {
    if (!shift.assigned_doctor_id) return;
    
    const confirmMsg = `¿Confirmas que la guardia fue realizada correctamente por ${assignedDoctor?.name || 'el profesional'}?\n\nAl confirmar, se registrará el pago de $${shift.price.toLocaleString('es-AR')} en su billetera virtual.`;
    
    if (!window.confirm(confirmMsg)) return;

    setProcessingPayment(true);
    try {
      const { error } = await supabase.from('shifts').update({
        status: 'completed',
        payment_status: 'paid',
        total_payment: shift.price,
        attendance_confirmed: true
      }).eq('id', shift.id);

      if (error) throw error;
      
      // Also record a transaction for history
      await supabase.from('transactions').insert({
        user_id: shift.assigned_doctor_id,
        shift_id: shift.id,
        amount: shift.price,
        type: 'credit',
        status: 'completed',
        description: `Pago por guardia: ${shift.specialty} - ${shift.clinic_name}`
      });

      toast.success('Guardia completada y pago registrado en el Wallet del profesional.');
      onRefresh();
    } catch (err) {
      console.error('Error confirming completion:', err);
      toast.error('Error al confirmar la realización de la guardia.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const submitRating = async () => {
    if (ratingVal === 0) {
      toast.error('Selecciona entre 1 y 5 estrellas.');
      return;
    }
    setSubmittingRating(true);
    try {
      const { error } = await supabase.from('shifts').update({
        rating_for_doctor: ratingVal,
        review_for_doctor: reviewTxt,
        status: 'completed'
      }).eq('id', shift.id);

      if (error) throw error;
      toast.success('¡Gracias por calificar al profesional!');
      onRefresh();
    } catch(err) {
      toast.error('Error al enviar la calificación.');
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      if (shift.assigned_doctor_id) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', shift.assigned_doctor_id)
          .single();
        if (data) {
          setAssignedDoctor(data as User);
        }
      }

      if (shift.applicants && shift.applicants.length > 0) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .in('id', shift.applicants);
        
        if (data) {
          setApplicants(data as User[]);
        }
      }
    };

    fetchUsers();
  }, [shift.assigned_doctor_id, shift.applicants]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Clinic Cancellation Penalty Indicator */}
      {shift.status === 'confirmed' && (
        <div className="absolute top-0 right-0 p-2">
          {/* Internal note: indicator visible in status confirmed */}
        </div>
      )}
      {/* Shift Details */}
      <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 space-y-4">
        <div className="flex justify-between items-start">
          <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "inline-block px-2.5 py-1 rounded-full text-xs font-semibold",
                  shift.status === 'noshow' ? "bg-red-100 text-red-700" : 
                  shift.status === 'cancelled_by_clinic' ? "bg-orange-100 text-orange-700" :
                  isConfirmed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                )}>
                  {shift.status === 'noshow' ? 'Ausente' : 
                   shift.status === 'cancelled_by_clinic' ? 'Cancelada (Penalizado)' :
                   isConfirmed ? 'Asignada' : 'Buscando Profesional'}
                </span>
                <span className={cn(
                  "inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                  shift.category === 'evento' ? "bg-purple-100 text-purple-700" : 
                  shift.category === 'empleo' ? "bg-green-100 text-green-700" :
                  shift.category === 'suplencia' ? "bg-orange-100 text-orange-700" :
                  shift.category === 'traslado' ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-700"
                )}>
                  {shift.category === 'evento' ? 'Evento' : 
                   shift.category === 'empleo' ? 'Empleo' :
                   shift.category === 'suplencia' ? 'Suplencia' :
                   shift.category === 'traslado' ? 'Traslado' :
                   'Guardia'}
                </span>
                {shift.job_duration && (
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    {shift.job_duration === 'tiempo_completo' ? 'Tiempo Completo' :
                     shift.job_duration === 'semanal' ? 'Semanal' :
                     shift.job_duration === '3_meses' ? '3 Meses' : 'Fijo/Temporal'}
                  </span>
                )}
              </div>
            <h3 className="font-bold text-xl text-gray-900">{shift.specialty}</h3>
            <p className="text-gray-600">{shift.type}</p>
          </div>
          {!isConfirmed && (
            <button 
                onClick={() => setIsCancelModalOpen(true)}
                className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200"
                title="Eliminar Guardia"
            >
                <XCircle className="w-5 h-5" />
            </button>
          )}
          {isTerminal && (
            <button 
                onClick={() => {
                  if (window.confirm('¿Deseas eliminar esta publicación de tu historial? Se borrará definitivamente.')) {
                    onDelete();
                  }
                }}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors border border-transparent"
                title="Quitar del historial"
            >
                <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
        
          {shift.description && (
          <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 text-gray-900 text-sm leading-relaxed">
            {shift.description}
          </div>
        )}

        <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600">
          {shift.category !== 'empleo' ? (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="capitalize">{format(new Date(shift.date), "d MMM yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{shift.start_time} - {shift.end_time}</span>
              </div>
            </>
          ) : (
            <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center gap-2 text-green-900 font-bold col-span-2">
              <Activity className="w-4 h-4" />
              <span>Búsqueda laboral activa / Puesto fijo</span>
            </div>
          )}
          <div className="flex items-start gap-2 col-span-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex flex-col">
              {shift.zone && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{shift.zone}</span>}
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(shift.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <span className="truncate max-w-[200px]">{shift.location}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 col-span-2 font-medium text-gray-900 pt-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span>${shift.price.toLocaleString('es-AR')} {shift.is_negotiable && <span className="text-xs text-gray-500 font-normal ml-1">(Negociable)</span>}</span>
          </div>
        </div>
      </div>

      {/* Applicants / Assigned Doctor */}
      <div className="p-6 md:w-1/2 bg-gray-50 flex flex-col">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          {isConfirmed ? 'Profesional Asignado' : `Postulantes (${shift.applicants.length})`}
        </h4>

        {isConfirmed && assignedDoctor ? (
          <>
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                <UserCircle className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <button onClick={() => onViewProfile(assignedDoctor.id)} className="font-bold text-gray-900 hover:text-blue-600 transition-colors border-b border-transparent hover:border-blue-600">{assignedDoctor.name}</button>
                <p className="text-sm text-gray-600">{assignedDoctor.specialty}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    {assignedDoctor.rating ? `★ ${assignedDoctor.rating.toFixed(1)}` : '★ Nuevo'}
                  </div>
                  {assignedDoctor.completion_rate && (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                      <Activity className="w-3 h-3" />
                      {assignedDoctor.completion_rate}% Asistencia
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Tracking Status */}
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-sm">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900">Estado de la Cobertura</h5>
                {(shift.status === 'confirmed' || shift.status === 'completed') && assignedDoctor && (
                  <button 
                    onClick={() => onOpenChat(assignedDoctor.id, assignedDoctor.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat Directo
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Asistencia:</span>
                  {shift.status === 'completed' ? (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Cumplida
                    </span>
                  ) : shift.status === 'noshow' ? (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Ausente
                    </span>
                  ) : (
                    <span className="text-blue-600 font-medium">En proceso / Pendiente</span>
                  )}
                </div>
                {shift.payment_status === 'paid' && (
                  <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                    <span className="text-gray-600">Wallet Status:</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-black uppercase tracking-tighter">
                      LIQUIDADO
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet / Payment Action */}
            {shift.status === 'confirmed' && (
               <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                 <div className="flex items-center gap-2 text-green-800">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-bold text-sm">Liquidación Express</span>
                 </div>
                 <p className="text-xs text-green-700 leading-tight">
                   Si la guardia terminó, confirmala para liberar los honorarios ($ {shift.price.toLocaleString('es-AR')}) al Wallet del profesional.
                 </p>
                 <button 
                    onClick={handleConfirmCompletionAndPay}
                    disabled={processingPayment}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {processingPayment ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <CheckCircle2 className="w-4 h-4" />
                   )}
                   Confirmar Realización y Pagar
                 </button>
               </div>
            )}
            
            {/* Rating System */}
            {shift.status === 'completed' || (isConfirmed && new Date(shift.date) <= new Date()) ? (
              <div className="mt-4 p-4 bg-blue-50 bg-opacity-50 rounded-lg border border-blue-100">
                {shift.rating_for_doctor ? (
                   <div className="space-y-2">
                     <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        Calificaste a este profesional
                     </h5>
                     <div className="flex gap-1">
                       {[1,2,3,4,5].map(star => (
                         <Star key={star} className={`w-4 h-4 ${star <= shift.rating_for_doctor! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                       ))}
                     </div>
                     {shift.review_for_doctor && <p className="text-sm text-gray-700 italic border-l-2 border-yellow-300 pl-2 mt-2">{shift.review_for_doctor}</p>}
                   </div>
                ) : (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-900">Evalúa al profesional</h5>
                    <p className="text-xs text-gray-600">24hs después de la fecha de la guardia, puedes calificar el desempeño para mantener la calidad de la red.</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <button key={star} onClick={() => setRatingVal(star)} className="focus:outline-none hover:scale-110 transition-transform">
                          <Star className={`w-6 h-6 ${star <= ratingVal ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      placeholder="Deja un comentario sobre su desempeño (opcional)..." 
                      value={reviewTxt}
                      onChange={e => setReviewTxt(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (window.confirm('¿Confirmas que el profesional NO asistió a la guardia? Esto afectará su reputación.')) {
                            onMarkNoShow(shift.id, assignedDoctor.id);
                          }
                        }}
                        className="flex-1 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition-colors border border-red-200"
                      >
                        Marcar Inasistencia
                      </button>
                      <button 
                        onClick={submitRating}
                        disabled={submittingRating || ratingVal === 0}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {submittingRating ? 'Enviando...' : 'Confirmar y Evaluar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : applicants.length > 0 ? (
          <div className="space-y-3 overflow-y-auto max-h-48 pr-2">
            {applicants.map(applicant => (
              <div key={applicant.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <UserCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <button onClick={() => onViewProfile(applicant.id)} className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors border-b border-transparent hover:border-blue-600">{applicant.name}</button>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        {applicant.rating ? `★ ${applicant.rating.toFixed(1)}` : '★ Nuevo'}
                      </div>
                      {applicant.completion_rate && (
                        <div className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                          {applicant.completion_rate}% Asistencia
                        </div>
                      )}
                    </div>
                    {shift.is_negotiable && shift.applicant_proposals?.[applicant.id] && (
                      <div className="mt-1 text-xs font-semibold text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded">
                        Oferta: ${shift.applicant_proposals[applicant.id].toLocaleString('es-AR')}
                      </div>
                    )}
                    {shift.confirmed_applicants?.includes(applicant.id) && (
                      <div className="mt-1 ml-1 text-[10px] font-bold text-yellow-700 bg-yellow-50 inline-block px-1.5 py-0.5 rounded border border-yellow-100 uppercase tracking-tighter">
                        Confirmado
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => onAssign(shift.id, applicant.id)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
                >
                  Asignar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
            <Users className="w-10 h-10 text-gray-300 mb-2" />
            <p className="font-medium text-gray-900">Aún no hay postulantes</p>
            <p className="text-sm mt-1 max-w-[250px]">
              Te notificaremos cuando un profesional se postule. Al aceptar a un profesional, le compartiremos tus datos para coordinar.
            </p>
          </div>
        )}
      </div>

      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cancelar oportunidad?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Estás a punto de eliminar la publicación para <strong>{shift.specialty}</strong>. Si ya hay médicos postulados, se les notificará de la cancelación. Esta acción es irreversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
              >
                No, mantener
              </button>
              <button 
                onClick={() => {
                  setIsCancelModalOpen(false);
                  onCancel();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
