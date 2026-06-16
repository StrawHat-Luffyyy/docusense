import { OrganizationSwitcher } from "@clerk/nextjs";

export function TenantSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal={true}
      afterSelectOrganizationUrl="/dashboard"
      afterCreateOrganizationUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "w-full",
          organizationSwitcherTrigger: `
            w-full
            h-12
            rounded-xl
            border
            border-zinc-800
            bg-zinc-900
            px-3
            hover:bg-zinc-800
            transition
          `,
          organizationPreviewTextContainer: "text-sm",
          organizationPreviewMainIdentifier: "font-medium text-zinc-100",
          organizationPreviewSecondaryIdentifier: "text-zinc-500 text-xs",
        },
      }}
    />
  );
}
