import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role } from "../../generated/prisma/enums.js";

const mockGetUser = vi.fn();
const mockGetOrganization = vi.fn();

vi.mock("@clerk/express", () => ({
  clerkClient: {
    users: {
      getUser: (...args: any[]) => mockGetUser(...args),
    },
    organizations: {
      getOrganization: (...args: any[]) => mockGetOrganization(...args),
    },
  },
}));

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockOrgFindUnique = vi.fn();
const mockOrgCreate = vi.fn();
const mockOrgUpdate = vi.fn();
const mockMemberFindFirst = vi.fn();
const mockMemberUpsert = vi.fn();

vi.mock("../../config/database.js", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
      update: mockUserUpdate,
    },
    organization: {
      findUnique: mockOrgFindUnique,
      create: mockOrgCreate,
      update: mockOrgUpdate,
    },
    organizationMember: {
      findFirst: mockMemberFindFirst,
      upsert: mockMemberUpsert,
    },
  },
  withRetry: async (fn: () => Promise<any>) => fn(),
}));

const { tenantSyncService, mapClerkRoleToRole } =
  await import("../../services/tenant-sync.service.js");

describe("tenantSyncService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapClerkRoleToRole", () => {
    it("maps owner/creator roles to Role.OWNER", () => {
      expect(mapClerkRoleToRole("org:admin:owner")).toBe(Role.OWNER);
      expect(mapClerkRoleToRole("creator")).toBe(Role.OWNER);
      expect(mapClerkRoleToRole("OWNER")).toBe(Role.OWNER);
    });

    it("maps admin roles to Role.ADMIN", () => {
      expect(mapClerkRoleToRole("org:admin")).toBe(Role.ADMIN);
      expect(mapClerkRoleToRole("admin")).toBe(Role.ADMIN);
    });

    it("defaults to Role.MEMBER for member or unknown/null roles", () => {
      expect(mapClerkRoleToRole("org:member")).toBe(Role.MEMBER);
      expect(mapClerkRoleToRole(null)).toBe(Role.MEMBER);
      expect(mapClerkRoleToRole(undefined)).toBe(Role.MEMBER);
      expect(mapClerkRoleToRole("guest")).toBe(Role.MEMBER);
    });
  });

  describe("syncUser", () => {
    it("returns existing user without calling Clerk if found by id", async () => {
      const existingUser = { id: "user_1", email: "existing@test.com" };
      mockUserFindUnique.mockResolvedValueOnce(existingUser);

      const result = await tenantSyncService.syncUser("user_1");

      expect(result).toEqual(existingUser);
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it("updates existing user if updateIfExists is true and profile provided", async () => {
      const existingUser = {
        id: "user_1",
        email: "old@test.com",
        firstName: "Old",
      };
      mockUserFindUnique.mockResolvedValueOnce(existingUser);
      mockUserUpdate.mockResolvedValueOnce({
        id: "user_1",
        email: "new@test.com",
        firstName: "New",
      });

      const result = await tenantSyncService.syncUser("user_1", {
        profile: { email: "new@test.com", firstName: "New" },
        updateIfExists: true,
      });

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: expect.objectContaining({
          email: "new@test.com",
          firstName: "New",
        }),
      });
      expect(result.firstName).toBe("New");
    });

    it("creates new user fetching profile from Clerk if not in DB", async () => {
      mockUserFindUnique.mockResolvedValueOnce(null); // not found by id
      mockGetUser.mockResolvedValueOnce({
        emailAddresses: [{ emailAddress: "clerk@test.com" }],
        firstName: "Clerk",
        lastName: "User",
        imageUrl: "http://img.png",
      });
      mockUserFindUnique.mockResolvedValueOnce(null); // not found by email
      const createdUser = { id: "user_new", email: "clerk@test.com" };
      mockUserCreate.mockResolvedValueOnce(createdUser);

      const result = await tenantSyncService.syncUser("user_new");

      expect(mockGetUser).toHaveBeenCalledWith("user_new");
      expect(mockUserCreate).toHaveBeenCalledWith({
        data: {
          id: "user_new",
          email: "clerk@test.com",
          firstName: "Clerk",
          lastName: "User",
          imageUrl: "http://img.png",
        },
      });
      expect(result).toEqual(createdUser);
    });
  });

  describe("syncOrganization", () => {
    it("returns existing organization without calling Clerk if found by clerkOrgId", async () => {
      const existingOrg = { id: "internal_org_1", clerkOrgId: "org_clerk_1" };
      mockOrgFindUnique.mockResolvedValueOnce(existingOrg);

      const result = await tenantSyncService.syncOrganization("org_clerk_1");

      expect(result).toEqual(existingOrg);
      expect(mockGetOrganization).not.toHaveBeenCalled();
      expect(mockOrgCreate).not.toHaveBeenCalled();
    });

    it("provisions organization from Clerk if not found in DB", async () => {
      mockOrgFindUnique.mockResolvedValueOnce(null); // by clerkOrgId
      mockGetOrganization.mockResolvedValueOnce({
        name: "Acme Corp",
        slug: "acme-corp",
        imageUrl: "http://org.png",
      });
      mockOrgFindUnique.mockResolvedValueOnce(null); // by slug
      const newOrg = { id: "internal_org_2", clerkOrgId: "org_clerk_2" };
      mockOrgCreate.mockResolvedValueOnce(newOrg);

      const result = await tenantSyncService.syncOrganization("org_clerk_2");

      expect(mockGetOrganization).toHaveBeenCalledWith({
        organizationId: "org_clerk_2",
      });
      expect(mockOrgCreate).toHaveBeenCalledWith({
        data: {
          clerkOrgId: "org_clerk_2",
          name: "Acme Corp",
          slug: "acme-corp",
          imageUrl: "http://org.png",
        },
      });
      expect(result).toEqual(newOrg);
    });
  });

  describe("syncTenantContext", () => {
    it("provisions user, organization, and membership seamlessly", async () => {
      mockUserFindUnique.mockResolvedValueOnce({ id: "user_100" });
      mockOrgFindUnique.mockResolvedValueOnce({
        id: "org_100",
        clerkOrgId: "clerk_org_100",
      });
      mockMemberFindFirst.mockResolvedValueOnce(null);
      mockMemberUpsert.mockResolvedValueOnce({ role: Role.ADMIN });

      const result = await tenantSyncService.syncTenantContext({
        userId: "user_100",
        orgId: "clerk_org_100",
        orgRole: "org:admin",
      });

      expect(result.user).toEqual({ id: "user_100" });
      expect(result.organization).toEqual({
        id: "org_100",
        clerkOrgId: "clerk_org_100",
      });
      expect(result.membership).toEqual({ role: Role.ADMIN });
    });
  });
});
