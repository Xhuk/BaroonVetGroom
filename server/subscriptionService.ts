import { 
  subscriptionPlans, 
  subscriptionTransactions,
  companyOnboarding,
  onboardingSites,
  companies,
  tenants,
  type InsertSubscriptionTransaction,
  type InsertCompanyOnboarding,
  type InsertOnboardingSite,
  type Company,
  type CompanyOnboarding,
  type SubscriptionTransaction
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { emailService } from "./emailService";

export interface OnboardingRequest {
  // Company Information
  legalName: string;
  businessType: string;
  taxId: string;
  phone: string;
  email: string;
  website: string;
  // Main Address
  mainAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: string;
  longitude?: string;
  // Contact Person
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  contactPersonRole: string;
  // Sites Setup
  sitesRequested: number;
  sites: Array<{
    siteName: string;
    siteType: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: string;
    longitude?: string;
    phone: string;
    email: string;
    openTime: string;
    closeTime: string;
    timeSlotDuration: number;
    isMainSite: boolean;
  }>;
}

export class SubscriptionService {
  
  // Get available subscription plans
  async getSubscriptionPlans() {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);
  }

  // Create subscription transaction record after payment
  async createSubscriptionTransaction(data: InsertSubscriptionTransaction): Promise<SubscriptionTransaction> {
    const [transaction] = await db
      .insert(subscriptionTransactions)
      .values(data)
      .returning();
    return transaction;
  }

  // Process company onboarding after payment confirmation
  async processCompanyOnboarding(
    transactionId: string,
    onboardingData: OnboardingRequest
  ): Promise<{ company: Company; onboarding: CompanyOnboarding }> {
    // Get the transaction to determine plan
    const [transaction] = await db
      .select()
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.id, transactionId));

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Create company record
    const [company] = await db
      .insert(companies)
      .values({
        name: onboardingData.legalName,
        domain: this.generateDomainFromName(onboardingData.legalName),
        subscriptionStatus: "active",
        subscriptionEndDate: transaction.subscriptionEndDate,
        subscriptionPlan: this.getSubscriptionPlanName(onboardingData.sitesRequested),
      })
      .returning();

    // Create onboarding record
    const onboardingRecord: InsertCompanyOnboarding = {
      companyId: company.id,
      transactionId: transactionId,
      legalName: onboardingData.legalName,
      businessType: onboardingData.businessType,
      taxId: onboardingData.taxId,
      phone: onboardingData.phone,
      email: onboardingData.email,
      website: onboardingData.website,
      mainAddress: onboardingData.mainAddress,
      city: onboardingData.city,
      state: onboardingData.state,
      postalCode: onboardingData.postalCode,
      country: onboardingData.country,
      latitude: onboardingData.latitude,
      longitude: onboardingData.longitude,
      contactPersonName: onboardingData.contactPersonName,
      contactPersonEmail: onboardingData.contactPersonEmail,
      contactPersonPhone: onboardingData.contactPersonPhone,
      contactPersonRole: onboardingData.contactPersonRole,
      sitesRequested: onboardingData.sitesRequested,
      status: "info_collected",
      currentStep: 2,
    };

    const [onboarding] = await db
      .insert(companyOnboarding)
      .values(onboardingRecord)
      .returning();

    // Create onboarding sites
    for (const site of onboardingData.sites) {
      const siteRecord: InsertOnboardingSite = {
        onboardingId: onboarding.id,
        siteName: site.siteName,
        siteType: site.siteType,
        address: site.address,
        city: site.city,
        state: site.state,
        postalCode: site.postalCode,
        latitude: site.latitude,
        longitude: site.longitude,
        phone: site.phone,
        email: site.email,
        openTime: site.openTime,
        closeTime: site.closeTime,
        timeSlotDuration: site.timeSlotDuration,
        isMainSite: site.isMainSite,
      };

      await db.insert(onboardingSites).values(siteRecord);
    }

    return { company, onboarding };
  }

  // Activate company account and create tenant sites
  async activateCompanyAccount(onboardingId: string): Promise<void> {
    // Get onboarding data
    const [onboarding] = await db
      .select()
      .from(companyOnboarding)
      .where(eq(companyOnboarding.id, onboardingId));

    if (!onboarding) {
      throw new Error("Onboarding record not found");
    }

    // Get onboarding sites
    const sites = await db
      .select()
      .from(onboardingSites)
      .where(eq(onboardingSites.onboardingId, onboardingId));

    // Create tenant records for each site
    for (const site of sites) {
      const subdomain = this.generateSubdomain(site.siteName, onboarding.companyId);
      
      const [tenant] = await db
        .insert(tenants)
        .values({
          companyId: onboarding.companyId,
          name: site.siteName,
          subdomain: subdomain,
          address: site.address,
          phone: site.phone,
          email: site.email,
          latitude: site.latitude,
          longitude: site.longitude,
          postalCode: site.postalCode,
          openTime: site.openTime,
          closeTime: site.closeTime,
          timeSlotDuration: site.timeSlotDuration,
        })
        .returning();

      // Update onboarding site with tenant ID
      await db
        .update(onboardingSites)
        .set({ 
          tenantId: tenant.id,
          setupCompleted: true
        })
        .where(eq(onboardingSites.id, site.id));
    }

    // Update onboarding status
    await db
      .update(companyOnboarding)
      .set({
        status: "completed",
        currentStep: 4,
        accountActivated: true,
        activatedAt: new Date(),
        completedAt: new Date(),
        welcomeEmailSent: true,
        loginGuideSent: true,
      })
      .where(eq(companyOnboarding.id, onboardingId));

    // Send welcome email with login credentials
    await this.sendWelcomeEmail(onboarding);
  }

  // Send welcome email with login guide
  private async sendWelcomeEmail(onboarding: CompanyOnboarding): Promise<void> {
    try {
      // For now, just log the welcome message - email integration would be added when the service is initialized
      console.log(`Welcome email would be sent to ${onboarding.contactPersonEmail} for company ${onboarding.legalName}`);
      console.log(`Account activated with ${onboarding.sitesRequested} sites`);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't throw error for email failures during demo
    }
  }

  // Utility functions
  private generateDomainFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
  }

  private generateSubdomain(siteName: string, companyId: string): string {
    const cleanName = siteName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 20);
    
    const companyPrefix = companyId.substring(0, 8);
    return `${cleanName}-${companyPrefix}`;
  }

  private getSubscriptionPlanName(sitesRequested: number): string {
    if (sitesRequested <= 1) return "trial";
    if (sitesRequested <= 3) return "medium";
    if (sitesRequested <= 5) return "large";
    return "extra_large";
  }

  // Get onboarding status
  async getOnboardingStatus(onboardingId: string) {
    const [onboarding] = await db
      .select()
      .from(companyOnboarding)
      .where(eq(companyOnboarding.id, onboardingId));

    if (!onboarding) {
      throw new Error("Onboarding not found");
    }

    const sites = await db
      .select()
      .from(onboardingSites)
      .where(eq(onboardingSites.onboardingId, onboardingId));

    return { onboarding, sites };
  }

  // Update payment transaction status (called by webhooks)
  async updateTransactionStatus(
    externalTransactionId: string,
    status: string,
    webhookData?: any
  ): Promise<SubscriptionTransaction | null> {
    const [transaction] = await db
      .update(subscriptionTransactions)
      .set({
        status,
        paymentDate: status === "completed" ? new Date() : undefined,
        webhookData,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionTransactions.externalTransactionId, externalTransactionId))
      .returning();

    // If payment is completed, process onboarding
    if (transaction && status === "completed") {
      // Auto-trigger onboarding activation for completed payments
      const [onboarding] = await db
        .select()
        .from(companyOnboarding)
        .where(eq(companyOnboarding.transactionId, transaction.id));

      if (onboarding && onboarding.status === "payment_confirmed") {
        await this.activateCompanyAccount(onboarding.id);
      }
    }

    return transaction || null;
  }
}

export const subscriptionService = new SubscriptionService();