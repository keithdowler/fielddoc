import { getWorkspaceData } from "../workspace-data";
import Link from "next/link";

export default async function ReportsPage() {
  const workspace = await getWorkspaceData();
  const reportsWithCloudPdf = workspace.reports.filter(
    (report) => report.hasGeneratedPdf,
  ).length;
  const reportsNeedingArchive = Math.max(
    workspace.reports.length - reportsWithCloudPdf,
    0,
  );

  return (
    <section className="workspaceSection">
      <p className="eyebrow">Reports</p>
      <h1>Proof Packet archive</h1>
      <p>
        Backed-up report drafts and generated PDFs appear here. Downloads use
        private, short-lived links when the PDF is archived.
      </p>

      {workspace.status !== "ready" ? (
        <p className="emptyMessage">{workspace.message}</p>
      ) : null}

      <section className="metricGrid compactMetrics" aria-label="Report health">
        <Metric label="Drafts" value={workspace.reports.length} />
        <Metric label="Cloud PDFs" value={reportsWithCloudPdf} />
        <Metric label="Need archive" value={reportsNeedingArchive} />
        <Metric label="Share links" value={workspace.reportShareLinkCount} />
      </section>

      {workspace.reports.length ? (
        <div className="dataList">
          {workspace.reports.map((report) => (
            <article className="dataRow" key={report.id}>
              <div>
                <h3>
                  <Link href={`/app/reports/${report.id}`}>{report.title}</Link>
                </h3>
                <p className="compactText">
                  {report.projectName} / updated {formatDate(report.updatedAt)}
                </p>
              </div>
              <div className="rowMetrics">
                <span>{report.status}</span>
                <span>
                  {report.generatedAt
                    ? `Generated ${formatDate(report.generatedAt)}`
                    : "Not generated"}
                </span>
                <span>
                  {report.latestExportUploadedAt
                    ? `Archived ${formatDate(report.latestExportUploadedAt)}`
                    : report.hasGeneratedPdf
                      ? "PDF stored"
                      : "PDF local"}
                </span>
                <span>
                  {report.activeShareLinkCount
                    ? `${report.activeShareLinkCount} active links`
                    : "No active link"}
                </span>
                {report.hasGeneratedPdf ? (
                  <Link
                    className="downloadLink"
                    href={`/app/reports/${report.id}/download`}
                    prefetch={false}
                  >
                    Download PDF
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="emptyMessage">
          No synced report drafts yet. Generate or save a local draft on mobile,
          then tap Back Up Now after mobile cloud sign-in is connected.
        </p>
      )}
    </section>
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

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
