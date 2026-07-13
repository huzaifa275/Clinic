import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Sparkles, Send, Calendar, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

interface BookingSession {
  step: 'idle' | 'ask_name' | 'ask_phone' | 'ask_procedure' | 'ask_day' | 'ask_time' | 'confirm';
  bookingData: any;
  isAdmin?: boolean;
}

export default function ChatbotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [session, setSession] = useState<BookingSession>({ step: 'idle', bookingData: null });
  
  // History stacks to support the interactive Back button step-backtracking
  const [sessionHistory, setSessionHistory] = useState<BookingSession[]>([]);
  const [messageHistory, setMessageHistory] = useState<Message[][]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hello 👋 I’m Aura, your dental assistant.\nHow can I help you today?\n\nOPTIONS:\n1) Book Appointment\n2) View Services\n3) Clinic Location\n4) Pricing Information\n5) Speak to Reception",
      time: 'Just now'
    }
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Global listeners for events
  useEffect(() => {
    const handleOpenBot = () => {
      setIsOpen(true);
      startBookingFlow();
    };

    window.addEventListener('open-booking-bot', handleOpenBot);
    return () => window.removeEventListener('open-booking-bot', handleOpenBot);
  }, []);

  const startBookingFlow = () => {
    setSessionHistory([]);
    setMessageHistory([]);
    
    const initialSession: BookingSession = { step: 'ask_name', bookingData: {} };
    setSession(initialSession);
    setMessages([
      {
        sender: 'bot',
        text: "Great. Let’s book your appointment. What is your full name?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleBackStep = () => {
    if (sessionHistory.length > 0 && messageHistory.length > 0) {
      const prevSession = sessionHistory[sessionHistory.length - 1];
      const prevMessages = messageHistory[messageHistory.length - 1];
      
      setSession(prevSession);
      setMessages(prevMessages);
      
      setSessionHistory(prev => prev.slice(0, -1));
      setMessageHistory(prev => prev.slice(0, -1));
    } else {
      // Fallback: reset to idle
      setSession({ step: 'idle', bookingData: null });
      setSessionHistory([]);
      setMessageHistory([]);
      setMessages([
        {
          sender: 'bot',
          text: "Hello 👋 I’m Aura, your dental assistant.\nHow can I help you today?\n\nOPTIONS:\n1) Book Appointment\n2) View Services\n3) Clinic Location\n4) Pricing Information\n5) Speak to Reception",
          time: 'Just now'
        }
      ]);
    }
  };

  const handleBackButtonClick = () => {
    setIsOpen(false);
  };

  const handleSendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query) return;

    setInputValue('');

    const userMsg: Message = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Store state in history for Back button tracking before modifying
    if (session.step !== 'idle') {
      setSessionHistory(prev => [...prev, { ...session }]);
      setMessageHistory(prev => [...prev, [...messages]]);
    }

    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          sessionState: session
        })
      });

      const data = await response.json();
      setTyping(false);

      if (data.text) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: data.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

      if (data.sessionState) {
        setSession(data.sessionState);
        // If login was successful, notify App.tsx to unlock navbar immediately
        if (data.sessionState.isAdmin || data.text.includes('Admin authentication successful')) {
          window.dispatchEvent(new CustomEvent('admin-login-success'));
        }
      }

      // If simulated WhatsApp message returned, show console log
      if (data.simulatedWhatsapp) {
        console.log(`[SIMULATED WHATSAPP OUT]: ${data.simulatedWhatsapp}`);
      }

    } catch (err) {
      console.error('Chat error:', err);
      setTyping(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'We apologize, but I had trouble establishing secure communication with the clinic server. Please check your internet connection or try again shortly.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const samplePrompts = [
    '1) Book Appointment',
    '2) View Services',
    '3) Clinic Location',
    '4) Pricing Information',
    '5) Speak to Reception'
  ];

  const handlePromptClick = (prompt: string) => {
    if (prompt.includes('Book Appointment') || prompt.startsWith('1')) {
      startBookingFlow();
    } else {
      const cleanPrompt = prompt.replace(/^\d+\)\s*/, '');
      handleSendMessage(cleanPrompt);
    }
  };

  return (
    <>
      {/* ALWAYS VISIBLE FLOATING BUTTON WITH PULSING GLOW */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-tr from-teal-500 to-teal-400 text-white shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer border border-teal-300/20"
        aria-label="Open clinical chatbot assistant"
        id="chatbot-trigger-btn"
      >
        <div className="absolute inset-0 rounded-full bg-teal-400/40 animate-ping opacity-75 group-hover:opacity-100 pointer-events-none" />
        <MessageSquare className="w-6.5 h-6.5 relative z-10" />
      </button>

      {/* CHAT DRAWER / POPUP WITH MOTION ANIMATIONS */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 w-[92%] sm:w-[390px] h-[82vh] md:h-[600px] mb-6 rounded-2xl shadow-xl overflow-hidden flex flex-col bg-slate-950 border border-slate-800/80"
            id="chatbot-drawer"
          >
            {/* Header */}
            <div className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 relative overflow-hidden">
              {/* Header Top Subtle Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-teal-500/45 to-transparent blur-xs" />
              
              {/* Stateful BACK Button (ALWAYS renders) */}
              <button
                onClick={handleBackButtonClick}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/65 transition-colors cursor-pointer absolute left-4"
                aria-label="Back or Close"
                id="chatbot-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Center: "Dental Assistant" */}
              <div className="flex flex-col items-center text-center">
                <span className="font-bold text-sm text-white font-heading tracking-wide">Dental Assistant</span>
                <span className="text-[9px] text-teal-400 font-extrabold tracking-wider uppercase flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  {session.step !== 'idle' ? 'Scheduling Active' : 'Online'}
                </span>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-grow overflow-y-auto pt-3 px-4 pb-4 space-y-4 bg-slate-950 text-slate-300">
              {messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
                  key={idx} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div 
                    className={`p-3.5 rounded-2.5xl text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-tr from-teal-600 to-teal-500 text-white rounded-tr-none shadow-md shadow-teal-700/10 border border-teal-400/20' 
                        : 'bg-slate-900 text-slate-100 border border-slate-800/60 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 font-semibold tracking-wide uppercase px-1">{msg.time}</span>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {typing && (
                <div className="flex flex-col max-w-[85%] mr-auto items-start">
                  <div className="p-3.5 rounded-2.5xl bg-slate-900 text-teal-400 border border-slate-800/60 rounded-tl-none flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Interactive Quick Reply Chips */}
            {session.step !== 'idle' && (
              <div className="px-4 py-2.5 border-t border-slate-900 bg-slate-950/90 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
                {session.step === 'ask_procedure' && [
                  '1', '2', '3', '4', '5', '6'
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(opt)}
                    className="inline-block px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/30 text-xs text-teal-400 hover:text-teal-300 font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm"
                  >
                    Option {opt}
                  </button>
                ))}

                {session.step === 'ask_day' && session.bookingData?.availableDates && (
                  session.bookingData.availableDates.map((d: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage((i + 1).toString())}
                      className="inline-block px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/30 text-xs text-teal-400 hover:text-teal-300 font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm"
                    >
                      {i + 1}) {d.formatted.split(',')[0]}
                    </button>
                  ))
                )}

                {session.step === 'ask_time' && session.bookingData?.availableTimes && (
                  session.bookingData.availableTimes.map((t: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage((i + 1).toString())}
                      className="inline-block px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/30 text-xs text-teal-400 hover:text-teal-300 font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm"
                    >
                      {i + 1}) {t}
                    </button>
                  ))
                )}

                {session.step === 'confirm' && [
                  'Yes', 'No'
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(opt)}
                    className={`inline-block px-5 py-2 rounded-full font-bold text-xs transition-all cursor-pointer whitespace-nowrap shadow-sm border ${
                      opt === 'Yes'
                        ? 'bg-teal-600 border-teal-500 text-white hover:bg-teal-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Idle Suggestions Layer */}
            {session.step === 'idle' && (
              <div className="px-4 py-2.5 border-t border-slate-900 bg-slate-950/90 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(prompt)}
                    className="inline-block px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/30 text-xs text-teal-400 hover:text-teal-300 font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800/85 flex gap-2">
              <input
                type="text"
                placeholder={session.step !== 'idle' ? "Answer bot question..." : "Ask prices, safety, or /admin login..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage(inputValue);
                }}
                className="flex-grow bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
                id="chatbot-input"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                className="p-3 bg-teal-500 text-white hover:bg-teal-400 rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center flex-shrink-0"
                aria-label="Send message"
                id="chatbot-send-btn"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
