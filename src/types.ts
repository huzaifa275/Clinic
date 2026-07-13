export type PageType = 'home' | 'services' | 'before-after' | 'about' | 'contact' | 'admin';

export interface ClinicSettings {
  id: string;
  timezone: string;
  working_hours_json: {
    [day: string]: { open: string; close: string; active: boolean };
  };
  admin_whatsapp: string;
  updated_at: string;
  time_slot_interval?: number;
  whatsapp_number?: string;
  clinic_name?: string;
}

export interface Procedure {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  slot_step_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  code_4digit: string;
  name: string;
  phone: string;
  procedure_id: string;
  start_at: string;
  end_at: string;
  status: 'BOOKED' | 'DONE' | 'CANCELED';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: 'NEW_APPOINTMENT';
  appointment_id: string;
  payload_json: string;
  read_at: string | null;
  created_at: string;
}

export interface AdminDevice {
  id: string;
  device_label: string;
  user_agent: string;
  last_seen: string;
  created_at: string;
  revoked?: boolean;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  data_json: string;
  is_published: boolean;
  created_at: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  typicalDuration: string;
  icon: string; // Lucide icon name
  priceEstimate: string;
  benefits: string[];
}

export interface BeforeAfterCase {
  id: string;
  title: string;
  description: string;
  category: 'whitening' | 'braces' | 'restoration';
  beforeLabel: string;
  afterLabel: string;
  imageSrc: string;
  // Specific styling values to simulate before condition via filters/overlays
  beforeFilter: string;
  afterFilter: string;
  hasBracesOverlay?: boolean;
  hasChippedOverlay?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  treatment: string;
  date: string;
  image: string;
}

export interface StaffDoctor {
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  certifications: string[];
  image: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}
