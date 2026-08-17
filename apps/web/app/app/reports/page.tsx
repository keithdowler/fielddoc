import { getWorkspaceData } from "../workspace-data";
import Link from "next/link";

export default async function ReportsPage() {
  const workspace = await getWorkspaceData();

  return (
    <section className="workspaceSection">
      <p className="eyebrow">Reports</p>
      <h1>Proof Packet archive</h1>
      <p>
        Synced report drafts appear here as cloud metadata. Generated PDFs are
        delivered through private, short-lived storage URLs when available.
      </p>

      {workspace.status !== "ready" ? (
        <p className="emptyMessage">{workspace.message}</p>
      ) : null}

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
                  {report.hasGeneratedPdf ? "PDF stored" : "PDF local"}
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
          then upload metadata after mobile cloud sign-in is connected.
        </p>
      )}
    </section>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
