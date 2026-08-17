import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ProvisionAccountButton } from "./provision-account-button";
import { getWorkspaceData } from "./workspace-data";

export default async function AppPage() {
  const [authContext, workspace] = await Promise.all([
    auth(),
    getWorkspaceData(),
  ]);
  const latestProjects = workspace.projects.slice(0, 5);

  return (
    <div className="workspaceStack">
      <section className="workspacePanel">
        <p className="eyebrow">Cloud workspace</p>
        <h1>Proof Packet workspace</h1>
        <p>
          Review synced project metadata, report drafts, and sync receipt health
          for the active organization.
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

      <section className="metricGrid" aria-label="Workspace metrics">
        <Metric label="Projects" value={workspace.projects.length} />
        <Metric label="Report drafts" value={workspace.reports.length} />
        <Metric label="Sync receipts" value={workspace.syncReceiptCount} />
        <Metric
          label="Rejected receipts"
          value={workspace.rejectedSyncReceiptCount}
        />
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Recent projects</p>
            <h2>Synced evidence pipeline</h2>
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
          <EmptyWorkspaceMessage message="No synced projects yet. Create evidence on mobile and upload metadata after mobile auth is connected." />
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

function EmptyWorkspaceMessage({ message }: { message: string }) {
  return <p className="emptyMessage">{message}</p>;
}
