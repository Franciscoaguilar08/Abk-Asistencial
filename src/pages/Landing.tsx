import { ArrowRight, Stethoscope, Building2, Clock, ShieldCheck, Zap, Mail } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface LandingProps {
  onLoginSuccess: (user: User) => void;
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'clinic' | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !email) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            role: selectedRole,
            name: email.split('@')[0] // Default name
          }
        }
      });

      if (error) throw error;
      setEmailSent(true);
    } catch (error) {
      console.error("Error sending magic link", error);
      alert("Error al enviar el link. Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col gap-20 py-12 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-gray-50 to-gray-50 opacity-70"></div>
      
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-8 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
          <Zap className="w-4 h-4" />
          <span>La nueva forma de conectar profesionales</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-display font-extrabold tracking-tight text-gray-900 leading-tight">
          Gestión inteligente de <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Guardias y Eventos Médicos
          </span>
        </h1>
        <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Abk Asistencial transforma la contratación médica en un sistema eficiente, transparente y escalable. 
          Conectamos instituciones y organizadores con profesionales para cubrir guardias clínicas y eventos de manera ágil y segura.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          {!selectedRole ? (
            <>
              <button 
                onClick={() => setSelectedRole('doctor')}
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
              >
                <Stethoscope className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                Ingresar como Médico
              </button>
              <button 
                onClick={() => setSelectedRole('clinic')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <Building2 className="w-5 h-5" />
                Ingresar como Institución / Organizador
              </button>
            </>
          ) : emailSent ? (
            <div className="bg-green-50 text-green-800 p-6 rounded-xl border border-green-200 max-w-md mx-auto">
              <Mail className="w-8 h-8 mx-auto mb-3 text-green-600" />
              <h3 className="font-bold text-lg mb-2">¡Revisa tu correo!</h3>
              <p>Te enviamos un link mágico a <strong>{email}</strong> para iniciar sesión sin contraseña.</p>
              <button 
                onClick={() => {setEmailSent(false); setSelectedRole(null)}}
                className="mt-4 text-sm text-green-700 underline"
              >
                Volver
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkLogin} className="w-full max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-900">
                Ingresar como {selectedRole === 'doctor' ? 'Médico' : 'Institución'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Correo electrónico</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Link Mágico'}
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Cambiar rol
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="grid md:grid-cols-3 gap-8 pt-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center rotate-3">
            <Zap className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900">Velocidad</h3>
          <p className="text-gray-600 leading-relaxed">Cubrí necesidades urgentes rápidamente. Matching inteligente entre oferta y demanda en tiempo real.</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center -rotate-3">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900">Flexibilidad</h3>
          <p className="text-gray-600 leading-relaxed">Los médicos eligen cuándo y dónde trabajar. Las clínicas publican según su necesidad real.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center rotate-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900">Confianza</h3>
          <p className="text-gray-600 leading-relaxed">Perfiles verificados, sistema de reputación y transparencia total en los pagos y condiciones.</p>
        </div>
      </section>
    </div>
  );
}
