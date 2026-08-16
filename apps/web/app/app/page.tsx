import { auth } from "@clerk/nextjs/server";
import { ProvisionAccountButton } from "./provision-account-button";

export default async function AppPage() {
  const authContext = await auth();

  return (
    <section className="workspacePanel">
      <p className="eyebrow">Cloud workspace</p>
      <h1>Proof Packet workspace</h1>
      <p>
        Your web session is authenticated. Connect the active organization to
        Neon so mobile sync receipts can be accepted for this tenant.
      </p>
      <dl className="detailList">
        <div>
          <dt>User</dt>
          <dd>{authContext.userId}</dd>
        </div>
        <div>
          <dt>Organization</dt>
          <dd>{authContext.orgId ?? "Select or create an organization"}</dd>
        </div>
      </dl>
      <ProvisionAccountButton />
    </section>
  );
}
