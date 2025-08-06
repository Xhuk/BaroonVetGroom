import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TimezoneKey, TIMEZONE_CONFIGS, getUserTimezone, setUserTimezone } from '@shared/timeUtils';

interface TimezoneContextType {
  timezone: TimezoneKey;
  setTimezone: (timezone: TimezoneKey) => void;
  timezoneConfig: typeof TIMEZONE_CONFIGS[TimezoneKey];
  availableTimezones: typeof TIMEZONE_CONFIGS;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<TimezoneKey>(getUserTimezone());
  
  const handleSetTimezone = (newTimezone: TimezoneKey) => {
    setTimezoneState(newTimezone);
    setUserTimezone(newTimezone);
  };
  
  useEffect(() => {
    // Sync with localStorage on mount
    const stored = getUserTimezone();
    if (stored !== timezone) {
      setTimezoneState(stored);
    }
  }, []);
  
  const value: TimezoneContextType = {
    timezone,
    setTimezone: handleSetTimezone,
    timezoneConfig: TIMEZONE_CONFIGS[timezone],
    availableTimezones: TIMEZONE_CONFIGS
  };
  
  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): TimezoneContextType {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}