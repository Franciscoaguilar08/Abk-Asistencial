import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shift, User, ExternalWork } from '../types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  MapPin, Clock, Briefcase, ExternalLink, Loader2, X,
  Trash2, AlertCircle, CheckCircle2, Building2
} from 'lucide-react';
import { 
  format, startOfWeek, addDays, startOfDay, isSameDay, 
  parseISO, isWithinInterval, setHours, setMinutes, 
  addWeeks, subWeeks 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function DoctorCalendar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [externalWork, setExternalWork] = useState<ExternalWork[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<ExternalWork | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(userData as User);
        fetchData(authUser.id);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const fetchData = async (userId: string) => {
    try {
      // Fetch ABK Shifts
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('assigned_doctor_id', userId)
        .in('status', ['confirmed', 'completed']);
      
      if (shiftError) throw shiftError;
      setShifts(shiftData as Shift[]);

      // Fetch External Work
      const { data: externalData, error: externalError } = await supabase
        .from('external_work')
        .select('*')
        .eq('user_id', userId);
      
      if (externalError) {
        // If table doesn't exist yet, we'll just handle it gracefully
        if (externalError.code === '42P01') {
          console.warn('external_work table not found. Please run SQL setup.');
          setExternalWork([]);
        } else {
          throw externalError;
        }
      } else {
        setExternalWork(externalData as ExternalWork[]);
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    }
  };

  const handleAddExternalWork = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const newWork = {
      user_id: user.id,
      title: formData.get('title') as string,
      location: formData.get('location') as string,
      date: formData.get('date') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      notes: formData.get('notes') as string,
      color: formData.get('color') as string || '#3b82f6'
    };

    setIsSubmitting(true);
    try {
      if (editingWork) {
        const { error } = await supabase
          .from('external_work')
          .update(newWork)
          .eq('id', editingWork.id);
        if (error) throw error;
        toast.success('Calendario actualizado');
      } else {
        const { error } = await supabase.from('external_work').insert(newWork);
        if (error) {
          if (error.code === '42P01') {
             throw new Error('La tabla de trabajo externo no existe en Supabase. Contactá al soporte.');
          }
          throw error;
        }
        toast.success('Entrada de calendario agregada');
      }
      setIsModalOpen(false);
      setEditingWork(null);
      fetchData(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExternal = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    try {
      const { error } = await supabase.from('external_work').delete().eq('id', id);
      if (error) throw error;
      setExternalWork(prev => prev.filter(w => w.id !== id));
      toast.success('Eliminado correctamente');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const weekDays = [...Array(7)].map((_, i) => addDays(currentWeekStart, i));

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <CalendarIcon className="w-32 h-32 rotate-12 text-white" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight">Calendario Inteligente</h1>
          <p className="text-slate-400 mt-1 font-medium italic">Gestioná tus guardias de ABK y tus trabajos externos en un solo lugar.</p>
        </div>
        <div className="relative z-10">
          <button 
            onClick={() => {
              setEditingWork(null);
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-5 h-5" />
            Cargar Guardias Externas
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-4 py-2 hover:bg-gray-100 rounded-xl text-sm font-bold text-gray-700 transition-colors"
          >
            Hoy
          </button>
          <button 
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <h2 className="text-xl font-black text-slate-800 capitalize tracking-tight">
          {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
        </h2>

        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
           <div className="flex items-center gap-1.5">
             <div className="w-3 h-3 rounded-full bg-blue-600" />
             ABK
           </div>
           <div className="flex items-center gap-1.5">
             <div className="w-3 h-3 rounded-full bg-slate-400" />
             Externo
           </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter(s => isSameDay(parseISO(s.date), day));
          const dayExternal = externalWork.filter(w => isSameDay(parseISO(w.date), day));
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={day.toString()} 
              className={cn(
                "bg-white rounded-[2rem] border min-h-[400px] flex flex-col transition-all overflow-hidden",
                isToday ? "border-blue-200 ring-2 ring-blue-50 ring-inset shadow-md" : "border-gray-100"
              )}
            >
              <div className={cn(
                "p-4 text-center border-b font-black",
                isToday ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50/50 text-slate-500 border-gray-50"
              )}>
                <p className="text-[10px] uppercase tracking-widest opacity-80">{format(day, 'EEE', { locale: es })}</p>
                <p className="text-xl">{format(day, 'd')}</p>
              </div>

              <div className="p-3 space-y-3 flex-grow overflow-y-auto max-h-[350px]">
                {/* ABK Shifts */}
                {dayShifts.map(shift => (
                  <div 
                    key={shift.id} 
                    className="p-3 bg-blue-50 border border-blue-100 rounded-2xl space-y-1 group relative hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-black text-[11px] text-blue-700 uppercase tracking-tight">
                       <CheckCircle2 className="w-3 h-3" />
                       {shift.category}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight line-clamp-2">{shift.clinic_name}</h4>
                    <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold">
                       <div className="flex items-center gap-1">
                         <Clock className="w-3 h-3 text-blue-400" />
                         {shift.start_time} - {shift.end_time}
                       </div>
                       <div className="flex items-center gap-1">
                         <MapPin className="w-3 h-3 text-blue-400" />
                         <span className="truncate">{shift.location}</span>
                       </div>
                    </div>
                  </div>
                ))}

                {/* External Work */}
                {dayExternal.map(work => (
                  <div 
                    key={work.id} 
                    onClick={() => {
                      setEditingWork(work);
                      setIsModalOpen(true);
                    }}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl rotate-[0.5deg] space-y-1 group relative hover:border-slate-300 transition-colors cursor-pointer"
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExternal(work.id);
                      }}
                      className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-1.5 font-black text-[11px] text-slate-500 uppercase tracking-tight">
                       <Briefcase className="w-3 h-3" />
                       Externo
                    </div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight line-clamp-2">{work.title}</h4>
                    <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-bold">
                       <div className="flex items-center gap-1">
                         <Clock className="w-3 h-3 text-slate-300" />
                         {work.start_time} - {work.end_time}
                       </div>
                       {work.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          <span className="truncate">{work.location}</span>
                        </div>
                       )}
                    </div>
                  </div>
                ))}

                {dayShifts.length === 0 && dayExternal.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                     <AlertCircle className="w-10 h-10 text-gray-300 mb-1" />
                     <p className="text-[10px] font-black uppercase text-gray-500">Disponible</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
               <Building2 className="w-6 h-6 text-slate-400" />
            </div>
            <div>
               <p className="text-sm font-black text-slate-900">Multitasking Organizado</p>
               <p className="text-xs text-slate-500 font-medium italic">Sincronizá tus tareas para evitar solapamientos y burnout.</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black">
                {shifts.length} Guardias ABK
             </div>
             <div className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-black">
                {externalWork.length} Trabajos Externos
             </div>
         </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50">
               <div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                   {editingWork ? 'Editar Trabajo' : 'Trabajo Externo'}
                 </h2>
                 <p className="text-slate-500 text-xs font-medium italic">Sincronizá tu agenda fuera de ABK.</p>
               </div>
               <button onClick={() => {
                 setIsModalOpen(false);
                 setEditingWork(null);
               }} className="p-2 hover:bg-white rounded-xl transition-colors">
                 <X className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            <form onSubmit={handleAddExternalWork} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lugar / Institución</label>
                <input 
                  required 
                  name="title" 
                  type="text" 
                  defaultValue={editingWork?.title}
                  placeholder="Ej: Hospital Italiano, Consultorio, etc." 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                <input 
                  required 
                  name="date" 
                  type="date" 
                  defaultValue={editingWork?.date}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio</label>
                  <input 
                    required 
                    name="start_time" 
                    type="time" 
                    defaultValue={editingWork?.start_time}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
                  <input 
                    required 
                    name="end_time" 
                    type="time" 
                    defaultValue={editingWork?.end_time}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sede / Piso (Opcional)</label>
                <input 
                  name="location" 
                  type="text" 
                  defaultValue={editingWork?.location}
                  placeholder="Ej: Piso 4, Guardia" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm" 
                />
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 border-b-4 border-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Guardar en Calendario
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
