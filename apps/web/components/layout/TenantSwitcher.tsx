import { OrganizationSwitcher } from "@clerk/nextjs";

export function TenantSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal={true}
      afterSelectOrganizationUrl="/dashboard"
      afterCreateOrganizationUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "flex w-full justify-center",
          organizationSwitcherTrigger:
            "w-full py-2 px-4 border border-zinc-200 dark:border-zinc-800 rounded-md",
        },
      }}
    />
  );
}
