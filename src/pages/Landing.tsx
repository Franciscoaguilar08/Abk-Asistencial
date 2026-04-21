import { Stethoscope, Building2, ShieldCheck, Zap, Mail, Lock, BadgeCheck, MessageSquareLock, CheckCircle2, Activity, Play, ChevronRight, Check, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LandingProps {
  onLoginSuccess: (user: User) => void;
}

const ROLES = [
  "médicos",
  "enfermeros",
  "kinesiólogos",
  "odontólogos",
  "paramédicos",
  "psicólogos",
  "técnicos",
  "administrativos"
];

function TypewriterEffect() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROLES.length);
    }, 2500); // Change roughly every 2.5 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <span className="inline-block text-blue-600">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="inline-block"
        >
          {ROLES[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'clinic' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showAuthModal || showRolePicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAuthModal, showRolePicker]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        checkProfile(session.user);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionUser(session.user);
        checkProfile(session.user);
      } else {
        setSessionUser(null);
        setShowRolePicker(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfile = async (authUser: any) => {
    const { data: existingProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error && error.code === 'PGRST116') {
      const metadataRole = authUser.user_metadata?.role;
      if (metadataRole) {
        // Auto-create profile if metadata has role (e.g. from email/pass registration)
        try {
          const newUser = {
            id: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Usuario',
            email: authUser.email,
            avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
            role: metadataRole,
            verification_status: 'unverified'
          };
          const { data: createdProfile, error: insertError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();
          
          if (!insertError && createdProfile) {
            onLoginSuccess(createdProfile as User);
            return;
          }
        } catch (e) {
          console.error("Auto-profile creation failed", e);
        }
      }
      
      // Session exists but no profile in public.users -> Show role picker
      setSessionUser(authUser);
      setShowRolePicker(true);
    } else if (existingProfile) {
      onLoginSuccess(existingProfile as User);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openAuth = (initialMode: 'login' | 'register', role?: 'doctor' | 'clinic') => {
    setMode(initialMode);
    if (role) setSelectedRole(role);
    setAuthError(null);
    setUnconfirmedEmail(false);
    setResendSuccess(false);
    setSignUpSuccess(false);
    setShowAuthModal(true);
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setResendSuccess(true);
      setAuthError(null);
    } catch (error: any) {
      console.error("Resend error", error);
      setAuthError(error.message || "Error al reenviar el correo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError(null);
    setUnconfirmedEmail(false);
    setResendSuccess(false);
    
    if (mode === 'register') {
      if (!selectedRole || !acceptedTerms) {
        setAuthError("Debes seleccionar un rol y aceptar los términos para continuar.");
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        setAuthError("La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 símbolo especial.");
        return;
      }
    }

    try {
      setLoading(true);
      
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: selectedRole }
          }
        });

        if (error) throw error;
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setAuthError('Esta cuenta ya está registrada. Por favor, inicia sesión.');
          setMode('login');
        } else if (!data.session && data.user) {
          // This happens if "Confirm Email" is enabled
          setSignUpSuccess(true);
          setUnconfirmedEmail(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('El correo o la contraseña son incorrectos. Verificá los datos o asegúrate de haber creado tu cuenta primero.');
          }
          if (error.message.includes('Email not confirmed')) {
            setUnconfirmedEmail(true);
            return;
          }
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Auth error", error);
      setAuthError(error.message || "Error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google Auth error", error);
      alert(error.message || "Error al conectar con Google.");
      setLoading(false);
    }
  };

  const handleCompleteSocialProfile = async () => {
    if (!selectedRole || !acceptedTerms || !sessionUser) {
      alert("Debes seleccionar un rol y aceptar los términos.");
      return;
    }

    try {
      setLoading(true);
      const newUser = {
        id: sessionUser.id,
        name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Usuario',
        email: sessionUser.email,
        avatar: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || null,
        role: selectedRole,
        verification_status: 'unverified' // Force onboarding completion
      };

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (error) throw error;
      
      setShowRolePicker(false);
      onLoginSuccess(data as User);
    } catch (error: any) {
      console.error("Error creating social profile", error);
      alert("Error al completar tu perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">ABK Asistencial</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo('como-funciona')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Cómo funciona</button>
              <button onClick={() => scrollTo('por-que')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Por qué usar</button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => openAuth('login')} className="text-sm font-medium text-gray-700 hover:text-blue-600 px-3 py-2 transition">
                Ingresar
              </button>
              <button onClick={() => openAuth('register')} className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition shadow-sm hover:shadow-md">
                Crear cuenta
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16 flex-grow">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-gray-50 opacity-90" />
          <div className="max-w-5xl mx-auto px-4 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight flex flex-col items-center"
            >
              <span className="mb-2">Encontrá o cubrí</span>
              <span className="flex flex-col md:flex-row items-center md:gap-3">
                <span className="shrink-0">trabajos para</span>
                <div className="text-center md:text-left mt-2 md:mt-0 min-w-[280px] md:min-w-[400px]">
                  <TypewriterEffect />
                </div>
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Conectamos profesionales del sector salud con clínicas, sanatorios y <span className="text-gray-900 font-medium">productores de eventos</span> que necesitan resolver coberturas médicas de forma rápida y verificada.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col items-center gap-2 text-sm font-medium text-gray-500"
            >
              <p className="uppercase tracking-widest text-[10px] font-bold text-gray-400">Perfecto para coberturas en:</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl px-4">
                {['Clínicas', 'Sanatorios', 'Maratones', 'Torneos de Fútbol', 'Recitales', 'Eventos Deportivos', 'Centros Médicos'].map((item) => (
                  <span key={item} className="px-3 py-1 bg-white text-gray-600 rounded-full border border-gray-200 shadow-sm hover:border-blue-200 hover:text-blue-600 transition-colors">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12"
            >
              <button 
                onClick={() => openAuth('register', 'doctor')}
                className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-200"
              >
                <Stethoscope className="w-5 h-5" />
                Soy profesional
              </button>
              <button 
                onClick={() => openAuth('register', 'clinic')}
                className="w-full sm:w-auto px-10 py-5 bg-white border-2 border-gray-900 text-gray-900 rounded-full font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Building2 className="w-5 h-5" />
                Soy institución
              </button>
            </motion.div>
          </div>
        </section>

        {/* COMO FUNCIONA - HORIZONTAL TIMELINE */}
        <section id="como-funciona" className="py-24 bg-white border-t border-gray-100 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-20 tracking-tight">Cómo funciona</h2>
            
            <div className="relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-0.5 bg-gray-100" />
              
              <div className="flex flex-col md:flex-row justify-between gap-12 md:gap-4">
                {[
                  {
                    step: '1',
                    icon: Activity,
                    title: 'Publicás o buscás',
                    desc: 'Instituciones publican coberturas. Profesionales exploran oportunidades según disponibilidad y ubicación.',
                    color: 'blue'
                  },
                  {
                    step: '2',
                    icon: ShieldCheck,
                    title: 'Verificación',
                    desc: 'Todos los perfiles pasan por validación de matrícula y revisión básica para asegurar confianza.',
                    color: 'green'
                  },
                  {
                    step: '3',
                    icon: CheckCircle2,
                    title: 'Elegís y trabajás',
                    desc: 'Resolvé las coberturas sin cadenas de WhatsApp. Todo el proceso centralizado en un solo lugar.',
                    color: 'purple'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center text-center flex-1 px-4">
                    <div className={`w-14 h-14 rounded-full bg-white border-4 border-gray-50 flex items-center justify-center mb-6 shadow-sm`}>
                      <span className="text-xl font-black text-gray-900">{item.step}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-500 max-w-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMA VS SOLUCIÓN */}
        <section className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-4">
            <div className="space-y-12">
              {[
                {
                  problem: "Grupos de WhatsApp, llamadas de último momento, acuerdos de palabra",
                  solution: "Todo en un lugar, con registro y trazabilidad"
                },
                {
                  problem: "Si un médico no aparece, la clínica no tiene forma de dejar registro",
                  solution: "Sistema de ratings que construye reputación real"
                },
                {
                  problem: "Si una clínica paga mal, el médico no puede advertirle a otros",
                  solution: "Transparencia en ambas direcciones"
                }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-center gap-8 md:gap-16 border-b border-gray-50 pb-12 last:border-0 last:pb-0">
                  <div className="flex-1 w-full">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Problema</p>
                    <p className="text-xl md:text-2xl font-medium text-gray-400 italic leading-snug">
                      "{item.problem}"
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <ChevronRight className="w-8 h-8 text-blue-200" />
                  </div>
                  <div className="flex-1 w-full bg-blue-50/50 p-6 md:p-8 rounded-3xl border border-blue-100/50 shadow-sm">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Solución ABK</p>
                    <p className="text-xl md:text-2xl font-black text-blue-900 leading-tight">
                      {item.solution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-20 text-center">
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
              >
                No inventamos el mercado. <span className="text-blue-600 underline decoration-blue-200 decoration-4 underline-offset-8">Lo ordenamos.</span>
              </motion.p>
            </div>
          </div>
        </section>

        {/* POR QUÉ USAR - EDITORIAL STYLE */}
        <section id="por-que" className="py-24 bg-gray-50 border-y border-gray-200">
          <div className="max-w-4xl mx-auto px-4">
            <div className="mb-16 text-left">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Por qué usar esta plataforma</h2>
              <p className="text-gray-600 text-lg">Diseñamos ABK para resolver los puntos de dolor más comunes en la gestión de salud.</p>
            </div>
            
            <div className="space-y-8">
              {[
                {
                  icon: BadgeCheck,
                  title: 'Validación de matrícula real',
                  desc: 'Eliminamos la incertidumbre. Cada profesional que ves en la plataforma ha pasado por un proceso de carga y revisión de sus credenciales profesionales.',
                  color: 'bg-blue-100 text-blue-600'
                },
                {
                  icon: Zap,
                  title: 'Velocidad de respuesta',
                  desc: 'Las guardias se cubren en minutos, no en días. Nuestro sistema de notificaciones asegura que la oferta llegue al profesional indicado al instante.',
                  color: 'bg-amber-100 text-amber-600'
                },
                {
                  icon: MessageSquareLock,
                  title: 'Versatilidad de uso',
                  desc: 'Desde una guardia en un sanatorio hasta la cobertura de una maratón o un torneo de fútbol. ABK te permite encontrar al profesional adecuado para cualquier escenario de salud.',
                  color: 'bg-emerald-100 text-emerald-600'
                }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-6 p-8 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                  <div className={`shrink-0 w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600 text-lg leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Empezá hoy con ABK</h2>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              La solución flexible para instituciones médicas, productores de eventos y coordinadores de salud que buscan profesionalismo y rapidez.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => openAuth('register', 'doctor')} className="px-8 py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition shadow-md">
                Crear cuenta como profesional
              </button>
              <button onClick={() => openAuth('register', 'clinic')} className="px-8 py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition shadow-md">
                Crear cuenta como institución
              </button>
              <button onClick={() => openAuth('login')} className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-50 transition">
                Ingresar
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* AUTH MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 overflow-y-auto">
                {signUpSuccess ? (
                  <div className="text-center py-8">
                    <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-10 h-10 text-blue-600 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-4">¡Revisá tu email!</h3>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                      Te enviamos un link de activación a <span className="font-bold text-gray-900">{email}</span>.<br />
                      Hacé clic para activar tu cuenta y empezar a trabajar.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm text-gray-500 mb-8">
                      <p className="flex items-start gap-2 text-left">
                        <BadgeCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        Asegúrate de revisar la carpeta de <span className="font-bold">Spam</span> si no lo ves en unos minutos.
                      </p>
                    </div>
                    <button 
                      onClick={() => { setSignUpSuccess(false); setMode('login'); }}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition"
                    >
                      Volver al login
                    </button>
                    <button 
                      onClick={handleResendConfirmation}
                      disabled={loading}
                      className="mt-6 text-sm text-blue-600 font-bold hover:underline"
                    >
                      {loading ? 'Reenviando...' : '¿No recibiste nada? Reenviar link'}
                    </button>
                    {resendSuccess && (
                      <p className="mt-2 text-xs text-green-600 font-medium">¡Link reenviado con éxito!</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {mode === 'login' ? 'Ingresar a ABK' : 'Crear tu cuenta'}
                      </h3>
                      <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 p-2 rounded-full transition">
                        &times;
                      </button>
                    </div>

                    <div className="space-y-4 mb-6">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuar con Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500 font-medium">o con email</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-5">
                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                       <XCircle className="w-4 h-4 shrink-0" />
                       <span>{authError}</span>
                    </div>
                  )}

                  {unconfirmedEmail && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-3">
                      <div className="flex items-start gap-3 text-orange-800">
                        <Mail className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed">
                          <p className="font-bold">Correo no confirmado</p>
                          <p>Todavía no activaste tu cuenta. Revisá tu casilla (spam incluido).</p>
                        </div>
                      </div>
                      {!resendSuccess ? (
                        <button 
                          type="button" 
                          onClick={handleResendConfirmation}
                          disabled={loading}
                          className="w-full py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition"
                        >
                          {loading ? 'Reenviando...' : 'Reenviar correo de confirmación'}
                        </button>
                      ) : (
                        <div className="py-2 px-3 bg-green-100 text-green-700 rounded-lg text-[11px] font-bold text-center">
                          ¡Correo reenviado con éxito!
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'register' && (
                      <div className="space-y-3 mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Elegí tu tipo de cuenta</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button" 
                            onClick={() => setSelectedRole('doctor')} 
                            className={`p-3 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${selectedRole === 'doctor' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:border-gray-200 bg-gray-50/50'}`}
                          >
                            <Stethoscope className="w-6 h-6" /> 
                            <span className="text-sm font-bold">Soy Profesional</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setSelectedRole('clinic')} 
                            className={`p-3 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${selectedRole === 'clinic' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:border-gray-200 bg-gray-50/50'}`}
                          >
                            <Building2 className="w-6 h-6" /> 
                            <span className="text-sm font-bold">Soy Institución</span>
                          </button>
                        </div>
                        {selectedRole && (
                          <div className={cn(
                            "text-[11px] font-medium px-3 py-2 rounded-lg border flex items-center gap-2 bg-opacity-30",
                            selectedRole === 'doctor' ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-indigo-50 border-indigo-100 text-indigo-700"
                          )}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Creando cuenta para {selectedRole === 'doctor' ? 'médicos y profesionales de salud' : 'clínicas, sanatorios y productores'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Correo electrónico</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Contraseña</label>
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? "Crea una contraseña segura" : "Tu contraseña"} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                      {mode === 'register' && (
                        <p className="text-[11px] text-gray-500 mt-2 px-1 leading-tight">Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo (@$!%*?&).</p>
                      )}
                    </div>

                    {mode === 'register' && (
                      <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                        <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-800 leading-relaxed">
                          <p className="font-bold mb-0.5">Validación de correo</p>
                          <p className="opacity-80">Te enviaremos un link de confirmación para activar tu cuenta de inmediato.</p>
                        </div>
                      </div>
                    )}

                    {mode === 'register' && (
                      <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <input type="checkbox" id="terms" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">Acepto que ABK Asistencial conecta a profesionales con instituciones y no es responsable de honorarios o mala praxis.</label>
                      </div>
                    )}

                    <button type="submit" disabled={loading || (mode === 'register' && !acceptedTerms)} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow disabled:opacity-50 mt-4">
                      {loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
                    </button>

                    <div className="text-center pt-2">
                      <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setSelectedRole(null); }} className="text-sm text-gray-500 hover:text-blue-600 font-medium">
                        {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
                      </button>
                    </div>
                  </form>
                </>
              )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRolePicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Casi listo!</h3>
              <p className="text-gray-600 mb-6">Solo necesitamos saber cómo vas a usar la plataforma.</p>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setSelectedRole('doctor')} 
                    className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${selectedRole === 'doctor' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md ring-2 ring-blue-100' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedRole === 'doctor' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold">Soy profesional</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedRole('clinic')} 
                    className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${selectedRole === 'clinic' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-md ring-2 ring-purple-100' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedRole === 'clinic' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold">Soy institución</span>
                  </button>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="social-terms" 
                    required 
                    checked={acceptedTerms} 
                    onChange={(e) => setAcceptedTerms(e.target.checked)} 
                    className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                  />
                  <label htmlFor="social-terms" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                    Acepto que ABK Asistencial conecta a profesionales con instituciones y no es responsable de honorarios o mala praxis.
                  </label>
                </div>

                <button 
                  onClick={handleCompleteSocialProfile}
                  disabled={loading || !selectedRole || !acceptedTerms}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? 'Preparando todo...' : 'Empezar ahora'}
                </button>
                
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setShowRolePicker(false);
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancelar registro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
