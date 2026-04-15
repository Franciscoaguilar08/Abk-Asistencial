/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';
import Landing from './pages/Landing';
import DoctorDashboard from './pages/DoctorDashboard';
import ClinicDashboard from './pages/ClinicDashboard';
import Navbar from './components/Navbar';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data() as User);
        } else {
          // If user doesn't exist in DB yet, they are in the middle of registration
          // We'll handle this in the Landing page
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
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
