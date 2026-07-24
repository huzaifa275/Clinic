import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Types representing the 8 required database tables
export interface ClinicSettings {
  id: string;
  timezone: string;
  working_hours_json: {
    [day: string]: { open: string; close: string; active: boolean };
  };
  admin_whatsapp: string;
  updated_at: string;
  time_slot_interval: number;
  whatsapp_number: string;
  clinic_name: string;
  clinic_logo: string;
  clinic_address: string;
  contact_email: string;
  admin_name: string;
  admin_profile_image: string;
  [key: string]: any; // future-proof clinic settings
}

export interface Procedure {
  id: string;
  name: string;
  duration_minutes: number;
  price: number; // e.g. 500
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
  start_at: string; // ISO datetime
  end_at: string;   // ISO datetime
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
  token_hash: string;
  last_seen: string;
  created_at: string;
  revoked_at: string | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer_long: string;
  updated_at: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  data_json: string; // Dynamic page sections text and image URLs
  is_published: boolean;
  created_at: string;
}

export interface DBState {
  clinic_settings: ClinicSettings;
  procedures: Procedure[];
  appointments: Appointment[];
  notifications: Notification[];
  admin_devices: AdminDevice[];
  faq_items: FaqItem[];
  pages: Page[];
  page_versions: PageVersion[];
  admin_password_hash: string;
  failed_login_attempts: { [ip: string]: { count: number; lockedUntil: string | null } };
}

const SEED_PATH = path.join(process.cwd(), 'data', 'db.json');
const TMP_PATH = '/tmp/db.json';
const DB_PATH = process.env.NETLIFY ? TMP_PATH : (fs.existsSync(TMP_PATH) ? TMP_PATH : SEED_PATH);

// Helper to hash passwords using PBKDF2
export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, 'aurasmile_salt_2026', 1000, 64, 'sha512').toString('hex');
}

// Initial seed data mirroring current static content
const initialSettings: ClinicSettings = {
  id: 'main',
  timezone: 'America/New_York',
  working_hours_json: {
    Monday: { open: '09:00', close: '17:00', active: true },
    Tuesday: { open: '09:00', close: '17:00', active: true },
    Wednesday: { open: '09:00', close: '17:00', active: true },
    Thursday: { open: '09:00', close: '17:00', active: true },
    Friday: { open: '09:00', close: '17:00', active: true },
    Saturday: { open: '10:00', close: '14:00', active: false },
    Sunday: { open: '10:00', close: '14:00', active: false },
  },
  admin_whatsapp: '+18005550199',
  updated_at: new Date().toISOString(),
  time_slot_interval: 30,
  whatsapp_number: '+18005550199',
  clinic_name: 'AuraSmile Dental Clinic',
  clinic_logo: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=120',
  clinic_address: '450 Wellness Plaza, Suite 100, New York, NY',
  contact_email: 'appointments@aurasmile.com',
  admin_name: 'Dr. Evelyn Sterling',
  admin_profile_image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
};

