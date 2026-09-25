import { useOrganization } from "@clerk/nextjs";

export function useCurrentMember() {
  const { membership, isLoaded } = useOrganization();
  if (!isLoaded) {
    return null;
  }
  const role = membership?.role;
  const roleLower = (role || "").toLowerCase();

  const isOwner =
    roleLower === "org:admin:owner" ||
    roleLower === "org:creator" ||
    roleLower === "org:owner" ||
    roleLower.includes("owner") ||
    roleLower.includes("creator");

  const isAdmin = isOwner || role === "org:admin";
  const isMember = role === "org:member";

  return {
    isLoaded,
    isOwner,
    isAdmin,
    isMember,
    role,
  };
}
