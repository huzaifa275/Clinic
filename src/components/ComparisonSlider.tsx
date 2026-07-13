import React, { useState, useRef, useEffect } from 'react';
import { BeforeAfterCase } from '../types';
import { Sparkles, ArrowLeftRight } from 'lucide-react';

interface ComparisonSliderProps {
  item: BeforeAfterCase;
}

export default function ComparisonSlider({ item }: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle manual dragging on the container
  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-full" id={`before-after-card-${item.id}`}>
      {/* Title & Badge */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
          <Sparkles className="w-3 h-3" />
          {item.category === 'whitening' && 'Deep Stain Bleaching'}
          {item.category === 'braces' && 'Invisible Aligners'}
          {item.category === 'restoration' && 'Cosmetic Crown'}
        </span>
        <h3 className="text-lg font-bold font-heading text-slate-900 mt-1.5">{item.title}</h3>
      </div>

      {/* Main Interactive Slider Box */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-100 bg-slate-50 select-none cursor-ew-resize group"
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        {/* AFTER IMAGE (Base Layer) */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src={item.imageSrc} 
            alt={item.afterLabel}
            className="w-full h-full object-cover select-none"
            style={{ filter: item.afterFilter }}
            referrerPolicy="no-referrer"
          />
          {/* Label Right */}
          <span className="absolute bottom-4 right-4 bg-teal-600/90 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-xs select-none">
            {item.afterLabel}
          </span>
        </div>

        {/* BEFORE IMAGE (Clipped Overlay Layer) */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ 
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` 
          }}
        >
          <img 
            src={item.imageSrc} 
            alt={item.beforeLabel}
            className="w-full h-full object-cover select-none"
            style={{ filter: item.beforeFilter }}
            referrerPolicy="no-referrer"
          />

          {/* BRACES OVERLAY (Only if specified, clipped along with before image) */}
          {item.hasBracesOverlay && (
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none text-slate-400"
              viewBox="0 0 800 450" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Silver Orthodontic Wire */}
              <path 
                d="M 120 220 Q 400 240 680 220" 
                stroke="url(#silverGradient)" 
                strokeWidth="4" 
                strokeLinecap="round" 
                filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.3))"
              />
              
              {/* Bracket 1 */}
              <rect x="200" y="200" width="16" height="16" rx="2" fill="url(#bracketGradient)" stroke="#8c8c8c" strokeWidth="1" />
              <line x1="208" y1="196" x2="208" y2="220" stroke="#a0a0a0" strokeWidth="2" />
              <line x1="196" y1="208" x2="220" y2="208" stroke="#a0a0a0" strokeWidth="1" />
              
              {/* Bracket 2 */}
              <rect x="280" y="206" width="18" height="18" rx="2" fill="url(#bracketGradient)" stroke="#8c8c8c" strokeWidth="1" />
              <line x1="289" y1="200" x2="289" y2="226" stroke="#a0a0a0" strokeWidth="2" />
              <line x1="276" y1="215" x2="302" y2="215" stroke="#a0a0a0" strokeWidth="1" />

              {/* Bracket 3 - Left Front Incisor */}
              <rect x="365" y="212" width="20" height="20" rx="2" fill="url(#bracketGradient)" stroke="#8c8c8c" strokeWidth="1" />
              <line x1="375" y1="206" x2="375" y2="234" stroke="#a0a0a0" strokeWidth="2.5" />
              <line x1="360" y1="222" x2="390" y2="222" stroke="#a0a0a0" strokeWidth="1" />

              {/* Bracket 4 - Right Front Incisor */}
              <rect x="415" y="212" width="20" height="20" rx="2" fill="url(#bracketGradient)" stroke="#8c8c8c" strokeWidth="1" />
              <line x1="425" y1="206" x2="425" y2="234" stroke="#a0a0a0" strokeWidth="2.5" />
              <line x1="410" y1="222" x2="440" y2="222" stroke="#a0a0a0" strokeWidth="1" />

              {/* Bracket 5 */}
              <rect x="502" y="206" width="18" height="18" rx="2" fill="url(#bracketGradient)" stroke="#8c8c8c" strokeWidth="1" />
              <line x1="511" y1="200" x2="511" y2="226" stroke="#a0a0a0" strokeWidth="2" />
              <line x1="498" y1="215" x2="524" y2="215" stroke="#a0a0a0" strokeWidth="1" />

              {/* Bracket 6 */}
              <rect x="584" y="200" width="16" height="16" rx="2" fill="url(#bracketGradient)" stroke="#8c8c8c" strokeWidth="1" />
              <line x1="592" y1="196" x2="592" y2="220" stroke="#a0a0a0" strokeWidth="2" />
              <line x1="580" y1="208" x2="604" y2="208" stroke="#a0a0a0" strokeWidth="1" />

              <defs>
                <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7a7a7a" />
                  <stop offset="50%" stopColor="#e0e0e0" />
                  <stop offset="100%" stopColor="#7a7a7a" />
                </linearGradient>
                <linearGradient id="bracketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d0d0d0" />
                  <stop offset="30%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#b0b0b0" />
                  <stop offset="100%" stopColor="#606060" />
                </linearGradient>
              </defs>
            </svg>
          )}

          {/* CHIPPED TOOTH OVERLAY (Only if specified, clips front tooth) */}
          {item.hasChippedOverlay && (
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 800 450" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Chip 1 - on the right central incisor tooth (around x=415, y=212) */}
              {/* Draws a dark shaded chip cutout to simulate broken enamel */}
              <path 
                d="M 416 230 C 418 226, 421 224, 424 225 L 426 232 L 416 232 Z" 
                fill="#3a2312" 
                opacity="0.85" 
              />
              {/* Subtle hairline crack running up the incisor */}
              <path 
                d="M 424 225 Q 426 200 422 180" 
                stroke="#614a38" 
                strokeWidth="1.5" 
                opacity="0.6" 
              />
            </svg>
          )}

          {/* Label Left */}
          <span className="absolute bottom-4 left-4 bg-slate-900/90 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-xs select-none">
            {item.beforeLabel}
          </span>
        </div>

        {/* COMPARISON SLIDER HANDLE (The vertical line + center circle) */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize select-none pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Draggable Circle Centerpiece */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-teal-600 shadow-md border-2 border-teal-500 flex items-center justify-center pointer-events-none transition-transform group-hover:scale-110">
            <ArrowLeftRight className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Swipe comparison indicator overlay (hidden when user drags) */}
        {sliderPosition === 50 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900/80 text-white text-xs font-medium rounded-full flex items-center gap-1.5 animate-bounce select-none pointer-events-none backdrop-blur-xs">
            <span>Swipe to compare</span>
          </div>
        )}
      </div>

      {/* Case Description Subtitle */}
      <p className="text-sm text-slate-600 mt-2.5 flex-grow line-clamp-2">{item.description}</p>
    </div>
  );
}
