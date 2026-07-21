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
const PORT = 3000;

app.set('trust proxy', 1);

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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aurasmile-scheduler',
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

app.post('/api/chat', async (req, res) => {
  const { message, sessionState } = req.body;
  const text = (message || '').trim();

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

  // Intercept main menu options if idle
  if (!sessionState || !sessionState.step || sessionState.step === 'idle') {
    const lowerText = text.toLowerCase().trim();
    if (lowerText === '1' || lowerText.includes('book appointment')) {
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
  if (sessionState && sessionState.step && sessionState.step !== 'idle') {
    const state = { ...sessionState };
    const booking = state.bookingData || {};

    switch (state.step) {
      case 'ask_name':
        if (!text) {
          res.json({ text: "Please enter your full name.", sessionState });
          return;
        }
        booking.name = text;
        state.bookingData = booking;
        state.step = 'ask_phone';
        res.json({
          text: `Thanks ${booking.name}. Please enter your WhatsApp or phone number.`,
          sessionState: state,
        });
        return;

      case 'ask_phone':
        if (!text) {
          res.json({ text: "Please enter a valid phone number including country code.", sessionState });
          return;
        }
        const phoneClean = text.replace(/[\s\-\(\)]/g, '');
        const isValidPhone = /^\+?[0-9]{7,18}$/.test(phoneClean) && (text.startsWith('+') || text.startsWith('00') || phoneClean.length >= 10);
        if (!isValidPhone) {
          res.json({
            text: "Please enter a valid phone number including country code.",
            sessionState
          });
          return;
        }
        booking.phone = text;
        state.bookingData = booking;
        state.step = 'ask_procedure';

        const procedures = db.getProcedures().filter(p => p.active);
        const optionsText = procedures.map((p, i) => `${i + 1}) ${p.name}`).join('\n');

        res.json({
          text: `Which procedure would you like to book?\n\n${optionsText}\n\nPlease select one of the available options.`,
          sessionState: state,
        });
        return;

      case 'ask_procedure':
        const procs = db.getProcedures().filter(p => p.active);
        let selectedProc: Procedure | undefined;

        // Try number matches
        const numIndex = parseInt(text) - 1;
        if (!isNaN(numIndex) && numIndex >= 0 && numIndex < procs.length) {
          selectedProc = procs[numIndex];
        } else {
          // Try text match
          selectedProc = procs.find(p => p.name.toLowerCase().includes(text.toLowerCase()));
        }

        if (!selectedProc) {
          const procsText = procs.map((p, i) => `${i + 1}) ${p.name}`).join('\n');
          res.json({
            text: `Please select a procedure from the available options:\n\n${procsText}`,
            sessionState,
          });
          return;
        }

        booking.procedureId = selectedProc.id;
        booking.procedureName = selectedProc.name;
        booking.procedureDuration = selectedProc.duration_minutes;
        booking.procedurePrice = selectedProc.price;

        const nextDates = getNextAvailableDates(5);
        booking.availableDates = nextDates;
        state.bookingData = booking;
        state.step = 'ask_day';

        const dateOptionsText = nextDates.map((d, i) => `${i + 1}) ${d.formatted}`).join('\n');

        res.json({
          text: `${selectedProc.name} typically takes ${selectedProc.duration_minutes} minutes.\n\nThese dates are available:\n\n${dateOptionsText}\n\nPlease select one of the available dates.`,
          sessionState: state,
        });
        return;

      case 'ask_day':
        const textLower = text.toLowerCase().trim();
        let selectedDateObj: any = null;

        if (booking.availableDates && booking.availableDates.length > 0) {
          const dateNumIndex = parseInt(textLower) - 1;
          if (!isNaN(dateNumIndex) && dateNumIndex >= 0 && dateNumIndex < booking.availableDates.length) {
            selectedDateObj = booking.availableDates[dateNumIndex];
          } else {
            selectedDateObj = booking.availableDates.find((d: any) => 
              textLower.includes(d.dateIso.toLowerCase()) || 
              textLower.includes(d.dayOfWeek.toLowerCase()) ||
              textLower.includes(d.formatted.toLowerCase())
            );
          }
        }

        if (!selectedDateObj) {
          res.json({
            text: "Please select a date from the available options.",
            sessionState
          });
          return;
        }

        booking.day = selectedDateObj.dayOfWeek;
        booking.dateIso = selectedDateObj.dateIso;
        booking.dateFormatted = selectedDateObj.formatted;
        state.bookingData = booking;
        state.step = 'ask_time';

        const procDetails = db.getProcedures().find(p => p.id === booking.procedureId)!;
        const availableTimes = getAvailableTimes(
          booking.day,
          procDetails.duration_minutes,
          procDetails.slot_step_minutes,
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

        const timeOptionsText = availableTimes.map((t, i) => `${i + 1}) ${t}`).join('\n');

        res.json({
          text: `Available time slots for ${booking.dateFormatted}:\n\n${timeOptionsText}\n\nPlease select a time.`,
          sessionState: state,
        });
        return;

      case 'ask_time':
        const textTrim = text.trim();
        let selectedTime: string | null = null;

        if (booking.availableTimes && booking.availableTimes.length > 0) {
          const timeNumIndex = parseInt(textTrim) - 1;
          if (!isNaN(timeNumIndex) && timeNumIndex >= 0 && timeNumIndex < booking.availableTimes.length) {
            selectedTime = booking.availableTimes[timeNumIndex];
          } else {
            const timeMatch = textTrim.match(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/);
            if (timeMatch && booking.availableTimes.includes(timeMatch[0])) {
              selectedTime = timeMatch[0];
            }
          }
        }

        if (!selectedTime) {
          const nearest = (booking.availableTimes || []).slice(0, 3);
          const nearestText = nearest.map((t: string, i: number) => `${i + 1}) ${t}`).join('\n');
          
          res.json({
            text: `That time is already booked.\n\nHere are the nearest available times:\n\n${nearestText}`,
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

      case 'confirm':
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
          const whatsappMsg = `New Appointment Booked ✅\nCode: ${code}\nName: ${newApp.name}\nPhone: ${newApp.phone}\nProcedure: ${booking.procedureName}\nTime: ${booking.dateIso} ${booking.time}\nDuration: ${booking.procedureDuration} min`;
          console.log(`[WHATSAPP ALERT SIMULATOR to Admin ${db.getSettings().admin_whatsapp}]:\n${whatsappMsg}`);

          state.step = 'idle';
          state.bookingData = null;

          res.json({
            text: `✅ Booked successfully.\nYour 4-digit code is ${code}.\nPlease show this code to the receptionist when you arrive.`,
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

  // --- FAQS & GENERAL FALLBACK WITH HYBRID KNOWLEDGE SYSTEM (AURA) ---
  
  // Backend Keyword Check: Filter non-dental/non-clinic queries before calling APIs
  if (!isDentalOrClinicRelated(text)) {
    res.json({
      text: "I specialize in dental care assistance. Please ask a dental-related question.",
      sessionState,
    });
    return;
  }

  const faqs = db.getFAQs();
  const cleanInput = text.toLowerCase().replace(/[?.,!]/g, '').trim();

  // Primary Rule: Check local clinic data and predefined FAQs first.
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
    res.json({
      text: "I recommend consulting our dentist for accurate advice.",
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

startServer();
