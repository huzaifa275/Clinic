import React, { useState } from 'react';
import { PageType } from '../types';
import { Sparkles, Menu, X, PhoneCall } from 'lucide-react';
import { useSettings } from '../SettingsContext';

interface NavbarProps {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  isAdmin?: boolean;
}

export default function Navbar({ currentPage, setCurrentPage, isAdmin }: NavbarProps) {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);

  React.useEffect(() => {
    const handleOpenLogin = () => {
      setShowLoginModal(true);
    };
    window.addEventListener('open-admin-login', handleOpenLogin);
    return () => window.removeEventListener('open-admin-login', handleOpenLogin);
  }, []);

  const navItems: { label: string; page: PageType }[] = [
    { label: 'Home', page: 'home' },
    { label: 'Treatments', page: 'services' },
    { label: 'Transformations', page: 'before-after' },
    { label: 'Our Story', page: 'about' },
    { label: 'Contact', page: 'contact' },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin Panel 🔐', page: 'admin' });
  }

  const handleNavClick = (page: PageType) => {
    setCurrentPage(page);
    setIsOpen(false);
    setShowAdminDropdown(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, label: 'Admin Session Portal' }),
        credentials: 'include'
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Dispatch the successful login event for App.tsx to catch and re-auth
      window.dispatchEvent(new CustomEvent('admin-login-success', {
        detail: { device: data.device }
      }));
      setCurrentPage('admin');
      setShowLoginModal(false);
      setPassword('');
    } catch (err) {
      setLoading(false);
      setError('Connection failed. Please check backend connection.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.reload();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo Brand */}
          <div 
            onClick={() => handleNavClick('home')} 
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            id="brand-logo"
          >
            {settings?.clinic_logo ? (
              <img 
                src={settings.clinic_logo} 
                alt="Clinic Logo" 
                className="w-11 h-11 rounded-xl object-cover shadow-md shadow-teal-500/10 group-hover:scale-105 transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 text-white shadow-md shadow-teal-500/10 group-hover:scale-105 transition-all">
                <Sparkles className="w-5.5 h-5.5" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-300 rounded-full animate-ping" />
              </div>
            )}
            <div>
              <span className="text-xl font-extrabold font-display tracking-tight text-slate-900 group-hover:text-teal-600 transition-colors">
                {settings?.clinic_name || 'AuraSmile'}
              </span>
              <span className="block text-[10px] font-semibold text-teal-600 tracking-wider uppercase">
                Premium Dental Clinic
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => handleNavClick(item.page)}
                className={`relative font-medium text-sm py-2 transition-all cursor-pointer ${
                  currentPage === item.page 
                    ? 'text-teal-600 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                id={`nav-link-${item.page}`}
              >
                {item.label}
                {currentPage === item.page && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* CTA, Booking & Top-right Hamburger Menu (3 lines) */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href={`tel:${(settings?.whatsapp_number || settings?.admin_whatsapp || '+18005550199').replace(/[\s\-\(\)]/g, '')}`} 
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-600 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-500" />
              {settings?.whatsapp_number || settings?.admin_whatsapp || '+1 (800) 555-0199'}
            </a>
            <button
              onClick={() => {
                if ((window as any).openBookingBot) {
                  (window as any).openBookingBot();
                } else {
                  handleNavClick('contact');
                }
              }}
              className="relative overflow-hidden cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 hover:from-teal-600 hover:to-teal-500 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition-all duration-300 hover:scale-103 hover:shadow-teal-500/10 active:scale-97"
              id="navbar-cta-btn"
            >
              Book Appointment
            </button>

            {/* Top-Right Hamburger Menu (3 lines) for Desktop Admin access */}
            <div className="relative">
              <button
                onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                className="flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 text-slate-700 hover:text-teal-600 hover:border-teal-300 transition-all cursor-pointer"
                id="desktop-admin-menu-toggle"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {showAdminDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-150 rounded-xl shadow-lg py-2 z-50 animate-fade-in" id="desktop-admin-menu">
                  {!isAdmin ? (
                    <button
                      onClick={() => {
                        setShowAdminDropdown(false);
                        setShowLoginModal(true);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 cursor-pointer"
                    >
                      <span>🔐</span> Admin Login
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setShowAdminDropdown(false);
                          setCurrentPage('admin');
                        }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-teal-600 cursor-pointer"
                      >
                        <span>🔒</span> Admin Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setShowAdminDropdown(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <span>🔓</span> Admin Logout
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button (Hamburger) */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-900 p-2 focus:outline-hidden"
              aria-label="Toggle menu"
              id="mobile-menu-toggle"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-xl animate-fade-in" id="mobile-menu-drawer">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => handleNavClick(item.page)}
                className={`block w-full text-left px-4 py-3 rounded-xl font-medium text-base transition-colors ${
                  currentPage === item.page
                    ? 'bg-teal-50 text-teal-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                id={`mobile-nav-link-${item.page}`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 px-4">
              <a 
                href={`tel:${(settings?.whatsapp_number || settings?.admin_whatsapp || '+18005550199').replace(/[\s\-\(\)]/g, '')}`} 
                className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <PhoneCall className="w-4 h-4 text-teal-500" />
                {settings?.whatsapp_number || settings?.admin_whatsapp || '+1 (800) 555-0199'}
              </a>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if ((window as any).openBookingBot) {
                    (window as any).openBookingBot();
                  } else {
                    handleNavClick('contact');
                  }
                }}
                className="w-full text-center bg-teal-600 text-white font-semibold py-3.5 rounded-xl shadow-md cursor-pointer"
                id="mobile-navbar-cta-btn"
              >
                Book Appointment
              </button>

              {/* Admin Access inside the Mobile Hamburger Menu Drawer */}
              {!isAdmin ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowLoginModal(true);
                  }}
                  className="w-full text-center border border-teal-600 text-teal-600 font-bold py-3.5 rounded-xl hover:bg-teal-50 cursor-pointer text-sm flex items-center justify-center gap-2"
                  id="mobile-admin-login-btn"
                >
                  🔐 Admin Login
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setCurrentPage('admin');
                    }}
                    className="w-full text-center bg-teal-50 border border-teal-200 text-teal-600 font-bold py-3.5 rounded-xl cursor-pointer text-sm"
                  >
                    🔐 Admin Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center bg-red-50 border border-red-100 text-red-600 font-bold py-3.5 rounded-xl cursor-pointer text-sm"
                  >
                    🔓 Admin Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sleek Password Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" id="admin-login-modal">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-md relative">
            <button
              onClick={() => {
                setShowLoginModal(false);
                setPassword('');
                setError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 mb-2 animate-pulse">
                  <span className="text-xl">🔐</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-display">{settings?.clinic_name || 'AuraSmile'} Admin Login</h3>
                <p className="text-xs text-slate-500 font-medium font-heading leading-relaxed">
                  Please authenticate with the server to manage clinic operations.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold leading-relaxed">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                  System Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter administrator password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 outline-none transition-all"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-teal-600 hover:to-teal-500 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Confirm Access'}
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
