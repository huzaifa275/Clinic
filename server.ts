import express from 'express';
import path from 'path';
import crypto from 'crypto';
import session from 'express-session';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, Procedure, Appointment, Notification, AdminDevice } from './server/db.js';
import { GoogleGenAI } from '@google/genai';

declare module 'express-session' {
  interface SessionData {
    admin?: boolean;
    deviceId?: string;
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.set('trust proxy', 1);

// Normalize Netlify Function request paths if routed via /.netlify/functions/api
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
    if (!req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  next();
});

app.use(express.json());

app.use(session({
  secret: 'aurasmile-clinic-secret-key-1293847',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Helper to parse cookies from request headers
function getCookies(req: express.Request): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    if (name) {
      list[name] = decodeURIComponent((parts[1] || '').trim());
    }
  });
  return list;
}

// Authentication Middleware
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.session && req.session.admin === true) {
    next();
    return;
  }

  const cookies = getCookies(req);
  const token = cookies['trusted_device'];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized. No active session or device token found.' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const device = db.getDevices().find(d => d.token_hash === tokenHash && !d.revoked_at);

  if (!device) {
    res.status(401).json({ error: 'Unauthorized. Invalid or revoked device.' });
    return;
  }

  // Update session
  if (req.session) {
    req.session.admin = true;
    req.session.deviceId = device.id;
  }

  // Update last seen
  db.updateDeviceSeen(device.id);
  (req as any).device = device;
  next();
}

// --- AUTH API ---

// Password rate limit and login
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  const { password, label } = req.body;

  const attempt = db.getFailedAttempts(ip);
  if (attempt.lockedUntil && new Date(attempt.lockedUntil) > new Date()) {
    const minsLeft = Math.ceil((new Date(attempt.lockedUntil).getTime() - Date.now()) / 60000);
    res.status(429).json({ error: `Too many failed attempts. Locked out for ${minsLeft} minutes.` });
    return;
  }

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const pHash = hashPassword(password);
  const correctHash = db.getPasswordHash();

  if (pHash !== correctHash) {
    db.registerFailedAttempt(ip);
    const updatedAttempt = db.getFailedAttempts(ip);
    const remaining = Math.max(0, 5 - updatedAttempt.count);
    if (updatedAttempt.lockedUntil) {
      res.status(401).json({ error: 'Incorrect password. Too many failures, you are locked out for 10 minutes.' });
    } else {
      res.status(401).json({ error: `Incorrect password. ${remaining} attempts remaining before temporary lockout.` });
    }
    return;
  }

  // Clear IP failures on success
  db.clearFailedAttempts(ip);

  // Generate trusted device token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const newDevice: AdminDevice = {
    id: 'dev_' + crypto.randomBytes(6).toString('hex'),
    device_label: label || `Device (${req.headers['user-agent']?.split(' ')[0] || 'Browser'})`,
    user_agent: req.headers['user-agent'] || 'Unknown Agent',
    token_hash: tokenHash,
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(),
    revoked_at: null,
  };

  db.addDevice(newDevice);

  // Set Session
  if (req.session) {
    req.session.admin = true;
    req.session.deviceId = newDevice.id;
  }

  // Set HTTPOnly Cookie
  res.setHeader('Set-Cookie', `trusted_device=${token}; HttpOnly; Path=/; Max-Age=31536000; SameSite=None; Secure`);
  res.json({ success: true, device: { id: newDevice.id, label: newDevice.device_label } });
});

// Check if device is trusted or session is active
app.get('/api/auth/check', (req, res) => {
  if (req.session && req.session.admin === true) {
    const deviceId = req.session.deviceId || '';
    const device = db.getDevices().find(d => d.id === deviceId);
    res.json({
      trusted: true,
      device: device ? { id: device.id, label: device.device_label } : { id: 'session_dev', label: 'Admin Session' }
    });
    return;
  }

  const cookies = getCookies(req);
  const token = cookies['trusted_device'];

  if (!token) {
    res.json({ trusted: false });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const device = db.getDevices().find(d => d.token_hash === tokenHash && !d.revoked_at);

  if (!device) {
    res.json({ trusted: false });
    return;
  }

  // Set Session
  if (req.session) {
    req.session.admin = true;
    req.session.deviceId = device.id;
  }

  db.updateDeviceSeen(device.id);
  res.json({ trusted: true, device: { id: device.id, label: device.device_label } });
});

// Logout device and destroy session
app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.setHeader('Set-Cookie', 'trusted_device=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure');
  res.json({ success: true });
});


// --- CLINIC SETTINGS API ---
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', authenticateAdmin, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});


// --- PROCEDURES API ---
app.get('/api/procedures', (req, res) => {
  // Public list
  res.json(db.getProcedures());
});

app.post('/api/procedures', authenticateAdmin, (req, res) => {
  const proc = req.body as Procedure;
  if (!proc.id) proc.id = 'proc_' + crypto.randomBytes(4).toString('hex');
  const saved = db.saveProcedure(proc);
  res.json(saved);
});

app.put('/api/procedures/:id', authenticateAdmin, (req, res) => {
  const proc = { ...req.body, id: req.params.id } as Procedure;
  const saved = db.saveProcedure(proc);
  res.json(saved);
});

app.delete('/api/procedures/:id', authenticateAdmin, (req, res) => {
  const deleted = db.deleteProcedure(req.params.id);
  res.json({ success: deleted });
});


// --- SERVICES API (Aliased to Procedures with database-specified keys) ---
app.get('/api/services', (req, res) => {
  const procedures = db.getProcedures();
  const services = procedures.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    duration: p.duration_minutes,
    active: p.active
  }));
  res.json(services);
});

