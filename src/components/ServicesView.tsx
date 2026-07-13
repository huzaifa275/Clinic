import React, { useState } from 'react';
import { PageType, ServiceItem } from '../types';
import { SERVICES_DATA } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Clock, 
  HelpCircle, 
  DollarSign, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  ShieldCheck,
  Flame,
  Anchor,
  Activity
} from 'lucide-react';

interface ServicesViewProps {
  setCurrentPage: (page: PageType) => void;
}

export default function ServicesView({ setCurrentPage }: ServicesViewProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>('veneers');
  const [filterCategory, setFilterCategory] = useState<'all' | 'cosmetic' | 'restorative'>('all');

  const handleBookService = (serviceTitle: string) => {
    localStorage.setItem('aura_selected_service', serviceTitle);
    if ((window as any).openBookingBot) {
      (window as any).openBookingBot();
    } else {
      setCurrentPage('contact');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-teal-500" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-orange-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-emerald-500" />;
      case 'Anchor':
        return <Anchor className="w-6 h-6 text-blue-500" />;
      case 'Activity':
        return <Activity className="w-6 h-6 text-purple-500" />;
      default:
        return <Sparkles className="w-6 h-6 text-teal-500" />;
    }
  };

  const services = SERVICES_DATA.filter(service => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'cosmetic') {
      return ['veneers', 'whitening', 'aligners'].includes(service.id);
    }
    if (filterCategory === 'restorative') {
      return ['crowns', 'implants', 'rootcanal'].includes(service.id);
    }
    return true;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 sm:px-6 lg:px-8" id="services-view-page">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
            <Sparkles className="w-3.5 h-3.5" />
            Clinical Masterwork Catalog
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-slate-900 tracking-tight">
            Premium Treatments & Technologies
          </h1>
          <p className="text-slate-600 font-medium">
            Discover our comprehensive dental menu, ranging from elite aesthetic enhancements to advanced high-magnification restorations. Select a service to reveal full technical details.
          </p>

          {/* Filter categories */}
          <div className="flex justify-center gap-2 pt-4">
            {(['all', 'cosmetic', 'restorative'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
                id={`filter-services-${cat}`}
              >
                {cat === 'all' && 'All Procedures'}
                {cat === 'cosmetic' && 'Aesthetics & Cosmetic'}
                {cat === 'restorative' && 'Micro Restorative'}
              </button>
            ))}
          </div>
        </div>

        {/* Services List / Detail Panels Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT: Services Card List (Col-span 7) */}
          <div className="lg:col-span-7 space-y-4">
            {services.map((service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedServiceId(isSelected ? null : service.id)}
                  className={`bg-white rounded-2xl p-6 border transition-all duration-300 cursor-pointer select-none relative group ${
                    isSelected 
                      ? 'border-teal-500 shadow-[0_15px_40px_rgba(20,184,166,0.12)] ring-1 ring-teal-500/20' 
                      : 'border-slate-150 hover:border-slate-300 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10'
                  }`}
                  id={`service-row-${service.id}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="p-3.5 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0">
                        {getServiceIcon(service.icon)}
                      </div>
                      <div>
                        <h3 className="font-semibold font-heading text-lg text-slate-900 group-hover:text-teal-600 transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                          Est. Investment: {service.priceEstimate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Duration Badge */}
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-100/50">
                        <Clock className="w-3 h-3" />
                        {service.typicalDuration}
                      </span>
                      {isSelected ? <ChevronUp className="w-5 h-5 text-teal-600" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />}
                    </div>
                  </div>

                  {/* Tiny snippet helper */}
                  <p className="text-xs text-slate-600 font-medium mt-3 leading-relaxed pl-1 sm:pl-16">
                    {service.shortDescription}
                  </p>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Selected Service Detail Panel (Col-span 5) */}
          <div className="lg:col-span-5">
            <div className="sticky top-28">
              <AnimatePresence mode="wait">
                {selectedServiceId ? (
                  (() => {
                    const activeService = SERVICES_DATA.find(s => s.id === selectedServiceId)!;
                    return (
                      <motion.div
                        key={activeService.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-800 flex flex-col relative overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-500/5 before:to-transparent before:blur-xl before:-z-10"
                        id={`service-detail-panel-${activeService.id}`}
                      >
                        {/* Decorative Backglow */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex justify-between items-start mb-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            {activeService.typicalDuration}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            ID: #{activeService.id.toUpperCase()}
                          </span>
                        </div>

                        <h2 className="text-2xl font-semibold font-heading text-white mb-4">
                          {activeService.title}
                        </h2>

                        <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                          {activeService.fullDescription}
                        </p>

                        <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 mb-6">
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Pricing Guidance
                          </span>
                          <span className="text-xl font-extrabold text-teal-400">
                            {activeService.priceEstimate}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                            *This represents standard clinical estimates. Exact investments vary depending on bone conditions and custom aesthetic parameters.
                          </p>
                        </div>

                        {/* Benefits list */}
                        <div className="mb-8 space-y-3 flex-grow">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-300">
                            Clinical Advantages:
                          </h4>
                          <ul className="space-y-2.5">
                            {activeService.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-300 font-medium leading-relaxed">
                                <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={() => handleBookService(activeService.title)}
                          className="w-full cursor-pointer bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-sm py-4 rounded-2xl shadow-inner shadow-teal-500/10 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          Request Treatment Slot
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })()
                ) : (
                  <div className="bg-white rounded-2xl p-10 border border-slate-200 border-dashed text-center flex flex-col justify-center items-center h-96">
                    <HelpCircle className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="font-bold text-slate-700 text-base">Select a Treatment</h3>
                    <p className="text-xs text-slate-500 max-w-[240px] mt-1.5 leading-relaxed font-medium">
                      Select any of our modern procedures on the left to review complete technical guides, durations, and estimated costs.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
