import type { ProjectEvidenceSummary, ProjectSummary } from "@fielddoc/domain";

export const sampleCurrentProject: ProjectSummary = {
  id: "current",
  organizationId: "00000000-0000-4000-8000-000000000001",
  name: "Unit 12 Turnover",
  status: "active",
  createdAt: "2026-08-12T12:00:00.000Z",
  updatedAt: "2026-08-12T17:30:00.000Z",
};

export const recentProjects: ProjectSummary[] = [
  sampleCurrentProject,
  {
    id: "roof-leak",
    organizationId: sampleCurrentProject.organizationId,
    name: "Roof leak photos",
    status: "draft",
    createdAt: "2026-08-11T14:00:00.000Z",
    updatedAt: "2026-08-11T19:10:00.000Z",
  },
  {
    id: "hvac-filter",
    organizationId: sampleCurrentProject.organizationId,
    name: "HVAC filter change",
    status: "archived",
    createdAt: "2026-08-09T08:00:00.000Z",
    updatedAt: "2026-08-09T10:45:00.000Z",
  },
];

export const sampleEvidenceSummary: ProjectEvidenceSummary = {
  beforeCount: 3,
  workCount: 2,
  afterCount: 1,
  documentCount: 1,
  missingCaptionCount: 2,
  otherCount: 0,
};

export const emptyEvidenceSummary: ProjectEvidenceSummary = {
  beforeCount: 0,
  workCount: 0,
  afterCount: 0,
  documentCount: 0,
  missingCaptionCount: 0,
  otherCount: 0,
};
