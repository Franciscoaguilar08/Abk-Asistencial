/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { User } from './types';
import Landing from './pages/Landing';
import DoctorDashboard from './pages/DoctorDashboard';
import ClinicDashboard from './pages/ClinicDashboard';
import Navbar from './components/Navbar';

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
        const newUser = {
          id: userId,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
          email: session.user.email,
          role: session.user.user_metadata?.role || 'doctor',
          ...(session.user.user_metadata?.role === 'doctor' ? { rating: 5.0, completion_rate: 100 } : {})
        };
        
        const { data: insertedData, error: insertError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single();
          
        if (insertError) throw insertError;
        setCurrentUser(insertedData as User);
      } else if (error) {
        throw error;
      } else if (data) {
        setCurrentUser(data as User);
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
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
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
                  <Navigate to={currentUser.role === 'doctor' ? '/doctor' : '/clinic'} replace />
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}
