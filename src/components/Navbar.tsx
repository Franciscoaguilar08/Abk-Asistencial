import { Activity, LogOut, User as UserIcon, ShieldCheck, Bell } from 'lucide-react';
import { User, AppNotification } from '../types';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    fetchNotifications();
    
    // Auto-refresh periodically to keep notifications "live"
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    const channel = supabase
      .channel(`notifications_${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          // Only add if it doesn't exist yet (in case both websocket and polling catch it)
          setNotifications(prev => prev.some(n => n.id === newNotif.id) ? prev : [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data as AppNotification[]);
    } catch(err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async () => {
    if (!currentUser || unreadCount === 0) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
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
              
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    if (!isDropdownOpen) markAsRead();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-40 overflow-hidden animate-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
                        {unreadCount > 0 && <span className="text-xs text-blue-600 font-medium">{unreadCount} nuevas</span>}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map(notif => (
                            <div key={notif.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!notif.read ? 'bg-blue-50/50' : 'bg-white'}`}>
                              <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.created_at).toLocaleDateString()}</p>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-gray-500">
                            No tienes notificaciones
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 border-l border-gray-200 pl-4">
                <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <span className="font-medium hidden sm:inline-flex items-center gap-1 text-gray-900 border-b border-transparent hover:border-blue-600">
                    {currentUser.name}
                    {currentUser.verification_status === 'verified' && (
                      <span title="Cuenta verificada"><ShieldCheck className="w-4 h-4 text-blue-600" /></span>
                    )}
                  </span>
                </Link>
                <span className="px-2 py-0.5 ml-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium capitalize hidden sm:inline-block">
                  {currentUser.role === 'clinic' ? 'Institución' : 'Profesional'}
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
