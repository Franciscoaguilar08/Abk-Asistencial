import { Stethoscope, Building2, ShieldCheck, Zap, Mail, Lock, BadgeCheck, MessageSquareLock, CheckCircle2, Activity, Play, ChevronRight, Check } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LandingProps {
  onLoginSuccess: (user: User) => void;
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'clinic' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openAuth = (initialMode: 'login' | 'register', role?: 'doctor' | 'clinic') => {
    setMode(initialMode);
    if (role) setSelectedRole(role);
    setShowAuthModal(true);
    setEmailSent(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (mode === 'register') {
      if (!selectedRole || !acceptedTerms) {
        alert("Debes seleccionar un rol y aceptar los términos para continuar.");
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        alert("La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 símbolo especial.");
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
          alert('Esta cuenta ya está registrada. Por favor, inicia sesión.');
          setMode('login');
        } else {
          setEmailSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) throw new Error('Credenciales inválidas.');
          if (error.message.includes('Email not confirmed')) throw new Error('Por favor confirma tu correo.');
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Auth error", error);
      alert(error.message || "Error al procesar la solicitud. Por favor intenta nuevamente.");
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
              <button onClick={() => scrollTo('para-quien')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Para quién es</button>
              <button onClick={() => scrollTo('seguridad')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Seguridad</button>
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
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight"
            >
              Encontrá o cubrí <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                guardias médicas en minutos
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Conectamos profesionales de la salud con instituciones que necesitan resolver guardias y coberturas de forma rápida, confiable y verificada.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button 
                onClick={() => openAuth('register', 'doctor')}
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-full font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Stethoscope className="w-5 h-5" />
                Soy profesional
              </button>
              <button 
                onClick={() => openAuth('register', 'clinic')}
                className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Building2 className="w-5 h-5" />
                Soy institución
              </button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <button onClick={() => openAuth('login')} className="text-sm text-gray-500 hover:text-gray-900 font-medium">
                ¿Ya tenés cuenta? <span className="text-blue-600 hover:underline">Ingresar</span>
              </button>
            </motion.div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">Cómo funciona</h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">1. Publicás o buscás</h3>
                <p className="text-gray-600 leading-relaxed">
                  Instituciones publican coberturas. Profesionales exploran oportunidades según disponibilidad, ubicación y tipo de trabajo.
                </p>
              </div>
              <div className="text-center relative">
                <div className="hidden md:block absolute top-8 -left-6 w-12 border-t-2 border-dashed border-gray-200" />
                <div className="w-16 h-16 mx-auto bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">2. Verificación</h3>
                <p className="text-gray-600 leading-relaxed">
                  Todos los perfiles pasan por validación de matrícula y revisión básica para dar más confianza y seguridad.
                </p>
                <div className="hidden md:block absolute top-8 -right-6 w-12 border-t-2 border-dashed border-gray-200" />
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">3. Elegís y trabajás</h3>
                <p className="text-gray-600 leading-relaxed">
                  La institución elige al profesional o el profesional acepta la oportunidad. Resolvé sin cadenas interminables de WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PARA QUIEN ES */}
        <section id="para-quien" className="py-24 bg-gray-50 border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">Pensado para quienes necesitan resolver rápido</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Clínicas</h3>
                <p className="text-gray-600">Para cubrir vacantes, reemplazos o guardias con mayor agilidad.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Sanatorios</h3>
                <p className="text-gray-600">Para organizar coberturas con profesionales validados y reducir fricción operativa.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Profesionales freelance</h3>
                <p className="text-gray-600">Para encontrar guardias y oportunidades laborales de forma más simple, clara y ordenada.</p>
              </div>
            </div>
          </div>
        </section>

        {/* DIFERENCIAL */}
        <section className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-16">Por qué usar esta plataforma</h2>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Validación de matrícula</h4>
                <p className="text-gray-600 leading-relaxed">Buscamos que los profesionales que participan estén correctamente identificados y verificados.</p>
              </div>
              <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Rapidez</h4>
                <p className="text-gray-600 leading-relaxed">Menos tiempo buscando, menos idas y vueltas, más resolución.</p>
              </div>
              <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <MessageSquareLock className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Sin intermediarios informales</h4>
                <p className="text-gray-600 leading-relaxed">Todo en un mismo lugar, con mayor orden, trazabilidad y confianza.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CONFIANZA */}
        <section id="seguridad" className="py-24 bg-blue-900 text-white">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Más seguridad para trabajar mejor</h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-12">
              Perfiles profesionales, datos organizados y un sistema pensado para dar más transparencia al vínculo entre instituciones y profesionales.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="flex items-center gap-2 bg-blue-800/50 border border-blue-700 px-4 py-2 rounded-full font-medium">
                <Check className="w-4 h-4 text-blue-300" /> Profesionales verificados
              </span>
              <span className="flex items-center gap-2 bg-blue-800/50 border border-blue-700 px-4 py-2 rounded-full font-medium">
                <Check className="w-4 h-4 text-blue-300" /> Coberturas más ágiles
              </span>
              <span className="flex items-center gap-2 bg-blue-800/50 border border-blue-700 px-4 py-2 rounded-full font-medium">
                <Check className="w-4 h-4 text-blue-300" /> Información centralizada
              </span>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6">Empezá hoy</h2>
            <p className="text-lg text-gray-600 mb-10">
              Ya seas profesional o institución, la plataforma está pensada para hacer más simple la cobertura de guardias y oportunidades.
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
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {mode === 'login' ? 'Ingresar a ABK' : 'Crear tu cuenta'}
                  </h3>
                  <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 p-2 rounded-full transition">
                    &times;
                  </button>
                </div>

                {emailSent ? (
                  <div className="text-center space-y-4 py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">¡Revisa tu correo!</h3>
                    <p className="text-gray-600 text-sm">Validá tu email haciendo clic en el enlace que enviamos a <strong>{email}</strong>.</p>
                  </div>
                ) : (
                  <form onSubmit={handleAuthSubmit} className="space-y-5">
                    {mode === 'register' && !selectedRole && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button type="button" onClick={() => setSelectedRole('doctor')} className={`p-3 border-2 rounded-xl flex flex-col items-center gap-2 ${selectedRole === 'doctor' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          <Stethoscope className="w-6 h-6" /> <span className="text-sm font-bold">Profesional</span>
                        </button>
                        <button type="button" onClick={() => setSelectedRole('clinic')} className={`p-3 border-2 rounded-xl flex flex-col items-center gap-2 ${selectedRole === 'clinic' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          <Building2 className="w-6 h-6" /> <span className="text-sm font-bold">Institución</span>
                        </button>
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
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
