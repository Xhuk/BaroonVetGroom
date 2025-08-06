import { useState, useEffect, useRef, useCallback } from 'react';

interface AppointmentData {
  appointments: any[];
  date: string;
  timestamp: number;
}

interface WebSocketUpdate {
  type: 'status_change' | 'new_appointment' | 'deleted_appointment' | 'rescheduled';
  tenantId: string;
  appointmentId: string;
  data: any;
  timestamp: number;
}

interface WebSocketMessage {
  type: 'initial_data' | 'date_data' | 'batch_updates' | 'heartbeat_ack';
  appointments?: any[];
  date?: string;
  updates?: WebSocketUpdate[];
  timestamp: number;
}

export function useWebSocketAppointments(tenantId: string, userId: string, selectedDate: string) {
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;
  const HEARTBEAT_INTERVAL = 25000; // 25 seconds

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws-appointments?tenantId=${tenantId}&userId=${userId}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, HEARTBEAT_INTERVAL);

        // Request data for current date if different from today
        const today = new Date().toISOString().split('T')[0];
        if (selectedDate !== today && wsRef.current) {
          wsRef.current.send(JSON.stringify({ 
            type: 'date_change', 
            date: selectedDate 
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'initial_data':
            case 'date_data':
              // Only update if we have actual data to prevent flickering
              if (message.appointments && message.appointments.length >= 0) {
                setAppointmentData({
                  appointments: message.appointments,
                  date: message.date || selectedDate,
                  timestamp: message.timestamp
                });
              }
              setIsLoading(false);
              break;

            case 'batch_updates':
              if (message.updates && appointmentData) {
                let updatedAppointments = [...appointmentData.appointments];
                
                message.updates.forEach(update => {
                  switch (update.type) {
                    case 'status_change':
                      const appointmentIndex = updatedAppointments.findIndex(apt => apt.id === update.appointmentId);
                      if (appointmentIndex !== -1) {
                        updatedAppointments[appointmentIndex] = {
                          ...updatedAppointments[appointmentIndex],
                          status: update.data.newStatus,
                          updatedAt: new Date().toISOString()
                        };
                      }
                      break;

                    case 'new_appointment':
                      // Only add if it's for the current displayed date
                      if (update.data.scheduledDate === selectedDate) {
                        updatedAppointments.push(update.data);
                      }
                      break;

                    case 'deleted_appointment':
                      updatedAppointments = updatedAppointments.filter(apt => apt.id !== update.appointmentId);
                      break;

                    case 'rescheduled':
                      // Remove from current date if rescheduled to different date
                      if (update.data.newDate !== selectedDate) {
                        updatedAppointments = updatedAppointments.filter(apt => apt.id !== update.appointmentId);
                      }
                      break;
                  }
                });

                setAppointmentData({
                  appointments: updatedAppointments,
                  date: appointmentData.date,
                  timestamp: message.timestamp
                });
              }
              break;

            case 'heartbeat_ack':
              // Heartbeat acknowledged, connection is alive
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt to reconnect unless it was a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Connection failed after multiple attempts. Please refresh the page.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to establish connection');
      setIsLoading(false);
    }
  }, [tenantId, userId, selectedDate, appointmentData]);

  // Handle date changes with debouncing to prevent flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'date_change', 
          date: selectedDate 
        }));
        // Don't set loading immediately to prevent flicker
      }
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timer);
  }, [selectedDate]);

  // Initial connection
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  const refresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_refresh' }));
    } else {
      connect();
    }
  }, [connect]);

  return {
    appointments: appointmentData?.appointments || [],
    isLoading,
    isConnected,
    error,
    refresh,
    lastUpdated: appointmentData?.timestamp
  };
}