const initialProcedures: Procedure[] = [
  {
    id: 'veneers',
    name: 'Aesthetic Porcelain Veneers',
    duration_minutes: 90,
    price: 1200,
    slot_step_minutes: 30,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'whitening',
    name: 'Laser Teeth Deep Bleaching',
    duration_minutes: 60,
    price: 450,
    slot_step_minutes: 15,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'aligners',
    name: 'AuraSmile Clear Aligners',
    duration_minutes: 45,
    price: 4500,
    slot_step_minutes: 15,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'crowns',
    name: 'Ceramic Crown Restorations',
    duration_minutes: 60,
    price: 1100,
    slot_step_minutes: 30,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'implants',
    name: 'Computer-Guided Dental Implants',
    duration_minutes: 120,
    price: 3300,
    slot_step_minutes: 60,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rootcanal',
    name: 'Microscopic Endodontic Therapy',
    duration_minutes: 75,
    price: 780,
    slot_step_minutes: 15,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const initialFAQs: FaqItem[] = [
  {
    id: 'faq_1',
    question: 'Do you offer teeth whitening?',
    answer_long: 'Yes. We offer professional laser teeth whitening with immediate visible results. The procedure typically takes 45–60 minutes.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_2',
    question: 'How long do dental implants last?',
    answer_long: 'With proper care, dental implants can last 15–25 years or more. Regular check-ups are essential.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_3',
    question: 'Is teeth whitening safe?',
    answer_long: 'Yes, when performed by professionals. We use clinically approved materials.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_4',
    question: 'How often should I get dental cleaning?',
    answer_long: 'Every 6 months is recommended for most patients.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_5',
    question: 'Do you accept walk-ins?',
    answer_long: 'We recommend booking in advance to avoid waiting.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_6',
    question: 'What payment methods do you accept?',
    answer_long: 'We accept cash, card, and approved digital payments.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_7',
    question: 'Do you treat children?',
    answer_long: 'Yes, we provide pediatric dental care.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_8',
    question: 'How long do veneers last?',
    answer_long: 'Porcelain veneers usually last 10–15 years with proper care.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_9',
    question: 'Is root canal painful?',
    answer_long: 'Modern root canal treatments are virtually painless due to local anesthesia.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_10',
    question: 'How long does a consultation take?',
    answer_long: 'A standard consultation takes 20–30 minutes.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_11',
    question: 'Do you provide emergency dental care?',
    answer_long: 'Yes. Please contact us immediately for urgent cases.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_12',
    question: 'Can I reschedule my appointment?',
    answer_long: 'Yes. Please contact reception at least 24 hours before.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_13',
    question: 'What if I miss my appointment?',
    answer_long: 'Please inform us as soon as possible to reschedule.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_14',
    question: 'Do you offer braces?',
    answer_long: 'Yes, we offer traditional and clear aligner options.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_15',
    question: 'How can I maintain oral hygiene?',
    answer_long: 'Brush twice daily, floss regularly, and schedule cleanings every 6 months.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_16',
    question: 'Where is the clinic located?',
    answer_long: '450 Wellness Plaza, Suite 100.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_17',
    question: 'What are your working hours?',
    answer_long: 'Monday to Saturday, 9:00 AM – 6:00 PM.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_18',
    question: 'How long does whitening last?',
    answer_long: 'Results typically last 6–12 months depending on lifestyle.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_19',
    question: 'Do you provide cosmetic dentistry?',
    answer_long: 'Yes. We specialize in aesthetic and restorative dentistry.',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'faq_20',
    question: 'How do I book an appointment?',
    answer_long: 'Click “Book Appointment” and follow the assistant steps.',
    updated_at: new Date().toISOString(),
  },
];

// Content structures for standard pages
const initialPages: Page[] = [
  { id: 'home', slug: 'home', title: 'Home' },
  { id: 'services', slug: 'services', title: 'Treatments' },
  { id: 'before-after', slug: 'before-after', title: 'Transformations' },
  { id: 'about', slug: 'about', title: 'Our Story' },
  { id: 'contact', slug: 'contact', title: 'Contact' },
];

const initialPageVersions: PageVersion[] = [
  {
    id: 'v_home_1',
    page_id: 'home',
    is_published: true,
    created_at: new Date().toISOString(),
    data_json: JSON.stringify({
      heroTitle: 'A Radiantly Healthy Smile Designed Just for You',
      heroSubtitle: 'Experience the pinnacle of high-end cosmetic dentistry and dental restorations at AuraSmile. We combine award-winning clinicians, state-of-the-art 3D imaging, and zero-pain protocols.',
      heroImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800',
      welcomeHeader: 'Next-Generation Dental Artistry',
      stats: [
        { value: '4.9/5', label: 'Patient Rating' },
        { value: '15k+', label: 'Happy Smiles' },
        { value: '100%', label: 'Pain-Free Tech' },
      ],
    }),
  },
  {
    id: 'v_services_1',
    page_id: 'services',
    is_published: true,
    created_at: new Date().toISOString(),
    data_json: JSON.stringify({
      headerTitle: 'Signature Dental Treatments',
      headerSubtitle: 'Every procedure is customized for optimal aesthetics and lifetime structural integrity.',
    }),
  },
  {
    id: 'v_before_after_1',
    page_id: 'before-after',
    is_published: true,
    created_at: new Date().toISOString(),
    data_json: JSON.stringify({
      headerTitle: 'AuraSmile Transformations',
      headerSubtitle: 'Explore real clinic before-and-after results with our precision comparison slider.',
    }),
  },
  {
    id: 'v_about_1',
    page_id: 'about',
    is_published: true,
    created_at: new Date().toISOString(),
    data_json: JSON.stringify({
      storyHeader: 'Our Clinical Philosophy',
      storyText: 'AuraSmile was founded on the belief that visiting the dentist should be an inspiring, relaxing, and life-changing experience. We fuse master artistry with high-magnification engineering to achieve elite health.',
    }),
  },
  {
    id: 'v_contact_1',
    page_id: 'contact',
    is_published: true,
    created_at: new Date().toISOString(),
    data_json: JSON.stringify({
      address: '742 Park Avenue, Penthouse B, New York, NY 10021',
      phone: '+1 (800) 555-0199',
      email: 'concierge@aurasmiledental.com',
      mapUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800',
    }),
  },
];

class Database {
  private state: DBState = {
    clinic_settings: initialSettings,
    procedures: initialProcedures,
    appointments: [],
    notifications: [],
    admin_devices: [],
    faq_items: initialFAQs,
    pages: initialPages,
    page_versions: initialPageVersions,
    admin_password_hash: hashPassword('huzaifa2'), // Secure default: huzaifa2
    failed_login_attempts: {},
  };

  constructor() {
    this.load();
    // Enforce the requested password 'huzaifa2' to ensure pre-existing data uses it
    if (this.state.admin_password_hash === hashPassword('admin123') || !this.state.admin_password_hash) {
      this.state.admin_password_hash = hashPassword('huzaifa2');
      this.save();
    }
  }

  private load() {
    try {
      let activePath = fs.existsSync(TMP_PATH) ? TMP_PATH : (fs.existsSync(SEED_PATH) ? SEED_PATH : null);

      if (activePath) {
        const raw = fs.readFileSync(activePath, 'utf-8');
        const loaded = JSON.parse(raw);
        this.state = { ...this.state, ...loaded };
        
        // Auto-upgrade FAQs to the new list if they are outdated or short
        if (!this.state.faq_items || this.state.faq_items.length < 20) {
          this.state.faq_items = initialFAQs;
          this.save();
        }

        // Defensive upgrades for new clinic_settings fields
        if (this.state.clinic_settings) {
          let updated = false;
          if (this.state.clinic_settings.time_slot_interval === undefined) {
            this.state.clinic_settings.time_slot_interval = 30;
            updated = true;
          }
          if (this.state.clinic_settings.whatsapp_number === undefined) {
            this.state.clinic_settings.whatsapp_number = this.state.clinic_settings.admin_whatsapp || '+18005550199';
            updated = true;
          }
          if (this.state.clinic_settings.clinic_name === undefined) {
            this.state.clinic_settings.clinic_name = 'AuraSmile Dental Clinic';
            updated = true;
          }
          if (this.state.clinic_settings.clinic_logo === undefined) {
            this.state.clinic_settings.clinic_logo = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=120';
            updated = true;
          }
          if (this.state.clinic_settings.clinic_address === undefined) {
            this.state.clinic_settings.clinic_address = '450 Wellness Plaza, Suite 100, New York, NY';
            updated = true;
          }
          if (this.state.clinic_settings.contact_email === undefined) {
            this.state.clinic_settings.contact_email = 'appointments@aurasmile.com';
            updated = true;
          }
          if (this.state.clinic_settings.admin_name === undefined) {
            this.state.clinic_settings.admin_name = 'Dr. Evelyn Sterling';
            updated = true;
          }
          if (this.state.clinic_settings.admin_profile_image === undefined) {
            this.state.clinic_settings.admin_profile_image = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200';
            updated = true;
          }
          if (updated) {
            this.save();
          }
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Failed to load database. Initializing defaults.', e);
    }
  }

  public save() {
    try {
      const dataStr = JSON.stringify(this.state, null, 2);
      
      // Write to /tmp/db.json
      try {
        const tmpDir = path.dirname(TMP_PATH);
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(TMP_PATH, dataStr, 'utf-8');
      } catch (err) {
        console.error('Failed to write to /tmp/db.json', err);
      }

      // Also try writing to SEED_PATH if writeable (non-serverless local env)
      try {
        const seedDir = path.dirname(SEED_PATH);
        if (!fs.existsSync(seedDir)) {
          fs.mkdirSync(seedDir, { recursive: true });
        }
        fs.writeFileSync(SEED_PATH, dataStr, 'utf-8');
      } catch (_) {
        // Safe fallback for read-only serverless filesystem
      }
    } catch (e) {
      console.error('Failed to save database.', e);
    }
  }

  // Clinic Settings
  public getSettings(): ClinicSettings {
    return this.state.clinic_settings;
  }

  public updateSettings(settings: Partial<ClinicSettings>): ClinicSettings {
    this.state.clinic_settings = {
      ...this.state.clinic_settings,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.state.clinic_settings;
  }

  // Password Setup
  public getPasswordHash(): string {
    return this.state.admin_password_hash;
  }

  public updatePassword(newPassword: string) {
    this.state.admin_password_hash = hashPassword(newPassword);
    this.save();
  }

  // Procedures
  public getProcedures(): Procedure[] {
    return this.state.procedures;
  }

  public saveProcedure(procedure: Procedure): Procedure {
    const idx = this.state.procedures.findIndex(p => p.id === procedure.id);
    if (idx !== -1) {
      this.state.procedures[idx] = {
        ...procedure,
        updated_at: new Date().toISOString(),
      };
    } else {
      this.state.procedures.push({
        ...procedure,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    this.save();
    return procedure;
  }

  public deleteProcedure(id: string): boolean {
    const originalLen = this.state.procedures.length;
    this.state.procedures = this.state.procedures.filter(p => p.id !== id);
    const deleted = this.state.procedures.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  // Appointments
  public getAppointments(): Appointment[] {
    return this.state.appointments;
  }

  public saveAppointment(app: Appointment): Appointment {
    const idx = this.state.appointments.findIndex(a => a.id === app.id);
    if (idx !== -1) {
      this.state.appointments[idx] = {
        ...app,
        updated_at: new Date().toISOString(),
      };
    } else {
      this.state.appointments.push({
        ...app,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    this.save();
    return app;
  }

  public deleteAppointment(id: string): boolean {
    const originalLen = this.state.appointments.length;
    this.state.appointments = this.state.appointments.filter(a => a.id !== id);
    const deleted = this.state.appointments.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  // FAQs
  public getFAQs(): FaqItem[] {
    return this.state.faq_items;
  }

  public saveFAQ(faq: FaqItem): FaqItem {
    const idx = this.state.faq_items.findIndex(f => f.id === faq.id);
    if (idx !== -1) {
      this.state.faq_items[idx] = {
        ...faq,
        updated_at: new Date().toISOString(),
      };
    } else {
      this.state.faq_items.push({
        ...faq,
        updated_at: new Date().toISOString(),
      });
    }
    this.save();
    return faq;
  }

  public deleteFAQ(id: string): boolean {
    const originalLen = this.state.faq_items.length;
    this.state.faq_items = this.state.faq_items.filter(f => f.id !== id);
    const deleted = this.state.faq_items.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  // Notifications
  public getNotifications(): Notification[] {
    return this.state.notifications;
  }

  public addNotification(notification: Notification): Notification {
    this.state.notifications.unshift(notification);
    this.save();
    return notification;
  }

  public markNotificationRead(id: string): Notification | null {
    const item = this.state.notifications.find(n => n.id === id);
    if (item) {
      item.read_at = new Date().toISOString();
      this.save();
      return item;
    }
    return null;
  }

  public markAllNotificationsRead(): void {
    const now = new Date().toISOString();
    this.state.notifications.forEach(n => {
      if (!n.read_at) n.read_at = now;
    });
    this.save();
  }

  // Admin Devices
  public getDevices(): AdminDevice[] {
    return this.state.admin_devices;
  }

  public addDevice(device: AdminDevice): AdminDevice {
    this.state.admin_devices.push(device);
    this.save();
    return device;
  }

  public updateDeviceSeen(id: string) {
    const dev = this.state.admin_devices.find(d => d.id === id);
    if (dev) {
      dev.last_seen = new Date().toISOString();
      this.save();
    }
  }

  public revokeDevice(id: string) {
    const dev = this.state.admin_devices.find(d => d.id === id);
    if (dev) {
      dev.revoked_at = new Date().toISOString();
      this.save();
    }
  }

  // Brute Force protection helpers
  public getFailedAttempts(ip: string) {
    const attempt = this.state.failed_login_attempts[ip];
    if (!attempt) return { count: 0, lockedUntil: null };
    if (attempt.lockedUntil && new Date(attempt.lockedUntil) < new Date()) {
      // Lock expired
      attempt.count = 0;
      attempt.lockedUntil = null;
      this.save();
    }
    return attempt;
  }

  public registerFailedAttempt(ip: string) {
    let attempt = this.state.failed_login_attempts[ip];
    if (!attempt) {
      attempt = { count: 0, lockedUntil: null };
    }
    attempt.count += 1;
    if (attempt.count >= 5) {
      // 10 minutes lockout
      const lockDate = new Date();
      lockDate.setMinutes(lockDate.getMinutes() + 10);
      attempt.lockedUntil = lockDate.toISOString();
    }
    this.state.failed_login_attempts[ip] = attempt;
    this.save();
  }

  public clearFailedAttempts(ip: string) {
    delete this.state.failed_login_attempts[ip];
    this.save();
  }

  // Pages & Content editing
  public getPages(): Page[] {
    return this.state.pages;
  }

  public getPageVersions(): PageVersion[] {
    return this.state.page_versions;
  }

  public savePage(page: Page): Page {
    const exists = this.state.pages.find(p => p.id === page.id || p.slug === page.slug);
    if (!exists) {
      this.state.pages.push(page);
    }
    this.save();
    return page;
  }

  public savePageVersion(version: PageVersion): PageVersion {
    const idx = this.state.page_versions.findIndex(v => v.id === version.id);
    if (idx !== -1) {
      this.state.page_versions[idx] = version;
    } else {
      this.state.page_versions.push(version);
    }
    this.save();
    return version;
  }

  public publishPageVersion(pageId: string, versionId: string) {
    this.state.page_versions.forEach(v => {
      if (v.page_id === pageId) {
        v.is_published = (v.id === versionId);
      }
    });
    this.save();
  }
}

export const db = new Database();
