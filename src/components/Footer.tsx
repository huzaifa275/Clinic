import React from 'react';
import { PageType } from '../types';
import { Sparkles, Phone, Mail, MapPin, Clock, ArrowUp } from 'lucide-react';

interface FooterProps {
  setCurrentPage: (page: PageType) => void;
}

export default function Footer({ setCurrentPage }: FooterProps) {
  const handleNavClick = (page: PageType) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800" id="app-footer">
      {/* Top Banner with Certifications badge and quick links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Emergency Dentist Available</h4>
              <p className="text-xs text-slate-400">24/7 Priority Support for Registered Clients</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Primacy Location</h4>
              <p className="text-xs text-slate-400">450 Wellness Plaza, Suite 100, New York</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Direct Clinical Line</h4>
              <p className="text-xs text-slate-400">Call +1 (800) 555-0199 for direct booking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-teal-500 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold font-display text-white">AuraSmile</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Experience dental excellence where clinical genius meets aesthetic mastery. We offer premium, painless, state-of-the-art treatments customized for your optimal wellness.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-teal-400 rounded-full border border-slate-700">
                ★ 4.9 Rating (450+ Google Reviews)
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Clinique Nav</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button onClick={() => handleNavClick('home')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Clinic Home
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('services')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Treatments & Badges
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('before-after')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Smile Transformations
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('about')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Our Specialists & Bio
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('contact')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Bookings & Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Operating Hours */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Operating Hours</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <span>Monday - Friday</span>
                <span className="text-white font-medium">8:00 AM - 7:00 PM</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <span>Saturday</span>
                <span className="text-white font-medium">9:00 AM - 4:00 PM</span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <span>Sunday</span>
                <span className="text-rose-400 font-medium">Closed (Emergency Only)</span>
              </li>
              <li className="pt-2 text-xs text-slate-500">
                *Appointments strictly secured via reservation.
              </li>
            </ul>
          </div>

          {/* Newsletter / Certification Badge */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Our Accreditations</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              We maintain active credentials with leading global dental and aesthetics governing bodies, validating our sterilization protocols and clinical artistry.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-center uppercase tracking-wider font-semibold">
              <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
                AACD Member
              </div>
              <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
                ADA Certified
              </div>
              <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
                OSHA Standard
              </div>
              <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-300">
                CEREC 3D Clinic
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
          <p>© {currentYear} AuraSmile Dental Clinic. All clinical rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <span className="hover:text-slate-300 transition-colors">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors">Terms of Service</span>
            <span>•</span>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              Back to top <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
