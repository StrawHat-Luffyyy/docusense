import { useOrganization } from "@clerk/nextjs";

export function useCurrentMember() {
  const { membership, isLoaded } = useOrganization();
  if (!isLoaded) {
    return null;
  }
  const role = membership?.role;

  const isOwner = role === "org:admin" && membership?.role === "org:admin";
  const isAdmin = role === "org:admin";
  const isMember = role === "org:member";

  return {
    isLoaded,
    isOwner,
    isAdmin,
    isMember,
    role,
  };
}
