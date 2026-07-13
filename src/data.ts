import { ServiceItem, BeforeAfterCase, Testimonial, StaffDoctor, FAQItem } from './types';

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'veneers',
    title: 'Aesthetic Porcelain Veneers',
    shortDescription: 'Ultra-thin, custom-crafted ceramic shells bonded to your teeth for a flawless smile shape and symmetry.',
    fullDescription: 'Porcelain veneers are the gold standard of cosmetic dentistry. We use ultra-premium lithium disilicate (e-max) ceramic, customized by master technicians to match your natural facial symmetry and preferred shade of brightness.',
    typicalDuration: '2 visits (1.5h each)',
    icon: 'Sparkles',
    priceEstimate: '$950 - $1,500 / tooth',
    benefits: [
      'Corrects minor gaps, chips, and misalignment instantly',
      'Ultra-natural translucency and custom textures',
      'Stain-resistant surface that stays white for 10-15+ years',
      'Minimally invasive preparation with maximum enamel conservation'
    ]
  },
  {
    id: 'whitening',
    title: 'Laser Teeth Deep Bleaching',
    shortDescription: 'In-office advanced clinical whitening utilizing photo-activated gels to lift years of deep organic stains.',
    fullDescription: 'Our deep bleaching protocol combines professional-grade carbamide peroxide gel with safe blue-spectrum laser light. This opens up enamel micro-pores to oxidize deep stains from coffee, wine, and aging without causing root sensitivity.',
    typicalDuration: '1 visit (60 - 90 mins)',
    icon: 'Flame',
    priceEstimate: '$350 - $600',
    benefits: [
      'Lightens teeth by 6 to 10 shades in a single session',
      'Includes specialized desensitizing therapy',
      'Custom take-home touch-up kit included',
      'Enamel-safe, pH-balanced formula'
    ]
  },
  {
    id: 'aligners',
    title: 'AuraSmile Clear Aligners',
    shortDescription: 'Virtually invisible orthodontic therapy using a digital series of custom thermoplastic aligner trays.',
    fullDescription: 'Straighten your teeth discretely with clear aligners. Using advanced 3D intraoral scans, we map your entire dental path digitally so you can preview your final smile before starting. No metal wires or brackets are needed.',
    typicalDuration: '12 - 18 months (bi-weekly changes)',
    icon: 'ShieldCheck',
    priceEstimate: '$3,500 - $5,500 total',
    benefits: [
      'Removable trays for easy eating, brushing, and flossing',
      'Nearly 100% transparent and highly comfortable',
      'Saves time with fewer, shorter clinical adjustment visits',
      'Includes premium final retention trays'
    ]
  },
  {
    id: 'crowns',
    title: 'Ceramic Crown Restorations',
    shortDescription: 'Full-coverage custom tooth crowns designed to protect and restore severely chipped or structurally weakened teeth.',
    fullDescription: 'When a tooth is cracked, heavily restored, or underwent root canal treatment, a custom crown is essential. We use premium biocompatible materials like Zirconia or high-translucency Porcelain to restore full chewing strength and pristine appearance.',
    typicalDuration: '2 visits (1h each)',
    icon: 'Activity',
    priceEstimate: '$850 - $1,300',
    benefits: [
      'Restores 100% structural strength and biting force',
      'Blends seamlessly with surrounding natural teeth',
      'Prevents future cracking or deep fracturing',
      'Biocompatible and highly gentle on gums'
    ]
  },
  {
    id: 'implants',
    title: 'Computer-Guided Dental Implants',
    shortDescription: 'Permanent titanium tooth replacement anchored securely into the bone, topped with a custom lifelike crown.',
    fullDescription: 'Implants represent the ultimate solution for missing teeth. Our computer-guided surgical protocols ensure exact placement of biological titanium posts. Implants prevent bone loss and provide the look, feel, and function of an organic tooth.',
    typicalDuration: '3 - 6 months (2 surgical phases)',
    icon: 'Anchor',
    priceEstimate: '$2,500 - $4,200',
    benefits: [
      'Permanent solution that can last a lifetime with proper care',
      'Prevents bone resorption and maintains facial volume',
      'No need to grind down adjacent teeth (unlike dental bridges)',
      '100% stable—feels and functions like a natural tooth'
    ]
  },
  {
    id: 'rootcanal',
    title: 'Microscopic Endodontic Therapy',
    shortDescription: 'Pain-free, highly precise root canal therapy conducted under high-power surgical microscopes to save infected teeth.',
    fullDescription: 'Say goodbye to tooth pain. Utilizing high-magnification dental microscopes, our specialists locate, disinfect, and seal complex root canal pathways with sub-millimeter precision, preserving your original tooth structure.',
    typicalDuration: '1 visit (60 - 75 mins)',
    icon: 'Activity',
    priceEstimate: '$600 - $950',
    benefits: [
      'Provides immediate relief from severe dental nerve pain',
      'Preserves the organic tooth and root foundation',
      '98% clinical success rate with advanced disinfection',
      'Comfort-first approach with virtual numbing technology'
    ]
  }
];

