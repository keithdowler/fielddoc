import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getReportDetailFromWorkspaceData,
  getWorkspaceData,
} from "../../workspace-data";

type ReportDetailPageProps = {
  params: Promise<{ reportDraftId: string }>;
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { reportDraftId } = await params;
  const workspace = await getWorkspaceData();

  if (workspace.status !== "ready") {
    return (
      <section className="workspaceSection">
        <p className="eyebrow">Report detail</p>
        <h1>Workspace not ready</h1>
        <p className="emptyMessage">{workspace.message}</p>
      </section>
    );
  }

  const report = getReportDetailFromWorkspaceData(workspace, reportDraftId);

  if (!report) {
    notFound();
  }

  return (
    <div className="workspaceStack">
      <section className="workspaceSection">
        <Link href="/app/reports">Back to reports</Link>
        <div className="sectionTitleRow detailHeader">
          <div>
            <p className="eyebrow">Proof Packet review</p>
            <h1>{report.title}</h1>
            <p>
              <Link href={`/app/projects/${report.project.id}`}>
                {report.project.name}
              </Link>
              {report.project.customerCompany
                ? ` / ${report.project.customerCompany}`
                : ""}
            </p>
          </div>
          <span
            className={`statusPill ${report.readiness.ready ? "ready" : ""}`}
          >
            {report.readiness.ready ? "Ready" : "Needs captions"}
          </span>
        </div>

        {report.notes ? <p className="noteText">{report.notes}</p> : null}

        <div className="metricGrid" aria-label="Report readiness metrics">
          <Metric label="Evidence" value={report.totals.evidenceCount} />
          <Metric label="Media" value={report.totals.mediaCount} />
          <Metric label="Uploaded" value={report.totals.uploadedMediaCount} />
          <Metric
            label="Missing captions"
            value={report.totals.missingCaptionCount}
          />
        </div>

        <dl className="detailList">
          <div>
            <dt>Status</dt>
            <dd>{report.status}</dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>
              {report.generatedAt
                ? formatDate(report.generatedAt)
                : "Not generated"}
            </dd>
          </div>
          <div>
            <dt>Cloud PDF</dt>
            <dd>{report.hasGeneratedPdf ? "Stored" : "Not uploaded yet"}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDate(report.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Included sections</p>
            <h2>Report contents</h2>
          </div>
          {report.readiness.missing.length ? (
            <span className="statusPill">
              Missing {report.readiness.missing.join(", ")}
            </span>
          ) : null}
        </div>

        <div className="sectionGrid">
          {report.sections.map((section, index) => (
            <section className="reviewSection" key={section.category}>
              <p className="eyebrow">Section {index + 1}</p>
              <h3>{section.label}</h3>
              <p className="compactText">
                {section.evidenceCount} evidence / {section.mediaCount} media /{" "}
                {section.annotationCount} notes
              </p>

              {section.evidenceItems.length ? (
                <div className="dataList">
                  {section.evidenceItems.map((evidence) => (
                    <article className="evidenceCard" key={evidence.id}>
                      <div className="sectionTitleRow">
                        <div>
                          <h4>
                            {evidence.title ??
                              evidence.caption ??
                              "Untitled evidence"}
                          </h4>
                          <p className="compactText">
                            {formatDate(evidence.captureTimestamp)}
                          </p>
                        </div>
                        {evidence.isImportant ? (
                          <span className="smallPill">Important</span>
                        ) : null}
                      </div>
                      <p
                        className={
                          evidence.missingCaption
                            ? "warningText"
                            : "compactText"
                        }
                      >
                        {evidence.caption ??
                          evidence.media[0]?.caption ??
                          "Caption needed"}
                      </p>
                      <div className="rowMetrics inlineMetrics">
                        <span>{evidence.mediaCount} media</span>
                        <span>{evidence.uploadedMediaCount} uploaded</span>
                        <span>{evidence.annotationCount} notes</span>
                      </div>
                      {evidence.media.some(
                        (media) => media.hasUploadedOriginal,
                      ) ? (
                        <div className="linkRow tight">
                          {evidence.media
                            .filter((media) => media.hasUploadedOriginal)
                            .map((media) => (
                              <Link
                                className="downloadLink"
                                href={`/app/media/${media.id}/download`}
                                key={media.id}
                                prefetch={false}
                              >
                                Download original
                              </Link>
                            ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="emptyMessage">
                  No synced evidence in this included section.
                </p>
              )}
            </section>
          ))}
        </div>
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

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
