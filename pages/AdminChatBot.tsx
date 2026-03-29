import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, Maximize2, Minimize2, Loader2, ShieldCheck } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    console.log("Checking Key:", import.meta.env.VITE_GEMINI_API_KEY ? "Key Found ✅" : "Key Missing ❌");

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

      // ✅ SAFE MODEL (fixes your error)
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest"
        });

      const systemContext = `
You are the "Mess Connect AI Assistant". You help administrators manage hostel mess data.

CURRENT DATABASE DATA:
- Total Users: ${users.length}
- Total Feedback Reports: ${feedback.length}
- Current Menu: ${JSON.stringify(menu.slice(0, 10))}
- Recent Feedback Entries: ${JSON.stringify(feedback.slice(0, 5))}

INSTRUCTIONS:
- Answer ONLY using this data
- Be concise and professional
- Use bullet points if needed
- If data not found, say: "Data not available"
`;

      const prompt = `${systemContext}\n\nAdmin Request: ${userMsg}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // small delay for smooth UX
      await new Promise(res => setTimeout(res, 500));

      setMessages(prev => [...prev, { role: 'ai', text }]);

    } catch (error) {
      console.error("Gemini Error:", error);

      setMessages(prev => [...prev, {
        role: 'ai',
        text: "⚠️ AI failed. Try again or check API key/model."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-all flex items-center gap-3 z-50"
    >
      <Bot size={24} />
      <span className="font-semibold">AI Assistant</span>
    </button>
  );

  return (
    <div className={`fixed shadow-2xl border bg-white flex flex-col z-[100]
      ${isMaximized ? 'inset-6 rounded-3xl' : 'bottom-6 right-6 w-[420px] h-[650px] rounded-2xl'}`}>

      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} />
          <h3 className="font-bold text-sm">Admin Intelligence</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
          </button>
          <button onClick={() => setIsOpen(false)}>
            <X size={18}/>
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-xl max-w-[80%]
              ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
              {m.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-indigo-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask something..."
            className="flex-1 border p-2 rounded-lg"
          />
          <button onClick={handleSendMessage} className="bg-indigo-600 text-white p-2 rounded-lg">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminChatBot;