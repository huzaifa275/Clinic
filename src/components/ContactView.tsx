import React from 'react';
import { PageType } from '../types';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  Calendar
} from 'lucide-react';
import { useSettings } from '../SettingsContext';

interface ContactViewProps {
  setCurrentPage: (page: PageType) => void;
}

export default function ContactView({ setCurrentPage }: ContactViewProps) {
  const { settings } = useSettings();
  const phoneVal = settings?.whatsapp_number || settings?.admin_whatsapp || '+1 (800) 555-0199';
  const cleanPhone = phoneVal.replace(/[\s\-\(\)]/g, '');
  const emailVal = settings?.contact_email || 'appointments@aurasmile.com';
  const addressVal = settings?.clinic_address || '450 Wellness Plaza, Suite 100, New York, NY';
  const clinicName = settings?.clinic_name || 'AuraSmile';
  const adminName = settings?.admin_name || 'Dr. Evelyn Sterling';

  return (
    <div className="bg-slate-50 min-h-screen py-12 md:py-16 px-4 sm:px-6 lg:px-8" id="contact-view-page">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
            <Sparkles className="w-3.5 h-3.5" />
            Reservation Hub
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-slate-900 tracking-tight">
            Book Your Appointment
          </h1>
          <p className="text-slate-600 font-medium">
            Ready to experience next-generation dental artistry? All appointments are booked and conflict-checked instantly via our smart clinical dental assistant.
          </p>
        </div>

        {/* 1. Seamless Dental Scheduling */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 space-y-6 relative transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10" id="chatbot-cta-card-block">
          <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-150">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Aura Interactive Scheduler
            </span>
            <h3 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
              Seamless Dental Scheduling
            </h3>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              We have streamlined clinical bookings. Our automated assistant, Aura, coordinates in real-time with {adminName}'s direct schedule to reserve your slot and generate a secure entry pass.
            </p>
          </div>

          {/* Step checklist */}
          <div className="bg-slate-50 p-5 md:p-6 rounded-xl border border-slate-150 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Your Booking Steps:
            </h4>
            <div className="space-y-3.5">
              <div className="flex gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-teal-100 text-teal-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Identify Yourself</h5>
                  <p className="text-[11px] text-slate-500 font-medium">State your name and contact phone/WhatsApp.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-teal-100 text-teal-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Select Procedure</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Select from active restorative or cosmetic dental services.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-teal-100 text-teal-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Pick Operational Day & Time</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Pick an available slot, backed by automated conflict-checking.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-teal-100 text-teal-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Generate Entry Code</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Receive a unique 4-digit verification code to show the clinic receptionist.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Big Booking Button */}
          <button
            onClick={() => {
              if ((window as any).openBookingBot) {
                (window as any).openBookingBot();
              } else {
                window.dispatchEvent(new CustomEvent('open-booking-bot'));
              }
            }}
            className="w-full cursor-pointer bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-sm py-4 rounded-2xl shadow-inner shadow-teal-500/10 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            id="contact-chatbot-start-btn"
          >
            <Calendar className="w-5 h-5" />
            Book Appointment
          </button>

          <p className="text-center text-[11px] text-slate-400 font-medium">
            *Booking details are collected securely. Rest assured, your medical data transmission is protected.
          </p>
        </div>

        {/* 2. Direct Channels (Contact Details Card) */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 space-y-6 relative transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10">
          <h3 className="text-xl font-bold font-heading text-slate-900 pb-4 border-b border-slate-100">
            Direct Channels
          </h3>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-50 rounded-xl text-teal-600 mt-0.5">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Direct Clinical Voice Line</h4>
              <a href={`tel:${cleanPhone}`} className="text-sm text-teal-600 font-bold hover:underline hover:text-teal-500 transition block mt-1">
                {phoneVal}
              </a>
              <p className="text-xs text-slate-400 mt-1 font-medium">Available Mon-Sat for direct patient support.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-50 rounded-xl text-teal-600 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Clinical Inquiries Email</h4>
              <a href={`mailto:${emailVal}`} className="text-sm text-teal-600 font-bold hover:underline hover:text-teal-500 transition block mt-1">
                {emailVal}
              </a>
              <p className="text-xs text-slate-400 mt-1 font-medium">Replies within 2 hours for standard consult requests.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-50 rounded-xl text-teal-600 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">{clinicName} Headquarters</h4>
              <span className="text-sm text-slate-700 font-semibold block mt-1">
                {addressVal}
              </span>
              <p className="text-xs text-slate-400 mt-1 font-medium">Free valet parking available in the subterranean wellness decks.</p>
            </div>
          </div>
        </div>

        {/* 3. Map Location */}
        <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-150 h-64 bg-slate-100 group select-none transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)]">
          {/* Map background grid representing city blocks */}
          <div className="absolute inset-0 bg-slate-50 flex flex-wrap pointer-events-none p-4 opacity-50">
            <div className="w-full h-full border-2 border-dashed border-teal-500/10 rounded-2xl flex items-center justify-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-teal-900/20">Wellness District Block Mapping</span>
            </div>
          </div>

          {/* Fake aesthetic map overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            
            {/* Simulated Street Names */}
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Lexington Ave</span>
              <span>E 48th St</span>
            </div>

            {/* Simulated central pin locator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full bg-teal-500/20 animate-ping" />
                {settings?.clinic_logo ? (
                  <img 
                    src={settings.clinic_logo} 
                    alt="Logo Pin" 
                    className="relative w-8 h-8 rounded-full object-cover shadow-lg border border-white"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="relative w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg border border-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <span className="mt-2 text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-lg shadow-sm font-heading">
                {clinicName} Clinic
              </span>
            </div>

            {/* Subtitle directions banner */}
            <div className="flex justify-between items-center bg-white/90 backdrop-blur-xs p-3 rounded-xl border border-slate-100 mt-auto">
              <div className="max-w-[70%] truncate">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Office Location</span>
                <span className="text-[11px] font-extrabold text-slate-900 block truncate">{addressVal}</span>
              </div>
              <a 
                href="https://maps.google.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-teal-600 transition-colors flex-shrink-0"
              >
                Open Directions
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
