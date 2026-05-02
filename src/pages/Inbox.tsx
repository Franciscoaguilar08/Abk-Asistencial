import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Message, Shift } from '../types';
import { MessageSquare, UserCircle, Calendar, ArrowRight, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ChatModal from '../components/ChatModal';
import { Skeleton } from '../components/Skeleton';

interface InboxProps {
  user: User;
}

interface Conversation {
  shiftId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  shiftTitle: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

export default function Inbox({ user }: InboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ shiftId: string; receiverId: string; receiverName: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages to refresh inbox
    const channel = supabase
      .channel('inbox_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchConversations = async () => {
    try {
      // 1. Fetch all messages involving the user
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      if (!messages || messages.length === 0) {
        setConversations([]);
        return;
      }

      // 2. Group by conversation (otherUserId + shiftId)
      const convMap = new Map<string, any>();

      for (const msg of messages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.shift_id}_${otherUserId}`;

        if (!convMap.has(key)) {
          convMap.set(key, {
            shiftId: msg.shift_id,
            otherUserId: otherUserId,
            lastMessage: msg.content,
            lastMessageDate: msg.created_at,
          });
        }
      }

      const convList = Array.from(convMap.values());

      // 3. Enrich with user names and shift titles
      const enrichedConvs = await Promise.all(convList.map(async (conv) => {
        // Fetch Other User
        const { data: otherUser } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', conv.otherUserId)
          .single();

        // Fetch Shift
        const { data: shift } = await supabase
          .from('shifts')
          .select('specialty, type')
          .eq('id', conv.shiftId)
          .single();

        return {
          ...conv,
          otherUserName: otherUser?.name || 'Usuario',
          otherUserRole: otherUser?.role || 'user',
          shiftTitle: shift ? `${shift.specialty} (${shift.type})` : 'Guardia Eliminada',
          unreadCount: 0 // Logic for unread could be added later if we add a 'read' column to messages
        };
      }));

      setConversations(enrichedConvs);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.otherUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.shiftTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mensajes</h1>
          <p className="text-gray-500">Historial de conversaciones con profesionales e instituciones.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o guardia..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex gap-4">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => (
              <div 
                key={`${conv.shiftId}_${conv.otherUserId}`}
                onClick={() => setActiveChat({ shiftId: conv.shiftId, receiverId: conv.otherUserId, receiverName: conv.otherUserName })}
                className="p-4 hover:bg-blue-50/30 transition-colors cursor-pointer group"
              >
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-full border border-gray-100 shrink-0 flex items-center justify-center ${conv.otherUserRole === 'doctor' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                    <UserCircle className={`w-8 h-8 ${conv.otherUserRole === 'doctor' ? 'text-blue-500' : 'text-purple-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {conv.otherUserName}
                      </h3>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                        {format(new Date(conv.lastMessageDate), "d MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                      <Calendar className="w-3 h-3" />
                      <span className="truncate">{conv.shiftTitle}</span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-1 italic">
                      "{conv.lastMessage}"
                    </p>
                  </div>
                  <div className="flex items-center">
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center px-4">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No hay mensajes aún</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">
              Cuando te postules a una guardia o asignes a un profesional, podrás chatear para coordinar detalles.
            </p>
            <Link to="/" className="inline-block mt-6 text-blue-600 font-bold hover:underline text-sm">
              Explorar red →
            </Link>
          </div>
        )}
      </div>

      {activeChat && (
        <ChatModal 
          shiftId={activeChat.shiftId}
          currentUserId={user.id}
          receiverId={activeChat.receiverId}
          receiverName={activeChat.receiverName}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}
