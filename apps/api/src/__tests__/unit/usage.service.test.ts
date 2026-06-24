import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();

vi.mock("../../config/database.js", () => ({
  db: {
    tenantUsage: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
  },
}));

const { usageService } = await import("../../services/usage.service.js");

const TENANT_ID = "tenant-abc-123";

describe("usageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkAndIncrementQuery", () => {
    it("should return true and increment when under limit", async () => {
      mockFindUnique.mockResolvedValue({
        tenantId: TENANT_ID,
        queryCount: 50,
        documentCount: 5,
      });
      mockUpsert.mockResolvedValue({});

      const result = await usageService.checkAndIncrementQuery(TENANT_ID);

      expect(result).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          update: { queryCount: { increment: 1 } },
        }),
      );
    });

    it("should return false when at the limit", async () => {
      mockFindUnique.mockResolvedValue({
        tenantId: TENANT_ID,
        queryCount: 100,
        documentCount: 5,
      });

      const result = await usageService.checkAndIncrementQuery(TENANT_ID);

      expect(result).toBe(false);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("should return false when over the limit", async () => {
      mockFindUnique.mockResolvedValue({
        tenantId: TENANT_ID,
        queryCount: 150,
        documentCount: 5,
      });

      const result = await usageService.checkAndIncrementQuery(TENANT_ID);

      expect(result).toBe(false);
    });

    it("should create usage record for new tenants", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockUpsert.mockResolvedValue({});

      const result = await usageService.checkAndIncrementQuery(TENANT_ID);

      expect(result).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tenantId: TENANT_ID,
            queryCount: 1,
          }),
        }),
      );
    });

    it("should return false on database error", async () => {
      mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

      const result = await usageService.checkAndIncrementQuery(TENANT_ID);

      expect(result).toBe(false);
    });
  });

  describe("getTenantUsage", () => {
    it("should return usage data for existing tenant", async () => {
      const usage = {
        tenantId: TENANT_ID,
        queryCount: 42,
        documentCount: 7,
      };
      mockFindUnique.mockResolvedValue(usage);

      const result = await usageService.getTenantUsage(TENANT_ID);

      expect(result).toEqual(usage);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      });
    });

    it("should return null for non-existent tenant", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await usageService.getTenantUsage("non-existent");

      expect(result).toBeNull();
    });
  });
});
