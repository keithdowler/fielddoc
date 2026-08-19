import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getProjectDetailFromWorkspaceData,
  getWorkspaceData,
  type WorkspaceEvidenceItem,
  type WorkspaceMediaAsset,
} from "../../workspace-data";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const workspace = await getWorkspaceData();

  if (workspace.status !== "ready") {
    return (
      <section className="workspaceSection">
        <p className="eyebrow">Project detail</p>
        <h1>Workspace not ready</h1>
        <p className="emptyMessage">{workspace.message}</p>
      </section>
    );
  }

  const project = getProjectDetailFromWorkspaceData(workspace, projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="workspaceStack">
      <section className="workspaceSection">
        <Link href="/app/projects">Back to projects</Link>
        <div className="sectionTitleRow detailHeader">
          <div>
            <p className="eyebrow">Project review</p>
            <h1>{project.name}</h1>
            <p>
              {project.customerCompany ?? "No customer saved"}
              {project.siteAddress ? ` / ${project.siteAddress}` : ""}
            </p>
          </div>
          <span
            className={`statusPill ${project.readiness.ready ? "ready" : ""}`}
          >
            {project.readiness.ready ? "Report ready" : "Needs review"}
          </span>
        </div>

        <dl className="detailList">
          <div>
            <dt>Work order</dt>
            <dd>{project.workOrderReference ?? "Not provided"}</dd>
          </div>
          <div>
            <dt>Scheduled</dt>
            <dd>{project.scheduledDate ?? "Not scheduled"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{project.status}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDate(project.updatedAt)}</dd>
          </div>
        </dl>

        {project.notes ? <p className="noteText">{project.notes}</p> : null}

        <div className="metricGrid" aria-label="Project evidence metrics">
          <Metric label="Evidence" value={project.evidenceCount} />
          <Metric label="Documents" value={project.documentCount} />
          <Metric label="Original media" value={project.mediaCount} />
          <Metric label="Uploaded" value={project.uploadedMediaCount} />
          <Metric
            label="Missing captions"
            value={project.missingCaptionCount}
          />
        </div>
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Evidence sections</p>
            <h2>Proof Packet readiness</h2>
          </div>
          {project.readiness.missing.length ? (
            <span className="statusPill">
              Missing {project.readiness.missing.join(", ")}
            </span>
          ) : null}
        </div>

        <div className="sectionGrid">
          {project.evidenceSections.map((section) => (
            <section className="reviewSection" key={section.category}>
              <div className="sectionTitleRow">
                <div>
                  <h3>{section.label}</h3>
                  <p className="compactText">
                    {section.evidenceCount} evidence / {section.mediaCount}{" "}
                    media / {section.documentCount} documents /{" "}
                    {section.annotationCount} notes
                  </p>
                </div>
                {section.importantCount ? (
                  <span className="smallPill">
                    {section.importantCount} important
                  </span>
                ) : null}
              </div>

              {section.evidenceItems.length ? (
                <div className="dataList">
                  {section.evidenceItems.map((evidence) => (
                    <EvidenceCard evidence={evidence} key={evidence.id} />
                  ))}
                </div>
              ) : (
                <p className="emptyMessage">No evidence in this section yet.</p>
              )}
            </section>
          ))}
        </div>
      </section>

      <section className="workspaceSection">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">Reports</p>
            <h2>Drafts for this project</h2>
          </div>
          <span className="statusPill ready">
            {project.reports.length} drafts
          </span>
        </div>

        {project.reports.length ? (
          <div className="dataList">
            {project.reports.map((report) => (
              <article className="dataRow" key={report.id}>
                <div>
                  <h3>
                    <Link href={`/app/reports/${report.id}`}>
                      {report.title}
                    </Link>
                  </h3>
                  <p className="compactText">
                    Updated {formatDate(report.updatedAt)}
                  </p>
                </div>
                <div className="rowMetrics">
                  <span>{report.status}</span>
                  <span>
                    {report.hasGeneratedPdf
                      ? "Cloud PDF stored"
                      : "Metadata only"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="emptyMessage">
            No report drafts synced for this project yet.
          </p>
        )}
      </section>
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: WorkspaceEvidenceItem }) {
  return (
    <article className="evidenceCard">
      <div className="sectionTitleRow">
        <div>
          <h4>{evidence.title ?? evidence.caption ?? "Untitled evidence"}</h4>
          <p className="compactText">
            {formatDate(evidence.captureTimestamp)}
            {evidence.missingCaption ? " / caption needed" : ""}
          </p>
        </div>
        {evidence.isImportant ? (
          <span className="smallPill">Important</span>
        ) : null}
      </div>

      {evidence.caption ? <p className="noteText">{evidence.caption}</p> : null}
      {evidence.notes ? <p className="compactText">{evidence.notes}</p> : null}

      {evidence.documents.length ? (
        <div className="dataList tight">
          {evidence.documents.map((document) => (
            <div className="mediaTile" key={document.id}>
              <strong>{document.title}</strong>
              <span>
                {document.notes ?? "Document metadata synced from mobile"}
              </span>
              <span>Updated {formatDate(document.updatedAt)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {evidence.media.length ? (
        <div className="mediaGrid">
          {evidence.media.map((media) => (
            <MediaTile media={media} key={media.id} />
          ))}
        </div>
      ) : (
        <p className="emptyMessage">No media attached.</p>
      )}

      {evidence.annotations.length ? (
        <ul className="annotationList">
          {evidence.annotations.map((annotation) => (
            <li key={annotation.id}>{annotation.body}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function MediaTile({ media }: { media: WorkspaceMediaAsset }) {
  const isDocument = media.mediaType === "DOCUMENT";

  return (
    <div className="mediaTile">
      <strong>
        {media.caption ?? (isDocument ? "Document original" : media.mediaType)}
      </strong>
      <span>
        {media.mimeType} / {formatBytes(media.sizeBytes)}
      </span>
      <span>SHA {media.sha256.slice(0, 12)}</span>
      {media.hasUploadedOriginal ? (
        <Link
          className="downloadLink"
          href={`/app/media/${media.id}/download`}
          prefetch={false}
        >
          {isDocument ? "Download document" : "Download original"}
        </Link>
      ) : (
        <span className="warningText">Original not uploaded</span>
      )}
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
