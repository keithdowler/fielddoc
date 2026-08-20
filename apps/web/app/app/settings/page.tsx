import {
  getWebProductionReadiness,
  publicWebEnvSchema,
  webServerEnvSchema,
} from "@fielddoc/config";
import { internalReadinessNotice } from "../artifact-safety";
import { getWorkspaceData } from "../workspace-data";

export default async function SettingsPage() {
  const [workspace, env, publicEnv] = await Promise.all([
    getWorkspaceData(),
    Promise.resolve(webServerEnvSchema.parse(process.env)),
    Promise.resolve(publicWebEnvSchema.parse(process.env)),
  ]);
  const readiness = getWebProductionReadiness({ ...env, ...publicEnv });

  return (
    <section className="workspaceSection internalAdminPage">
      <aside className="printOnly printSafetyPage" aria-label="Print warning">
        <p className="eyebrow">Internal page</p>
        <h1>{internalReadinessNotice.printTitle}</h1>
        <p>{internalReadinessNotice.printDetail}</p>
      </aside>

      <p className="eyebrow">Settings</p>
      <h1>Organization readiness</h1>
      <p>
        Production readiness for the active workspace. These checks keep setup
        honest: storage, billing, email, and observability must be configured
        before the app claims they are ready.
      </p>

      <aside className="internalNotice noPrint">
        <div>
          <h2>{internalReadinessNotice.title}</h2>
          <p className="compactText">{internalReadinessNotice.detail}</p>
        </div>
        <span className="statusPill blocked">Do not send</span>
      </aside>

      <section className="readinessPanel">
        <div>
          <p className="eyebrow">Beta readiness</p>
          <h2>{workspace.betaReadiness.headline}</h2>
          <p>{workspace.betaReadiness.detail}</p>
        </div>
        <div className="readinessScore" aria-label="Beta readiness score">
          <strong>{workspace.betaReadiness.score}</strong>
          <span>of 100</span>
        </div>
      </section>

      <div className="dataList">
        <article className="dataRow">
          <div>
            <h3>How to use this page</h3>
            <p className="compactText">
              Green means the workspace can use that production feature. Brown
              means the app will keep the feature locked until the missing
              provider or environment variable is configured.
            </p>
          </div>
          <span className="statusPill ready">Guide</span>
        </article>
      </div>

      {workspace.betaReadiness.blockers.length ||
      workspace.betaReadiness.warnings.length ? (
        <div className="dataList">
          {[
            ...workspace.betaReadiness.blockers,
            ...workspace.betaReadiness.warnings,
          ]
            .slice(0, 6)
            .map((risk) => (
              <article className="dataRow" key={risk.id}>
                <div>
                  <h3>{risk.label}</h3>
                  <p className="compactText">{risk.detail}</p>
                </div>
                <span
                  className={
                    risk.severity === "blocker"
                      ? "statusPill blocked"
                      : "statusPill"
                  }
                >
                  {risk.severity}
                </span>
              </article>
            ))}
        </div>
      ) : null}

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
        <div>
          <dt>Report exports</dt>
          <dd>{workspace.reportExportCount} archived PDFs</dd>
        </div>
        <div>
          <dt>Share links</dt>
          <dd>{workspace.reportShareLinkCount} issued links</dd>
        </div>
        <div>
          <dt>Audit events</dt>
          <dd>{workspace.auditEventCount} recorded events</dd>
        </div>
      </dl>

      <div className="dataList">
        {workspace.diagnosticsWarning ? (
          <article className="dataRow">
            <div>
              <h3>Diagnostics unavailable</h3>
              <p className="compactText">{workspace.diagnosticsWarning}</p>
            </div>
            <span className="statusPill">Needs Neon</span>
          </article>
        ) : null}
        <article className="dataRow">
          <div>
            <h3>Tenant provisioned</h3>
            <p className="compactText">{workspace.message}</p>
            <p className="compactText">
              <strong>Required for:</strong> Workspace data access
            </p>
          </div>
          <span
            className={
              workspace.status === "ready" ? "statusPill ready" : "statusPill"
            }
          >
            {workspace.status === "ready" ? "Ready" : "Needs setup"}
          </span>
        </article>
        {readiness.map((item) => (
          <article className="dataRow" key={item.label}>
            <div>
              <h3>{item.label}</h3>
              <p className="compactText">{item.detail}</p>
              <p className="compactText">
                <strong>Required for:</strong> {item.requiredFor}
              </p>
              {item.missingVariableNames.length ? (
                <ul
                  className="envList"
                  aria-label={`${item.label} missing variables`}
                >
                  {item.missingVariableNames.map((variableName) => (
                    <li key={variableName}>
                      <code>{variableName}</code>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="actionCluster">
              {item.ready && item.id === "email" ? (
                <form action="/api/ops/email/test" method="post">
                  <button className="primaryButton compactButton" type="submit">
                    Send test
                  </button>
                </form>
              ) : null}
              {item.ready && item.id === "error_reporting" ? (
                <form action="/api/ops/error-reporting/test" method="post">
                  <button className="primaryButton compactButton" type="submit">
                    Send test
                  </button>
                </form>
              ) : null}
              <span className={item.ready ? "statusPill ready" : "statusPill"}>
                {item.ready ? "Ready" : "Not configured"}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="dataList">
        <article className="dataRow">
          <div>
            <h3>Recent audit activity</h3>
            <p className="compactText">
              Last ten tenant-scoped operational events recorded by the API.
            </p>
          </div>
          <span className="statusPill ready">
            {workspace.recentAuditEvents.length} shown
          </span>
        </article>
        {workspace.recentAuditEvents.map((event) => (
          <article className="dataRow" key={event.id}>
            <div>
              <h3>{event.eventType}</h3>
              <p className="compactText">
                {event.entityType ?? "Workspace"} {event.entityId ?? ""} |{" "}
                {event.createdAt.toISOString()}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