app.post('/api/services', authenticateAdmin, (req, res) => {
  const body = req.body;
  const proc: Procedure = {
    id: body.id || 'proc_' + crypto.randomBytes(4).toString('hex'),
    name: body.name,
    price: Number(body.price),
    duration_minutes: Number(body.duration),
    slot_step_minutes: Number(body.duration) || 30,
    active: body.active !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const saved = db.saveProcedure(proc);
  res.json({
    id: saved.id,
    name: saved.name,
    price: saved.price,
    duration: saved.duration_minutes,
    active: saved.active
  });
});

app.put('/api/services/:id', authenticateAdmin, (req, res) => {
  const body = req.body;
  const existing = db.getProcedures().find(p => p.id === req.params.id);
  const proc: Procedure = {
    id: req.params.id,
    name: body.name || (existing ? existing.name : ''),
    price: body.price !== undefined ? Number(body.price) : (existing ? existing.price : 0),
    duration_minutes: body.duration !== undefined ? Number(body.duration) : (existing ? existing.duration_minutes : 30),
    slot_step_minutes: body.duration !== undefined ? Number(body.duration) : (existing ? existing.slot_step_minutes : 30),
    active: body.active !== undefined ? !!body.active : (existing ? existing.active : true),
    created_at: existing ? existing.created_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const saved = db.saveProcedure(proc);
  res.json({
    id: saved.id,
    name: saved.name,
    price: saved.price,
    duration: saved.duration_minutes,
    active: saved.active
  });
});

app.delete('/api/services/:id', authenticateAdmin, (req, res) => {
  const deleted = db.deleteProcedure(req.params.id);
  res.json({ success: deleted });
});


// --- APPOINTMENTS API ---
app.get('/api/appointments', authenticateAdmin, (req, res) => {
  res.json(db.getAppointments());
});

app.put('/api/appointments/:id', authenticateAdmin, (req, res) => {
  const existing = db.getAppointments().find(a => a.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }
  const updated = { ...existing, ...req.body, id: req.params.id } as Appointment;
  db.saveAppointment(updated);
  res.json(updated);
});

app.delete('/api/appointments/:id', authenticateAdmin, (req, res) => {
  const deleted = db.deleteAppointment(req.params.id);
  res.json({ success: deleted });
});


// --- NOTIFICATIONS API ---
app.get('/api/notifications', authenticateAdmin, (req, res) => {
  res.json(db.getNotifications());
});

app.post('/api/notifications/read-all', authenticateAdmin, (req, res) => {
  db.markAllNotificationsRead();
  res.json({ success: true });
});

app.post('/api/notifications/:id/read', authenticateAdmin, (req, res) => {
  const updated = db.markNotificationRead(req.params.id);
  res.json({ success: !!updated, notification: updated });
});


// --- ADMIN DEVICES API ---
app.get('/api/devices', authenticateAdmin, (req, res) => {
  const devices = db.getDevices().map(d => ({
    id: d.id,
    device_label: d.device_label,
    user_agent: d.user_agent,
    last_seen: d.last_seen,
    created_at: d.created_at,
    revoked: !!d.revoked_at,
  }));
  res.json(devices);
});

app.post('/api/devices/:id/revoke', authenticateAdmin, (req, res) => {
  db.revokeDevice(req.params.id);
  res.json({ success: true });
});


// --- FAQ MANAGEMENT API ---
app.get('/api/faqs', (req, res) => {
  res.json(db.getFAQs());
});

app.post('/api/faqs', authenticateAdmin, (req, res) => {
  const faq = req.body;
  if (!faq.id) faq.id = 'faq_' + crypto.randomBytes(4).toString('hex');
  const saved = db.saveFAQ(faq);
  res.json(saved);
});

app.put('/api/faqs/:id', authenticateAdmin, (req, res) => {
  const faq = { ...req.body, id: req.params.id };
  const saved = db.saveFAQ(faq);
  res.json(saved);
});

app.delete('/api/faqs/:id', authenticateAdmin, (req, res) => {
  const deleted = db.deleteFAQ(req.params.id);
  res.json({ success: deleted });
});


// --- PAGES & CONTENT API ---
app.get('/api/content', (req, res) => {
  const pages = db.getPages();
  const versions = db.getPageVersions();
  res.json({ pages, versions });
});

app.post('/api/pages', authenticateAdmin, (req, res) => {
  const page = req.body;
  const saved = db.savePage(page);
  res.json(saved);
});

app.post('/api/page-versions', authenticateAdmin, (req, res) => {
  const version = req.body;
  const saved = db.savePageVersion(version);
  res.json(saved);
});

app.post('/api/page-versions/:id/publish', authenticateAdmin, (req, res) => {
  const version = db.getPageVersions().find(v => v.id === req.params.id);
  if (!version) {
    res.status(404).json({ error: 'Page version not found' });
    return;
  }
  db.publishPageVersion(version.page_id, version.id);
  res.json({ success: true });
});


// --- CHAT ENDPOINT WITH BOOKING FLOW + AI BACKUP ---

// Helper: Check if query is booking-related
function isBookingIntent(text: string): boolean {
  const clean = text.toLowerCase().trim();

  // If the query is just a single word like 'book' or 'schedule' or 'appointment' or 'appt' or 'visit', that is definitely booking intent.
  if (clean === 'book' || clean === 'schedule' || clean === 'appointment' || clean === 'appt' || clean === 'visit' || clean === 'booking') {
    return true;
  }

  // Check for explicit booking verbs/actions
  if (clean.includes('book') || clean.includes('schedul') || clean.includes('reserv')) {
    return true;
  }

  // Check for combination of request words and appointment targets
  const requestWords = ['need', 'want', 'get', 'make', 'set', 'arrang', 'request', 'see', 'plan', 'hav', 'visit', 'go to', 'come to', 'tomorrow', 'today'];
  const targets = ['appointment', 'appt', 'visit', 'slot', 'dentist', 'checkup', 'check-up', 'clean', 'consult', 'session'];

  const hasRequestWord = requestWords.some(word => clean.includes(word));
  const hasTarget = targets.some(t => clean.includes(t));

  if (hasRequestWord && hasTarget) {
    return true;
  }

  // Explicit phrases list
  const explicitPhrases = [
    'see a dentist',
    'see the dentist',
    'see dentist',
    'visit a dentist',
    'visit the dentist',
    'visit dentist',
    'can i come in',
    'can i see someone',
    'appointment tomorrow',
    'appointment today'
  ];

  if (explicitPhrases.some(phrase => clean.includes(phrase))) {
    return true;
  }

  return false;
}


// Helper: Check if query is dental or clinic related
function isDentalOrClinicRelated(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return true;

  // Obviously unrelated topics to filter out immediately
  const nonDentalBlocks = [
    'recipe', 'cook', 'bake', 'football', 'soccer', 'basketball', 'baseball', 'sports', 
    'python', 'javascript', 'html', 'css', 'programming', 'code', 'coding', 'history',
    'geography', 'president', 'weather', 'movie', 'song', 'music', 'game', 'gaming',
    'math', 'science', 'physics', 'chemistry', 'biology', 'novel', 'book recommendation'
  ];
  
  if (nonDentalBlocks.some(word => lower.includes(word))) {
    return false;
  }

  // Allowed roots/stems related to dental care or clinic operations
  const dentalStems = [
    'dent', 'tooth', 'teeth', 'smile', 'brace', 'whiten', 'fill', 'canal', 'root',
    'crown', 'implant', 'cavit', 'ache', 'pain', 'bleed', 'gum', 'mouth', 'clean',
    'fluorid', 'hygie', 'bracket', 'align', 'invisalign', 'veneer', 'dentur', 'extract',
    'floss', 'ortho', 'carie', 'pulp', 'cosmetic', 'clinic', 'office', 'appointment',
    'book', 'schedul', 'locat', 'address', 'direction', 'hour', 'open', 'close', 'price',
    'cost', 'fee', 'rate', 'recept', 'phone', 'number', 'contact', 'doctor', 'treat',
    'service', 'hello', 'hi', 'hey', 'greet', 'morning', 'afternoon', 'evening', 'aura',
    'who are you', 'help', 'how much', 'what is', 'receptionist'
  ];

  return dentalStems.some(stem => lower.includes(stem));
}


// Helper: Get synonyms for a procedure name
function getProcedureSynonyms(pName: string): string[] {
  const lower = pName.toLowerCase();
  const syns: string[] = [lower];
  
  if (lower.includes('whiten') || lower.includes('bleach') || lower.includes('bright')) {
    syns.push('whitening', 'whiten', 'bleaching', 'bleach', 'brightening', 'teeth white');
  }
  if (lower.includes('veneer') || lower.includes('porcelain')) {
    syns.push('veneers', 'veneer', 'porcelain', 'laminate');
  }
  if (lower.includes('align') || lower.includes('brace') || lower.includes('invisalign')) {
    syns.push('aligners', 'aligner', 'braces', 'brace', 'invisalign', 'orthodontic');
  }
  if (lower.includes('crown') || lower.includes('cap') || lower.includes('ceramic')) {
    syns.push('crown', 'crowns', 'cap', 'caps', 'ceramic');
  }
  if (lower.includes('implant') || lower.includes('bridge')) {
    syns.push('implant', 'implants', 'bridge', 'bridges', 'screw');
  }
  if (lower.includes('root canal') || lower.includes('endodontic') || lower.includes('therapy')) {
    syns.push('root canal', 'endodontic', 'pulp', 'therapy');
  }
  if (lower.includes('clean') || lower.includes('scale') || lower.includes('hygiene')) {
    syns.push('cleaning', 'clean', 'scaling', 'scale', 'hygiene');
  }
  if (lower.includes('extract') || lower.includes('remove') || lower.includes('wisdom')) {
    syns.push('extraction', 'extract', 'removal', 'wisdom');
  }
  
  return syns;
}


function parseAndCheckDateValidity(text: string): { isValid: boolean; errorMsg?: string } {
  const lower = text.toLowerCase().trim();
  
  // Months list to recognize text format dates
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthMatch = months.find(m => lower.includes(m));
  
  if (monthMatch) {
    const numStr = lower.match(/\b\d{1,2}\b/)?.[0];
    if (numStr) {
      const day = parseInt(numStr, 10);
      const monthIndex = months.indexOf(monthMatch) % 12; // Normalizes Jan/January, Feb/February to 0-11
      
      const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day > daysInMonth[monthIndex] || day < 1) {
        return { 
          isValid: false, 
          errorMsg: `The date is invalid. ${monthMatch.charAt(0).toUpperCase() + monthMatch.slice(1)} only has ${daysInMonth[monthIndex]} days, so ${monthMatch} ${day} is not a valid calendar date.` 
        };
      }
      
      if (monthIndex === 1 && day > 29) {
        return { 
          isValid: false, 
          errorMsg: "The date is invalid. February does not have 30 or 31 days. Please select a valid date." 
        };
      }
    }
  }
  
  return { isValid: true };
}


function checkTimeValidity(text: string): { isValid: boolean; errorMsg?: string } {
  const clean = text.toUpperCase().replace(/\s/g, '');
  
  // Matches expressions like "25:00", "13:80", "14:65"
  const timeMatch = clean.match(/\b(\d{1,2})[\s:h]*(\d{2})?\s*(AM|PM)?\b/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];
    
    if (hour > 23 || (ampm && (hour < 1 || hour > 12))) {
      return { 
        isValid: false, 
        errorMsg: `${text} is not a valid time. Hours must be between 1 and 12 for AM/PM format, or 0 and 23 for 24-hour format.` 
      };
    }
    if (minute > 59) {
      return { 
        isValid: false, 
        errorMsg: `${text} is not a valid time. Minutes must be between 00 and 59.` 
      };
    }
  }
  
  return { isValid: true };
}


