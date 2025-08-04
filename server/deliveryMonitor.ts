import { storage } from "./storage";
import { eq, and, lt, sql } from "drizzle-orm";

interface DelayDetectionConfig {
  maxDelayMinutes: number;
  checkInIntervalMinutes: number;
  criticalDelayMinutes: number;
  emergencyTimeoutMinutes: number;
}

class DeliveryMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private config: DelayDetectionConfig = {
    maxDelayMinutes: 15, // Warning threshold
    checkInIntervalMinutes: 30, // Expected check-in frequency
    criticalDelayMinutes: 45, // Critical alert threshold
    emergencyTimeoutMinutes: 90, // Emergency alert threshold
  };

  start() {
    console.log("Starting delivery monitoring service...");
    
    // Run initial check
    this.checkDeliveryStatus();
    
    // Set up interval to check every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.checkDeliveryStatus();
    }, 5 * 60 * 1000); // 5 minutes
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("Delivery monitoring service stopped");
    }
  }

  private async checkDeliveryStatus() {
    try {
      console.log("Checking delivery status...");
      
      // Get all active deliveries across all tenants
      const activeDeliveries = await storage.getActiveDeliveryTracking("");
      
      for (const delivery of activeDeliveries) {
        await this.checkSingleDelivery(delivery);
      }
      
    } catch (error) {
      console.error("Error in delivery monitoring:", error);
    }
  }

  private async checkSingleDelivery(delivery: any) {
    const now = new Date();
    const currentTime = now.getTime();
    
    // Check for missed check-ins
    if (delivery.nextCheckInDue) {
      const nextCheckInTime = new Date(delivery.nextCheckInDue).getTime();
      const minutesOverdue = Math.floor((currentTime - nextCheckInTime) / (1000 * 60));
      
      if (minutesOverdue > 0) {
        await this.handleMissedCheckIn(delivery, minutesOverdue);
      }
    }
    
    // Check estimated return time delays
    if (delivery.estimatedReturnTime && delivery.status === "en_route") {
      const estimatedTime = new Date(delivery.estimatedReturnTime).getTime();
      const delayMinutes = Math.floor((currentTime - estimatedTime) / (1000 * 60));
      
      if (delayMinutes > 0) {
        await this.handleDelay(delivery, delayMinutes);
      }
    }
    
    // Check for critical situations (no check-in for extended period)
    if (delivery.lastCheckIn) {
      const lastCheckInTime = new Date(delivery.lastCheckIn).getTime();
      const minutesSinceLastCheckIn = Math.floor((currentTime - lastCheckInTime) / (1000 * 60));
      
      if (minutesSinceLastCheckIn > this.config.emergencyTimeoutMinutes) {
        await this.handleEmergencyTimeout(delivery, minutesSinceLastCheckIn);
      }
    }
  }

  private async handleMissedCheckIn(delivery: any, minutesOverdue: number) {
    console.log(`Missed check-in detected for delivery ${delivery.id}: ${minutesOverdue} minutes overdue`);
    
    let alertType: "delay_warning" | "delay_critical" | "missed_checkin" = "missed_checkin";
    let severity: "low" | "medium" | "high" | "critical" = "medium";
    
    if (minutesOverdue > this.config.criticalDelayMinutes) {
      alertType = "delay_critical";
      severity = "critical";
    } else if (minutesOverdue > this.config.maxDelayMinutes) {
      severity = "high";
    }
    
    // Create alert for admin and backup drivers
    await this.createAlert(delivery, {
      alertType,
      severity,
      recipientType: "admin",
      message: `Conductor no ha reportado check-in. Retrasado ${minutesOverdue} minutos desde el check-in esperado.`,
    });
    
    // Notify backup driver if critical
    if (severity === "critical") {
      await this.createAlert(delivery, {
        alertType,
        severity,
        recipientType: "backup_driver",
        message: `CRÍTICO: Conductor sin check-in por ${minutesOverdue} minutos. Puede necesitar asistencia.`,
      });
      
      // Send WhatsApp notification
      await this.sendWhatsAppAlert(delivery.tenantId, 
        `🚨 ENTREGA RETRASADA: ${delivery.vanName} sin check-in por ${minutesOverdue} minutos`);
    }
  }

  private async handleDelay(delivery: any, delayMinutes: number) {
    console.log(`Delivery delay detected for ${delivery.id}: ${delayMinutes} minutes`);
    
    // Update delay in tracking
    await storage.updateDeliveryTracking(delivery.id, {
      delayMinutes,
      status: delayMinutes > this.config.criticalDelayMinutes ? "delayed" : delivery.status,
    });
    
    let severity: "low" | "medium" | "high" | "critical" = "low";
    let alertType: "delay_warning" | "delay_critical" = "delay_warning";
    
    if (delayMinutes > this.config.criticalDelayMinutes) {
      severity = "critical";
      alertType = "delay_critical";
    } else if (delayMinutes > this.config.maxDelayMinutes) {
      severity = "high";
    }
    
    // Only create alert if it's significant delay
    if (delayMinutes > this.config.maxDelayMinutes) {
      await this.createAlert(delivery, {
        alertType,
        severity,
        recipientType: "admin",
        message: `Entrega retrasada ${delayMinutes} minutos respecto al tiempo estimado de retorno.`,
      });
      
      // Notify owner for critical delays
      if (severity === "critical") {
        await this.createAlert(delivery, {
          alertType,
          severity,
          recipientType: "owner",
          message: `CRÍTICO: Entrega con retraso significativo de ${delayMinutes} minutos.`,
        });
        
        await this.sendWhatsAppAlert(delivery.tenantId, 
          `⏰ RETRASO CRÍTICO: ${delivery.vanName} con ${delayMinutes} minutos de retraso`);
      }
    }
  }

  private async handleEmergencyTimeout(delivery: any, minutesSinceLastCheckIn: number) {
    console.log(`Emergency timeout for delivery ${delivery.id}: ${minutesSinceLastCheckIn} minutes since last check-in`);
    
    // Update to emergency status
    await storage.updateDeliveryTracking(delivery.id, {
      status: "emergency",
    });
    
    // Create emergency alerts for all stakeholders
    const emergencyMessage = `EMERGENCIA: No hay comunicación con conductor por ${minutesSinceLastCheckIn} minutos. Contacto de emergencia requerido.`;
    
    await this.createAlert(delivery, {
      alertType: "emergency",
      severity: "critical",
      recipientType: "admin",
      message: emergencyMessage,
    });
    
    await this.createAlert(delivery, {
      alertType: "emergency",
      severity: "critical",
      recipientType: "owner",
      message: emergencyMessage,
    });
    
    await this.createAlert(delivery, {
      alertType: "emergency",
      severity: "critical",
      recipientType: "backup_driver",
      message: `EMERGENCIA: Prepararse para ruta de respaldo. Sin contacto con ${delivery.vanName} por ${minutesSinceLastCheckIn} minutos.`,
    });
    
    // Send WhatsApp emergency alert
    await this.sendWhatsAppAlert(delivery.tenantId, 
      `🚨🚨 EMERGENCIA: ${delivery.vanName} sin contacto por ${minutesSinceLastCheckIn} minutos. Atención inmediata requerida.`);
  }

  private async createAlert(delivery: any, alertData: {
    alertType: "delay_warning" | "delay_critical" | "missed_checkin" | "emergency";
    severity: "low" | "medium" | "high" | "critical";
    recipientType: "admin" | "owner" | "driver" | "backup_driver";
    message: string;
  }) {
    try {
      await storage.createDeliveryAlert({
        tenantId: delivery.tenantId,
        deliveryTrackingId: delivery.id,
        ...alertData,
      });
    } catch (error) {
      console.error("Error creating delivery alert:", error);
    }
  }

  private async sendWhatsAppAlert(tenantId: string, message: string) {
    try {
      if (!process.env.N8N_WEBHOOK_URL || !process.env.N8N_JWT_TOKEN) {
        console.warn("n8n webhook not configured, skipping WhatsApp alert");
        return;
      }

      const webhookPayload = {
        tenantId,
        message,
        type: "delivery_alert",
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.N8N_JWT_TOKEN}`,
        },
        body: JSON.stringify(webhookPayload),
      });

      if (response.ok) {
        console.log("WhatsApp alert sent successfully");
      } else {
        console.error("Failed to send WhatsApp alert:", response.status);
      }
    } catch (error) {
      console.error("Error sending WhatsApp alert:", error);
    }
  }
}

export const deliveryMonitor = new DeliveryMonitoringService();