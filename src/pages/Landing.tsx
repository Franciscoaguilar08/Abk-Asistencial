import { ArrowRight, Stethoscope, Building2, Clock, ShieldCheck, Zap, Mail, Lock, BadgeCheck, MessageSquareLock, CheckCircle2, Activity } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { motion } from 'motion/react';

interface LandingProps {
  onLoginSuccess: (user: User) => void;
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  const [mode, setMode] = useState<'login' | 'register' | null>(null);
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'clinic' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
        alert("La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, un número y un carácter especial (ej: @$!%*?&).");
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
            data: {
              role: selectedRole,
              name: email.split('@')[0]
            }
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Credenciales inválidas. Revisa tu correo y contraseña.');
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Por favor confirma tu correo electrónico antes de iniciar sesión.');
          }
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
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-gray-50">
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-white to-gray-50 opacity-80" />
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent -z-10" />

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Copy & Value Prop */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-sm font-semibold shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Plataforma Oficial Segura</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-gray-900 leading-[1.1]">
              La red médica de <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Guaridas y Eventos
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Conectamos de forma inteligente a instituciones y organizadores con profesionales de la salud. Todos los perfiles son rigurosamente validados a nivel nacional.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-sm">Validación SISA</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                <Lock className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-sm">Chat Encriptado</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Auth Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl rotate-3 scale-105 opacity-10 blur-lg" />
            
            <div className="relative bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/50">
              {!mode ? (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Activity className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Bienvenido a ABK</h2>
                  <p className="text-gray-500 text-sm">Ingresa a tu portal seguro para continuar</p>
                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={() => setMode('login')}
                      className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                    >
                      Iniciar Sesión
                    </button>
                    <button 
                      onClick={() => setMode('register')}
                      className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                    >
                      Soy nuevo (Crear cuenta)
                    </button>
                  </div>
                </div>
              ) : mode === 'register' && !selectedRole ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900 text-center">Selecciona tu perfil</h3>
                  <div className="grid gap-4">
                    <button 
                      onClick={() => setSelectedRole('doctor')}
                      className="group flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Stethoscope className="w-6 h-6 text-blue-600 group-hover:text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Médico Profesional</h4>
                        <p className="text-xs text-gray-500 mt-1">Busco y aplico a guardias/eventos</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setSelectedRole('clinic')}
                      className="group flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Building2 className="w-6 h-6 text-purple-600 group-hover:text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Institución / Organizador</h4>
                        <p className="text-xs text-gray-500 mt-1">Busco profesionales para cubrir turnos</p>
                      </div>
                    </button>
                  </div>
                  <button 
                    onClick={() => setMode(null)}
                    className="w-full text-sm text-gray-500 hover:text-gray-900 text-center font-medium"
                  >
                    ← Volver atrás
                  </button>
                </motion.div>
              ) : emailSent ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">¡Bandeja de entrada!</h3>
                  <p className="text-gray-600">Para activar tu cuenta de forma segura, haz clic en el enlace que enviamos a <strong className="text-gray-900">{email}</strong>.</p>
                  <button 
                    onClick={() => {setEmailSent(false); setMode('login'); setSelectedRole(null);}}
                    className="mt-6 w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-md"
                  >
                    Ya confirmé mi correo, Iniciar Sesión
                  </button>
                </motion.div>
              ) : (
                <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleAuthSubmit} className="space-y-5">
                  <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">
                    {mode === 'login' ? 'Iniciar Sesión' : `Registro: ${selectedRole === 'doctor' ? 'Médico' : 'Institución'}`}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Correo electrónico</label>
                      <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com" 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Contraseña</label>
                      <input 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'register' ? "Crea una contraseña segura" : "Tu contraseña"} 
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      />
                      {mode === 'register' && (
                        <p className="text-[11px] text-gray-500 mt-2 px-1 leading-tight flex items-start gap-1">
                          <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo especial (@$!%*?&).</span>
                        </p>
                      )}
                    </div>
                    
                    {mode === 'register' && (
                      <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <input 
                          type="checkbox" 
                          id="terms" 
                          required
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                          Acepto que ABK Asistencial conecta a profesionales con instituciones y no es responsable de honorarios o mala praxis.
                        </label>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading || (mode === 'register' && !acceptedTerms)}
                      className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 mt-2"
                    >
                      {loading ? 'Procesando...' : mode === 'login' ? 'Ingresar a mi portal' : 'Crear mi cuenta protegida'}
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        if (mode === 'register') setSelectedRole(null);
                        else setMode(null);
                      }}
                      className="w-full text-sm text-gray-500 hover:text-gray-900 font-medium py-2"
                    >
                      {mode === 'register' ? 'Cambiar tipo de perfil' : '← Volver atrás'}
                    </button>
                  </div>
                </motion.form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security & Features Bento Grid */}
      <section className="bg-white py-20 border-t border-gray-100 relative">
        <div className="max-w-6xl mx-auto px-4 z-10 relative">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">La seguridad médica como prioridad</h2>
            <p className="text-gray-600 text-lg">
              Diseñamos un ecosistema digital que filtra y protege cada interacción, garantizando contrataciones sólidas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <BadgeCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Auditoría SISA y AFIP</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Todos los profesionales deben validar su DNI y Matrícula Nacional/Provincial (M.N. / M.P.). Las instituciones validan su vigencia fiscal verificando su inscripción en AFIP.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-purple-50/50 p-8 rounded-3xl border border-purple-100 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <MessageSquareLock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Chats Encriptados</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                La negociación de honorarios y cruce de datos logísticos se realiza a través de nuestro mensajero interno en tiempo real, bloqueado y visible solo para las partes involucradas.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Reputación Bidireccional</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Al finalizar una guardia, ambas partes se califican. Esto genera un historial de confianza que premia a las clínicas que pagan a término y a los de asistencia impecable.
              </p>
            </motion.div>

          </div>
        </div>
      </section>
      
    </div>
  );
}
