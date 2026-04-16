import { Activity, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { Link } from 'react-router-dom';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
              <Activity className="h-8 w-8" />
              <span className="font-bold text-xl tracking-tight">Abk Asistencial</span>
            </Link>
          </div>
          
          {currentUser && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <span className="font-medium hidden sm:inline-block flex items-center gap-1">
                  {currentUser.name}
                  {currentUser.verification_status === 'verified' && (
                    <ShieldCheck className="w-4 h-4 text-blue-600" title="Cuenta verificada" />
                  )}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium capitalize hidden sm:inline-block">
                  {currentUser.role === 'clinic' ? 'Institución' : 'Médico'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
