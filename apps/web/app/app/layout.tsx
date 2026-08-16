import { OrganizationSwitcher, SignOutButton, UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolvePublicProductName } from "@fielddoc/config";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authContext = await auth();

  if (!authContext.userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const productName = resolvePublicProductName(
    process.env.NEXT_PUBLIC_PRODUCT_NAME,
  );

  return (
    <main className="workspaceShell">
      <header className="workspaceHeader">
        <Link className="brandLink" href="/app">
          {productName}
        </Link>
        <nav className="workspaceNav" aria-label="Workspace">
          <Link href="/app/projects">Projects</Link>
          <Link href="/app/reports">Reports</Link>
          <Link href="/app/settings">Settings</Link>
        </nav>
        <div className="accountControls">
          <OrganizationSwitcher
            afterCreateOrganizationUrl="/app"
            afterSelectOrganizationUrl="/app"
            afterLeaveOrganizationUrl="/sign-in"
          />
          <UserButton />
        </div>
      </header>
      <section className="workspaceMeta" aria-label="Signed-in account">
        <span>{user?.primaryEmailAddress?.emailAddress ?? "Signed in"}</span>
        <span>
          {authContext.orgId
            ? "Organization active"
            : "No organization selected"}
        </span>
        <SignOutButton>
          <button className="textButton" type="button">
            Sign out
          </button>
        </SignOutButton>
      </section>
      {children}
    </main>
  );
}
