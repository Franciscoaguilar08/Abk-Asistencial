/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { User } from './types';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import DoctorDashboard from './pages/DoctorDashboard';
import ClinicDashboard from './pages/ClinicDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Feed from './pages/Feed';
import Inbox from './pages/Inbox';
import Navbar from './components/Navbar';
import OnboardingModal from './components/OnboardingModal';
import InstitutionalManagement from './pages/InstitutionalManagement';
import DoctorCalendar from './pages/DoctorCalendar';
import { MessageSquarePlus } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (session: any) => {
    try {
      const userId = session.user.id;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      // PGRST116 means no rows returned (user doesn't exist in public.users yet)
      if (error && error.code === 'PGRST116') {
        setCurrentUser(null);
      } else if (error) {
        throw error;
      } else if (data) {
        const profile = data as User;
        
        // Sync avatar with Google if not set
        const googleAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
        if (googleAvatar && !profile.avatar) {
          const { data: updatedProfile } = await supabase
            .from('users')
            .update({ avatar: googleAvatar })
            .eq('id', userId)
            .select()
            .single();
          
          if (updatedProfile) {
            setCurrentUser(updatedProfile as User);
            return;
          }
        }
        
        setCurrentUser(profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-50 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 border-t-4 border-blue-600 rounded-full animate-spin" />
        </div>
        <div className="mt-6 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-gray-900 tracking-tight">ABK ASISTENCIAL</span>
          <p className="text-gray-400 text-sm font-medium animate-pulse">Iniciando red de profesionales...</p>
        </div>
      </div>
    );
  }

  if (currentUser && currentUser.verification_status === 'unverified' && currentUser.role !== null && currentUser.email !== import.meta.env.VITE_ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <Toaster position="top-center" richColors />
        <div className="flex-1 flex items-center justify-center p-4">
          <OnboardingModal 
            user={currentUser} 
            onComplete={setCurrentUser} 
            onLogout={logout}
          />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <Toaster position="top-center" richColors />
        {!isSupabaseConfigured && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-4 text-center text-yellow-800 text-sm">
            <strong>Atención:</strong> Las variables de entorno de Supabase no están configuradas. La aplicación no funcionará correctamente hasta que agregues <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
          </div>
        )}
        <Navbar currentUser={currentUser} onLogout={logout} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route 
              path="/" 
              element={
                currentUser ? (
                  <Feed user={currentUser} />
                ) : (
                  <Landing onLoginSuccess={(user) => setCurrentUser(user)} />
                )
              } 
            />
            <Route 
              path="/doctor/*" 
              element={
                currentUser?.role === 'doctor' ? (
                  <DoctorDashboard user={currentUser} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/clinic/*" 
              element={
                currentUser?.role === 'clinic' ? (
                  <ClinicDashboard user={currentUser} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/calendar" 
              element={
                currentUser?.role === 'doctor' ? (
                  <DoctorCalendar />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/clinic-management" 
              element={
                currentUser?.role === 'clinic' ? (
                  <InstitutionalManagement />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/admin" 
              element={<AdminDashboard currentUser={currentUser} />} 
            />
            <Route 
              path="/profile" 
              element={
                currentUser ? (
                  <Profile user={currentUser} onProfileUpdate={(u) => setCurrentUser(u)} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/inbox" 
              element={
                currentUser ? (
                  <Inbox user={currentUser} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
          </Routes>
        </main>
        
        {/* Floating Beta Feedback Button */}
        {currentUser && (
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdM0NDJiFAbhAeuMBwakKP_eOCuycrhcFLw9iwHqP51zcyWHg/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <MessageSquarePlus className="w-5 h-5" />
            <span className="font-medium text-sm">Dejanos tu opinión de la fase beta</span>
          </a>
        )}
      </div>
      <Analytics />
    </Router>
  );
}
