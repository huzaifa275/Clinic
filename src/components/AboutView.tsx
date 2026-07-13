import React from 'react';
import { PageType } from '../types';
import { CLINIC_DOCTORS, STERILIZATION_STANDARDS } from '../data';
import { Sparkles, Award, ShieldCheck, Heart, User, Building, HeartHandshake } from 'lucide-react';

interface AboutViewProps {
  setCurrentPage: (page: PageType) => void;
}

export default function AboutView({ setCurrentPage }: AboutViewProps) {
  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 sm:px-6 lg:px-8" id="about-view-page">
      <div className="max-w-7xl mx-auto space-y-24">
        
        {/* 1. SECTION HEADER / CLINIC STORY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
              <Sparkles className="w-3.5 h-3.5" />
              Established Dental Integrity
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-slate-900 tracking-tight leading-tight">
              A Symphony of Clinical Science & Aesthetic Artistry
            </h1>
            <p className="text-slate-600 font-medium leading-relaxed text-base">
              Founded in 2018, AuraSmile Dental Clinic was created to challenge the impersonal, rushed nature of traditional dental care. We believe that cosmetic oral alignment and tooth reconstructions represent a profound form of facial design.
            </p>
            <p className="text-slate-600 font-medium leading-relaxed text-sm">
              Our state-of-the-art facility integrates premium CAD/CAM milling centers, computerized desensitized local anesthesia, and beautiful aromatherapy clinical chambers. Here, we don't just treat symptoms—we co-design confidence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <span>Hospital-Grade Sterile Validation</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-600" />
                <span>AACD Board Member Clinicians</span>
              </div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-teal-600" />
                <span>Completely Pain-Free Protocols</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-teal-600" />
                <span>On-Site High-Precision CAD Milling</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-teal-500/10 rounded-3xl blur-2xl transform rotate-3" />
            <img 
              src="https://images.unsplash.com/photo-1579684389782-64d84b5e901d?auto=format&fit=crop&q=80&w=600" 
              alt="AuraSmile reception and premium lounge interior" 
              className="w-full h-full object-cover rounded-3.5xl shadow-xl relative z-10 border border-white"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* 2. THE SPECIALISTS */}
        <div id="our-specialists">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-teal-600 uppercase tracking-widest block font-heading">The Board-Certified Team</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
              Our Leading Medical Artisans
            </h2>
            <p className="text-slate-600 font-medium">
              Every clinician at AuraSmile possesses advanced post-doctoral styling training, combining strict academic dental science with artistic design principles.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {CLINIC_DOCTORS.map((doctor, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100 hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row gap-8 relative overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-400/5 before:to-emerald-400/5 before:blur-xl before:-z-10"
                id={`doctor-card-${idx}`}
              >
                {/* Doctor Photo */}
                <div className="w-full md:w-1/3 aspect-square rounded-2xl overflow-hidden shadow-xs border border-slate-100 flex-shrink-0">
                  <img 
                    src={doctor.image} 
                    alt={doctor.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Doctor Bio and Credentials */}
                <div className="flex-grow space-y-4">
                  <div>
                    <span className="text-xs font-bold text-teal-600 tracking-wider uppercase">{doctor.role}</span>
                    <h3 className="text-xl font-bold font-heading text-slate-900 mt-0.5">{doctor.name}</h3>
                  </div>
                  
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {doctor.bio}
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Core Specialties:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {doctor.specialties.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-md text-[10px] font-bold border border-slate-150">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Board Memberships & Honors:</h4>
                    <ul className="space-y-1.5">
                      {doctor.certifications.map((c, i) => (
                        <li key={i} className="text-[10px] font-semibold text-slate-600 flex items-start gap-1.5">
                          <span className="text-teal-500 font-bold mt-0.5">✔</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. STERILIZATION & CLINICAL SAFETY CODES */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-800 relative overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-teal-500/5 before:to-transparent before:blur-xl before:-z-10" id="sterilization-excellence">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-teal-400 uppercase tracking-widest block">Uncompromised Clinical Integrity</span>
            <h2 className="text-3xl font-extrabold font-heading text-white tracking-tight">
              Hospital-Grade Sterilization Guidelines
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Hygiene is not an afterthought; it is our foundation. We maintain strict validation protocols exceeding state guidelines to ensure complete safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STERILIZATION_STANDARDS.map((std, i) => (
              <div 
                key={i} 
                className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-3 hover:border-teal-500/20 transition-all duration-300 shadow-sm hover:shadow-md"
                id={`hygiene-rule-${i}`}
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <h4 className="font-bold text-sm text-white font-heading">{std.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{std.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
