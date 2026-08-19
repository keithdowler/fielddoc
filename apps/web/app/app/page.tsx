import { auth } from "@clerk/nextjs/server";
import { getPrimaryFieldDocNextAction } from "@fielddoc/domain";
import Link from "next/link";
import { ProvisionAccountButton } from "./provision-account-button";
import { getWorkspaceData } from "./workspace-data";

export default async function AppPage() {
  const [authContext, workspace] = await Promise.all([
    auth(),
    getWorkspaceData(),
  ]);
  const latestProjects = workspace.projects.slice(0, 5);
  const uploadedOriginals = workspace.media.filter(
    (media) => media.hasUploadedOriginal,
  ).length;
  const pendingOriginals = Math.max(
    workspace.media.length - uploadedOriginals,
    0,
  );
  const unarchivedReports = Math.max(
    workspace.reports.length - workspace.reportExportCount,
    0,
  );
  const missingCaptions = workspace.projects.reduce(
    (count, project) => count + project.missingCaptionCount,
    0,
  );
  const primaryAction = getPrimaryFieldDocNextAction({
    projectCount: workspace.projects.length,
    hasSelectedProject: workspace.projects.length > 0,
    beforeCount: workspace.evidence.filter((item) => item.category === "BEFORE")
      .length,
    workCount: workspace.evidence.filter((item) => item.category === "WORK")
      .length,
    afterCount: workspace.evidence.filter((item) => item.category === "AFTER")
      .length,
    documentCount: workspace.documents.length,
    missingCaptionCount: missingCaptions,
    hasReportDraft: workspace.reports.length > 0,
    hasGeneratedPdf: workspace.reports.some((report) => report.hasGeneratedPdf),
    pendingLocalChangeCount: 0,
    isSignedIn: Boolean(authContext.userId),
    privateStorageReady: workspace.betaReadiness.blockers.every(
      (risk) => risk.id !== "private_storage",
    ),
    pendingOriginalFileCount: pendingOriginals,
    pendingReportPdfCount: unarchivedReports,
  });

  return (
    <div className="workspaceStack">
      <section className="workspacePanel">
        <p className="eyebrow">Cloud workspace</p>
        <h1>Proof Packet workspace</h1>
        <p>
          Review backed-up jobs, original files, reports, and account health for
          the active organization.
        </p>
        <dl className="detailList">
          <div>
            <dt>User</dt>
            <dd>{authContext.userId}</dd>
          </div>
          <div>
            <dt>Organization</dt>
            <dd>
              {workspace.organizationName ??
                authContext.orgId ??
                "Select or create an organization"}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{workspace.message}</dd>
          </div>
        </dl>
        {workspace.status === "not_provisioned" ? (
          <ProvisionAccountButton />
        ) : null}
      </section>

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

      <section className="metricGrid" aria-label="Workspace metrics">
        <Metric label="Projects" value={workspace.projects.length} />
        <Metric label="Evidence" value={workspace.evidence.length} />
        <Metric label="Originals" value={uploadedOriginals} />
        <Metric label="Archived PDFs" value={workspace.reportExportCount} />
        <Metric label="Sync receipts" value={workspace.syncReceiptCount} />
        <Metric
          label="Rejected receipts"
          value={workspace.rejectedSyncReceiptCount}
        />
        <Metric label="Missing captions" value={missingCaptions} />
        <Metric label="Share links" value={workspace.reportShareLinkCount} />
        <Metric label="Audit events" value={workspace.auditEventCount} />
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Recommended next step</p>
            <h2>{primaryAction.label}</h2>
            <p>{primaryAction.detail}</p>
          </div>
          <span
            className={`statusPill ${
              primaryAction.status === "complete" ? "ready" : ""
            }`}
          >
            {primaryAction.actionLabel ?? primaryAction.status}
          </span>
        </div>
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Attention queue</p>
            <h2>What needs attention</h2>
          </div>
          <span
            className={`statusPill ${
              workspace.betaReadiness.blockers.length === 0 ? "ready" : ""
            }`}
          >
            {workspace.betaReadiness.blockers.length} blockers
          </span>
        </div>
        <div className="dataList">
          <QueueItem
            label="Pending originals"
            value={pendingOriginals}
            detail="An original file still needs private cloud backup."
          />
          <QueueItem
            label="Unarchived report PDFs"
            value={unarchivedReports}
            detail="A report exists but its PDF is not archived in private storage."
          />
          <QueueItem
            label="Missing captions"
            value={missingCaptions}
            detail="Evidence needs short captions before customer-ready packets."
          />
          <QueueItem
            label="Rejected sync receipts"
            value={workspace.rejectedSyncReceiptCount}
            detail="Rejected uploads should be reviewed before more field tests."
          />
        </div>
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Next actions</p>
            <h2>Recommended operator path</h2>
          </div>
          <span className="statusPill">{workspace.betaReadiness.stage}</span>
        </div>
        <ol className="actionList">
          {workspace.betaReadiness.nextActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ol>
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Recent projects</p>
            <h2>Backed-up jobs</h2>
          </div>
        </div>
        {latestProjects.length ? (
          <div className="dataList">
            {latestProjects.map((project) => (
              <article className="dataRow" key={project.id}>
                <div>
                  <h3>
                    <Link href={`/app/projects/${project.id}`}>
                      {project.name}
                    </Link>
                  </h3>
                  <p className="compactText">
                    {[project.customerCompany, project.siteAddress]
                      .filter(Boolean)
                      .join(" / ") || "No customer or site saved"}
                  </p>
                </div>
                <div className="rowMetrics">
                  <span>{project.evidenceCount} evidence</span>
                  <span>{project.mediaCount} media</span>
                  <span>{project.reportDraftCount} reports</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyWorkspaceMessage message="No backed-up jobs yet. Create a job on mobile, add evidence, then tap Back Up Now in Settings." />
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metricBox">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function QueueItem({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="dataRow">
      <div>
        <h3>{label}</h3>
        <p className="compactText">{detail}</p>
      </div>
      <span className={`statusPill ${value === 0 ? "ready" : ""}`}>
        {value === 0 ? "Clear" : value}
      </span>
    </article>
  );
}

function EmptyWorkspaceMessage({ message }: { message: string }) {
  return <p className="emptyMessage">{message}</p>;
}
