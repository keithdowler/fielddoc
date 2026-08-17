import { getWorkspaceData } from "../workspace-data";

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
                    <strong>{project.name}</strong>
                    <span>{project.workOrderReference ?? project.status}</span>
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
                  <td>{project.reportDraftCount}</td>
                  <td>{formatDate(project.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
