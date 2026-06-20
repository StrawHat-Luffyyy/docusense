import { db } from "../config/database.js";
import { logger } from "../utils/logger.js";

const FREE_TIER_QUERY_LIMIT = 100;

export const usageService = {
  /**
   * Checks if the tenant has query credits remaining.
   * If they do, it increments their count and returns true.
   * If they don't, it returns false.
   */

  async checkAndIncrementQuery(tenantId: string): Promise<boolean> {
    try {
      const usage = await db.tenantUsage.findUnique({
        where: { tenantId },
      });
      const currentCount = usage?.queryCount || 0;
      if (currentCount >= FREE_TIER_QUERY_LIMIT) {
        logger.warn({ tenantId }, "Tenant has exceeded query limit");
        return false;
      }
      await db.tenantUsage.upsert({
        where: { tenantId },
        update: { queryCount: { increment: 1 } },
        create: {
          tenantId,
          documentCount: 0,
          queryCount: 1,
        },
      });
      return true;
    } catch (error) {
      logger.error({ err: error, tenantId }, "Failed to check usage limits");
      return false;
    }
  },
  /**
   * Simply fetches the current usage stats
   */
  async getTenantUsage(tenantId: string) {
    return await db.tenantUsage.findUnique({
      where: { tenantId },
    });
  },
};
