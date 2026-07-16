import React, { useState, useEffect } from 'react';
import { 
  ClinicSettings, 
  Procedure, 
  Appointment
} from '../types';
import { 
  Settings, 
  CalendarDays, 
  BarChart3, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Save, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Activity,
  Users,
  Search,
  Grid,
  Filter,
  Phone,
  Building,
  LogOut,
  Stethoscope
} from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
  activeDeviceId?: string;
}

type AdminTab = 'overview' | 'appointments' | 'services' | 'hours' | 'analytics' | 'settings';

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Database State
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [services, setServices] = useState<Procedure[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BOOKED' | 'DONE' | 'CANCELED'>('ALL');

  // Editing service state
  const [editingService, setEditingService] = useState<Partial<Procedure> | null>(null);

  // Fetch all admin data on mount
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [resSettingsRaw, resServicesRaw, resAppsRaw] = await Promise.all([
        fetch('/api/settings', { credentials: 'include' }),
        fetch('/api/procedures', { credentials: 'include' }),
        fetch('/api/appointments', { credentials: 'include' })
      ]);

      if (!resSettingsRaw.ok || !resServicesRaw.ok || !resAppsRaw.ok) {
        throw new Error('Session expired or unauthorized. Please authenticate as admin.');
      }

      const resSettings = await resSettingsRaw.json();
      const resServices = await resServicesRaw.json();
      const resApps = await resAppsRaw.json();

      if (resSettings && resSettings.error) {
        throw new Error(resSettings.error);
      }
      if (!Array.isArray(resServices) || !Array.isArray(resApps)) {
        throw new Error('Received invalid data structure from server.');
      }

      setSettings(resSettings);
      setServices(resServices);
      setAppointments(resApps);
    } catch (err: any) {
      console.error('Failed to load admin panel data:', err);
      setError(err.message || 'Failed to authenticate and load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update appointment status
  const updateAppointmentStatus = async (id: string, status: 'BOOKED' | 'DONE' | 'CANCELED') => {
    try {
      setSaving(true);
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete appointment
  const deleteAppointment = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this appointment?')) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save Service (CRUD)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      setSaving(true);
      const isEdit = !!editingService.id;
      const url = isEdit ? `/api/procedures/${editingService.id}` : '/api/procedures';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingService,
          price: Number(editingService.price),
          duration_minutes: Number(editingService.duration_minutes),
          slot_step_minutes: Number(editingService.slot_step_minutes) || Number(editingService.duration_minutes) || 30,
          active: editingService.active !== false
        }),
        credentials: 'include'
      });

      if (res.ok) {
        setEditingService(null);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to save service:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete Service
  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service? Existing appointments for this service won\'t be affected.')) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/procedures/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save Clinic Settings & Working Hours
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include'
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        window.dispatchEvent(new CustomEvent('settings-updated'));
        alert('Operational settings updated successfully!');
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Day Active state
  const handleDayToggle = (day: string) => {
    if (!settings) return;
    const current = settings.working_hours_json[day];
    const updatedDays = {
      ...settings.working_hours_json,
      [day]: {
        ...current,
        active: !current.active
      }
    };
    setSettings({
      ...settings,
      working_hours_json: updatedDays
    });
  };

  // Change open/close times for a working day
  const handleHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    if (!settings) return;
    const current = settings.working_hours_json[day];
    const updatedDays = {
      ...settings.working_hours_json,
      [day]: {
        ...current,
        [field]: value
      }
    };
    setSettings({
      ...settings,
      working_hours_json: updatedDays
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold text-slate-500 tracking-wide">Loading AuraSmile Admin Panel...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white border border-red-100 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-100">
            <span className="text-xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Administrative Error</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
            {error}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => fetchData()}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
            <button
              onClick={onLogout}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STATS CALCULATIONS ---
  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const safeServices = Array.isArray(services) ? services : [];

  const todayIso = new Date().toISOString().split('T')[0];

  const appointmentsToday = safeAppointments.filter(a => {
    const appDate = (a.start_at || '').split('T')[0] || '';
    return appDate === todayIso;
  });

  const upcomingAppointments = safeAppointments.filter(a => {
    const appDate = (a.start_at || '').split('T')[0] || '';
    return appDate >= todayIso && a.status === 'BOOKED';
  });

  const completedAppointments = safeAppointments.filter(a => a.status === 'DONE');
  const canceledAppointments = safeAppointments.filter(a => a.status === 'CANCELED');

  // Revenue counts ONLY completed (DONE) appointments
  const totalRevenue = completedAppointments.reduce((acc, a) => {
    const service = safeServices.find(s => s.id === a.procedure_id);
    return acc + (service ? (service.price || 0) : 0);
  }, 0);

  // --- FILTERED APPOINTMENTS ---
  const filteredAppointments = safeAppointments.filter(a => {
    const matchesSearch = 
      (a.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (a.phone || '').includes(searchTerm || '') ||
      (a.id && a.id.toLowerCase().includes((searchTerm || '').toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in" id="admin-dashboard-container">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs gap-4">
        <div>
          <span className="block text-xs font-extrabold text-teal-600 tracking-wider uppercase mb-1">Clinic Administration</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            AuraSmile Operations
          </h1>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-5 py-3 border border-red-100 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors"
          id="admin-logout-btn"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </button>
      </div>

      {/* HORIZONTAL TOP TABS (NO SIDEBARS as requested) */}
      <div className="bg-slate-50 p-1.5 border border-slate-200/65 rounded-2xl flex flex-wrap gap-1" id="admin-top-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: Grid },
          { id: 'appointments', label: 'Appointments', icon: CalendarDays },
          { id: 'services', label: 'Services', icon: Stethoscope },
          { id: 'hours', label: 'Working Hours', icon: Clock },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as AdminTab);
                setEditingService(null);
              }}
              className={`flex items-center gap-2 px-4.5 py-3 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer ${
                isActive 
                  ? 'bg-white text-teal-600 shadow-sm border border-slate-100' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id={`tab-btn-${tab.id}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-500' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB STAGE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs min-h-[450px]" id="admin-tab-stage">
        
        {/* ================================================= */}
        {/* 1️⃣ OVERVIEW TAB */}
        {/* ================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in" id="overview-tab-content">
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold font-display text-slate-900">Clinic Overview</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                Quick diagnostic indices tracking live visitor scheduling activities and earnings.
              </p>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              
              {/* Today's Appointments */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3" id="kpi-today">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Appointments Today</span>
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-extrabold text-slate-900">{appointmentsToday.length}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Scheduled for today</span>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3" id="kpi-upcoming">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Upcoming Bookings</span>
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-extrabold text-slate-900">{upcomingAppointments.length}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Active & pending</span>
                </div>
              </div>

              {/* Completed Appointments */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3" id="kpi-completed">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completed</span>
                  <div className="p-2 rounded-xl bg-green-50 text-green-600 border border-green-100">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-extrabold text-slate-900">{completedAppointments.length}</span>
                  <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Status: Done</span>
                </div>
              </div>

              {/* Cancelled Appointments */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3" id="kpi-canceled">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Canceled</span>
                  <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-extrabold text-slate-900">{canceledAppointments.length}</span>
                  <span className="text-[10px] text-red-600 font-semibold uppercase tracking-wider">Status: Canceled</span>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-teal-900 text-white rounded-2xl p-5 space-y-3 shadow-xs" id="kpi-revenue">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider">Total Revenue</span>
                  <div className="p-2 rounded-xl bg-teal-850 text-teal-300 border border-teal-800">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className="block text-2xl font-extrabold">${totalRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-teal-200 font-semibold">Only completed (Done)</span>
                </div>
              </div>

            </div>

            {/* Quick Actions Portal */}
            <div className="border border-slate-150 rounded-2xl p-6 bg-slate-50/50 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Operational shortcuts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="p-4 bg-white border border-slate-200 hover:border-teal-500/30 rounded-xl text-left cursor-pointer transition-all shadow-xs"
                >
                  <span className="block text-xs font-bold text-slate-800 mb-1">Manage Appointments</span>
                  <span className="text-[11px] text-slate-500">Approve, cancel or clean appointments ledger.</span>
                </button>
                <button
                  onClick={() => {
                    setEditingService({ name: '', price: 100, duration_minutes: 30, slot_step_minutes: 30, active: true });
                    setActiveTab('services');
                  }}
                  className="p-4 bg-white border border-slate-200 hover:border-teal-500/30 rounded-xl text-left cursor-pointer transition-all shadow-xs"
                >
                  <span className="block text-xs font-bold text-slate-800 mb-1">Create New Service</span>
                  <span className="text-[11px] text-slate-500">Introduce procedures immediately available to chatbot.</span>
                </button>
                <button
                  onClick={() => setActiveTab('hours')}
                  className="p-4 bg-white border border-slate-200 hover:border-teal-500/30 rounded-xl text-left cursor-pointer transition-all shadow-xs"
                >
                  <span className="block text-xs font-bold text-slate-800 mb-1">Modify Clinic Hours</span>
                  <span className="text-[11px] text-slate-500">Configure open working days and hourly ranges.</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 2️⃣ APPOINTMENTS TAB */}
        {/* ================================================= */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-fade-in" id="appointments-tab-content">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold font-display text-slate-900">Clinic Bookings</h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Real-time dental schedules submitted by patients via chatbot dialogue.
                </p>
              </div>

              {/* Filters Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-grow sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, phone or code..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500/50 transition-all text-slate-800"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Bookings</option>
                    <option value="BOOKED">Active (Booked)</option>
                    <option value="DONE">Completed (Done)</option>
                    <option value="CANCELED">Canceled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-5">Code / Patient</th>
                      <th className="py-4 px-5">WhatsApp/Phone</th>
                      <th className="py-4 px-5">Procedure</th>
                      <th className="py-4 px-5">Date</th>
                      <th className="py-4 px-5">Time</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                          No appointments found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map(app => {
                        let statusColor = 'bg-sky-50 text-sky-600 border-sky-100';
                        if (app.status === 'DONE') statusColor = 'bg-green-50 text-green-600 border-green-100';
                        if (app.status === 'CANCELED') statusColor = 'bg-red-50 text-red-600 border-red-100';

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4.5 px-5 space-y-0.5">
                              <span className="block font-bold text-slate-900">{app.name}</span>
                              <span className="block text-[10px] font-mono text-slate-400 uppercase">#{app.id}</span>
                            </td>
                            <td className="py-4.5 px-5">
                              <a href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 transition-colors">
                                {app.phone}
                              </a>
                            </td>
                            <td className="py-4.5 px-5 font-bold text-slate-800">
                              {services.find(s => s.id === app.procedure_id)?.name || 'Unknown Treatment'}
                            </td>
                            <td className="py-4.5 px-5">
                              {new Date(app.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="py-4.5 px-5 font-semibold text-slate-600">
                              {new Date(app.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </td>
                            <td className="py-4.5 px-5">
                              <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full border ${statusColor}`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="py-4.5 px-5 text-right">
                              <div className="flex gap-2 justify-end items-center">
                                {app.status === 'BOOKED' && (
                                  <>
                                    <button
                                      onClick={() => updateAppointmentStatus(app.id, 'DONE')}
                                      disabled={saving}
                                      className="p-1.5 text-green-600 hover:bg-green-50 border border-green-100 rounded-lg transition-colors cursor-pointer"
                                      title="Mark Completed"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => updateAppointmentStatus(app.id, 'CANCELED')}
                                      disabled={saving}
                                      className="p-1.5 text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition-colors cursor-pointer"
                                      title="Mark Cancelled"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => deleteAppointment(app.id)}
                                  disabled={saving}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Appointment"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 3️⃣ SERVICES TAB */}
        {/* ================================================= */}
        {activeTab === 'services' && (
          <div className="space-y-6 animate-fade-in" id="services-tab-content">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold font-display text-slate-900">Treatments & Services</h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Active clinic procedures available for appointment bookings in the automated system.
                </p>
              </div>

              {!editingService && (
                <button
                  onClick={() => setEditingService({ name: '', price: 100, duration_minutes: 30, slot_step_minutes: 30, active: true })}
                  className="flex items-center gap-1.5 px-4.5 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  id="add-service-btn"
                >
                  <Plus className="w-4 h-4" />
                  Add New Service
                </button>
              )}
            </div>

            {/* Service Form Modal (Inline overlay for cleaner UI) */}
            {editingService && (
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-6">
                <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                  {editingService.id ? 'Edit Treatment Details' : 'Create Treatment Service'}
                </h3>

                <form onSubmit={handleSaveService} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Service Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Laser Teeth Whitening"
                        value={editingService.name || ''}
                        onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Price ($ USD)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 299"
                        value={editingService.price || 0}
                        onChange={e => setEditingService({ ...editingService, price: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Duration (minutes)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 45"
                        value={editingService.duration_minutes || 0}
                        onChange={e => setEditingService({ ...editingService, duration_minutes: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="service-active-chk"
                      checked={editingService.active !== false}
                      onChange={e => setEditingService({ ...editingService, active: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <label htmlFor="service-active-chk" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Active Service (Available to book in bot)
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      Save Treatment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Services Cards List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map(proc => (
                <div key={proc.id} className="border border-slate-200 hover:border-slate-300 rounded-2xl p-5 bg-slate-50/20 space-y-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                        proc.active 
                          ? 'bg-teal-50 text-teal-600 border-teal-100' 
                          : 'bg-slate-50 text-slate-400 border-slate-150'
                      }`}>
                        {proc.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-[13px] font-extrabold text-teal-600">${proc.price}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{proc.name}</h4>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold pt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {proc.duration_minutes} Minutes Treatment
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setEditingService(proc)}
                      className="flex-grow flex items-center justify-center gap-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleDeleteService(proc.id)}
                      className="p-2 border border-slate-200 hover:text-red-600 hover:bg-red-50 text-slate-400 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 4️⃣ WORKING HOURS TAB */}
        {/* ================================================= */}
        {activeTab === 'hours' && (
          <div className="space-y-6 animate-fade-in" id="hours-tab-content">
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold font-display text-slate-900">Clinic Working Hours</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Set active operational business days and hours. This determines what slots can be booked in the bot.
              </p>
            </div>

            {settings && (
              <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
                {/* Working days schedule cards list */}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  {Object.keys(settings.working_hours_json).map(day => {
                    const details = settings.working_hours_json[day];
                    return (
                      <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 gap-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`hours-active-${day}`}
                            checked={details.active}
                            onChange={() => handleDayToggle(day)}
                            className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <label htmlFor={`hours-active-${day}`} className="font-extrabold text-xs text-slate-800 w-24 cursor-pointer select-none">
                            {day}
                          </label>
                        </div>

                        {details.active ? (
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <input
                              type="time"
                              value={details.open}
                              onChange={e => handleHoursChange(day, 'open', e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-medium outline-none"
                            />
                            <span className="text-slate-400 font-bold text-xs px-1">to</span>
                            <input
                              type="time"
                              value={details.close}
                              onChange={e => handleHoursChange(day, 'close', e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-medium outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Clinic Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Slot Interval Settings Section */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/30 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">Booking Interval</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Time Slot Interval (minutes)</label>
                      <input
                        type="number"
                        required
                        value={settings.time_slot_interval || 30}
                        onChange={e => setSettings({ ...settings, time_slot_interval: Number(e.target.value) })}
                        className="w-full max-w-xs bg-white border border-slate-200 focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800"
                      />
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Determines spacing gap between suggested slots (e.g. 30 means booking slots every 30 mins).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving System Hours...' : 'Save Working Hours & Interval'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* 5️⃣ ANALYTICS TAB */}
        {/* ================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in" id="analytics-tab-content">
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold font-display text-slate-900">Clinic Financial Analytics</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Insights and graphical performance reporting on booking trends, status spreads, and service popularity.
              </p>
            </div>

            {/* Visual Analytics Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Daily Revenue trend chart (Last 7 Days) */}
              <div className="lg:col-span-7 border border-slate-200 rounded-2xl p-6 bg-slate-50/10 space-y-6">
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Revenue Trend</span>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">Completed Bookings Revenue</h4>
                </div>

                {/* Custom Tailwind Bar Chart */}
                <div className="relative h-64 flex items-end justify-between gap-2.5 pt-8 px-2">
                  {/* Grid Lines background */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-4 text-[9px] text-slate-400 font-semibold font-mono">
                    <div className="border-b border-slate-100 w-full pt-1">High Range</div>
                    <div className="border-b border-slate-100 w-full">Mid Range</div>
                    <div className="border-b border-slate-150 w-full">Floor</div>
                  </div>

                  {/* Calculations for 7 days */}
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - idx));
                    const dateStr = date.toISOString().split('T')[0];
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                    // Sum done revenue
                    const dayRev = appointments
                      .filter(a => a.status === 'DONE' && a.start_at.startsWith(dateStr))
                      .reduce((acc, a) => {
                        const service = services.find(s => s.id === a.procedure_id);
                        return acc + (service ? service.price : 0);
                      }, 0);

                    // Find max representation height
                    const maxScale = Math.max(1000, ...Array.from({ length: 7 }).map((_, j) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - j));
                      const ds = d.toISOString().split('T')[0];
                      return appointments
                        .filter(a => a.status === 'DONE' && a.start_at.startsWith(ds))
                        .reduce((acc, a) => {
                          const service = services.find(s => s.id === a.procedure_id);
                          return acc + (service ? service.price : 0);
                        }, 0);
                    }));

                    const heightPct = maxScale > 0 ? (dayRev / maxScale) * 85 : 0;

                    return (
                      <div key={idx} className="flex-grow flex flex-col items-center gap-2 relative z-10">
                        <div className="text-[10px] font-bold text-teal-600">${dayRev}</div>
                        <div 
                          style={{ height: `${Math.max(4, heightPct)}%` }}
                          className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-lg shadow-sm group hover:from-teal-600 hover:to-teal-500 transition-all duration-300 relative"
                        >
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${dayRev}
                          </div>
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{dayName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service popularity analysis */}
              <div className="lg:col-span-5 border border-slate-200 rounded-2xl p-6 bg-slate-50/10 space-y-6">
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Demand Analytics</span>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">Service Popularity Ledger</h4>
                </div>

                <div className="space-y-4">
                  {services.slice(0, 5).map(proc => {
                    const count = appointments.filter(a => a.procedure_id === proc.id).length;
                    const maxCount = Math.max(1, ...services.map(p => appointments.filter(a => a.procedure_id === p.id).length));
                    const progressPct = (count / maxCount) * 100;

                    return (
                      <div key={proc.id} className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-700 truncate max-w-[200px]">{proc.name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">{count} bookings</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            style={{ width: `${progressPct}%` }}
                            className="bg-teal-500 h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Secondary spread summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Ticket Price</span>
                <span className="block text-xl font-extrabold text-slate-800">
                  ${completedAppointments.length > 0 ? Math.round(totalRevenue / completedAppointments.length) : 0}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">Per completed patient session</span>
              </div>
              <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booking Completion Rate</span>
                <span className="block text-xl font-extrabold text-slate-800">
                  {appointments.length > 0 ? Math.round((completedAppointments.length / appointments.length) * 100) : 0}%
                </span>
                <span className="text-[9px] text-slate-500 font-medium">DONE appointments vs total ledger</span>
              </div>
              <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Customers</span>
                <span className="block text-xl font-extrabold text-slate-800">
                  {new Set(appointments.map(a => a.phone)).size}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">Unique phone registries recorded</span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 6️⃣ SYSTEM SETTINGS TAB */}
        {/* ================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in" id="settings-tab-content">
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold font-display text-slate-900">Clinic Operational Settings</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Configure primary metadata including clinic names, branding logos, contact lines, and active clinician profiles.
              </p>
            </div>

            {settings && (
              <form onSubmit={handleSaveSettings} className="space-y-8 max-w-3xl text-xs font-semibold">
                
                {/* 1. BRANDING & CONTACT INFO */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-2xs">
                  <h3 className="text-xs font-bold text-teal-600 tracking-wide uppercase border-b border-slate-100 pb-2">
                    1. Branding & contact channels
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        Clinic Display Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AuraSmile Dental Clinic"
                        value={settings.clinic_name || ''}
                        onChange={e => setSettings({ ...settings, clinic_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                        Clinic Logo Image URL
                      </label>
                      <input
                        type="url"
                        placeholder="e.g. https://images.unsplash.com/... or /logo.png"
                        value={settings.clinic_logo || ''}
                        onChange={e => setSettings({ ...settings, clinic_logo: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        WhatsApp / Contact Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +1 (800) 555-0199"
                        value={settings.whatsapp_number || ''}
                        onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value, admin_whatsapp: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                        Inquiries Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. appointments@aurasmile.com"
                        value={settings.contact_email || ''}
                        onChange={e => setSettings({ ...settings, contact_email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>

                    <div className="space-y-2 col-span-1 sm:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Physical Clinic Address
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 450 Wellness Plaza, Suite 100, New York, NY"
                        value={settings.clinic_address || ''}
                        onChange={e => setSettings({ ...settings, clinic_address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. CLINICIAN / ADMIN PERSONNEL */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-2xs">
                  <h3 className="text-xs font-bold text-teal-600 tracking-wide uppercase border-b border-slate-100 pb-2">
                    2. Primary Clinician Profile
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Admin Doctor Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Evelyn Sterling"
                        value={settings.admin_name || ''}
                        onChange={e => setSettings({ ...settings, admin_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Doctor Profile Photo URL
                      </label>
                      <input
                        type="url"
                        placeholder="e.g. https://images.unsplash.com/photo-1559839734-2b71ea197ec2"
                        value={settings.admin_profile_image || ''}
                        onChange={e => setSettings({ ...settings, admin_profile_image: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. ENGINE SCHEDULING CONFIG */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-2xs">
                  <h3 className="text-xs font-bold text-teal-600 tracking-wide uppercase border-b border-slate-100 pb-2">
                    3. Scheduling Engine Configuration
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Time Slot Interval (minutes)
                      </label>
                      <input
                        type="number"
                        required
                        value={settings.time_slot_interval || 30}
                        onChange={e => setSettings({ ...settings, time_slot_interval: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Determines the time granularity gap between suggested calendar slots.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Operational Timezone
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.timezone}
                        onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving System configurations...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
