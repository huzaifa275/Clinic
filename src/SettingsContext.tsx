import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClinicSettings } from './types';

interface SettingsContextType {
  settings: ClinicSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: ClinicSettings = {
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
  admin_profile_image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ClinicSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        // Merge with defaultSettings to guarantee all keys exist
        setSettings({
          ...defaultSettings,
          ...data,
          working_hours_json: {
            ...defaultSettings.working_hours_json,
            ...(data.working_hours_json || {})
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch clinic settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();

    const handleUpdate = () => {
      refreshSettings();
    };

    window.addEventListener('settings-updated', handleUpdate);
    return () => {
      window.removeEventListener('settings-updated', handleUpdate);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
