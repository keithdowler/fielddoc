import { getWorkspaceData } from "../workspace-data";
import Link from "next/link";

export default async function ProjectsPage() {
  const workspace = await getWorkspaceData();

  return (
    <section className="workspaceSection">
      <p className="eyebrow">Projects</p>
      <h1>Synced projects</h1>
      <p>
        Projects appear here after mobile metadata is uploaded into the active
        organization. Media counts show how many immutable originals have been
        attached to private object storage.
      </p>

      {workspace.status !== "ready" ? (
        <p className="emptyMessage">{workspace.message}</p>
      ) : null}

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
                      {project.uploadedMediaCount}/{project.mediaCount} uploaded
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
                <h2 id="media-title">Uploaded originals</h2>
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
                          Uploaded{" "}
                          {media.uploadedAt
                            ? formatDate(media.uploadedAt)
                            : "recently"}
                        </span>
                        <Link
                          className="downloadLink"
                          href={`/app/media/${media.id}/download`}
                          prefetch={false}
                        >
                          Download original
                        </Link>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <p className="emptyMessage">
                No uploaded originals yet. Capture media on mobile, run Upload
                All Pending Changes, then refresh this page.
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="emptyMessage">
          No synced projects yet. Use the mobile app to create a local project,
          capture evidence, then upload metadata once mobile cloud sign-in is
          connected.
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

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
