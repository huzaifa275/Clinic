import React from 'react';
import { PageType } from '../types';
import { SERVICES_DATA, BEFORE_AFTER_DATA, TESTIMONIALS_DATA } from '../data';
import ComparisonSlider from './ComparisonSlider';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  ShieldCheck, 
  Award, 
  CheckCircle,
  Clock, 
  Star,
  Users
} from 'lucide-react';

interface HomeViewProps {
  setCurrentPage: (page: PageType) => void;
}

export default function HomeView({ setCurrentPage }: HomeViewProps) {
  // Take 3 services for preview
  const featuredServices = SERVICES_DATA.slice(0, 3);
  const mainBeforeAfter = BEFORE_AFTER_DATA[0];

  const handleCTA = () => {
    if ((window as any).openBookingBot) {
      (window as any).openBookingBot();
    } else {
      setCurrentPage('contact');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="overflow-hidden" id="home-view-page">
      {/* 1. HERO SECTION WITH ANIMATED GRADIENT & GLASSMORPHISM */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-teal-500/10 via-slate-50 to-teal-500/5 py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        
        {/* Subtle background decorative shapes (Floating) */}
        <div className="absolute top-1/4 left-10 w-72 h-72 rounded-full bg-teal-300/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero Left Content - Scroll Reveal styled with Motion */}
          <motion.div 
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Generation Dental Artistry
            </span>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6.5xl font-extrabold font-heading text-slate-900 tracking-tight leading-tight">
              A Radiantly <span className="text-teal-600 bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">Healthy Smile</span> Designed Just for You
            </h1>
            
            <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Experience the pinnacle of high-end cosmetic dentistry and dental restorations at AuraSmile. We combine award-winning clinicians, state-of-the-art 3D imaging, and zero-pain protocols to craft the smile of your dreams.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <button
                onClick={handleCTA}
                className="group cursor-pointer bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-sm px-8 py-4.5 rounded-2xl shadow-inner shadow-teal-500/10 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                id="hero-primary-cta"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setCurrentPage('services')}
                className="cursor-pointer bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 text-slate-800 font-semibold text-sm px-8 py-4.5 rounded-2xl shadow-sm transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-98 flex items-center justify-center gap-1.5"
                id="hero-secondary-cta"
              >
                Explore Services & Pricing
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-4 pt-10 border-t border-slate-200/60 max-w-lg mx-auto lg:mx-0">
              <div>
                <span className="block text-2xl font-extrabold font-display text-slate-900">4.9/5</span>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Patient Rating</span>
              </div>
              <div>
                <span className="block text-2xl font-extrabold font-display text-slate-900">15k+</span>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Happy Smiles</span>
              </div>
              <div>
                <span className="block text-2xl font-extrabold font-display text-slate-900">100%</span>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pain-Free Tech</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Right - Glassmorphic Hero Card */}
          <motion.div 
            className="lg:col-span-5 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <div className="relative">
              {/* Backglow element */}
              <div className="absolute inset-0 bg-teal-500/20 rounded-3xl blur-2xl transform rotate-2 scale-102 -z-10" />
              
              {/* Main premium image representation card with glassmorphism overlays */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/50 aspect-video lg:aspect-square bg-slate-900">
                <img 
                  src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800" 
                  alt="Modern premium dentist clinic surgery room" 
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating Glassmorphic Overlay 1 - Top-Right */}
                <div className="absolute top-4 right-4 glass-card p-4 rounded-2xl shadow-lg border border-white/50 max-w-[200px] hidden sm:block">
                  <div className="flex items-center gap-2 text-teal-700">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider">Sterile Standard</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1 leading-normal font-medium">Hospital-Grade Class-B autoclave and air purification.</p>
                </div>

                {/* Floating Glassmorphic Overlay 2 - Bottom-Left */}
                <div className="absolute bottom-4 left-4 glass-card p-4 rounded-2xl shadow-lg border border-white/50 max-w-[240px]">
                  <div className="flex gap-1.5 text-amber-500 mb-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-normal">
                    "My veneers look beautifully real. AuraSmile is pure genius!"
                  </p>
                  <span className="block text-[10px] font-semibold text-slate-500 mt-1">— Sarah J.</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. CLINIC BENEFITS & WHY CHOOSE US */}
      <section className="py-12 md:py-16 bg-white" id="why-choose-us">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-teal-600 uppercase tracking-widest block">The AuraSmile Distinction</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
              Why Discerning Patients Choose Us
            </h2>
            <p className="text-slate-600 font-medium">
              We reject the cold, assembly-line model of traditional dentist clinics. At AuraSmile, we curate an exquisite, customized experience centering around your ultimate comfort and premium aesthetic desires.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 hover:bg-white p-5 md:p-6 rounded-2xl border border-slate-100 hover:border-teal-100/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10 group">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 group-hover:bg-teal-500 group-hover:text-white transition-all">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-3">Artistic Masterwork</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Our specialists utilize custom-layered ceramics matching structural light translucency, ensuring your results look naturally beautiful instead of opaque and artificial.
              </p>
            </div>

            <div className="bg-slate-50 hover:bg-white p-5 md:p-6 rounded-2xl border border-slate-100 hover:border-teal-100/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10 group">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 group-hover:bg-teal-500 group-hover:text-white transition-all">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-3">Virtual 3D Pre-Planning</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Never agree to a treatment blindly. Our digital smile scans map out complete alignments and crowns so you can preview, edit, and approve your transformation.
              </p>
            </div>

            <div className="bg-slate-50 hover:bg-white p-5 md:p-6 rounded-2xl border border-slate-100 hover:border-teal-100/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10 group">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 group-hover:bg-teal-500 group-hover:text-white transition-all">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-3">Pain-Free Dentistry</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                We combine soothing aromatherapy chambers, topical pre-numbing, and slow computerized anesthetics to eliminate all discomfort, reducing dental anxiety completely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY SERVICES PREVIEW (With typical duration badges) */}
      <section className="py-12 md:py-16 bg-gradient-to-tr from-slate-50 to-teal-500/5" id="key-services-preview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-16 gap-4">
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-teal-600 uppercase tracking-widest block">World-Class Treatments</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
                Featured Clinical Procedures
              </h2>
              <p className="text-slate-600 font-medium max-w-2xl">
                We offer a carefully designed suite of luxury aesthetic and general restorative procedures. Every treatment features standard "Typical Duration" badges.
              </p>
            </div>
            <button
              onClick={() => {
                setCurrentPage('services');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 transition-colors group text-sm"
            >
              See All Treatments
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-white p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 hover:border-teal-50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10"
                id={`featured-service-card-${service.id}`}
              >
                {/* Duration Badge */}
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-teal-50/80 text-teal-700 border border-teal-100">
                    <Clock className="w-3.5 h-3.5" />
                    {service.typicalDuration}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold font-heading text-slate-900 mb-3">{service.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium flex-grow">{service.shortDescription}</p>
                
                <div className="pt-5 border-t border-slate-100 flex justify-between items-center mt-auto">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Price</span>
                    <span className="text-sm font-extrabold text-slate-900">{service.priceEstimate}</span>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPage('services');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="cursor-pointer text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors group"
                  >
                    View details
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MINI BEFORE/AFTER PREVIEW SECTION */}
      <section className="py-12 md:py-16 bg-white" id="mini-transformation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Text description */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-extrabold text-teal-600 uppercase tracking-widest block">Interactive Showcase</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight leading-tight">
                Behold the Miracle of Clinical Artistry
              </h2>
              <p className="text-slate-600 font-medium leading-relaxed">
                Move the comparison handle to witness the transformation of coffee stains and age-related yellowing into a sparkling, radiant white enamel shade. 
              </p>
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-semibold">Pixel-perfect teeth comparison alignment</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-semibold">Hospital stain filters simulated in real-time</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-semibold">Drag-to-compare interactive viewport slider</span>
                </div>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => {
                    setCurrentPage('before-after');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="cursor-pointer inline-flex items-center gap-2 bg-slate-900 hover:bg-teal-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-md transition-all group"
                  id="mini-beforeafter-cta"
                >
                  See Braces & Restorations
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Comparison Slider Box (Option B: WIDE 16:9 Slider) */}
            <div className="lg:col-span-7 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-md">
              <ComparisonSlider item={mainBeforeAfter} />
            </div>
            
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS SECTION */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-teal-400 uppercase tracking-widest block">Verifiable Patient Stories</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
              AuraSmile Experiences
            </h2>
            <p className="text-slate-400 font-medium">
              We collect reviews through independent platforms to guarantee validity. Here is what some of our elite patients say about their journeys.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS_DATA.map((t) => (
              <div 
                key={t.id} 
                className="bg-slate-900/60 border border-slate-800/80 p-5 md:p-6 rounded-2xl flex flex-col justify-between hover:border-teal-500/30 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-500/5 before:to-transparent before:blur-xl before:-z-10"
                id={`patient-testimonial-${t.id}`}
              >
                <div>
                  <div className="flex gap-1 text-amber-400 mb-6">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4.5 h-4.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed font-medium italic">
                    "{t.text}"
                  </p>
                </div>
                
                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-800/60">
                  <img 
                    src={t.image} 
                    alt={t.name} 
                    className="w-11 h-11 rounded-full object-cover border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-white font-semibold text-sm font-heading">{t.name}</h4>
                    <span className="block text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                      Treatment: {t.treatment}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CONVERSION CTA BANNER */}
      <section className="py-12 md:py-16 bg-teal-600 relative overflow-hidden" id="bottom-conversion">
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-700 via-teal-600 to-teal-500 opacity-90" />
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-slate-900/20 blur-2xl" />
        
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            Ready to Begin Your Premium Smile Makeover?
          </h2>
          <p className="text-teal-50 text-base font-semibold max-w-2xl mx-auto">
            Book an appointment for a 3D scan today. Dr. Evelyn Sterling and our specialist team will map out a customized visual transformation plan suited to your facial metrics.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={handleCTA}
              className="cursor-pointer bg-white hover:bg-teal-50 text-teal-700 font-semibold text-sm px-8 py-4.5 rounded-2xl shadow-md transition-all hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)] active:scale-95 duration-200"
              id="bottom-cta-primary"
            >
              Book Appointment
            </button>
            <a
              href="https://wa.me/18005550199"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer bg-teal-800/80 hover:bg-teal-800 text-white font-semibold text-sm px-8 py-4.5 rounded-2xl shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 border border-teal-700/50"
              id="bottom-cta-whatsapp"
            >
              Instant Consultation via WhatsApp
            </a>
          </div>
          <div className="text-[11px] text-teal-100 font-medium">
            *Deposit may apply. Standard dental checkup is fully covered by premium health insurances.
          </div>
        </div>
      </section>
    </div>
  );
}
