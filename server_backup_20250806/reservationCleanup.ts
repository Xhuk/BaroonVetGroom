import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Reservation cleanup service that runs every 15 minutes
 * to remove expired slot reservations
 */
class ReservationCleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

  start() {
    console.log("Starting reservation cleanup service...");
    
    // Run initial cleanup
    this.cleanup();
    
    // Schedule recurring cleanup every 15 minutes
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
    
    console.log("Reservation cleanup service started - running every 15 minutes");
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Reservation cleanup service stopped");
    }
  }

  private async cleanup() {
    try {
      const result = await db.execute(sql`SELECT cleanup_expired_reservations()`);
      const deletedCount = result.rows[0] as any;
      const count = deletedCount?.cleanup_expired_reservations || 0;
      
      if (count > 0) {
        console.log(`Reservation cleanup: Removed ${count} expired reservations`);
      }
    } catch (error) {
      console.error("Error during reservation cleanup:", error);
    }
  }

  // Manual cleanup trigger for testing or immediate cleanup needs
  async manualCleanup(): Promise<number> {
    try {
      const result = await db.execute(sql`SELECT cleanup_expired_reservations()`);
      const deletedCount = result.rows[0] as any;
      return deletedCount?.cleanup_expired_reservations || 0;
    } catch (error) {
      console.error("Error during manual reservation cleanup:", error);
      return 0;
    }
  }
}

export const reservationCleanup = new ReservationCleanupService();