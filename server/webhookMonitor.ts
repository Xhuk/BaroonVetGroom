import { storage } from "./storage";
import type { InsertWebhookErrorLog, InsertWebhookMonitoring } from "@shared/schema";

export class WebhookMonitor {
  private retryInterval: NodeJS.Timeout | null = null;

  // Start the monitoring service
  start() {
    console.log("Starting webhook monitoring service...");
    
    // Check for failed webhooks every 2 minutes
    this.retryInterval = setInterval(() => {
      this.processFailedWebhooks();
    }, 2 * 60 * 1000);

    // Initialize monitoring for known webhooks
    this.initializeWebhookMonitoring();
  }

  // Stop the monitoring service
  stop() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    console.log("Webhook monitoring service stopped.");
  }

  // Log webhook error and update monitoring status
  async logError(tenantId: string, webhookType: string, endpoint: string, error: any, requestPayload?: any) {
    try {
      // Check if we recently logged the same error to avoid spam
      const recentLogs = await storage.getWebhookErrorLogs(tenantId, 5);
      const sameErrorRecently = recentLogs.find(log => 
        log.webhookType === webhookType && 
        log.errorMessage === error.message &&
        new Date(log.createdAt).getTime() > Date.now() - (5 * 60 * 1000) // Within last 5 minutes
      );

      if (sameErrorRecently) {
        console.log(`Duplicate error suppressed for ${webhookType} (${tenantId}):`, error.message);
        return;
      }

      // Log the error
      const errorLog: InsertWebhookErrorLog = {
        tenantId,
        webhookType,
        endpoint,
        requestPayload,
        errorMessage: error.message || error.toString(),
        errorCode: error.code || 'MAINTENANCE',
        httpStatus: error.status || error.statusCode || 0,
        retryCount: 0,
        status: 'failed'
      };

      await storage.logWebhookError(errorLog);

      // Update monitoring status
      await this.updateMonitoringStatus(tenantId, webhookType, endpoint, false);

      console.log(`Webhook error logged for ${webhookType} (${tenantId}):`, error.message);
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }
  }

  // Log successful webhook call
  async logSuccess(tenantId: string, webhookType: string, endpoint: string) {
    try {
      await this.updateMonitoringStatus(tenantId, webhookType, endpoint, true);
      console.log(`Webhook success logged for ${webhookType} (${tenantId})`);
    } catch (error) {
      console.error("Failed to log webhook success:", error);
    }
  }

  // Update monitoring status based on success/failure
  private async updateMonitoringStatus(tenantId: string, webhookType: string, endpoint: string, success: boolean) {
    const monitoring = await storage.getWebhookMonitoring(tenantId, webhookType);
    
    if (!monitoring) {
      // Create new monitoring record
      const newMonitoring: InsertWebhookMonitoring = {
        tenantId,
        webhookType,
        endpoint,
        status: success ? 'healthy' : 'down',
        lastSuccessAt: success ? new Date() : undefined,
        lastFailureAt: success ? undefined : new Date(),
        consecutiveFailures: success ? 0 : 1,
        isAutoRetryEnabled: true,
        retryIntervalMinutes: 5,
        maxRetryIntervalMinutes: 60,
        nextRetryAt: success ? undefined : new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      };
      
      await storage.upsertWebhookMonitoring(newMonitoring);
    } else {
      // Determine new status
      let newStatus = 'healthy';
      if (!success) {
        const failures = (monitoring.consecutiveFailures || 0) + 1;
        newStatus = failures >= 5 ? 'down' : 'degraded';
      }

      await storage.updateWebhookMonitoringStatus(
        tenantId, 
        webhookType, 
        newStatus, 
        success ? undefined : new Date()
      );
    }
  }

  // Process failed webhooks for retry
  private async processFailedWebhooks() {
    try {
      const failedWebhooks = await storage.getFailedWebhooksForRetry();
      
      for (const webhook of failedWebhooks) {
        await this.retryWebhook(webhook);
      }
    } catch (error) {
      console.error("Error processing failed webhooks:", error);
    }
  }

  // Retry a specific webhook
  private async retryWebhook(webhook: any) {
    try {
      console.log(`Retrying webhook ${webhook.webhookType} for tenant ${webhook.tenantId}`);
      
      // Update retry timestamp
      await storage.incrementWebhookRetry(webhook.tenantId, webhook.webhookType);

      // Test webhook availability with a simple ping
      const isAvailable = await this.testWebhookAvailability(webhook.endpoint);
      
      if (isAvailable) {
        await storage.updateWebhookMonitoringStatus(
          webhook.tenantId, 
          webhook.webhookType, 
          'healthy'
        );
        console.log(`Webhook ${webhook.webhookType} for tenant ${webhook.tenantId} is back online`);
      } else {
        // Continue with exponential backoff
        await storage.updateWebhookMonitoringStatus(
          webhook.tenantId, 
          webhook.webhookType, 
          webhook.consecutiveFailures >= 10 ? 'down' : 'degraded',
          new Date()
        );
      }
    } catch (error) {
      console.error(`Failed to retry webhook ${webhook.webhookType}:`, error);
    }
  }

  // Test if webhook endpoint is available
  private async testWebhookAvailability(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'User-Agent': 'VetGroom-Webhook-Monitor/1.0'
        }
      });
      
      // Consider 2xx, 3xx, or 405 (Method Not Allowed) as available
      return response.status < 500 || response.status === 405;
    } catch (error) {
      return false;
    }
  }

  // Initialize monitoring for known webhook types
  private async initializeWebhookMonitoring() {
    // This could be expanded to initialize monitoring for all tenants
    // For now, it will be created on first webhook call
    console.log("Webhook monitoring initialized");
  }

  // Get webhook statistics for super admin dashboard
  async getWebhookStats(tenantId?: string) {
    const logs = await storage.getWebhookErrorLogs(tenantId, 1000);
    
    const stats = {
      totalErrors: logs.length,
      errorsByType: {} as Record<string, number>,
      errorsByTenant: {} as Record<string, number>,
      recentErrors: logs.slice(0, 20),
      activeFailures: 0,
      resolvedErrors: 0
    };

    logs.forEach(log => {
      // Count by type
      stats.errorsByType[log.webhookType] = (stats.errorsByType[log.webhookType] || 0) + 1;
      
      // Count by tenant
      stats.errorsByTenant[log.tenantId] = (stats.errorsByTenant[log.tenantId] || 0) + 1;
      
      // Count status
      if (log.status === 'failed' || log.status === 'retrying') {
        stats.activeFailures++;
      } else if (log.status === 'resolved') {
        stats.resolvedErrors++;
      }
    });

    return stats;
  }
}

// Global webhook monitor instance
export const webhookMonitor = new WebhookMonitor();