function parseNaturalTime(inputText: string): string | null {
  const clean = inputText.toLowerCase().replace(/[\s\.]/g, ''); // e.g. "3pm", "3:00pm"
  
  // 1. Try to match "15:30" or "09:00" (24h or simple format)
  const simpleMatch = clean.match(/^([0-2]?[0-9]):([0-5][0-9])/);
  if (simpleMatch) {
    let h = parseInt(simpleMatch[1], 10);
    const m = parseInt(simpleMatch[2], 10);
    
    // If user specified am/pm explicitly
    if (clean.includes('pm') && h < 12) {
      h += 12;
    } else if (clean.includes('am') && h === 12) {
      h = 0;
    }
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  
  // 2. Try to match "3pm", "3am", "12pm"
  const hourOnlyMatch = clean.match(/^([0-2]?[0-9])(am|pm)/);
  if (hourOnlyMatch) {
    let h = parseInt(hourOnlyMatch[1], 10);
    const ampm = hourOnlyMatch[2];
    
    if (ampm === 'pm' && h < 12) {
      h += 12;
    } else if (ampm === 'am' && h === 12) {
      h = 0;
    }
    
    return `${h.toString().padStart(2, '0')}:00`;
  }
  
  // 3. Try to match just a number "3" or "15"
  const digitMatch = clean.match(/^([0-2]?[0-9])$/);
  if (digitMatch) {
    let h = parseInt(digitMatch[1], 10);
    // If it's a small hour like 1-6, assume PM by default for afternoon slots or leave it to match
    if (h >= 1 && h <= 6) {
      h += 12;
    }
    return `${h.toString().padStart(2, '0')}:00`;
  }
  
  return null;
}


function getCurrentStepPrompt(state: any): string {
  switch (state.step) {
    case 'ask_name':
      return "What is your full name?";
    case 'ask_phone':
      return "Please enter your WhatsApp or phone number so we can confirm your booking.";
    case 'ask_procedure': {
      const procedures = db.getProcedures().filter(p => p.active);
      const optionsText = procedures.map((p, i) => `${i + 1}) ${p.name}`).join('\n');
      return `Which procedure would you like to book?\n\n${optionsText}\n\nPlease select one of the available options.`;
    }
    case 'ask_day': {
      const dateOptionsText = (state.bookingData?.availableDates || []).map((d: any, i: number) => `${i + 1}) ${d.formatted}`).join('\n');
      return `These dates are available:\n\n${dateOptionsText}\n\nPlease select one of the available dates.`;
    }
    case 'ask_time': {
      const timeOptionsText = (state.bookingData?.availableTimes || []).map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
      return `Available time slots for ${state.bookingData?.dateFormatted || 'the selected date'}:\n\n${timeOptionsText}\n\nPlease select a time.`;
    }
    case 'confirm': {
      const b = state.bookingData || {};
      return `Please confirm your appointment details:\n\nName: ${b.name}\nPhone: ${b.phone}\nProcedure: ${b.procedureName}\nDate: ${b.dateFormatted}\nTime: ${b.time}\nDuration: ${b.procedureDuration} minutes\n\nConfirm? (Yes / No)`;
    }
    default:
      return "What can I do for you?";
  }
}


// Helper: Typo normalization
function normalizeTextTypos(inputText: string): string {
  let clean = inputText.trim();
  const lower = clean.toLowerCase();
  
  // Exact or pattern based typo corrections
  if (lower === 'bok apointment tomorow') return 'book appointment tomorrow';
  if (lower.includes('bok apointment')) clean = clean.replace(/bok apointment/i, 'book appointment');
  if (lower.includes('tomorow')) clean = clean.replace(/tomorow/i, 'tomorrow');
  if (lower.includes('whitning')) clean = clean.replace(/whitning/i, 'whitening');
  if (lower.includes('whats ur')) clean = clean.replace(/whats ur/i, 'what is your');
  if (lower === 'helo' || lower.startsWith('helo ')) clean = clean.replace(/helo/i, 'hello');
  
  return clean;
}

// Helper: Get robust local clinic response from db data for common questions
function getClinicDataResponse(text: string): string | null {
  const settings = db.getSettings();
  const activeProcedures = db.getProcedures().filter(p => p.active);
  const clinicName = settings.clinic_name || 'AuraSmile Dental Clinic';

  const normalized = normalizeTextTypos(text);
  const clean = normalized.toLowerCase().trim();

  // --- SECTION 14: SECURITY & ACCESS REFUSAL (MUST RUN FIRST) ---
  if (clean.includes('show api key') || clean.includes('reveal api key') || clean.includes('get api key') || clean.includes('what is your api key') || clean.includes('api_key') || clean.includes('api key')) {
    return `I am committed to protecting the security of our systems. I cannot show, reveal, or share any API keys, credentials, or sensitive configurations.`;
  }
  if (clean.includes('show hidden instructions') || clean.includes('reveal system instructions') || clean.includes('show prompt') || clean.includes('system instructions') || clean.includes('system prompt')) {
    return `I am programmed to be the virtual assistant for ${clinicName}. I cannot reveal my system instructions, prompt details, or inner operational configurations.`;
  }
  if (clean.includes('ignore clinic policy') || clean.includes('bypass policy') || clean.includes('override policy') || clean.includes('ignore policy') || clean.includes('ignore previous')) {
    return `I am committed to assisting you as the professional virtual assistant for ${clinicName}. I cannot ignore, bypass, or override my operational policies or system instructions.`;
  }
  if (clean.includes('reveal database') || clean.includes('show database') || clean.includes('access database') || clean.includes('reveal your database') || clean.includes('database schema')) {
    return `I am committed to protecting patient privacy and clinic security. I cannot reveal, share, or grant access to our database systems or backend structures.`;
  }

  // --- SECTION 13: POLITENESS & GREETINGS ---
  if (clean === 'good morning' || clean.startsWith('good morning ') || clean.includes('good morning')) {
    return `Good morning! Welcome to our clinic. I am Aura, your virtual dental assistant. How can I help you today? You can ask about our services, pricing, business hours, or start booking an appointment.`;
  }
  if (clean === 'good night' || clean.startsWith('good night ') || clean.includes('good night')) {
    return `Good night! Thank you for reaching out. Sleep well, and keep your smile bright! Let us know if you need any dental care.`;
  }
  if (clean.includes('you are amazing') || clean.includes("you're amazing") || clean.includes('you are awesome') || clean.includes("you're awesome") || clean.includes('you amazing')) {
    return `Thank you so much for your kind words! It is my absolute pleasure to assist you and keep your smile healthy.`;
  }

  // --- SECTION 15: RANDOM USER STATES & MINDSETS ---
  if (clean.includes('just want information') || clean.includes('only want info') || clean.includes('only information') || clean === 'i just want information') {
    return `No problem at all! I'm happy to provide any information you need about our treatments, clinic hours, pricing, or dentists. Ask me anything, without any obligation to book!`;
  }
  if (clean.includes("don't want an appointment") || clean.includes('do not want an appointment') || clean.includes('no appointment') || clean.includes('dont want appointment')) {
    return `That's completely fine! I am here to help you with any questions or educational details about dental health. Feel free to ask anything.`;
  }
  if (clean.includes('comparing clinics') || clean.includes('compare clinics') || clean.includes('checking other clinics') || clean.includes('comparing dentist')) {
    return `We completely understand! Choosing the right dental care is an important decision. At ${clinicName}, we pride ourselves on master artistry, advanced technology, and maximum patient comfort. Let me know what specific treatments or features you are comparing, and I will gladly provide the details!`;
  }
  if (clean.includes('nervous') || clean.includes('i am nervous') || clean.includes("i'm nervous")) {
    return `It is completely normal to feel nervous! Many of our patients feel the same way. At our clinic, we focus on a gentle, painless experience and offer customized options like sedation or comforting music. We will go entirely at your own pace.`;
  }
  if (clean.includes('scared of dentist') || clean.includes('scared of dentists') || clean.includes('fear of dentist') || clean.includes('dentist phobia') || clean.includes('fear of dentists') || clean.includes('scared')) {
    return `We completely understand dental fear and treat it with the utmost respect and empathy. Our team is trained in gentle dental care, and we offer advanced comfort solutions to make your visit completely stress-free. Your peace of mind is our top priority.`;
  }

  // --- SECTION 9: NATURAL HUMAN CLINICAL/FAQ QUESTIONS ---
  if (clean.includes('tooth hurts') || clean.includes('toothache') || clean.includes('tooth pain') || clean.includes('my tooth hurts') || clean.includes('pain in my tooth')) {
    return `I am so sorry to hear that you are experiencing severe tooth pain. Dental pain can be very distressing, and we recommend scheduling an appointment as soon as possible for a professional examination. I cannot provide a medical diagnosis, but we can certainly get you in to see our dentist to relieve your discomfort. Would you like to book an appointment now?`;
  }
  if (clean.includes('broke my tooth') || clean.includes('broken tooth') || clean.includes('chipped tooth') || clean.includes('crack my tooth') || clean.includes('i broke my tooth')) {
    return `Oh no, a broken tooth requires urgent professional dental attention to protect the nerve and prevent infection. Please book an urgent dental visit as soon as possible, or contact our reception immediately so we can accommodate you. Would you like to check our available times right now?`;
  }
  if (clean.includes('filling fell out') || clean.includes('lost my filling') || clean.includes('lost filling') || clean.includes('my filling fell out')) {
    return `If your filling has fallen out, it is important to protect the exposed tooth structure from further decay or damage. We advise booking an appointment with our dentist as soon as possible. Would you like to schedule a visit to have your filling replaced?`;
  }
  if (clean.includes('gums are bleeding') || clean.includes('bleeding gums') || clean.includes('gums bleed') || clean.includes('my gums are bleeding')) {
    return `Bleeding gums are often an early sign of gingivitis or gum irritation and should not be ignored. We recommend scheduling a professional dental examination and deep cleaning to evaluate your gum health. Would you like to book an appointment with our specialist?`;
  }
  if (clean.includes('child has tooth pain') || clean.includes('kid has tooth pain') || clean.includes('children tooth ache') || clean.includes('child tooth') || clean.includes("child's tooth") || clean.includes('my child has tooth pain') || clean.includes('child toothache')) {
    return `I understand how worrying it is when a child has tooth pain. Children's teeth require gentle and specialized pediatric care to address discomfort quickly. We recommend scheduling a pediatric dental examination with our dentist as soon as possible. Would you like to book a slot for your child?`;
  }
  if (clean.includes('eat after teeth whitening') || clean.includes('eat after whitening') || clean.includes('after whitening eat') || clean.includes('can i eat after')) {
    return `Yes, you can eat after teeth whitening, but we highly recommend following the 'white diet' for the first 24 to 48 hours. Please avoid highly pigmented foods and beverages like coffee, red wine, tea, berries, and soy sauce, as well as extremely hot or cold items. Stick to neutral-colored foods like chicken, pasta, rice, and water to keep your smile bright!`;
  }
  if (clean.includes('how long do veneers last') || clean.includes('veneer lifetime') || clean.includes('veneers duration') || clean.includes('veneer last') || clean.includes('how long veneers last')) {
    return `Porcelain veneers typically last between 10 to 15 years, while composite veneers last about 5 to 7 years. Their longevity depends greatly on maintaining excellent oral hygiene, avoiding hard objects (like biting pens or ice), and visiting your dentist for regular check-ups. Would you like to book a consultation to learn more?`;
  }
  if (clean.includes('does whitening hurt') || clean.includes('is whitening painful') || clean.includes('whitening pain') || clean.includes('teeth whitening hurt')) {
    return `Professional teeth whitening is safe and generally not painful. Some patients may experience mild, temporary tooth sensitivity during or after the treatment, which usually resolves within 24 hours. We use specialized desensitizing agents to ensure your comfort throughout the procedure. Would you like to schedule a whitening session?`;
  }
  if (clean.includes('treatment is best for yellow teeth') || clean.includes('best for yellow teeth') || clean.includes('best treatment for yellow teeth') || clean.includes('yellow teeth') || clean.includes('whiten yellow teeth')) {
    return `To determine the best treatment for yellow teeth, we recommend booking a personalized consultation with our dentist. We offer excellent professional teeth whitening options, including in-office laser whitening and custom take-home whitening trays. Would you like to book a consultation to discuss your whitening options?`;
  }
  if (clean.includes('do implants hurt') || clean.includes('implant pain') || clean.includes('implants hurt') || clean.includes('does implant hurt')) {
    return `Dental implant placement is performed under local anesthesia, so you will not feel any pain during the procedure itself. Afterward, it is normal to experience some mild discomfort, swelling, or tenderness for a few days, which can be easily managed with standard over-the-counter pain relief. Implants are a highly successful, long-term solution for missing teeth. Would you like to book a consultation to see if they are right for you?`;
  }

  // 1. Services offered / treatments list queries
  const isServicesQuery = (clean.includes('service') || clean.includes('treatment') || clean.includes('procedure') || clean.includes('offer') || clean.includes('provide') || clean.includes('care')) &&
    (clean.includes('what') || clean.includes('list') || clean.includes('show') || clean.includes('avail') || clean.includes('have') || clean.includes('do you') || clean.includes('tell me') || clean.includes('any'));

  if (isServicesQuery || clean === 'services' || clean === 'treatments' || clean.includes('what do you do') || clean.includes('what do you offer') || clean.includes('what is available')) {
    if (activeProcedures.length > 0) {
      const listStr = activeProcedures.map((p, i) => `${i + 1}. **${p.name}** ($${p.price}, ${p.duration_minutes} min)`).join('\n');
      return `At ${clinicName}, we offer a comprehensive range of professional dental treatments and services:\n\n${listStr}\n\nWould you like to book an appointment for any of these treatments?`;
    } else {
      return `At ${clinicName}, we offer professional dental care and consultations. Please contact our reception for details on currently available procedures.`;
    }
  }

  // 2. Specific treatment query (check if user mentions any active procedure name or synonyms)
  for (const p of activeProcedures) {
    const synonyms = getProcedureSynonyms(p.name);
    const matchedSynonym = synonyms.find(syn => clean.includes(syn));
    if (matchedSynonym) {
      return `Yes, we offer professional **${p.name}** at ${clinicName}.\n\n- **Price**: $${p.price}\n- **Duration**: ${p.duration_minutes} minutes\n\nWould you like me to guide you through booking an appointment for this treatment?`;
    }
  }

  // 3. Working hours query
  const hoursKeywords = ['hours', 'open', 'close', 'schedule', 'time', 'saturday', 'sunday', 'weekday', 'working', 'when are you'];
  const isHoursQuery = hoursKeywords.some(kw => clean.includes(kw)) && (clean.includes('when') || clean.includes('what') || clean.includes('work') || clean.includes('are you') || clean.includes('open') || clean.includes('close') || clean.includes('hour'));
  if (isHoursQuery || clean === 'hours' || clean === 'opening hours' || clean === 'schedule') {
    const activeDays = Object.keys(settings.working_hours_json).filter(d => settings.working_hours_json[d].active);
    const hoursLines = activeDays.map(d => `- **${d}**: ${settings.working_hours_json[d].open} – ${settings.working_hours_json[d].close}`).join('\n');
    return `Our clinic hours at ${clinicName} are:\n\n${hoursLines}\n\nWe recommend booking an appointment in advance. Would you like to book a slot?`;
  }

  // 4. Location / address query
  const locationKeywords = ['located', 'location', 'address', 'where is', 'where are', 'get to', 'directions', 'place', 'find you'];
  const isLocationQuery = locationKeywords.some(kw => clean.includes(kw));
  if (isLocationQuery || clean === 'location' || clean === 'address') {
    const address = settings.clinic_address || '450 Wellness Plaza, Suite 100, New York, NY';
    return `${clinicName} is located at **${address}**.\n\nLet me know if you would like to schedule an appointment or get directions!`;
  }

  // 5. Contact / phone query
  const contactKeywords = ['contact', 'phone', 'number', 'whatsapp', 'call', 'speak', 'email', 'receptionist', 'reception'];
  const isContactQuery = contactKeywords.some(kw => clean.includes(kw));
  if (isContactQuery || clean === 'contact') {
    const phone = settings.whatsapp_number || settings.admin_whatsapp || '+1 (800) 555-0199';
    const email = settings.contact_email || 'appointments@aurasmile.com';
    return `You can reach the receptionist at ${clinicName} via:\n\n- **Phone / WhatsApp**: ${phone}\n- **Email**: ${email}\n\nWe are here to help! Would you like me to guide you through booking an appointment online?`;
  }

  // 6. Personality/Identity queries (Who are you?)
  if (clean.includes('who are you') || clean.includes('your name') || clean.includes('what is you') || clean.includes('are you a bot') || clean.includes('are you an ai') || clean.includes('are you ai')) {
    return `I am Aura, the professional virtual assistant for ${clinicName}. I am here to help you learn about our services, clinic hours, location, and guide you through booking or managing appointments.`;
  }

  // 8. Are you ChatGPT?
  if (clean.includes('are you chatgpt') || clean.includes('are you chat gpt') || clean.includes('are you gpt')) {
    return `No, I am Aura, the professional virtual dental assistant for ${clinicName}. I am trained to help you with clinic services, scheduling, and general inquiries.`;
  }

  // 9. Greetings
  if (clean === 'hello' || clean === 'hi' || clean === 'hey' || clean.startsWith('hello ') || clean.startsWith('hi ') || clean.startsWith('hey ')) {
    return `Hello! Welcome to ${clinicName}. I am Aura, your virtual dental assistant. How can I help you today? You can ask about our services, pricing, business hours, or start booking an appointment.`;
  }

  // 10. Thank you
  if (clean.includes('thank you') || clean === 'thanks' || clean.startsWith('thanks ') || clean.includes('thankyou')) {
    return `You are very welcome! It's my pleasure to assist you. Please let us know if there is anything else ${clinicName} can do for your smile.`;
  }

  // 11. Bye (Farewell)
  if (clean === 'bye' || clean === 'goodbye' || clean.startsWith('bye ') || clean.startsWith('goodbye ') || clean.includes('see you later')) {
    return `Goodbye! Thank you for contacting ${clinicName}. Have a wonderful, healthy day!`;
  }

  // 12. Tell me a joke
  if (clean.includes('joke') || clean.includes('funny') || clean.includes('laugh')) {
    return `Why did the dentist secure a gold medal? Because they knew their drills! I'm here to keep your smile bright and healthy. Let me know if you would like to book an appointment or ask about our services!`;
  }

  // 13. Weather today
  if (clean.includes('weather') || clean.includes('rain') || clean.includes('temperature') || clean.includes('forecast')) {
    return `I specialize in helping patients with clinic-related questions and dental services at ${clinicName}. I don't have access to live weather forecasts, but I can certainly help you book a dental visit!`;
  }

  return null;
}


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Calculate standard suggested available times for a procedure and day
function getAvailableTimes(dayOfWeek: string, durationMin: number, stepMin: number, procedureId: string, checkDayIso: string): string[] {
  const settings = db.getSettings();
  const dayHours = settings.working_hours_json[dayOfWeek];

  if (!dayHours || !dayHours.active) {
    return [];
  }

  const [openH, openM] = dayHours.open.split(':').map(Number);
  const [closeH, closeM] = dayHours.close.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const suggestions: string[] = [];

  // Existing bookings for this day to perform real overlap conflict checks
  const dayBookings = db.getAppointments().filter(app => {
    if (app.status === 'CANCELED') return false;
    return app.start_at.startsWith(checkDayIso);
  });

  const actualStepMin = settings.time_slot_interval || stepMin || 30;

  for (let time = openMinutes; time + durationMin <= closeMinutes; time += actualStepMin) {
    const h = Math.floor(time / 60);
    const m = time % 60;
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    // Check overlap with existing appointments on that day
    const startIso = `${checkDayIso}T${timeStr}:00.000Z`;
    const endIso = new Date(new Date(startIso).getTime() + durationMin * 60000).toISOString();

    const overlaps = dayBookings.some(app => {
      // app.start_at < end && app.end_at > start
      return app.start_at < endIso && app.end_at > startIso;
    });

    if (!overlaps) {
      suggestions.push(timeStr);
    }
  }

  return suggestions.slice(0, 8); // return top 8
}

// Helper: Calculate the next 5 active calendar dates where the clinic is open
function getNextAvailableDates(count = 5): { dateIso: string; formatted: string; dayOfWeek: string }[] {
  const settings = db.getSettings();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dates: { dateIso: string; formatted: string; dayOfWeek: string }[] = [];
  
  let current = new Date();
  // Start tomorrow to avoid same-day booking hour conflicts
  current.setDate(current.getDate() + 1);
  
  while (dates.length < count) {
    const dayName = daysOfWeek[current.getDay()];
    const hours = settings.working_hours_json[dayName];
    if (hours && hours.active) {
      const dateIso = current.toISOString().split('T')[0];
      const formatted = current.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      dates.push({
        dateIso,
        formatted,
        dayOfWeek: dayName
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Helper: Extract name from natural language response (e.g. "My name is John" -> "John")
function extractName(text: string): string {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  
  // Regex to match common name introduction formats
  const pattern = /^(?:my\s+name\s+is|i\s+am|i'm|call\s+me|this\s+is)\s+([a-zA-Z\s]+)/i;
  const match = clean.match(pattern);
  if (match && match[1]) {
    const extracted = match[1].trim();
    // Capitalize first letters of names
    return extracted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  
  // If no pattern matched, just return the cleaned original text with capitalized first letters
  return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}


app.post('/api/chat', async (req, res) => {
  const { message, sessionState } = req.body;
  const rawText = (message || '').trim();
  const text = normalizeTextTypos(rawText);
  const textLower = text.toLowerCase().trim();

  // If chatbot receives an admin login, bypass chat state and execute login
  if (text.startsWith('/admin login ')) {
    const password = text.replace('/admin login ', '').trim();
    // Simulate internal call to login
    const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const attempt = db.getFailedAttempts(ip);
    if (attempt.lockedUntil && new Date(attempt.lockedUntil) > new Date()) {
      const minsLeft = Math.ceil((new Date(attempt.lockedUntil).getTime() - Date.now()) / 60000);
      res.json({
        text: `🔐 Brute force lockout active. Please try again in ${minsLeft} minutes.`,
        sessionState,
      });
      return;
    }

    const pHash = hashPassword(password);
    const correctHash = db.getPasswordHash();

    if (pHash !== correctHash) {
      db.registerFailedAttempt(ip);
      const updatedAttempt = db.getFailedAttempts(ip);
      const remaining = Math.max(0, 5 - updatedAttempt.count);
      if (updatedAttempt.lockedUntil) {
        res.json({
          text: `🔐 Incorrect password. Access Denied. Brute-force block triggered! Local device locked for 10 minutes.`,
          sessionState,
        });
      } else {
        res.json({
          text: `🔐 Incorrect password. Access Denied. (${remaining} attempts remaining before temporary lockout)`,
          sessionState,
        });
      }
      return;
    }

    // Success! Register device
    db.clearFailedAttempts(ip);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const newDevice: AdminDevice = {
      id: 'dev_' + crypto.randomBytes(6).toString('hex'),
      device_label: `Device (${req.headers['user-agent']?.split(' ')[0] || 'Browser'})`,
      user_agent: req.headers['user-agent'] || 'Unknown Agent',
      token_hash: tokenHash,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
      revoked_at: null,
    };

    db.addDevice(newDevice);

    res.setHeader('Set-Cookie', `trusted_device=${token}; HttpOnly; Path=/; Max-Age=31536000; SameSite=Lax`);
    res.json({
      text: `✅ **Admin authentication successful!**\n\nThis device is now verified as a trusted terminal.\nThe **Admin Panel** navigation link is now visible on this device!`,
      sessionState: { ...sessionState, isAdmin: true },
    });
    return;
  }

  // Session State extraction/initialization
  const state = sessionState ? { ...sessionState } : { step: 'idle', bookingData: {} };
  if (!state.bookingData) {
    state.bookingData = {};
  }
  const booking = state.bookingData;

  // --- SECTION 12: MEMORY MANAGEMENT & EXTRACTION ---
  if (textLower.includes('my name is ')) {
    const nameExt = extractName(text);
    if (nameExt && nameExt !== text) {
      booking.name = nameExt;
    }
  }
  if (textLower.includes('my number is ') || textLower.includes('my phone is ')) {
    const phoneMatch = text.match(/(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/);
    if (phoneMatch) {
      booking.phone = phoneMatch[0];
    }
  }

  // Answer Memory queries immediately: "What is my name?"
  if (textLower.includes('what is my name') || textLower.includes('what\'s my name') || textLower === 'my name') {
    if (booking.name) {
      res.json({
        text: `Your name is **${booking.name}**.`,
        sessionState: state
      });
      return;
    } else {
      res.json({
        text: `You haven't told me your name yet! What is your full name?`,
        sessionState: state
      });
      return;
    }
  }

  // Answer Treatment selection memory: "What treatment did I choose?"
  if (textLower.includes('what treatment') || textLower.includes('which treatment') || textLower.includes('my treatment') || textLower.includes('what procedure') || textLower.includes('which procedure') || textLower.includes('my procedure')) {
    if (booking.procedureName) {
      res.json({
        text: `You selected **${booking.procedureName}**.`,
        sessionState: state
      });
      return;
    } else {
      res.json({
        text: `You haven't selected a treatment yet. Would you like to see our services?`,
        sessionState: state
      });
      return;
    }
  }

  // Answer "Continue booking" or "Let's continue" while idle
  if (state.step === 'idle' && (textLower.includes('continue booking') || textLower.includes('resume booking') || textLower.includes('continue my booking') || textLower === 'continue' || textLower === 'resume')) {
    if (booking && Object.keys(booking).length > 0) {
      let nextStep = 'ask_name';
      if (booking.name) nextStep = 'ask_phone';
      if (booking.phone) nextStep = 'ask_procedure';
      if (booking.procedureId) nextStep = 'ask_day';
      if (booking.dateIso) nextStep = 'ask_time';
      if (booking.time) nextStep = 'confirm';
      
      state.step = nextStep;
      res.json({
        text: `Let's resume where we left off. ${getCurrentStepPrompt(state)}`,
        sessionState: state
      });
      return;
    }
  }

  // --- SECTION 11: CHANGING BOOKINGS (RESCHEDULE/CANCEL/TIME ONLY) ---
  const isCancelIntent = textLower.includes('cancel my appointment') || textLower.includes('cancel appointment') || textLower === 'cancel';
  const isRescheduleIntent = textLower.includes('reschedule') || textLower.includes('move my appointment') || textLower.includes('change my appointment') || textLower.includes('re-schedule');
  const isTimeOnlyIntent = textLower.includes('change the time only') || textLower.includes('change time only') || textLower.includes('time only') || textLower.includes('change the time');

  if ((isCancelIntent || isRescheduleIntent || isTimeOnlyIntent) && state.step === 'idle') {
    state.step = 'change_ask_code';
    state.bookingData = {}; // Clear any partial booking state for clean flow
    if (isCancelIntent) {
      state.changeAction = 'cancel';
    } else if (isTimeOnlyIntent) {
      state.changeAction = 'time_only';
    } else {
      state.changeAction = 'reschedule';
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const d of days) {
        if (textLower.includes(d)) {
          state.changeTargetDay = d;
          break;
        }
      }
    }
    res.json({
      text: `Sure, I can help you with that. To locate your appointment, please enter your **4-digit appointment code** (e.g. 1234).`,
      sessionState: state
    });
    return;
  }

  // --- SECTION 10: BOOKING PREFERENCES (E.G., "BOOK ME TOMORROW MORNING") ---
  if (state.step === 'idle' && (isBookingIntent(text) || textLower.includes('book me') || textLower.includes('need an appointment') || textLower.includes('see a dentist'))) {
    state.step = 'ask_name';
    state.bookingData = {};
    
    // Extract preferences
    if (textLower.includes('tomorrow morning')) {
      state.bookingData.preferredDay = 'tomorrow';
      state.bookingData.preferredTime = 'morning';
    } else if (textLower.includes('tomorrow')) {
      state.bookingData.preferredDay = 'tomorrow';
    } else if (textLower.includes('today')) {
      state.bookingData.preferredDay = 'today';
    } else if (textLower.includes('after 6 pm') || textLower.includes('after 6pm')) {
      state.bookingData.preferredTime = 'after_6pm';
    } else if (textLower.includes('earliest')) {
      state.bookingData.preferredSlot = 'earliest';
    } else if (textLower.includes('latest')) {
      state.bookingData.preferredSlot = 'latest';
    }
    
    if (textLower.includes('emergency') || textLower.includes('urgent') || textLower.includes('asap')) {
      state.bookingData.isEmergency = true;
      res.json({
        text: `🚨 **Emergency priority booking activated.** We will prioritize getting you in for our earliest available emergency slot.\n\nTo begin, what is your full name?`,
        sessionState: state
      });
      return;
    }
    
    res.json({
      text: `Great. Let’s book your appointment. What is your full name?`,
      sessionState: state
    });
    return;
  }

  // Check today's availability: "Any appointment today?"
  if (state.step === 'idle' && (textLower.includes('appointment today') || textLower.includes('appointments today') || textLower.includes('available today') || textLower.includes('any slot today'))) {
    const dates = getNextAvailableDates(5);
    const todayDate = new Date();
    const todayIso = todayDate.toISOString().split('T')[0];
    const todayAvailable = dates.find(d => d.dateIso === todayIso);
    if (todayAvailable) {
      res.json({
        text: `Yes! We have available appointments today, **${todayAvailable.formatted}**. Let's start booking your visit. What is your full name?`,
        sessionState: {
          step: 'ask_name',
          bookingData: { preferredDay: 'today' }
        }
      });
    } else {
      res.json({
        text: `We are closed or fully booked for today. However, we have slots starting tomorrow! Would you like to book for tomorrow? Just tell me your full name to start!`,
        sessionState: {
          step: 'ask_name',
          bookingData: { preferredDay: 'tomorrow' }
        }
      });
    }
    return;
  }

  // Intercept main menu options if idle
  if (state.step === 'idle') {
    const lowerText = text.toLowerCase().trim();
    if (lowerText === '1') {
      res.json({
        text: "Great. Let’s book your appointment. What is your full name?",
        sessionState: {
          step: 'ask_name',
          bookingData: {}
        }
      });
      return;
    } else if (lowerText === '2' || lowerText.includes('view services') || lowerText === 'services') {
      const procedures = db.getProcedures().filter(p => p.active);
      const listStr = procedures.map((p, i) => `${i + 1}) ${p.name}`).join('\n');
      res.json({
        text: `Here are our active treatments and services:\n\n${listStr}\n\nLet me know if you would like to book an appointment!`,
        sessionState: { step: 'idle', bookingData: null }
      });
      return;
    } else if (lowerText === '3' || lowerText.includes('clinic location') || lowerText === 'location') {
      const settings = db.getSettings();
      const activeDays = Object.keys(settings.working_hours_json).filter(
        d => settings.working_hours_json[d].active
      );
      const hoursLines = activeDays
        .map(d => `${d}: ${settings.working_hours_json[d].open} – ${settings.working_hours_json[d].close}`)
        .join('\n');
      const clinicName = settings.clinic_name || 'AuraSmile Dental Clinic';
      const address = settings.clinic_address || '450 Wellness Plaza, Suite 100, New York';

      res.json({
        text: `${clinicName} is located at ${address}.\n\nOur Business Hours:\n${hoursLines}\n\nWould you like to book an appointment?`,
        sessionState: { step: 'idle', bookingData: null }
      });
      return;
    } else if (lowerText === '4' || lowerText.includes('pricing information') || lowerText === 'pricing') {
      const procedures = db.getProcedures().filter(p => p.active);
      const listStr = procedures.map((p) => `• ${p.name}: $${p.price}`).join('\n');
      res.json({
        text: `Our current treatment and service pricing:\n\n${listStr}\n\nWould you like to book a slots for any of these?`,
        sessionState: { step: 'idle', bookingData: null }
      });
      return;
    } else if (lowerText === '5' || lowerText.includes('speak to reception') || lowerText === 'speak' || lowerText === 'reception') {
      const settings = db.getSettings();
      const phone = settings.whatsapp_number || settings.admin_whatsapp || '+1 (800) 555-0199';
      const email = settings.contact_email || 'appointments@aurasmile.com';
      res.json({
        text: `You can speak to our receptionist by calling ${phone} or emailing ${email}.\n\nLet me know if you would like to book an appointment instead!`,
        sessionState: { step: 'idle', bookingData: null }
      });
      return;
    }
  }

  // If in a booking flow, run the state machine
  if (state.step && state.step !== 'idle') {

    // 1. Handle No Wait / Don't Wait Intent
    const isNoWaitIntent = (
      textLower === 'no wait' ||
      textLower === "don't wait" ||
      textLower === 'do not wait'
    );

    if (isNoWaitIntent) {
      state.paused = false;
      res.json({
        text: `Alright, let's keep going. ${getCurrentStepPrompt(state)}`,
        sessionState: state,
      });
      return;
    }

    // 2. Handle Pause Intent
    const isPauseIntent = (
      textLower === 'wait' ||
      textLower === 'hold on' ||
      textLower === 'one moment' ||
      textLower === 'tell you later' ||
      textLower === 'later' ||
      textLower === 'pause' ||
      textLower === 'hang on' ||
      textLower === 'not ready' ||
      textLower === 'not now' ||
      textLower === 'stop'
    );

    const isResumeIntent = (
      textLower === 'continue' ||
      textLower === 'continue booking' ||
      textLower === 'resume' ||
      textLower === 'ready' ||
      textLower === 'go on' ||
      textLower === "let's do it" ||
      'let\'s do it'.includes(textLower) ||
      textLower === 'start again' ||
      textLower === 'go ahead' ||
      textLower === 'i am ready' ||
      textLower === 'ok i am ready'
    );

    const getResumePrompt = (state: any) => {
      switch (state.step) {
        case 'ask_name':
          return "Ok, let's continue. We were at the step where I asked for your name. What is your full name?";
        case 'ask_phone':
          return "Ok, let's continue. We were at the step where I asked for your phone number. Please enter your WhatsApp or phone number.";
        case 'ask_procedure': {
          const procedures = db.getProcedures().filter(p => p.active);
          const optionsText = procedures.map((p, i) => `${i + 1}) ${p.name}`).join('\n');
          return `Ok, let's continue. Which procedure would you like to book?\n\n${optionsText}\n\nPlease select one of the available options.`;
        }
        case 'ask_day': {
          const dateOptionsText = (state.bookingData?.availableDates || []).map((d: any, i: number) => `${i + 1}) ${d.formatted}`).join('\n');
          return `Ok, let's continue. These dates are available:\n\n${dateOptionsText}\n\nPlease select one of the available dates.`;
        }
        case 'ask_time': {
          const timeOptionsText = (state.bookingData?.availableTimes || []).map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
          return `Ok, let's continue. Available time slots for ${state.bookingData?.dateFormatted || 'the selected date'}:\n\n${timeOptionsText}\n\nPlease select a time.`;
        }
        case 'confirm': {
          const b = state.bookingData || {};
          return `Ok, let's continue. Please confirm your appointment details:\n\nName: ${b.name}\nPhone: ${b.phone}\nProcedure: ${b.procedureName}\nDate: ${b.dateFormatted}\nTime: ${b.time}\nDuration: ${b.procedureDuration} minutes\n\nConfirm? (Yes / No)`;
        }
        default:
          return "Ok, let's continue with your booking. What can I do for you?";
      }
    };

    if (isPauseIntent) {
      state.paused = true;
      res.json({
        text: "Sure, take your time. Let me know when you're ready.",
        sessionState: state,
      });
      return;
    }

    // 2. Handle Resume or Input while Paused
    if (state.paused) {
      if (isResumeIntent) {
        state.paused = false;
        res.json({
          text: getResumePrompt(state),
          sessionState: state,
        });
        return;
      } else {
        // If they enter any other message, unpause and treat it as the response to the current step
        state.paused = false;
      }
    }

    // 3. Handle "I don't know" Intent
    const isIdkIntent = textLower.includes("don't know") || textLower.includes("not sure") || textLower.includes("no idea") || textLower === 'idk';
    if (isIdkIntent) {
      if (state.step === 'ask_procedure') {
        const procs = db.getProcedures().filter(p => p.active);
        const firstProc = procs[0]?.name || "Laser Teeth Deep Bleaching";
        res.json({
          text: `No worries. Many patients start with a general dental consultation. Out of our available services (such as ${firstProc}), what seems closest to what you need? You can select any option to proceed.`,
          sessionState: state,
        });
        return;
      }
      if (state.step === 'ask_day') {
        const dates = booking.availableDates || getNextAvailableDates(3);
        const dateList = dates.slice(0, 3).map((d: any) => d.formatted).join(', ');
        res.json({
          text: `No problem. Any of our next available days like ${dateList} would be great. You can also pick another day. Which of those works for you?`,
          sessionState: state,
        });
        return;
      }
      if (state.step === 'ask_time') {
        const times = booking.availableTimes || [];
        const timeList = times.slice(0, 3).join(', ');
        res.json({
          text: `No worries. We have open slots at ${timeList}. Would morning or afternoon be better for you?`,
          sessionState: state,
        });
        return;
      }
    }

    // Run the state machine
    switch (state.step) {
      // --- CHANGE / RESCHEDULE / CANCEL STATES ---
      case 'change_ask_code': {
        const code = text.trim();
        const appt = db.getAppointments().find(a => a.code_4digit === code && a.status === 'BOOKED');
        if (!appt) {
          res.json({
            text: `I couldn't find an active appointment with the code **${code}**. Please double-check your code and enter it again, or say 'cancel' to abort.`,
            sessionState: state
          });
          return;
        }
        state.targetAppointment = appt;
        
        if (state.changeAction === 'cancel') {
          state.step = 'change_confirm_cancel';
          res.json({
            text: `I found your appointment for **${appt.name}** (${appt.phone}) on **${new Date(appt.start_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}**. Are you sure you want to cancel this appointment? (Yes / No)`,
            sessionState: state
          });
          return;
        } else if (state.changeAction === 'reschedule') {
          // Check if they specified a target day previously (e.g., Friday)
          const dates = getNextAvailableDates(5);
          if (state.changeTargetDay) {
            const matchedDate = dates.find(d => d.dayOfWeek.toLowerCase() === state.changeTargetDay.toLowerCase());
            if (matchedDate) {
              state.bookingData = {
                name: appt.name,
                phone: appt.phone,
                procedureId: appt.procedure_id,
                procedureName: db.getProcedures().find(p => p.id === appt.procedure_id)?.name || 'Consultation',
                procedureDuration: db.getProcedures().find(p => p.id === appt.procedure_id)?.duration_minutes || 30,
                dateIso: matchedDate.dateIso,
                dateFormatted: matchedDate.formatted,
                day: matchedDate.dayOfWeek,
              };
              const availableTimes = getAvailableTimes(
                matchedDate.dayOfWeek,
                state.bookingData.procedureDuration,
                30,
                appt.procedure_id,
                matchedDate.dateIso
              );
              state.bookingData.availableTimes = availableTimes;
              state.step = 'change_ask_time';
              
              const timeOptionsText = availableTimes.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
              res.json({
                text: `I've selected Friday, ${matchedDate.formatted} for you.\n\nAvailable times:\n\n${timeOptionsText}\n\nPlease select one of the available times.`,
                sessionState: state
              });
              return;
            }
          }
          
          // Show all available dates
          state.bookingData = {
            name: appt.name,
            phone: appt.phone,
            procedureId: appt.procedure_id,
            procedureName: db.getProcedures().find(p => p.id === appt.procedure_id)?.name || 'Consultation',
            procedureDuration: db.getProcedures().find(p => p.id === appt.procedure_id)?.duration_minutes || 30,
            availableDates: dates
          };
          state.step = 'change_ask_day';
          const dateOptionsText = dates.map((d: any, i: number) => `${i + 1}) ${d.formatted}`).join('\n');
          res.json({
            text: `Alright, let's find a new day for your appointment.\n\nThese dates are available:\n\n${dateOptionsText}\n\nPlease select one of the available dates.`,
            sessionState: state
          });
          return;
        } else if (state.changeAction === 'time_only') {
          const apptDate = new Date(appt.start_at);
          const dateIso = appt.start_at.split('T')[0];
          const dayOfWeek = apptDate.toLocaleDateString('en-US', { weekday: 'long' });
          const formatted = apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
          
          state.bookingData = {
            name: appt.name,
            phone: appt.phone,
            procedureId: appt.procedure_id,
            procedureName: db.getProcedures().find(p => p.id === appt.procedure_id)?.name || 'Consultation',
            procedureDuration: db.getProcedures().find(p => p.id === appt.procedure_id)?.duration_minutes || 30,
            dateIso,
            dateFormatted: formatted,
            day: dayOfWeek,
          };
          const availableTimes = getAvailableTimes(
            dayOfWeek,
            state.bookingData.procedureDuration,
            30,
            appt.procedure_id,
            dateIso
          );
          state.bookingData.availableTimes = availableTimes;
          state.step = 'change_ask_time';
          
          const timeOptionsText = availableTimes.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
          res.json({
            text: `Let's update only the time for your appointment on **${formatted}**.\n\nAvailable times:\n\n${timeOptionsText}\n\nPlease select one of the available times.`,
            sessionState: state
          });
          return;
        }
        break;
      }

      case 'change_confirm_cancel': {
        const resp = text.toLowerCase().trim();
        if (resp === 'yes' || resp === 'confirm' || resp.includes('yeah') || resp.includes('yep')) {
          const appt = state.targetAppointment;
          if (appt) {
            appt.status = 'CANCELED';
            db.saveAppointment(appt);
          }
          state.step = 'idle';
          state.bookingData = null;
          state.targetAppointment = null;
          res.json({
            text: `Your appointment has been successfully canceled. Let me know if you need anything else!`,
            sessionState: state
          });
          return;
        } else {
          state.step = 'idle';
          state.bookingData = null;
          state.targetAppointment = null;
          res.json({
            text: `Cancellation aborted. Your appointment remains scheduled.`,
            sessionState: state
          });
          return;
        }
      }

      case 'change_ask_day': {
        const dateCheck = parseAndCheckDateValidity(text);
        if (!dateCheck.isValid) {
          const dateOptionsList = (state.bookingData.availableDates || []).map((d: any, i: number) => `${i + 1}) ${d.formatted}`).join('\n');
          res.json({
            text: `${dateCheck.errorMsg}\n\nPlease select one of our available dates:\n\n${dateOptionsList}`,
            sessionState: state
          });
          return;
        }

        let selectedDateObj: any = null;
        if (state.bookingData.availableDates && state.bookingData.availableDates.length > 0) {
          const dateNumIndex = parseInt(text) - 1;
          if (!isNaN(dateNumIndex) && dateNumIndex >= 0 && dateNumIndex < state.bookingData.availableDates.length) {
            selectedDateObj = state.bookingData.availableDates[dateNumIndex];
          } else {
            selectedDateObj = state.bookingData.availableDates.find((d: any) => 
              textLower.includes(d.dateIso.toLowerCase()) || 
              textLower.includes(d.dayOfWeek.toLowerCase()) ||
              textLower.includes(d.formatted.toLowerCase())
            );
          }
        }

        if (!selectedDateObj) {
          const dateOptionsList = (state.bookingData.availableDates || []).map((d: any, i: number) => `${i + 1}) ${d.formatted}`).join('\n');
          res.json({
            text: `Please select a valid date from the available options:\n\n${dateOptionsList}`,
            sessionState: state
          });
          return;
        }

        state.bookingData.day = selectedDateObj.dayOfWeek;
        state.bookingData.dateIso = selectedDateObj.dateIso;
        state.bookingData.dateFormatted = selectedDateObj.formatted;
        state.step = 'change_ask_time';

        const availableTimes = getAvailableTimes(
          state.bookingData.day,
          state.bookingData.procedureDuration,
          30,
          state.bookingData.procedureId,
          state.bookingData.dateIso
        );

        if (availableTimes.length === 0) {
          res.json({
            text: `We apologize, but there are no slots remaining on ${state.bookingData.dateFormatted}. Please select another date.`,
            sessionState: { ...state, step: 'change_ask_day' }
          });
          return;
        }

        state.bookingData.availableTimes = availableTimes;
        const timeOptionsText = availableTimes.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
        res.json({
          text: `Available times for ${state.bookingData.dateFormatted}:\n\n${timeOptionsText}\n\nPlease select a time.`,
          sessionState: state
        });
        return;
      }

      case 'change_ask_time': {
        const timeCheck = checkTimeValidity(text);
        if (!timeCheck.isValid) {
          const nearest = (state.bookingData.availableTimes || []).slice(0, 3);
          const nearestText = nearest.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
          res.json({
            text: `${timeCheck.errorMsg}\n\nPlease choose a valid time slot from the available options:\n\n${nearestText}`,
            sessionState: state
          });
          return;
        }

        let selectedTime: string | null = null;
        if (state.bookingData.availableTimes && state.bookingData.availableTimes.length > 0) {
          const timeNumIndex = parseInt(text) - 1;
          if (!isNaN(timeNumIndex) && timeNumIndex >= 0 && timeNumIndex < state.bookingData.availableTimes.length) {
            selectedTime = state.bookingData.availableTimes[timeNumIndex];
          } else {
            const parsed = parseNaturalTime(text);
            if (parsed && state.bookingData.availableTimes.includes(parsed)) {
              selectedTime = parsed;
            } else {
              const timeMatch = text.match(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/);
              if (timeMatch && state.bookingData.availableTimes.includes(timeMatch[0])) {
                selectedTime = timeMatch[0];
              }
            }
          }
        }

        if (!selectedTime) {
          const nearest = (state.bookingData.availableTimes || []).slice(0, 3);
          const nearestText = nearest.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
          res.json({
            text: `Please choose a valid time slot from the available options:\n\n${nearestText}`,
            sessionState: state
          });
          return;
        }

        state.bookingData.time = selectedTime;
        state.bookingData.startAtIso = `${state.bookingData.dateIso}T${selectedTime}:00.000Z`;
        state.bookingData.endAtIso = new Date(new Date(state.bookingData.startAtIso).getTime() + state.bookingData.procedureDuration * 60000).toISOString();
        state.step = 'change_confirm';

        res.json({
          text: `Please confirm your rescheduled appointment details:\n\nName: ${state.bookingData.name}\nPhone: ${state.bookingData.phone}\nProcedure: ${state.bookingData.procedureName}\nDate: ${state.bookingData.dateFormatted}\nTime: ${state.bookingData.time}\n\nConfirm rescheduled appointment? (Yes / No)`,
          sessionState: state
        });
        return;
      }

      case 'change_confirm': {
        const resp = text.toLowerCase().trim();
        if (resp === 'yes' || resp === 'confirm' || resp.includes('yeah') || resp.includes('yep')) {
          const appt = state.targetAppointment;
          if (appt) {
            appt.start_at = state.bookingData.startAtIso;
            appt.end_at = state.bookingData.endAtIso;
            appt.updated_at = new Date().toISOString();
            db.saveAppointment(appt);
            
            state.step = 'idle';
            state.bookingData = null;
            state.targetAppointment = null;
            
            res.json({
              text: `Your appointment has been successfully rescheduled to **${appt.start_at.split('T')[0]} ${appt.start_at.split('T')[1].substring(0, 5)}**. Your 4-digit code remains **${appt.code_4digit}**.`,
              sessionState: state
            });
            return;
          }
        } else {
          state.step = 'idle';
          state.bookingData = null;
          state.targetAppointment = null;
          res.json({
            text: `Rescheduling cancelled. Your appointment remains scheduled at its original time.`,
            sessionState: state
          });
          return;
        }
        break;
      }

      // --- STANDARD APPOINTMENT STATES ---
      case 'ask_name': {
        const nameText = text.trim();
        if (nameText.length < 2) {
          res.json({
            text: "Please enter your valid full name so we can record your booking.",
            sessionState,
          });
          return;
        }
        
        booking.name = extractName(nameText);
        state.bookingData = booking;
        state.step = 'ask_phone';
        res.json({
          text: `Thank you, **${booking.name}**. What is your phone or WhatsApp number?`,
          sessionState: state,
        });
        return;
      }

      case 'ask_phone': {
        const phoneText = text.trim();
        const cleanPhone = phoneText.replace(/[^0-9+]/g, '');
        if (cleanPhone.length < 5) {
          res.json({
            text: "Please enter a valid phone or WhatsApp number so we can confirm your booking.",
            sessionState,
          });
          return;
        }

        booking.phone = phoneText;
        state.bookingData = booking;
        state.step = 'ask_procedure';

        const procedures = db.getProcedures().filter(p => p.active);
        const optionsText = procedures.map((p, i) => `${i + 1}) ${p.name}`).join('\n');
        res.json({
          text: `Got it. Which treatment or service are you booking?\n\n${optionsText}\n\nPlease select one of the available options.`,
          sessionState: state,
        });
        return;
      }

      case 'ask_procedure': {
        let selectedProcedure: any = null;
        const activeProcs = db.getProcedures().filter(p => p.active);

        const numIndex = parseInt(text) - 1;
        if (!isNaN(numIndex) && numIndex >= 0 && numIndex < activeProcs.length) {
          selectedProcedure = activeProcs[numIndex];
        } else {
          selectedProcedure = activeProcs.find(p => 
            textLower.includes(p.name.toLowerCase()) || 
            getProcedureSynonyms(p.name).some(syn => textLower.includes(syn))
          );
        }

        if (!selectedProcedure) {
          const procsText = activeProcs.map((p, i) => `${i + 1}) ${p.name}`).join('\n');
          res.json({
            text: `Please choose a valid procedure from our active options:\n\n${procsText}`,
            sessionState,
          });
          return;
        }

        booking.procedureId = selectedProcedure.id;
        booking.procedureName = selectedProcedure.name;
        booking.procedureDuration = selectedProcedure.duration_minutes;
        booking.procedureStep = selectedProcedure.slot_step_minutes || 30;

        const availableDates = getNextAvailableDates(5);
        booking.availableDates = availableDates;
        state.bookingData = booking;

        // Apply preferredDay automatic choice if present!
        if (booking.preferredDay) {
          const todayDate = new Date();
          const todayIso = todayDate.toISOString().split('T')[0];
          const tomorrowDate = new Date();
          tomorrowDate.setDate(tomorrowDate.getDate() + 1);
          const tomorrowIso = tomorrowDate.toISOString().split('T')[0];
          
          let preselectedDate = null;
          if (booking.preferredDay === 'tomorrow') {
            preselectedDate = booking.availableDates.find((d: any) => d.dateIso === tomorrowIso);
          } else if (booking.preferredDay === 'today') {
            preselectedDate = booking.availableDates.find((d: any) => d.dateIso === todayIso);
          } else {
            preselectedDate = booking.availableDates.find((d: any) => d.dayOfWeek.toLowerCase() === booking.preferredDay.toLowerCase());
          }
          
          if (preselectedDate) {
            booking.day = preselectedDate.dayOfWeek;
            booking.dateIso = preselectedDate.dateIso;
            booking.dateFormatted = preselectedDate.formatted;
            
            // Auto-transition to ask_time!
            state.step = 'ask_time';
            const availableTimes = getAvailableTimes(
              booking.day,
              booking.procedureDuration,
              booking.procedureStep,
              booking.procedureId,
              booking.dateIso
            );
            
            if (availableTimes.length === 0) {
              res.json({
                text: `We apologize, but there are no slots remaining on ${booking.dateFormatted}. Please select another date.`,
                sessionState: { ...state, step: 'ask_day' }
              });
              return;
            }
            
            booking.availableTimes = availableTimes;
            
            // Apply preferredTime/preferredSlot automatic choice if present!
            let autoSelectedTime: string | null = null;
            if (booking.preferredSlot === 'earliest') {
              autoSelectedTime = availableTimes[0];
            } else if (booking.preferredSlot === 'latest') {
              autoSelectedTime = availableTimes[availableTimes.length - 1];
            } else if (booking.preferredTime === 'morning') {
              autoSelectedTime = availableTimes.find((t: string) => parseInt(t.split(':')[0]) < 12) || availableTimes[0];
            } else if (booking.preferredTime === 'after_6pm') {
              autoSelectedTime = availableTimes.find((t: string) => parseInt(t.split(':')[0]) >= 18) || availableTimes[availableTimes.length - 1];
            }
            
            if (autoSelectedTime) {
              booking.time = autoSelectedTime;
              const startAtIso = `${booking.dateIso}T${autoSelectedTime}:00.000Z`;
              booking.startAtIso = startAtIso;
              booking.endAtIso = new Date(new Date(startAtIso).getTime() + booking.procedureDuration * 60000).toISOString();
              state.step = 'confirm';
              
              res.json({
                text: `I've pre-selected **${booking.dateFormatted} at ${booking.time}** based on your preferences.\n\nPlease confirm your appointment details:\n\nName: ${booking.name}\nPhone: ${booking.phone}\nProcedure: ${booking.procedureName}\nDate: ${booking.dateFormatted}\nTime: ${booking.time}\nDuration: ${booking.procedureDuration} minutes\n\nConfirm? (Yes / No)`,
                sessionState: state
              });
              return;
            }
            
            const timeOptionsText = availableTimes.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
            res.json({
              text: `I've selected **${booking.dateFormatted}** for you.\n\nAvailable times:\n\n${timeOptionsText}\n\nPlease select one of the available times.`,
              sessionState: state
            });
            return;
          }
        }

        // Standard date prompt
        const dateOptionsText = availableDates.map((d, i) => `${i + 1}) ${d.formatted}`).join('\n');
        res.json({
          text: `Great choice, **${booking.name}**. Let's find a convenient date.\n\nThese dates are available:\n\n${dateOptionsText}\n\nPlease select one of the available dates.`,
          sessionState: state,
        });
        return;
      }

      case 'ask_day': {
        const dateCheck = parseAndCheckDateValidity(text);
        if (!dateCheck.isValid) {
          const dateOptionsList = (booking.availableDates || []).map((d: any, i: number) => `${i + 1}) ${d.formatted}`).join('\n');
          res.json({
            text: `${dateCheck.errorMsg}\n\nPlease select one of our available dates:\n\n${dateOptionsList}`,
            sessionState,
          });
          return;
        }

        let selectedDateObj: any = null;
        if (booking.availableDates && booking.availableDates.length > 0) {
          const dateNumIndex = parseInt(text) - 1;
          if (!isNaN(dateNumIndex) && dateNumIndex >= 0 && dateNumIndex < booking.availableDates.length) {
            selectedDateObj = booking.availableDates[dateNumIndex];
          } else {
            const todayDate = new Date();
            const todayIso = todayDate.toISOString().split('T')[0];
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrowIso = tomorrowDate.toISOString().split('T')[0];

            if (textLower.includes('tomorrow')) {
              selectedDateObj = booking.availableDates.find((d: any) => d.dateIso === tomorrowIso) || booking.availableDates[0];
            } else if (textLower.includes('today')) {
              selectedDateObj = booking.availableDates.find((d: any) => d.dateIso === todayIso) || booking.availableDates[0];
            } else {
              selectedDateObj = booking.availableDates.find((d: any) => 
                textLower.includes(d.dateIso.toLowerCase()) || 
                textLower.includes(d.dayOfWeek.toLowerCase()) ||
                textLower.includes(d.formatted.toLowerCase())
              );
            }
          }
        }

        if (!selectedDateObj) {
          const dateOptionsList = (booking.availableDates || []).map((d: any, i: number) => `${i + 1}) ${d.formatted}`).join('\n');
          res.json({
            text: `Please select a valid date from the available options:\n\n${dateOptionsList}`,
            sessionState,
          });
          return;
        }

        booking.day = selectedDateObj.dayOfWeek;
        booking.dateIso = selectedDateObj.dateIso;
        booking.dateFormatted = selectedDateObj.formatted;
        state.step = 'ask_time';

        const procDetails = db.getProcedures().find(p => p.id === booking.procedureId)!;
        const availableTimes = getAvailableTimes(
          booking.day,
          procDetails.duration_minutes,
          procDetails.slot_step_minutes || 30,
          booking.procedureId,
          booking.dateIso
        );

        if (availableTimes.length === 0) {
          res.json({
            text: `We apologize, but there are no slots remaining on ${booking.dateFormatted}. Please select another date from the available options.`,
            sessionState: { ...state, step: 'ask_day' }
          });
          return;
        }

        booking.availableTimes = availableTimes;
        state.bookingData = booking;

        // Apply preferredTime/preferredSlot automatic choice if present!
        let autoSelectedTime: string | null = null;
        if (booking.preferredSlot === 'earliest') {
          autoSelectedTime = availableTimes[0];
        } else if (booking.preferredSlot === 'latest') {
          autoSelectedTime = availableTimes[availableTimes.length - 1];
        } else if (booking.preferredTime === 'morning') {
          autoSelectedTime = availableTimes.find((t: string) => parseInt(t.split(':')[0]) < 12) || availableTimes[0];
        } else if (booking.preferredTime === 'after_6pm') {
          autoSelectedTime = availableTimes.find((t: string) => parseInt(t.split(':')[0]) >= 18) || availableTimes[availableTimes.length - 1];
        }
        
        if (autoSelectedTime) {
          booking.time = autoSelectedTime;
          const startAtIso = `${booking.dateIso}T${autoSelectedTime}:00.000Z`;
          booking.startAtIso = startAtIso;
          booking.endAtIso = new Date(new Date(startAtIso).getTime() + booking.procedureDuration * 60000).toISOString();
          state.step = 'confirm';
          
          res.json({
            text: `I've pre-selected **${booking.dateFormatted} at ${booking.time}** based on your preferences.\n\nPlease confirm your appointment details:\n\nName: ${booking.name}\nPhone: ${booking.phone}\nProcedure: ${booking.procedureName}\nDate: ${booking.dateFormatted}\nTime: ${booking.time}\nDuration: ${booking.procedureDuration} minutes\n\nConfirm? (Yes / No)`,
            sessionState: state
          });
          return;
        }

        const timeOptionsText = availableTimes.map((t, i) => `${i + 1}) ${t}`).join('\n');

        res.json({
          text: `Available time slots for ${booking.dateFormatted}:\n\n${timeOptionsText}\n\nPlease select a time.`,
          sessionState: state,
        });
        return;
      }

      case 'ask_time': {
        const textTrim = text.trim();
        const timeCheck = checkTimeValidity(textTrim);
        if (!timeCheck.isValid) {
          const nearest = (booking.availableTimes || []).slice(0, 3);
          const nearestText = nearest.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
          res.json({
            text: `${timeCheck.errorMsg}\n\nPlease choose a valid time slot from the available options (e.g. '09:00', '3 PM', or select a number like 1):\n\n${nearestText}`,
            sessionState
          });
          return;
        }

        let selectedTime: string | null = null;

        if (booking.availableTimes && booking.availableTimes.length > 0) {
          const timeNumIndex = parseInt(textTrim) - 1;
          if (!isNaN(timeNumIndex) && timeNumIndex >= 0 && timeNumIndex < booking.availableTimes.length) {
            selectedTime = booking.availableTimes[timeNumIndex];
          } else {
            const parsed = parseNaturalTime(textTrim);
            if (parsed && booking.availableTimes.includes(parsed)) {
              selectedTime = parsed;
            } else {
              const timeMatch = textTrim.match(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/);
              if (timeMatch && booking.availableTimes.includes(timeMatch[0])) {
                selectedTime = timeMatch[0];
              }
            }
          }
        }

        if (!selectedTime) {
          const nearest = (booking.availableTimes || []).slice(0, 3);
          const nearestText = nearest.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
          
          res.json({
            text: `Please choose a valid time slot from the available options (e.g. '09:00', '3 PM', or select a number like 1):\n\n${nearestText}`,
            sessionState
          });
          return;
        }

        booking.time = selectedTime;
        const startAtIso = `${booking.dateIso}T${selectedTime}:00.000Z`;
        const endAtIso = new Date(new Date(startAtIso).getTime() + booking.procedureDuration * 60000).toISOString();

        booking.startAtIso = startAtIso;
        booking.endAtIso = endAtIso;
        state.bookingData = booking;
        state.step = 'confirm';

        res.json({
          text: `Please confirm your appointment details:\n\nName: ${booking.name}\nPhone: ${booking.phone}\nProcedure: ${booking.procedureName}\nDate: ${booking.dateFormatted}\nTime: ${booking.time}\nDuration: ${booking.procedureDuration} minutes\n\nConfirm? (Yes / No)`,
          sessionState: state,
        });
        return;
      }

      case 'confirm': {
        const responseText = text.toLowerCase().trim();
        if (responseText === 'yes' || responseText === 'confirm') {
          let code = '';
          let collision = true;
          const dayAppointments = db.getAppointments().filter(a => a.start_at.startsWith(booking.dateIso) && a.status !== 'CANCELED');

          while (collision) {
            code = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            collision = dayAppointments.some(a => a.code_4digit === code);
          }

          // Save appointment
          const newApp: Appointment = {
            id: 'app_' + crypto.randomBytes(6).toString('hex'),
            code_4digit: code,
            name: booking.name,
            phone: booking.phone,
            procedure_id: booking.procedureId,
            start_at: booking.startAtIso,
            end_at: booking.endAtIso,
            status: 'BOOKED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          db.saveAppointment(newApp);

          // Add notification
          const newNotif: Notification = {
            id: 'notif_' + crypto.randomBytes(6).toString('hex'),
            type: 'NEW_APPOINTMENT',
            appointment_id: newApp.id,
            payload_json: JSON.stringify(newApp),
            read_at: null,
            created_at: new Date().toISOString(),
          };
          db.addNotification(newNotif);

          // Simulate WhatsApp Notification to Admin
          const whatsappMsg = `New Appointment Booked\nCode: ${code}\nName: ${newApp.name}\nPhone: ${newApp.phone}\nProcedure: ${booking.procedureName}\nTime: ${booking.dateIso} ${booking.time}\nDuration: ${booking.procedureDuration} min`;
          console.log(`[WHATSAPP ALERT SIMULATOR to Admin ${db.getSettings().admin_whatsapp}]:\n${whatsappMsg}`);

          state.step = 'idle';
          state.bookingData = null;

          res.json({
            text: `Booked successfully. Your 4-digit code is ${code}. Please show this code to the receptionist when you arrive.`,
            sessionState: state,
            simulatedWhatsapp: whatsappMsg,
          });
          return;
        } else if (responseText === 'no' || responseText === 'cancel') {
          state.step = 'idle';
          state.bookingData = null;
          res.json({
            text: "No problem. Let me know if you'd like to book another time.",
            sessionState: state,
          });
          return;
        } else {
          res.json({
            text: "Please respond with **Yes** to confirm, or **No** to discard your booking details.",
            sessionState,
          });
          return;
        }
      }
    }
  }

  // --- FAQS & GENERAL FALLBACK WITH HYBRID KNOWLEDGE SYSTEM (AURA) ---
  
  // Primary Rule: Check dynamic clinic data queries (services, pricing, hours, location, greetings, safety, jokes, etc.) first.
  const clinicResponse = getClinicDataResponse(text);
  if (clinicResponse) {
    res.json({
      text: clinicResponse,
      sessionState,
    });
    return;
  }

  const faqs = db.getFAQs();
  const cleanInput = text.toLowerCase().replace(/[?.,!]/g, '').trim();

  // Check predefined FAQs
  let foundLocalFaq = null;

  // 1. Direct or substring match
  foundLocalFaq = faqs.find(f => {
    const qClean = f.question.toLowerCase().replace(/[?.,!]/g, '').trim();
    return cleanInput === qClean || cleanInput.includes(qClean) || qClean.includes(cleanInput);
  });

  // 2. Multi-word key phrase matching fallback
  if (!foundLocalFaq) {
    const stopWords = new Set(['do', 'you', 'offer', 'how', 'long', 'does', 'is', 'should', 'i', 'get', 'what', 'are', 'your', 'where', 'the', 'can', 'my', 'to', 'for', 'a', 'an', 'of', 'in', 'at']);
    const queryWords = cleanInput.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

    let bestScore = 0;
    let bestFaq = null;

    for (const faq of faqs) {
      const qClean = faq.question.toLowerCase().replace(/[?.,!]/g, '').trim();
      const faqWords = qClean.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

      if (queryWords.length === 0 || faqWords.length === 0) continue;

      let overlap = 0;
      for (const qw of queryWords) {
        if (faqWords.includes(qw)) {
          overlap++;
        }
      }

      const score = overlap / Math.max(queryWords.length, faqWords.length);
      if (score > bestScore) {
        bestScore = score;
        bestFaq = faq;
      }
    }

    if (bestScore >= 0.5 && bestFaq) {
      foundLocalFaq = bestFaq;
    }
  }

  // If a local predefined FAQ matched, return its answer directly.
  if (foundLocalFaq) {
    res.json({
      text: foundLocalFaq.answer_long,
      sessionState,
    });
    return;
  }

  // Backend Keyword Check: Filter non-dental/non-clinic queries before calling APIs
  if (!isDentalOrClinicRelated(text)) {
    res.json({
      text: "I specialize in dental care assistance. Please ask a dental-related question.",
      sessionState,
    });
    return;
  }

  // If not found in local data, proceed to secondary AI reasoning
  try {
    const settings = db.getSettings();
    const activeProcedures = db.getProcedures().filter(p => p.active);
    const clinicName = settings.clinic_name || 'AuraSmile Dental Clinic';
    const activeDays = Object.keys(settings.working_hours_json).filter(d => settings.working_hours_json[d].active);
    const workingHoursStr = activeDays.map(d => `${d}: ${settings.working_hours_json[d].open} to ${settings.working_hours_json[d].close}`).join('\n');
    const servicesStr = activeProcedures.map(p => `- ${p.name}`).join('\n');

    const systemInstruction = `
      You are Aura, the official AI assistant of ${clinicName}.

      SYSTEM MODE: HYBRID KNOWLEDGE SYSTEM

      PRIMARY RULE:
      Always check local clinic data and predefined FAQs first.
      If the answer exists in stored clinic data, use that answer directly.
      Do NOT generate new information when local data is available.
      Do NOT expand beyond stored data unnecessarily.

      ONLY use AI reasoning when:
      - The answer is not found in local FAQ data.
      - The question requires additional dental explanation.
      - The question is dental-related but not predefined.

      STRICT RULES:
      1. Answer ONLY dental or clinic-related questions.
      2. If a question is unrelated to dentistry or clinic, respond exactly:
         "I specialize in dental care assistance. Please ask a dental-related question."
      3. Keep responses extremely short (maximum 3 sentences).
      4. Be medically accurate.
      5. Do NOT guess or invent treatments.
      6. Do NOT create services not listed by the clinic.
      7. Do NOT provide prescriptions or medical diagnosis.
      8. If unsure, respond exactly:
         "I recommend consulting our dentist for accurate advice."
      9. Maintain a calm, professional, empathetic tone.
     10. Do NOT use any emojis. Emojis are strictly forbidden in your replies.

      OFFICIAL CLINIC DATA (SOURCE OF TRUTH):
      Clinic Name: ${clinicName}
      Location: ${settings.clinic_address || '450 Wellness Plaza, Suite 100, New York'}
      Working Hours:
      ${workingHoursStr}

      Services Offered:
      ${servicesStr}

      Active treatments and pricing details:
      ${activeProcedures.map(p => `• ${p.name}: Duration ${p.duration_minutes} min, Price $${p.price}`).join('\n')}

      RESPONSE STYLE:
      - Professional
      - Clear
      - Short (maximum 3 sentences)
      - No long paragraphs
      - No emojis under any circumstances.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: text,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const replyText = response.text?.trim() || "I recommend consulting our dentist for accurate advice.";

    res.json({
      text: replyText,
      sessionState,
    });
  } catch (error) {
    console.error('AI Assistant service call failed:', error);
    
    // Even if AI service call fails, let's try our local dynamic database responder first.
    const fallbackClinicResponse = getClinicDataResponse(text);
    if (fallbackClinicResponse) {
      res.json({
        text: fallbackClinicResponse,
        sessionState,
      });
      return;
    }

    const settings = db.getSettings();
    const activeProcedures = db.getProcedures().filter(p => p.active);
    const clinicName = settings.clinic_name || 'AuraSmile Dental Clinic';
    const serviceList = activeProcedures.map(p => p.name).slice(0, 3).join(', ');
    const phone = settings.whatsapp_number || settings.admin_whatsapp || '+1 (800) 555-0199';

    res.json({
      text: `I recommend consulting our dentist for personal medical advice. At ${clinicName}, we offer professional treatments such as ${serviceList}, and more. You can contact us at ${phone} to learn more or book an appointment!`,
      sessionState,
    });
  }
});


// --- VITE MIDDLEWARE CONFIGURATION FOR FULL-STACK DEPLOYMENT ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export { app };

if (!process.env.NETLIFY && process.env.NODE_ENV !== 'test') {
  startServer();
}
