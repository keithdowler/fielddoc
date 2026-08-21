import { getWorkspaceData } from "../workspace-data";
import Link from "next/link";

export default async function ProjectsPage() {
  const workspace = await getWorkspaceData();
  const uploadedOriginals = workspace.media.filter(
    (media) => media.hasUploadedOriginal,
  ).length;
  const pendingOriginals = Math.max(
    workspace.media.length - uploadedOriginals,
    0,
  );
  const missingCaptions = workspace.projects.reduce(
    (count, project) => count + project.missingCaptionCount,
    0,
  );
  const importantEvidence = workspace.projects.reduce(
    (count, project) => count + project.importantEvidenceCount,
    0,
  );

  return (
    <section className="workspaceSection">
      <p className="eyebrow">Projects</p>
      <h1>Backed-up jobs</h1>
      <p>
        Jobs appear here after the mobile app backs up job details. Media counts
        show how many original files are protected in private storage.
      </p>

      {workspace.status !== "ready" ? (
        <p className="emptyMessage">{workspace.message}</p>
      ) : null}

      <section
        className="metricGrid compactMetrics"
        aria-label="Project health"
      >
        <Metric label="Backed-up jobs" value={workspace.projects.length} />
        <Metric label="Important evidence" value={importantEvidence} />
        <Metric label="Missing captions" value={missingCaptions} />
        <Metric label="Originals pending" value={pendingOriginals} />
      </section>

      {workspace.projects.length ? (
        <>
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Customer / Site</th>
                  <th>Evidence</th>
                  <th>Important</th>
                  <th>Media</th>
                  <th>Reports</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {workspace.projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <strong>
                        <Link href={`/app/projects/${project.id}`}>
                          {project.name}
                        </Link>
                      </strong>
                      <span>
                        {project.workOrderReference ?? project.status}
                      </span>
                    </td>
                    <td>
                      {[project.customerCompany, project.siteAddress]
                        .filter(Boolean)
                        .join(" / ") || "Not provided"}
                    </td>
                    <td>
                      {project.evidenceCount}
                      {project.missingCaptionCount ? (
                        <span className="warningText">
                          {project.missingCaptionCount} missing captions
                        </span>
                      ) : null}
                    </td>
                    <td>{project.importantEvidenceCount}</td>
                    <td>
                      {project.uploadedMediaCount}/{project.mediaCount} saved
                    </td>
                    <td>
                      {project.reportDraftCount}
                      <span>
                        <Link href={`/app/projects/${project.id}`}>Review</Link>
                      </span>
                    </td>
                    <td>{formatDate(project.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="workspaceSection" aria-labelledby="media-title">
            <div className="sectionTitleRow">
              <div>
                <p className="eyebrow">Private Storage</p>
                <h2 id="media-title">Protected originals</h2>
              </div>
              <span className="statusPill ready">
                {
                  workspace.media.filter((media) => media.hasUploadedOriginal)
                    .length
                }{" "}
                ready
              </span>
            </div>

            {workspace.media.some((media) => media.hasUploadedOriginal) ? (
              <div className="dataList">
                {workspace.media
                  .filter((media) => media.hasUploadedOriginal)
                  .map((media) => (
                    <article className="dataRow" key={media.id}>
                      <div>
                        <h3>
                          {media.evidenceTitle ??
                            media.evidenceCaption ??
                            `${media.evidenceCategory} evidence`}
                        </h3>
                        <p className="compactText">
                          {media.projectName} / {media.mimeType} /{" "}
                          {formatBytes(media.sizeBytes)}
                        </p>
                      </div>
                      <div className="rowMetrics">
                        <span>
                          Saved{" "}
                          {media.uploadedAt
                            ? formatDate(media.uploadedAt)
                            : "recently"}
                        </span>
                        <Link
                          className="downloadLink"
                          href={`/app/media/${media.id}/download`}
                          prefetch={false}
                        >
                          Open original
                        </Link>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <p className="emptyMessage">
                No backed-up originals yet. Add photos or files on mobile, tap
                Back Up Now in Settings, then refresh this page.
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="emptyMessage">
          No jobs yet. Use the mobile app to create a job, capture evidence,
          then tap Back Up Now after signing in.
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

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
