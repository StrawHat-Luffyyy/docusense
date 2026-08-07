import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuth = vi.fn();
const mockGetUser = vi.fn();
const mockGetOrganization = vi.fn();

vi.mock("@clerk/express", () => ({
  getAuth: (...args: any[]) => mockGetAuth(...args),
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
const mockUserUpsert = vi.fn();
const mockOrgFindUnique = vi.fn();
const mockOrgUpsert = vi.fn();
const mockMemberFindFirst = vi.fn();
const mockMemberUpsert = vi.fn();

vi.mock("../../config/database.js", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      upsert: mockUserUpsert,
    },
    organization: {
      findUnique: mockOrgFindUnique,
      upsert: mockOrgUpsert,
    },
    organizationMember: {
      findFirst: mockMemberFindFirst,
      upsert: mockMemberUpsert,
    },
  },
}));

const { injectTenantContext } =
  await import("../../middleware/auth.middleware.js");

describe("injectTenantContext middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {};
    res = {};
    next = vi.fn();
  });

  it("should return 401 if no userId in auth", async () => {
    mockGetAuth.mockReturnValue({});
    await injectTenantContext(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "Unauthorized: Please sign in",
      }),
    );
  });

  it("should return 403 if no orgId in auth", async () => {
    mockGetAuth.mockReturnValue({ userId: "user_123" });
    await injectTenantContext(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: "Forbidden: No active organization selected",
      }),
    );
  });

  it("should auto-provision missing user, org, and membership seamlessly", async () => {
    mockGetAuth.mockReturnValue({
      userId: "user_123",
      orgId: "org_clerk_123",
      orgRole: "org:admin",
      orgSlug: "my-team",
    });

    // User missing initially
    mockUserFindUnique.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "John",
      lastName: "Doe",
      imageUrl: "http://example.com/photo.png",
    });
    mockUserUpsert.mockResolvedValue({
      id: "user_123",
      email: "user@example.com",
    });

    // Org missing initially
    mockOrgFindUnique.mockResolvedValue(null);
    mockGetOrganization.mockResolvedValue({
      name: "My Team Org",
      slug: "my-team",
      imageUrl: null,
    });
    mockOrgUpsert.mockResolvedValue({
      id: "internal-org-uuid-123",
      clerkOrgId: "org_clerk_123",
    });

    // Member missing initially
    mockMemberFindFirst.mockResolvedValue(null);
    mockMemberUpsert.mockResolvedValue({ role: "ADMIN" });

    await injectTenantContext(req, res, next);

    expect(mockUserUpsert).toHaveBeenCalled();
    expect(mockOrgUpsert).toHaveBeenCalled();
    expect(mockMemberUpsert).toHaveBeenCalled();
    expect(req.tenantId).toBe("internal-org-uuid-123");
    expect(req.tenantRole).toBe("ADMIN");
    expect(next).toHaveBeenCalledWith();
  });

  it("should reuse existing user, org, and membership without auto-provisioning if they already exist", async () => {
    mockGetAuth.mockReturnValue({
      userId: "user_123",
      orgId: "org_clerk_123",
    });

    mockUserFindUnique.mockResolvedValue({ id: "user_123" });
    mockOrgFindUnique.mockResolvedValue({ id: "internal-org-uuid-123" });
    mockMemberFindFirst.mockResolvedValue({ role: "OWNER" });

    await injectTenantContext(req, res, next);

    expect(mockUserUpsert).not.toHaveBeenCalled();
    expect(mockOrgUpsert).not.toHaveBeenCalled();
    expect(mockMemberUpsert).not.toHaveBeenCalled();
    expect(req.tenantId).toBe("internal-org-uuid-123");
    expect(req.tenantRole).toBe("OWNER");
    expect(next).toHaveBeenCalledWith();
  });
});
