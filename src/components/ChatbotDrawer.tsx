import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Sparkles, Send, Calendar, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../SettingsContext';

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
  const { settings } = useSettings();
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

  const suggestionPrompts = [
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
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-tr from-teal-500 to-teal-400 text-white shadow-xl shadow-teal-500/20 hover:shadow-teal-500/40 hover:scale-105 active:scale-95 transition-all duration-300 group cursor-pointer border border-teal-300/10"
        aria-label="Open clinical chatbot assistant"
        id="chatbot-trigger-btn"
      >
        <div className="absolute inset-0 rounded-full bg-teal-400/30 animate-ping opacity-60 group-hover:opacity-100 pointer-events-none" />
        <MessageSquare className="w-6 h-6 relative z-10" />
      </button>

      {/* CHAT WINDOW / POPUP WITH MOTION ANIMATIONS */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 z-50 w-auto sm:w-[410px] h-[78vh] md:h-[620px] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-slate-950 border border-slate-800/90"
            id="chatbot-drawer"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800/60 relative overflow-hidden flex-shrink-0">
              {/* Header Top Subtle Glow */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
              
              <div className="flex items-center gap-3">
                {/* Back button (only shown when booking has history to go back) */}
                {sessionHistory.length > 0 && (
                  <button
                    onClick={handleBackStep}
                    className="text-slate-400 hover:text-teal-400 p-1.5 -ml-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                    aria-label="Go back one step"
                    title="Go back one step"
                    id="chatbot-back-step-btn"
                  >
                    <ArrowLeft className="w-4.5 h-4.5" />
                  </button>
                )}

                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700/80 bg-slate-950 flex-shrink-0 flex items-center justify-center">
                    {settings?.admin_profile_image ? (
                      <img src={settings.admin_profile_image} alt="Aura Portrait" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-teal-400" />
                    )}
                  </div>
                  {/* Pulse online dot */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" />
                </div>

                {/* Name / Description */}
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-white tracking-wide">Aura</span>
                  <span className="text-[11px] text-teal-400 font-medium tracking-wide flex items-center gap-1">
                    {session.step !== 'idle' ? 'Booking Assistant' : 'Clinical Assistant • Online'}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                aria-label="Close Chat"
                id="chatbot-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-grow overflow-y-auto py-5 px-5 space-y-5 bg-slate-950 text-slate-300 scrollbar-none">
              {messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.2) }}
                  key={idx} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' ? (
                    <div className="flex items-start gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-850 bg-slate-900 flex items-center justify-center">
                        {settings?.admin_profile_image ? (
                          <img src={settings.admin_profile_image} alt="Aura Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-teal-400" />
                        )}
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900 text-slate-100 border border-slate-850 shadow-sm text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide px-1">{msg.time}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col max-w-[85%] items-end">
                      <div className="p-3.5 rounded-2xl rounded-tr-none bg-gradient-to-tr from-teal-600 to-teal-500 text-white shadow-md shadow-teal-900/10 border border-teal-400/20 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide px-1">{msg.time}</span>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {typing && (
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-850 bg-slate-900 flex items-center justify-center">
                    {settings?.admin_profile_image ? (
                      <img src={settings.admin_profile_image} alt="Aura Typing" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-teal-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900 text-teal-400 border border-slate-850 flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Interactive Quick Reply Chips */}
            {session.step !== 'idle' && (
              <div className="px-5 py-3 border-t border-slate-900 bg-slate-950/95 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar flex-shrink-0">
                {session.step === 'ask_procedure' && [
                  '1', '2', '3', '4', '5', '6'
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(opt)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-900/90 hover:bg-teal-500/10 border border-slate-800 hover:border-teal-500/40 text-xs text-teal-400 hover:text-teal-300 font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-95"
                  >
                    Option {opt}
                  </button>
                ))}

                {session.step === 'ask_day' && session.bookingData?.availableDates && (
                  session.bookingData.availableDates.map((d: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage((i + 1).toString())}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-900/90 hover:bg-teal-500/10 border border-slate-800 hover:border-teal-500/40 text-xs text-teal-400 hover:text-teal-300 font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-95"
                    >
                      {d.formatted.split(',')[0]}
                    </button>
                  ))
                )}

                {session.step === 'ask_time' && session.bookingData?.availableTimes && (
                  session.bookingData.availableTimes.map((t: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage((i + 1).toString())}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-900/90 hover:bg-teal-500/10 border border-slate-800 hover:border-teal-500/40 text-xs text-teal-400 hover:text-teal-300 font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-95"
                    >
                      {t}
                    </button>
                  ))
                )}

                {session.step === 'confirm' && [
                  'Yes', 'No'
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(opt)}
                    className={`inline-flex items-center justify-center px-5 py-2.5 rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer whitespace-nowrap shadow-md hover:scale-[1.02] active:scale-95 border ${
                      opt === 'Yes'
                        ? 'bg-teal-500 border-teal-400/30 text-white hover:bg-teal-400 shadow-teal-500/10'
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
              <div className="px-5 py-3 border-t border-slate-900 bg-slate-950/95 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar flex-shrink-0">
                {suggestionPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(prompt)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-900/90 hover:bg-teal-500/10 border border-slate-800 hover:border-teal-500/40 text-xs text-teal-400 hover:text-teal-300 font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-95"
                  >
                    {prompt.replace(/^\d+\)\s*/, '')}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800/60 flex items-center gap-2 flex-shrink-0">
              <div className="flex-grow relative flex items-center">
                <input
                  type="text"
                  placeholder={session.step !== 'idle' ? "Answer Aura's question..." : "Ask prices, safety, or type search..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage(inputValue);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/35 rounded-full pl-5 pr-12 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  id="chatbot-input"
                />
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim()}
                  className="absolute right-1.5 p-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-850 disabled:text-slate-600 disabled:scale-100 text-white rounded-full shadow-md cursor-pointer disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
                  aria-label="Send message"
                  id="chatbot-send-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
