'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Incident } from '@/lib/mock-data';
import { MOCK_INCIDENTS } from '@/lib/mock-data';

type IncidentContextValue = {
  incidents: Incident[];
  setIncidents: React.Dispatch<React.SetStateAction<Incident[]>>;
  resetToMockData: () => void;
};

const IncidentContext = createContext<IncidentContextValue | undefined>(undefined);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);

  const resetToMockData = useCallback(() => {
    setIncidents(MOCK_INCIDENTS);
  }, []);

  useEffect(() => {
    // Demo Mode (default): socket connection intentionally disabled.
    // Uncomment this section to enable Live Mode with socket.io-client.
    //
    // import { io } from 'socket.io-client';
    // const socket = io('http://localhost:8000', { transports: ['websocket'] });
    //
    // const onNewIncident = (incomingIncident: Incident) => {
    //   setIncidents((previousIncidents) => [...previousIncidents, incomingIncident]);
    // };
    //
    // socket.off('new_incident', onNewIncident);
    // socket.on('new_incident', onNewIncident);
    //
    // return () => {
    //   socket.off('new_incident', onNewIncident);
    //   socket.disconnect();
    // };

    return () => {
      // Demo Mode cleanup only.
    };
  }, []);

  const value = useMemo(
    () => ({ incidents, setIncidents, resetToMockData }),
    [incidents, resetToMockData]
  );

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

export function useIncidents() {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
}
