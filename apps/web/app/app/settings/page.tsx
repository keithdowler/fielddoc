import { webServerEnvSchema } from "@fielddoc/config";
import { getWorkspaceData } from "../workspace-data";

export default async function SettingsPage() {
  const [workspace, env] = await Promise.all([
    getWorkspaceData(),
    Promise.resolve(webServerEnvSchema.parse(process.env)),
  ]);
  const readiness = [
    {
      label: "Tenant provisioned",
      ready: workspace.status === "ready",
      detail: workspace.message,
    },
    {
      label: "Private object storage",
      ready: Boolean(
        env.R2_ACCOUNT_ID &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_BUCKET_NAME,
      ),
      detail:
        "Required before originals and generated PDFs can leave device storage.",
    },
    {
      label: "RevenueCat webhook",
      ready: Boolean(env.REVENUECAT_WEBHOOK_SECRET),
      detail:
        "Required before subscription entitlements can be trusted server-side.",
    },
    {
      label: "Email delivery",
      ready: Boolean(env.RESEND_API_KEY),
      detail: "Required before sending report links or account email flows.",
    },
    {
      label: "Error reporting",
      ready: Boolean(env.SENTRY_DSN),
      detail: "Required before broad beta or App Store launch.",
    },
  ];

  return (
    <section className="workspaceSection">
      <p className="eyebrow">Settings</p>
      <h1>Organization readiness</h1>
      <p>
        Production readiness for the active workspace. These checks avoid
        pretending that storage, billing, or observability are live before the
        required environment is configured.
      </p>

      <dl className="detailList">
        <div>
          <dt>Organization</dt>
          <dd>{workspace.organizationName ?? "Not provisioned"}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{workspace.organizationRole ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Sync receipts</dt>
          <dd>
            {workspace.syncReceiptCount} total /{" "}
            {workspace.rejectedSyncReceiptCount} rejected
          </dd>
        </div>
      </dl>

      <div className="dataList">
        {readiness.map((item) => (
          <article className="dataRow" key={item.label}>
            <div>
              <h3>{item.label}</h3>
              <p className="compactText">{item.detail}</p>
            </div>
            <span className={item.ready ? "statusPill ready" : "statusPill"}>
              {item.ready ? "Ready" : "Not configured"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
