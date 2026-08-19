import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getReportDetailFromWorkspaceData,
  getWorkspaceData,
  type WorkspaceReportDetail,
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
          <Metric label="Documents" value={report.totals.documentCount} />
          <Metric label="Media" value={report.totals.mediaCount} />
          <Metric label="Uploaded" value={report.totals.uploadedMediaCount} />
          <Metric
            label="Visual docs"
            value={report.totals.visualDocumentCount}
          />
          <Metric
            label="Metadata docs"
            value={report.totals.metadataOnlyDocumentCount}
          />
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
            <dd>
              {report.hasGeneratedPdf ? (
                <Link
                  className="downloadLink"
                  href={`/app/reports/${report.id}/download`}
                  prefetch={false}
                >
                  Download private PDF
                </Link>
              ) : (
                "Not uploaded yet"
              )}
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDate(report.updatedAt)}</dd>
          </div>
        </dl>

        <div className="dataList">
          <article className="dataRow">
            <div>
              <h3>Delivery readiness</h3>
              <p className="compactText">{report.deliveryReadiness.detail}</p>
              {report.deliveryReadiness.blockers.length ? (
                <ul className="actionList compactActionList">
                  {report.deliveryReadiness.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : null}
              {report.deliveryReadiness.warnings.length ? (
                <ul className="actionList compactActionList">
                  {report.deliveryReadiness.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <span
              className={`statusPill ${
                report.deliveryReadiness.ready ? "ready" : ""
              }`}
            >
              {report.deliveryReadiness.label}
            </span>
          </article>
        </div>
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Delivery history</p>
            <h2>Exports and share links</h2>
          </div>
          <span
            className={`statusPill ${
              report.activeShareLinkCount ? "ready" : ""
            }`}
          >
            {report.activeShareLinkCount} active links
          </span>
        </div>

        <div className="sectionGrid">
          <section className="reviewSection">
            <h3>Archived PDFs</h3>
            {report.exports.length ? (
              <div className="dataList">
                {report.exports.map((exportRow) => (
                  <article className="dataRow" key={exportRow.id}>
                    <div>
                      <h3>{formatBytes(exportRow.sizeBytes)} PDF</h3>
                      <p className="compactText">
                        Uploaded {formatDate(exportRow.uploadedAt)}
                      </p>
                      <p className="compactText">
                        SHA {exportRow.sha256.slice(0, 16)}
                      </p>
                    </div>
                    <Link
                      className="downloadLink"
                      href={`/app/reports/${report.id}/download`}
                      prefetch={false}
                    >
                      Download
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="emptyMessage">
                No archived PDFs yet. Upload the generated mobile PDF from
                Settings.
              </p>
            )}
          </section>

          <section className="reviewSection">
            <h3>Share links</h3>
            {report.shareLinks.length ? (
              <div className="dataList">
                {report.shareLinks.map((link) => (
                  <article className="dataRow" key={link.id}>
                    <div>
                      <h3>{getShareLinkStatus(link)}</h3>
                      <p className="compactText">
                        Expires {formatDate(link.expiresAt)}
                      </p>
                      <p className="compactText">
                        {link.accessCount} views
                        {link.lastAccessedAt
                          ? ` / last ${formatDate(link.lastAccessedAt)}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`statusPill ${
                        getShareLinkStatus(link) === "Active" ? "ready" : ""
                      }`}
                    >
                      {getShareLinkStatus(link)}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="emptyMessage">
                No share links issued yet. Create one after the PDF is archived.
              </p>
            )}
          </section>
        </div>
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
                {section.documentCount} documents / {section.annotationCount}{" "}
                notes
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
                        <span>
                          {evidence.documentCount} documents (
                          {evidence.visualDocumentCount} visual /{" "}
                          {evidence.metadataOnlyDocumentCount} metadata)
                        </span>
                        <span>{evidence.annotationCount} notes</span>
                      </div>
                      {evidence.documents.length ? (
                        <ul className="annotationList">
                          {evidence.documents.map((document) => (
                            <li key={document.id}>
                              {document.title}
                              {document.notes ? ` / ${document.notes}` : ""}
                              {document.pageCount
                                ? ` / ${document.pageCount} ${
                                    document.pageCount === 1 ? "page" : "pages"
                                  }`
                                : ""}
                              {document.sourceType === "DOCUMENT_SCAN"
                                ? " / scanned"
                                : document.sourceType
                                  ? ` / ${document.sourceType.toLowerCase().replaceAll("_", " ")}`
                                  : ""}
                              {document.sha256
                                ? ` / SHA-256 ${document.sha256.slice(0, 16)}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
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
                                {media.mediaType === "DOCUMENT"
                                  ? "Download document"
                                  : "Download original"}
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

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getShareLinkStatus(link: WorkspaceReportDetail["shareLinks"][number]) {
  if (link.revokedAt) return "Revoked";
  if (link.expiresAt.getTime() <= Date.now()) return "Expired";
  return "Active";
}
