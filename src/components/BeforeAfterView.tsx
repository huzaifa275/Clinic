import React from 'react';
import { PageType } from '../types';
import { BEFORE_AFTER_DATA } from '../data';
import ComparisonSlider from './ComparisonSlider';
import { Sparkles, HelpCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface BeforeAfterViewProps {
  setCurrentPage: (page: PageType) => void;
}

export default function BeforeAfterView({ setCurrentPage }: BeforeAfterViewProps) {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-teal-500/5 to-white min-h-screen py-16 px-4 sm:px-6 lg:px-8" id="before-after-view-page">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
            <Sparkles className="w-3.5 h-3.5" />
            Verified Case Studies
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-slate-900 tracking-tight">
            Visual Smile Transformations
          </h1>
          <p className="text-slate-600 font-medium">
            Drag the slider handles on each of our 3 core cases to witness the pixel-perfect alignment, bleaching, and ceramic restoration results achieved for our actual patients.
          </p>
        </div>

        {/* 3 COMPARISON SLIDER CARDS (Option B: WIDE aspect-video grids) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="three-slider-grid">
          {BEFORE_AFTER_DATA.map((caseItem) => (
            <div 
              key={caseItem.id} 
              className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10"
            >
              {/* Draggable Component */}
              <ComparisonSlider item={caseItem} />
              
              {/* Additional clinic-case insights */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified Case Result
                </span>
                <span>ID: {caseItem.id.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Informative Grid on Mapping Technology */}
        <div className="mt-24 bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-800 relative overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-500/5 before:to-transparent before:blur-xl before:-z-10">
          {/* Decorative Background */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-6">
              <span className="text-xs font-extrabold text-teal-400 uppercase tracking-widest block">AuraSmile Bio-Architecture</span>
              <h2 className="text-3xl font-bold font-heading tracking-tight leading-tight">
                Our Digital Smile Engineering Protocol
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed font-medium">
                At AuraSmile, we do not guess. We engineer. Every porcelain veneer, implant, and aligner series undergoes our rigorous 4-step digital mapping process to guarantee exact bone integration and flawless aesthetic ratios.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 font-bold text-sm flex items-center justify-center">1</div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Intraoral 3D Laser Scanning</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">No gooey plaster trays. Our hand scanners map your mouth down to 20 microns.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 font-bold text-sm flex items-center justify-center">2</div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Golden Ratio Alignment</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">AI software compares your teeth sizes against your nose and lip symmetry.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 font-bold text-sm flex items-center justify-center">3</div>
                  <div>
                    <h4 className="font-bold text-sm text-white">High-Translucency Milling</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">CAD/CAM 5-axis machines mill your ceramic crowns from solid blocks of silicate.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-2.5 text-amber-400">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <h4 className="font-bold text-sm font-heading uppercase tracking-wide">Patient Safety & Comfort Notice</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                All transformations displayed here correspond to procedures that were carried out under our triple sterilization guidelines (Class-B vacuum autoclave, sterile single-use micro-barriers, positive surgical HEPA pressure chambers). 
              </p>
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-855">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Schedule Consultation</span>
                <p className="text-xs text-slate-300 font-semibold leading-relaxed">Would you like a complimentary 3D map checkup? Our specialist team can scan your mouth to estimate aligner or crown configurations.</p>
                <button
                  onClick={() => {
                    setCurrentPage('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="cursor-pointer font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1.5 transition-colors group text-xs mt-3"
                >
                  Book 3D Smile Scan
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