export const BEFORE_AFTER_DATA: BeforeAfterCase[] = [
  {
    id: 'whitening-case',
    title: 'Laser Whitening Transformation',
    description: 'Noticeable stain removal for a vibrant, naturally bright smile.',
    category: 'whitening',
    beforeLabel: 'Before: Stained',
    afterLabel: 'After: Bleached',
    imageSrc: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800',
    beforeFilter: 'sepia(0.55) saturate(1.8) contrast(0.85) brightness(0.82)',
    afterFilter: 'brightness(1.08) contrast(1.04) saturate(0.92)'
  },
  {
    id: 'braces-case',
    title: 'Clear Aligner Alignment',
    description: 'Perfect alignment and wire-bracket removal simulation.',
    category: 'braces',
    beforeLabel: 'Before: Braces',
    afterLabel: 'After: Aligned',
    imageSrc: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800',
    beforeFilter: 'brightness(0.96)',
    afterFilter: 'brightness(1.05) contrast(1.02)',
    hasBracesOverlay: true
  },
  {
    id: 'chipped-case',
    title: 'Ceramic Crown Restoration',
    description: 'Restoration of a broken front incisor with a flawless zirconia crown.',
    category: 'restoration',
    beforeLabel: 'Before: Broken',
    afterLabel: 'After: Restored',
    imageSrc: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800',
    beforeFilter: 'brightness(0.97)',
    afterFilter: 'brightness(1.05) contrast(1.03)',
    hasChippedOverlay: true
  }
];

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    rating: 5,
    text: 'AuraSmile completely changed how I feel about visiting the dentist! The porcelain veneers they did are breathtakingly natural. The entire staff treated me like royalty.',
    treatment: 'Porcelain Veneers',
    date: '2 weeks ago',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    rating: 5,
    text: 'As a medical professional, I am extremely particular about sterilization standards. AuraSmile exceeded my expectations. Their microscopic root canal was entirely pain-free.',
    treatment: 'Microscopic Root Canal',
    date: '1 month ago',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: '3',
    name: 'Elena Rostova',
    rating: 5,
    text: 'I completed my clear aligner treatment here. The digital 3D planning was fascinating, and my teeth are now perfectly straight. The best cosmetic clinic in the city!',
    treatment: 'Clear Aligners',
    date: '3 days ago',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
  }
];

export const CLINIC_DOCTORS: StaffDoctor[] = [
  {
    name: 'Dr. Evelyn Sterling, DDS',
    role: 'Lead Cosmetic Dentist & Founder',
    bio: 'With over 15 years of cosmetic dentistry experience, Dr. Sterling graduated with honors from NYU College of Dentistry. She specializes in full-mouth smile makeovers and advanced porcelain veneers, blending medical mastery with artistic precision.',
    specialties: ['Cosmetic Smile Makeovers', 'Porcelain Veneers', 'Lumineers'],
    certifications: [
      'American Academy of Cosmetic Dentistry (AACD) Active Member',
      'International Congress of Oral Implantologists Fellow',
      'Advanced Aesthetic Styling certification (Geneva)'
    ],
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Dr. Marcus Vance, DDS, MS',
    role: 'Specialist Orthodontist & Implantologist',
    bio: 'Dr. Vance completed his dual orthodontic and surgical residency at Harvard Dental School. He specializes in computer-guided implants and clear aligners, focusing on bite-reconstruction and facial aesthetics.',
    specialties: ['Clear Aligner Orthodontics', 'Guided Dental Implants', 'Bite Alignment'],
    certifications: [
      'American Board of Orthodontics (ABO) Certified',
      'Invisalign Diamond Top Provider Award',
      'Guided Bone Regeneration Mastery (Zurich)'
    ],
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400'
  }
];

