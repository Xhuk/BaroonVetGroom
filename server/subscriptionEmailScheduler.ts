import { storage } from './storage';
import { emailService } from './emailService';

// Subscription email scheduler - runs daily to check for expiring subscriptions
class SubscriptionEmailScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Start the scheduler - runs every day at 9 AM
  start() {
    if (this.isRunning) {
      console.log('Subscription email scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('🔔 Starting subscription email scheduler...');

    // Run immediately on startup
    this.checkAndSendReminders();

    // Then run every day at 9 AM
    this.scheduleDaily();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('📧 Subscription email scheduler stopped');
  }

  private scheduleDaily() {
    // Calculate time until next 9 AM
    const now = new Date();
    const next9AM = new Date();
    next9AM.setHours(9, 0, 0, 0);
    
    // If it's already past 9 AM today, schedule for tomorrow
    if (now.getTime() > next9AM.getTime()) {
      next9AM.setDate(next9AM.getDate() + 1);
    }

    const timeUntilNext9AM = next9AM.getTime() - now.getTime();

    // Set initial timeout for next 9 AM
    setTimeout(() => {
      this.checkAndSendReminders();
      
      // Then run every 24 hours
      this.intervalId = setInterval(() => {
        this.checkAndSendReminders();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilNext9AM);

    console.log(`📅 Next subscription check scheduled for: ${next9AM.toLocaleString()}`);
  }

  async checkAndSendReminders() {
    try {
      console.log('🔍 Checking for expiring subscriptions...');

      // Get email configuration
      const emailConfig = await storage.getEmailConfig();
      if (!emailConfig || !emailConfig.isActive) {
        console.log('❌ Email configuration not found or inactive - skipping reminder check');
        return;
      }

      // Initialize email service
      await emailService.initialize(emailConfig);

      // Check for subscriptions expiring in 30, 14, 7, 3, and 1 days
      const reminderDays = [30, 14, 7, 3, 1];
      let totalEmailsSent = 0;

      for (const days of reminderDays) {
        const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const expiringSubscriptions = await storage.getExpiringSubscriptions(cutoffDate);

        for (const subscription of expiringSubscriptions) {
          const { companyEmail, companyName, planDisplayName, currentPeriodEnd } = subscription;
          
          if (!companyEmail) {
            console.log(`⚠️ No email found for company: ${companyName}`);
            continue;
          }

          // Check if we already sent a reminder for this period
          const recentLogs = await storage.getEmailLogs(100);
          const alreadySent = recentLogs.some(log => 
            log.recipientEmail === companyEmail &&
            log.emailType === 'subscription_reminder' &&
            log.status === 'sent' &&
            log.createdAt && 
            new Date(log.createdAt).getTime() > Date.now() - (days - 1) * 24 * 60 * 60 * 1000
          );

          if (alreadySent) {
            console.log(`✅ Reminder already sent to ${companyEmail} for ${days} days notice`);
            continue;
          }

          // Send reminder email
          const success = await emailService.sendSubscriptionExpiryReminder(
            companyEmail,
            companyName,
            days,
            planDisplayName,
            currentPeriodEnd.toISOString()
          );

          // Log the email attempt
          await storage.createEmailLog({
            emailType: 'subscription_reminder',
            recipientEmail: companyEmail,
            companyId: subscription.companyId,
            subject: `Recordatorio: Tu suscripción VetGroom expira en ${days} días`,
            status: success ? 'sent' : 'failed',
            errorMessage: success ? null : 'Failed to send reminder email',
            sentAt: success ? new Date() : null
          });

          if (success) {
            totalEmailsSent++;
            console.log(`📧 Sent ${days}-day reminder to ${companyEmail} (${companyName})`);
          } else {
            console.error(`❌ Failed to send ${days}-day reminder to ${companyEmail}`);
          }

          // Add small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Check for expired subscriptions (send final notice)
      const today = new Date();
      const expiredSubscriptions = await storage.getExpiringSubscriptions(today);

      for (const subscription of expiredSubscriptions) {
        const { companyEmail, companyName, planDisplayName, currentPeriodEnd } = subscription;
        
        if (!companyEmail) continue;

        // Check if we already sent an expired notice
        const recentLogs = await storage.getEmailLogs(50);
        const alreadySent = recentLogs.some(log => 
          log.recipientEmail === companyEmail &&
          log.emailType === 'subscription_expired' &&
          log.status === 'sent' &&
          log.createdAt && 
          new Date(log.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
        );

        if (alreadySent) {
          console.log(`✅ Expiration notice already sent to ${companyEmail}`);
          continue;
        }

        // Send expired notice
        const success = await emailService.sendSubscriptionExpiredNotification(
          companyEmail,
          companyName,
          planDisplayName,
          currentPeriodEnd.toISOString()
        );

        // Log the email attempt
        await storage.createEmailLog({
          emailType: 'subscription_expired',
          recipientEmail: companyEmail,
          companyId: subscription.companyId,
          subject: '⚠️ Tu suscripción VetGroom ha expirado - Acción requerida',
          status: success ? 'sent' : 'failed',
          errorMessage: success ? null : 'Failed to send expiration notice',
          sentAt: success ? new Date() : null
        });

        if (success) {
          totalEmailsSent++;
          console.log(`🚨 Sent expiration notice to ${companyEmail} (${companyName})`);
        } else {
          console.error(`❌ Failed to send expiration notice to ${companyEmail}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`✅ Subscription reminder check completed. Emails sent: ${totalEmailsSent}`);

    } catch (error) {
      console.error('❌ Error in subscription email scheduler:', error);
    }
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('🔧 Manual subscription reminder check triggered');
    await this.checkAndSendReminders();
  }
}

// Export singleton instance
export const subscriptionEmailScheduler = new SubscriptionEmailScheduler();