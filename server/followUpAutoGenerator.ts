/**
 * Follow-up Tasks Auto-Generator Service
 * Automatically generates follow-up tasks for incomplete medical and grooming records
 * Runs every 15 minutes to check for missing information
 */

import { storage } from './storage';

class FollowUpAutoGenerator {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private currentInterval = 15; // Default 15 minutes

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Follow-up auto-generator is already running');
      return;
    }

    console.log('🔄 Starting follow-up auto-generator service...');
    
    // Get initial configuration
    await this.updateConfiguration();
    
    // Run immediately on start
    this.runAutoGeneration();

    // Set up interval with configurable time
    this.scheduleNextRun();

    this.isRunning = true;
    console.log(`📅 Follow-up auto-generator scheduled - running every ${this.currentInterval} minutes`);
  }

  private scheduleNextRun(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      // Update configuration before each run
      await this.updateConfiguration();
      await this.runAutoGeneration();
      
      // Reschedule if interval changed
      if (this.intervalId) {
        const currentIntervalMs = this.currentInterval * 60 * 1000;
        // @ts-ignore - accessing internal timer property
        if (this.intervalId._idleTimeout !== currentIntervalMs) {
          console.log(`🔄 Rescheduling follow-up auto-generator with new interval: ${this.currentInterval} minutes`);
          this.scheduleNextRun();
        }
      }
    }, this.currentInterval * 60 * 1000);
  }

  private async updateConfiguration(): Promise<void> {
    try {
      // Get configuration from any company (use first available company)
      const configs = await storage.getFollowUpConfigurations();
      if (configs.length > 0) {
        const newInterval = configs[0].followUpAutoGenerationInterval || 15;
        if (newInterval !== this.currentInterval) {
          console.log(`📝 Updating follow-up auto-generation interval from ${this.currentInterval} to ${newInterval} minutes`);
          this.currentInterval = newInterval;
        }
      }
    } catch (error) {
      console.error('❌ Error updating follow-up configuration:', error);
      // Keep current interval on error
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Follow-up auto-generator service stopped');
  }

  private async runAutoGeneration(): Promise<void> {
    try {
      console.log(`🔍 Running follow-up auto-generation check (interval: ${this.currentInterval} min)...`);
      
      // Get all active tenants
      const tenants = await this.getActiveTenants();
      
      let totalGenerated = 0;

      for (const tenantId of tenants) {
        try {
          // Generate medical follow-ups
          const medicalTasks = await storage.autoGenerateFollowUpTasks(tenantId, 'medical');
          
          // Generate grooming follow-ups
          const groomingTasks = await storage.autoGenerateFollowUpTasks(tenantId, 'grooming');
          
          const generated = medicalTasks.length + groomingTasks.length;
          totalGenerated += generated;

          if (generated > 0) {
            console.log(`✅ Generated ${generated} follow-up tasks for tenant ${tenantId} (${medicalTasks.length} medical, ${groomingTasks.length} grooming)`);
          }
        } catch (error) {
          console.error(`❌ Error generating follow-ups for tenant ${tenantId}:`, error);
        }
      }

      if (totalGenerated > 0) {
        console.log(`📋 Follow-up auto-generation completed. Total tasks generated: ${totalGenerated}`);
      } else {
        console.log('✨ Follow-up auto-generation completed. No new tasks needed.');
      }
    } catch (error) {
      console.error('❌ Error in follow-up auto-generation process:', error);
    }
  }

  private async getActiveTenants(): Promise<string[]> {
    try {
      // Return hardcoded tenants for now - you may want to implement a dynamic tenant list
      return ['vetgroom1', 'demo-vet-1', 'clinic-abc', 'vet-plus', 'pet-care-center'];
    } catch (error) {
      console.error('Error fetching active tenants:', error);
      return ['vetgroom1']; // Fallback to default tenant
    }
  }

  getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? new Date(Date.now() + 15 * 60 * 1000) : undefined
    };
  }
}

export const followUpAutoGenerator = new FollowUpAutoGenerator();