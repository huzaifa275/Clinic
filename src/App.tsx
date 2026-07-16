import React, { useState, useEffect } from 'react';
import { PageType } from './types';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatbotDrawer from './components/ChatbotDrawer';
import HomeView from './components/HomeView';
import ServicesView from './components/ServicesView';
import BeforeAfterView from './components/BeforeAfterView';
import AboutView from './components/AboutView';
import ContactView from './components/ContactView';
import AdminPanel from './components/AdminPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { FAQS_DATA } from './data';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';
import { useSettings } from './SettingsContext';

export default function App() {
  const { settings } = useSettings();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // Sync tab title with clinic name
  useEffect(() => {
    if (settings?.clinic_name) {
      document.title = settings.clinic_name;
    }
  }, [settings?.clinic_name]);

  // Validate trusted device session on mount and when event fires
  const checkAuthStatus = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth/check', { credentials: 'include' });
      const data = await res.json();
      if (data.trusted) {
        setIsAdmin(true);
        setActiveDeviceId(data.device?.id || '');
      } else {
        setIsAdmin(false);
        setActiveDeviceId('');
      }
    } catch (err) {
      console.error('Failed to verify clinic terminal token:', err);
      setIsAdmin(false);
      setActiveDeviceId('');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    // Listen for chatbot successful administrative login event
    const handleLoginSuccess = (e: Event) => {
      const customEvent = e as CustomEvent;
      const device = customEvent.detail?.device;
      
      setIsAdmin(true);
      if (device?.id) {
        setActiveDeviceId(device.id);
      }
      changePage('admin');
    };

    window.addEventListener('admin-login-success', handleLoginSuccess);
    return () => window.removeEventListener('admin-login-success', handleLoginSuccess);
  }, []);

  // Sync with address bar and popstate on mount
  useEffect(() => {
    const handleUrlPage = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setCurrentPage('admin');
      } else if (path === '/services') {
        setCurrentPage('services');
      } else if (path === '/before-after') {
        setCurrentPage('before-after');
      } else if (path === '/about') {
        setCurrentPage('about');
      } else if (path === '/contact') {
        setCurrentPage('contact');
      } else {
        setCurrentPage('home');
      }
    };

    handleUrlPage();
    window.addEventListener('popstate', handleUrlPage);
    return () => window.removeEventListener('popstate', handleUrlPage);
  }, []);

  // Custom page changer that updates browser address bar without reload
  const changePage = (page: PageType) => {
    setCurrentPage(page);
    const path = page === 'home' ? '/' : `/${page}`;
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Guard: if user lands on /admin but is not authorized, redirect to home and trigger login modal
  useEffect(() => {
    if (currentPage === 'admin' && !authLoading && !isAdmin) {
      changePage('home');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-admin-login'));
      }, 150);
    }
  }, [currentPage, isAdmin, authLoading]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setIsAdmin(false);
      setActiveDeviceId('');
      changePage('home');
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to render the active page
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomeView setCurrentPage={changePage} />;
      case 'services':
        return <ServicesView setCurrentPage={changePage} />;
      case 'before-after':
        return <BeforeAfterView setCurrentPage={changePage} />;
      case 'about':
        return <AboutView setCurrentPage={changePage} />;
      case 'contact':
        return <ContactView setCurrentPage={changePage} />;
      case 'admin':
        if (authLoading) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-slate-500 tracking-wide">Verifying administrator session...</span>
            </div>
          );
        }
        if (!isAdmin) {
          return null; // Will trigger the redirect useEffect block
        }
        return (
          <ErrorBoundary>
            <div className="min-h-screen bg-slate-50 pb-12">
              <AdminPanel onLogout={handleLogout} activeDeviceId={activeDeviceId} />
            </div>
          </ErrorBoundary>
        );
      default:
        return <HomeView setCurrentPage={changePage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans" id="app-root-container">
      {/* 1. Header Navigation */}
      <Navbar currentPage={currentPage} setCurrentPage={changePage} isAdmin={isAdmin} />

      {/* 2. Page View Stage with Slide/Fade transitions */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. CLINIC GENERAL FAQ ACCORDION (Shows at the bottom of main pages for conversion) */}
      {currentPage !== 'contact' && currentPage !== 'admin' && (
        <section className="py-12 md:py-16 bg-white border-t border-slate-100" id="global-faq-section">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16 space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
                <HelpCircle className="w-3.5 h-3.5" />
                Frequently Answered
              </span>
              <h2 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">
                Curated Clinical FAQs
              </h2>
              <p className="text-slate-500 font-medium text-sm">
                Understand cosmetic and restorative dental treatments. Browse our common dental care inquiries.
              </p>
            </div>

            <div className="space-y-4">
              {FAQS_DATA.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`bg-slate-50 rounded-2xl border transition-all ${
                      isOpen ? 'border-teal-500 bg-white shadow-md' : 'border-slate-150'
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full flex justify-between items-center px-6 py-5 text-left font-bold text-slate-800 hover:text-teal-600 transition-colors cursor-pointer outline-none"
                    >
                      <span className="font-heading text-sm sm:text-base">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-4 ${
                          isOpen ? 'rotate-180 text-teal-500' : ''
                        }`}
                      />
                    </button>
                    
                    {isOpen && (
                      <div className="px-6 pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium border-t border-slate-100/50 pt-4 animate-fade-in">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Chatbot Widget Placeholder */}
      <ChatbotDrawer />

      {/* 5. Clinical Footer */}
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
