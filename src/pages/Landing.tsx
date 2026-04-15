import { ArrowRight, Stethoscope, Building2, Clock, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User } from '../types';

interface LandingProps {
  onLoginSuccess: (user: User) => void;
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'clinic' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async (role: 'doctor' | 'clinic') => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // User already exists, log them in
        onLoginSuccess(userDoc.data() as User);
      } else {
        // New user, create profile
        const newUser: User = {
          id: user.uid,
          name: user.displayName || 'Usuario',
          email: user.email || '',
          role: role,
          ...(role === 'doctor' ? { rating: 5.0, completionRate: 100 } : {})
        };
        await setDoc(userDocRef, newUser);
        onLoginSuccess(newUser);
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      alert("Error al iniciar sesión. Por favor intenta nuevamente.");
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
          <button 
            onClick={() => handleGoogleLogin('doctor')}
            disabled={loading}
            className="group flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
          >
            <Stethoscope className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            Ingresar como Médico
          </button>
          <button 
            onClick={() => handleGoogleLogin('clinic')}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Building2 className="w-5 h-5" />
            Ingresar como Institución / Organizador
          </button>
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
