import { eq, and, lt } from "drizzle-orm";
import { db } from "./db";
import { tempLinks } from "../shared/schema";
import { generateTempToken, defaultExpirationHours, type TempLinkType } from "../shared/tempLinks";

export class TempLinkService {
  // Create a temporary link
  static async createTempLink({
    type,
    resourceId,
    tenantId,
    createdBy,
    expirationHours,
    maxAccess = null,
    metadata = null
  }: {
    type: TempLinkType;
    resourceId: string;
    tenantId: string;
    createdBy: string;
    expirationHours?: number;
    maxAccess?: number | null;
    metadata?: any;
  }) {
    const token = generateTempToken();
    const hours = expirationHours || defaultExpirationHours[type];
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const [tempLink] = await db.insert(tempLinks).values({
      token,
      type,
      resourceId,
      tenantId,
      expiresAt,
      maxAccess,
      createdBy,
      metadata,
    }).returning();

    return tempLink;
  }

  // Validate and access a temporary link
  static async validateAndAccess(token: string) {
    const tempLink = await db.query.tempLinks.findFirst({
      where: and(
        eq(tempLinks.token, token),
        eq(tempLinks.isActive, true)
      ),
    });

    if (!tempLink) {
      return { valid: false, error: "Link not found or inactive" };
    }

    // Check expiration
    if (tempLink.expiresAt < new Date()) {
      // Deactivate expired link
      await db.update(tempLinks)
        .set({ isActive: false })
        .where(eq(tempLinks.id, tempLink.id));
      
      return { valid: false, error: "Link has expired" };
    }

    // Check access limits
    if (tempLink.maxAccess && tempLink.accessCount >= tempLink.maxAccess) {
      await db.update(tempLinks)
        .set({ isActive: false })
        .where(eq(tempLinks.id, tempLink.id));
      
      return { valid: false, error: "Link access limit exceeded" };
    }

    // Increment access count
    await db.update(tempLinks)
      .set({ accessCount: tempLink.accessCount + 1 })
      .where(eq(tempLinks.id, tempLink.id));

    return { valid: true, link: tempLink };
  }

  // Get all links for a resource
  static async getLinksForResource(resourceId: string, tenantId: string) {
    return await db.query.tempLinks.findMany({
      where: and(
        eq(tempLinks.resourceId, resourceId),
        eq(tempLinks.tenantId, tenantId),
        eq(tempLinks.isActive, true)
      ),
      orderBy: (tempLinks, { desc }) => [desc(tempLinks.createdAt)],
    });
  }

  // Cleanup expired links (should be run periodically)
  static async cleanupExpiredLinks() {
    const now = new Date();
    const result = await db.update(tempLinks)
      .set({ isActive: false })
      .where(and(
        lt(tempLinks.expiresAt, now),
        eq(tempLinks.isActive, true)
      ))
      .returning({ id: tempLinks.id });

    return result.length;
  }

  // Revoke a specific link
  static async revokeLink(token: string, tenantId: string) {
    const result = await db.update(tempLinks)
      .set({ isActive: false })
      .where(and(
        eq(tempLinks.token, token),
        eq(tempLinks.tenantId, tenantId)
      ))
      .returning();

    return result.length > 0;
  }
}