export const STERILIZATION_STANDARDS = [
  {
    title: 'Class-B Autoclave Sterilization',
    description: 'We utilize hospital-grade fractionated vacuum autoclaves ensuring absolute destruction of all microbial life on all instruments.'
  },
  {
    title: 'Surgical HEPA Air Filtration',
    description: 'All clinical bays feature positive-pressure air systems with H14 medical HEPA filtration cycling fresh, sterile air 12 times per hour.'
  },
  {
    title: 'Chemical Indicator Validation',
    description: 'Every surgical pack contains multiple physical, chemical, and biological spore tests validating sterile chambers.'
  },
  {
    title: 'Disposable Single-Use Barriers',
    description: 'Every handpiece surface, utility rail, and contact point is wrapped in protective, sterile film replaced after each client.'
  }
];

export const FAQS_DATA: FAQItem[] = [
  {
    question: 'Do you offer teeth whitening?',
    answer: 'Yes. We offer professional laser teeth whitening with immediate visible results. The procedure typically takes 45–60 minutes.',
    category: 'Whitening'
  },
  {
    question: 'How long do dental implants last?',
    answer: 'With proper care, dental implants can last 15–25 years or more. Regular check-ups are essential.',
    category: 'Implants'
  },
  {
    question: 'Is teeth whitening safe?',
    answer: 'Yes, when performed by professionals. We use clinically approved materials.',
    category: 'Whitening'
  },
  {
    question: 'How often should I get dental cleaning?',
    answer: 'Every 6 months is recommended for most patients.',
    category: 'Cleaning'
  },
  {
    question: 'Do you accept walk-ins?',
    answer: 'We recommend booking in advance to avoid waiting.',
    category: 'General'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept cash, card, and approved digital payments.',
    category: 'General'
  },
  {
    question: 'Do you treat children?',
    answer: 'Yes, we provide pediatric dental care.',
    category: 'Pediatric'
  },
  {
    question: 'How long do veneers last?',
    answer: 'Porcelain veneers usually last 10–15 years with proper care.',
    category: 'Cosmetic'
  },
  {
    question: 'Is root canal painful?',
    answer: 'Modern root canal treatments are virtually painless due to local anesthesia.',
    category: 'Treatments'
  },
  {
    question: 'How long does a consultation take?',
    answer: 'A standard consultation takes 20–30 minutes.',
    category: 'General'
  },
  {
    question: 'Do you provide emergency dental care?',
    answer: 'Yes. Please contact us immediately for urgent cases.',
    category: 'General'
  },
  {
    question: 'Can I reschedule my appointment?',
    answer: 'Yes. Please contact reception at least 24 hours before.',
    category: 'General'
  },
  {
    question: 'What if I miss my appointment?',
    answer: 'Please inform us as soon as possible to reschedule.',
    category: 'General'
  },
  {
    question: 'Do you offer braces?',
    answer: 'Yes, we offer traditional and clear aligner options.',
    category: 'Orthodontics'
  },
  {
    question: 'How can I maintain oral hygiene?',
    answer: 'Brush twice daily, floss regularly, and schedule cleanings every 6 months.',
    category: 'General'
  },
  {
    question: 'Where is the clinic located?',
    answer: '450 Wellness Plaza, Suite 100.',
    category: 'General'
  },
  {
    question: 'What are your working hours?',
    answer: 'Monday to Saturday, 9:00 AM – 6:00 PM.',
    category: 'General'
  },
  {
    question: 'How long does whitening last?',
    answer: 'Results typically last 6–12 months depending on lifestyle.',
    category: 'Whitening'
  },
  {
    question: 'Do you provide cosmetic dentistry?',
    answer: 'Yes. We specialize in aesthetic and restorative dentistry.',
    category: 'Cosmetic'
  },
  {
    question: 'How do I book an appointment?',
    answer: 'Click “Book Appointment” and follow the assistant steps.',
    category: 'General'
  }
];
