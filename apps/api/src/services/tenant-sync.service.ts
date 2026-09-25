import { clerkClient } from "@clerk/express";
import { db, withRetry } from "../config/database.js";
import {
  Role,
  User,
  Organization,
  OrganizationMember,
} from "../generated/prisma/client.js";
import { logger } from "../utils/logger.js";

/**
 * Maps Clerk organization role strings to internal Prisma Role enum.
 */
export function mapClerkRoleToRole(clerkRole?: string | null): Role {
  if (!clerkRole) return Role.MEMBER;
  const roleUpper = clerkRole.toUpperCase();
  if (roleUpper.includes("OWNER") || roleUpper.includes("CREATOR")) {
    return Role.OWNER;
  }
  if (roleUpper.includes("ADMIN")) {
    return Role.ADMIN;
  }
  return Role.MEMBER;
}

export interface ClerkUserProfile {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface SyncTenantContextParams {
  userId: string;
  orgId?: string | null;
  orgRole?: string | null;
  orgSlug?: string | null;
  updateExistingUser?: boolean;
}

export interface SyncTenantContextResult {
  user: User;
  organization: Organization | null;
  membership: OrganizationMember | null;
}

/**
 * Synchronizes a user from Clerk into the local database (JIT provisioning).
 */
export async function syncUser(
  userId: string,
  options?: {
    profile?: ClerkUserProfile;
    updateIfExists?: boolean;
  },
): Promise<User> {
  let resolvedUser = await db.user.findUnique({
    where: { id: userId },
  });

  if (resolvedUser) {
    if (options?.updateIfExists && options.profile) {
      const { firstName, lastName, imageUrl, email } = options.profile;
      const emailToUse = email || resolvedUser.email;
      try {
        resolvedUser = await db.user.update({
          where: { id: userId },
          data: {
            email: emailToUse,
            firstName:
              firstName !== undefined ? firstName : resolvedUser.firstName,
            lastName: lastName !== undefined ? lastName : resolvedUser.lastName,
            imageUrl: imageUrl !== undefined ? imageUrl : resolvedUser.imageUrl,
          },
        });
      } catch (_updateErr) {
        resolvedUser = await db.user.update({
          where: { id: userId },
          data: {
            firstName:
              firstName !== undefined ? firstName : resolvedUser.firstName,
            lastName: lastName !== undefined ? lastName : resolvedUser.lastName,
            imageUrl: imageUrl !== undefined ? imageUrl : resolvedUser.imageUrl,
          },
        });
      }
    }
    return resolvedUser;
  }

  // User does not exist, fetch from Clerk if profile not provided
  let email = options?.profile?.email;
  let firstName = options?.profile?.firstName ?? null;
  let lastName = options?.profile?.lastName ?? null;
  let imageUrl = options?.profile?.imageUrl ?? null;

  if (!options?.profile) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress;
      firstName = clerkUser.firstName;
      lastName = clerkUser.lastName;
      imageUrl = clerkUser.imageUrl;
    } catch (err) {
      logger.warn(
        { err, userId },
        "Failed to fetch user from Clerk API, using fallback",
      );
    }
  }

  const emailToUse = email || `${userId}@user.clerk`;

  // Check if user exists by email if not by ID
  const existingUserByEmail = await db.user.findUnique({
    where: { email: emailToUse },
  });

  if (existingUserByEmail) {
    if (options?.updateIfExists) {
      return await db.user.update({
        where: { id: existingUserByEmail.id },
        data: {
          firstName: firstName || existingUserByEmail.firstName,
          lastName: lastName || existingUserByEmail.lastName,
          imageUrl: imageUrl || existingUserByEmail.imageUrl,
        },
      });
    }
    return existingUserByEmail;
  }

  try {
    return await db.user.create({
      data: {
        id: userId,
        email: emailToUse,
        firstName,
        lastName,
        imageUrl,
      },
    });
  } catch (_createErr) {
    // Fallback with timestamped unique email if collision occurs
    const fallbackEmail = `${userId}-${Date.now()}@user.clerk`;
    return await db.user.create({
      data: {
        id: userId,
        email: fallbackEmail,
        firstName,
        lastName,
        imageUrl,
      },
    });
  }
}

/**
 * Synchronizes an organization from Clerk into the local database (JIT provisioning).
 */
export async function syncOrganization(
  orgId: string,
  orgSlug?: string | null,
): Promise<Organization> {
  const resolvedOrg = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (resolvedOrg) {
    return resolvedOrg;
  }

  let name = orgSlug || `Org ${orgId.slice(0, 8)}`;
  let slug = orgSlug || orgId;
  let imageUrl: string | null = null;

  try {
    const clerkOrg = await clerkClient.organizations.getOrganization({
      organizationId: orgId,
    });
    if (clerkOrg) {
      name = clerkOrg.name || name;
      slug = clerkOrg.slug || slug;
      imageUrl = clerkOrg.imageUrl || null;
    }
  } catch (err) {
    logger.warn(
      { err, orgId },
      "Failed to fetch org from Clerk API, using fallback",
    );
  }

  // Check if organization exists by slug
  const existingOrgBySlug = await db.organization.findUnique({
    where: { slug },
  });

  if (existingOrgBySlug) {
    return await db.organization.update({
      where: { id: existingOrgBySlug.id },
      data: { clerkOrgId: orgId, name, imageUrl },
    });
  }

  try {
    return await db.organization.create({
      data: {
        clerkOrgId: orgId,
        name,
        slug,
        imageUrl,
      },
    });
  } catch (_createOrgErr) {
    // Fallback with unique slug if slug collision occurs
    const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
    return await db.organization.create({
      data: {
        clerkOrgId: orgId,
        name,
        slug: fallbackSlug,
        imageUrl,
      },
    });
  }
}

/**
 * Synchronizes organization membership with role mapping.
 */
export async function syncMembership(
  userId: string,
  organizationId: string,
  orgRole?: string | null,
  updateIfExists = false,
): Promise<OrganizationMember> {
  const mappedRole = mapClerkRoleToRole(orgRole);

  if (!updateIfExists) {
    const existing = await db.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
      },
    });
    if (existing) {
      return existing;
    }
  }

  return await db.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    update: { role: mappedRole },
    create: {
      userId,
      organizationId,
      role: mappedRole,
    },
  });
}

/**
 * High-level helper to synchronize user, organization, and membership in one call.
 * Wrapped in withRetry for Render DB hibernation resilience.
 */
export async function syncTenantContext(
  params: SyncTenantContextParams,
): Promise<SyncTenantContextResult> {
  return await withRetry(async () => {
    // 1. Sync User
    const user = await syncUser(params.userId, {
      updateIfExists: params.updateExistingUser,
    });

    // 2. Sync Org & Membership if orgId is provided
    let organization: Organization | null = null;
    let membership: OrganizationMember | null = null;

    if (params.orgId) {
      organization = await syncOrganization(params.orgId, params.orgSlug);
      membership = await syncMembership(
        user.id,
        organization.id,
        params.orgRole,
        params.updateExistingUser,
      );
    }

    return { user, organization, membership };
  }, "tenantSyncService.syncTenantContext");
}

export const tenantSyncService = {
  mapClerkRoleToRole,
  syncUser,
  syncOrganization,
  syncMembership,
  syncTenantContext,
};
