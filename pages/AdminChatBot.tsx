import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, Maximize2, Minimize2, Loader2, Database, MessageSquare, ShieldCheck } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Defining the shape of your data based on Mess Connect / VDX structure
interface AdminChatBotProps {
  feedback: any[];
  users: any[];
  menu: any[];
  isFullScreen?: boolean;
}

const AdminChatBot: React.FC<AdminChatBotProps> = ({ feedback, users, menu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: "Hello Admin! I've synced with the database. How can I help you analyze the mess operations today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Initialize Gemini with your Vite Env Variable
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // 2. Construct the Database Context
      // This allows Gemini to "see" your current Supabase/Firebase data
      const systemContext = `
        You are the "Mess Connect AI Assistant". You help administrators manage hostel mess data.
        
        CURRENT DATABASE DATA:
        - Total Students/Users: ${users.length}
        - Total Feedback Reports: ${feedback.length}
        - Current Menu: ${JSON.stringify(menu.slice(0, 10))}
        - Recent Feedback Entries: ${JSON.stringify(feedback.slice(0, 5))}

        INSTRUCTIONS:
        - Use the data above to answer questions.
        - If asked about "reports" or "complaints", summarize the feedback.
        - If asked about "users", provide counts or roles.
        - Keep answers professional, concise, and use bullet points for lists.
        - If the data isn't available, say: "I don't see that specific data in the current database logs."
      `;

      const prompt = `${systemContext}\n\nAdmin Request: ${userMsg}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: 'ai', text: text }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "I encountered an error connecting to the AI engine. Please check your API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Floating Trigger Button
  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.4)] hover:scale-110 transition-all flex items-center gap-3 active:scale-95 z-50 group"
    >
      <div className="relative">
        <Bot size={24} />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-indigo-600 rounded-full animate-pulse"></span>
      </div>
      <span className="font-semibold pr-1">AI Assistant</span>
    </button>
  );

  return (
    <div className={`fixed transition-all duration-500 ease-out shadow-2xl border border-slate-200 bg-white flex flex-col z-[100] overflow-hidden
      ${isMaximized ? 'inset-6 rounded-3xl' : 'bottom-6 right-6 w-[420px] h-[650px] rounded-2xl'}`}>
      
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">Admin Intelligence</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-indigo-100 uppercase font-black tracking-widest">Live Sync: ${users.length} Users</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {isMaximized ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18}/>
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/80">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm 
                ${m.role === 'user' ? 'bg-indigo-600' : 'bg-white border text-indigo-600'}`}>
                {m.role === 'user' ? <User size={16} className="text-white"/> : <Bot size={16}/>}
              </div>
              <div className={`p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm whitespace-pre-wrap
                ${m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-indigo-500 animate-pulse">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-xs font-bold tracking-wider uppercase">Analyzing Database...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about feedback, menu or users..."
            className="flex-1 bg-transparent outline-none text-[14px] p-2 text-slate-700 placeholder:text-slate-400"
          />
          <button 
            disabled={isLoading}
            onClick={handleSendMessage}
            className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:bg-slate-300 shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          Powered by Gemini 1.5 Flash • Context: {feedback.length} Reports
        </p>
      </div>
    </div>
  );
};

// Simple User Icon helper
const User = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

export default AdminChatBot;