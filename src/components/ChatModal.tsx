import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types';
import { X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChatModalProps {
  shiftId: string;
  currentUserId: string;
  receiverId: string;
  receiverName: string;
  onClose: () => void;
}

export default function ChatModal({ shiftId, currentUserId, receiverId, receiverName, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime messages for this shift
    const channel = supabase
      .channel(`chat_${shiftId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `shift_id=eq.${shiftId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shiftId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgContent = newMessage.trim();
    setNewMessage(''); // optimistic clear

    try {
      const { data: newMsg, error } = await supabase.from('messages').insert({
        shift_id: shiftId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: msgContent
      }).select().single();

      if (error) throw error;

      // Create a notification for the receiver
      await supabase.from('notifications').insert({
        user_id: receiverId,
        title: 'Nuevo mensaje',
        message: 'Has recibido un nuevo mensaje en el chat de la guardia.',
        type: 'message',
        shift_id: shiftId
      });
      
      // Update local state immediately so we don't depend entirely on the WebSocket
      if (newMsg) {
        setMessages((prev) => {
          // Prevent duplicates if websocket *does* fire
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg as Message];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
      setNewMessage(msgContent); // restore on error
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-[60]">
      <div className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shadow-sm shrink-0">
          <div>
            <h3 className="font-bold text-lg">Chat Directo</h3>
            <p className="text-xs text-blue-100">con {receiverName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-4">
              <p className="text-sm">No hay mensajes aún.</p>
              <p className="text-xs mt-1">Escribe tu primer mensaje para coordinar los detalles finales.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <span className={`text-[10px] mt-1 block ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-200 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2 bg-gray-100 border-transparent rounded-full focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              <Send className="w-5 h-5 -ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
