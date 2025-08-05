import { WebSocket, WebSocketServer } from 'ws';
import { storage } from './storage';

interface TenantConnection {
  ws: WebSocket;
  tenantId: string;
  userId: string;
  lastHeartbeat: number;
}

interface AppointmentUpdate {
  type: 'status_change' | 'new_appointment' | 'deleted_appointment' | 'rescheduled';
  tenantId: string;
  appointmentId: string;
  data: any;
  timestamp: number;
}

class ScalableAppointmentService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, TenantConnection[]> = new Map();
  private updateQueue: Map<string, AppointmentUpdate[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_INTERVAL = 2000; // 2 seconds batching
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds

  constructor() {
    this.startHeartbeatMonitor();
  }

  initializeWebSocketServer(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws-appointments' // Use specific path to avoid conflicts with Vite's WebSocket
    });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleNewConnection(ws, req);
    });

    console.log('Scalable appointment WebSocket service initialized');
  }

  private handleNewConnection(ws: WebSocket, req: any) {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenantId');
    const userId = url.searchParams.get('userId');

    if (!tenantId || !userId) {
      ws.close(4001, 'Missing tenantId or userId');
      return;
    }

    const connection: TenantConnection = {
      ws,
      tenantId,
      userId,
      lastHeartbeat: Date.now()
    };

    // Add connection to tenant group
    if (!this.connections.has(tenantId)) {
      this.connections.set(tenantId, []);
    }
    this.connections.get(tenantId)!.push(connection);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(connection, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      this.removeConnection(connection);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.removeConnection(connection);
    });

    // Send initial data
    this.sendInitialAppointmentData(connection);
  }

  private async sendInitialAppointmentData(connection: TenantConnection) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const appointments = await storage.getAppointments(connection.tenantId, today);
      
      const message = {
        type: 'initial_data',
        date: today,
        appointments: appointments,
        timestamp: Date.now()
      };

      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending initial appointment data:', error);
    }
  }

  private handleClientMessage(connection: TenantConnection, message: any) {
    connection.lastHeartbeat = Date.now();

    switch (message.type) {
      case 'heartbeat':
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
        }
        break;

      case 'date_change':
        this.handleDateChange(connection, message.date);
        break;

      case 'request_refresh':
        this.sendInitialAppointmentData(connection);
        break;
    }
  }

  private async handleDateChange(connection: TenantConnection, date: string) {
    try {
      const appointments = await storage.getAppointments(connection.tenantId, date);
      
      const message = {
        type: 'date_data',
        date: date,
        appointments: appointments,
        timestamp: Date.now()
      };

      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error handling date change:', error);
    }
  }

  // Called when appointments are modified
  public broadcastAppointmentUpdate(update: AppointmentUpdate) {
    // Add to batch queue
    if (!this.updateQueue.has(update.tenantId)) {
      this.updateQueue.set(update.tenantId, []);
    }
    this.updateQueue.get(update.tenantId)!.push(update);

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchUpdates();
      }, this.BATCH_INTERVAL);
    }
  }

  private processBatchUpdates() {
    Array.from(this.updateQueue.entries()).forEach(([tenantId, updates]) => {
      const connections = this.connections.get(tenantId) || [];
      
      if (updates.length > 0 && connections.length > 0) {
        const message = {
          type: 'batch_updates',
          updates: updates,
          timestamp: Date.now()
        };

        const messageStr = JSON.stringify(message);
        
        connections.forEach((connection: TenantConnection) => {
          if (connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(messageStr);
          }
        });
      }
    });

    // Clear queue and timer
    this.updateQueue.clear();
    this.batchTimer = null;
  }

  private removeConnection(connection: TenantConnection) {
    const tenantConnections = this.connections.get(connection.tenantId);
    if (tenantConnections) {
      const index = tenantConnections.indexOf(connection);
      if (index > -1) {
        tenantConnections.splice(index, 1);
      }
      
      // Remove tenant entry if no connections left
      if (tenantConnections.length === 0) {
        this.connections.delete(connection.tenantId);
      }
    }
  }

  private startHeartbeatMonitor() {
    setInterval(() => {
      const now = Date.now();
      
      Array.from(this.connections.entries()).forEach(([tenantId, connections]) => {
        // Filter out stale connections
        const activeConnections = connections.filter((connection: TenantConnection) => {
          const isStale = (now - connection.lastHeartbeat) > this.CONNECTION_TIMEOUT;
          
          if (isStale && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.close(4002, 'Connection timeout');
          }
          
          return !isStale;
        });

        if (activeConnections.length !== connections.length) {
          if (activeConnections.length === 0) {
            this.connections.delete(tenantId);
          } else {
            this.connections.set(tenantId, activeConnections);
          }
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  // Public methods for appointment operations
  public onAppointmentStatusChange(tenantId: string, appointmentId: string, oldStatus: string, newStatus: string) {
    this.broadcastAppointmentUpdate({
      type: 'status_change',
      tenantId,
      appointmentId,
      data: { oldStatus, newStatus },
      timestamp: Date.now()
    });
  }

  public onAppointmentCreated(tenantId: string, appointment: any) {
    this.broadcastAppointmentUpdate({
      type: 'new_appointment',
      tenantId,
      appointmentId: appointment.id,
      data: appointment,
      timestamp: Date.now()
    });
  }

  public onAppointmentDeleted(tenantId: string, appointmentId: string) {
    this.broadcastAppointmentUpdate({
      type: 'deleted_appointment',
      tenantId,
      appointmentId,
      data: {},
      timestamp: Date.now()
    });
  }

  public onAppointmentRescheduled(tenantId: string, appointmentId: string, oldDate: string, newDate: string) {
    this.broadcastAppointmentUpdate({
      type: 'rescheduled',
      tenantId,
      appointmentId,
      data: { oldDate, newDate },
      timestamp: Date.now()
    });
  }

  // Get connection statistics
  public getConnectionStats() {
    let totalConnections = 0;
    const tenantStats: Record<string, number> = {};

    Array.from(this.connections.entries()).forEach(([tenantId, connections]) => {
      tenantStats[tenantId] = connections.length;
      totalConnections += connections.length;
    });

    return {
      totalConnections,
      totalTenants: this.connections.size,
      tenantStats
    };
  }
}

export const scalableAppointmentService = new ScalableAppointmentService();