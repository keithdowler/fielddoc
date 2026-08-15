import {
  normalizeOptionalText,
  toLocalProject,
  type Project,
  type ProjectFormInput,
  type ProjectRepository,
  type ProjectSearchOptions,
  type SyncState,
} from "@fielddoc/domain";

import type { LocalDatabase, SqlValue } from "./database";
import { createLocalId } from "./id";
import { SqliteLocalMutationRepository } from "./mutations";

type ProjectRow = {
  id: string;
  customer_id: string | null;
  site_id: string | null;
  name: string;
  customer_company: string | null;
  site_address: string | null;
  work_order_reference: string | null;
  scheduled_date: string | null;
  notes: string | null;
  status: Project["status"];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  sync_state: SyncState;
};

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    customerId: row.customer_id,
    siteId: row.site_id,
    name: row.name,
    customerCompany: row.customer_company,
    siteAddress: row.site_address,
    workOrderReference: row.work_order_reference,
    scheduledDate: row.scheduled_date,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    syncState: row.sync_state,
  };
}

function normalizeSort(options: ProjectSearchOptions): {
  column: string;
  direction: string;
} {
  const columnBySort = {
    createdAt: "created_at",
    name: "name",
    scheduledDate: "scheduled_date",
    updatedAt: "updated_at",
  } as const;

  return {
    column: columnBySort[options.sortBy ?? "updatedAt"],
    direction: options.sortDirection === "asc" ? "ASC" : "DESC",
  };
}

export class SqliteProjectRepository implements ProjectRepository {
  private readonly mutations: SqliteLocalMutationRepository;

  constructor(private readonly database: LocalDatabase) {
    this.mutations = new SqliteLocalMutationRepository(database);
  }

  async create(input: ProjectFormInput): Promise<Project> {
    const now = new Date().toISOString();
    const project = toLocalProject(input, {
      id: createLocalId("project"),
      now,
    });

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          INSERT INTO projects (
            id,
            customer_id,
            site_id,
            name,
            customer_company,
            site_address,
            work_order_reference,
            scheduled_date,
            notes,
            status,
            created_at,
            updated_at,
            archived_at,
            deleted_at,
            sync_state
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          project.id,
          project.customerId,
          project.siteId,
          project.name,
          project.customerCompany,
          project.siteAddress,
          project.workOrderReference,
          project.scheduledDate,
          project.notes,
          project.status,
          project.createdAt,
          project.updatedAt,
          project.archivedAt,
          project.deletedAt,
          project.syncState,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `project:${project.id}:create:${project.updatedAt}`,
        entityType: "Project",
        entityId: project.id,
        operation: "CREATE",
        payloadRef: project.updatedAt,
        payloadJson: JSON.stringify(project),
        createdAt: now,
      });
    });

    return project;
  }

  async update(id: string, input: ProjectFormInput): Promise<Project> {
    const existing = await this.getById(id);

    if (!existing) {
      throw new Error("Project not found.");
    }

    const updatedAt = new Date().toISOString();
    const updated: Project = {
      ...existing,
      name: input.name.trim(),
      customerCompany: normalizeOptionalText(input.customerCompany),
      siteAddress: normalizeOptionalText(input.siteAddress),
      workOrderReference: normalizeOptionalText(input.workOrderReference),
      scheduledDate: normalizeOptionalText(input.scheduledDate),
      notes: normalizeOptionalText(input.notes),
      updatedAt,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE projects
          SET name = ?,
              customer_company = ?,
              site_address = ?,
              work_order_reference = ?,
              scheduled_date = ?,
              notes = ?,
              updated_at = ?,
              sync_state = ?
          WHERE id = ? AND deleted_at IS NULL
        `,
        [
          updated.name,
          updated.customerCompany,
          updated.siteAddress,
          updated.workOrderReference,
          updated.scheduledDate,
          updated.notes,
          updated.updatedAt,
          updated.syncState,
          id,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `project:${id}:update:${updated.updatedAt}`,
        entityType: "Project",
        entityId: id,
        operation: "UPDATE",
        payloadRef: updated.updatedAt,
        payloadJson: JSON.stringify(updated),
        createdAt: updatedAt,
      });
    });

    return updated;
  }

  async archive(id: string): Promise<void> {
    await this.mutateStatus(id, "archived", "ARCHIVE");
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction(async (tx) => {
      await tx.run(
        "UPDATE projects SET deleted_at = ?, updated_at = ?, sync_state = ? WHERE id = ? AND deleted_at IS NULL",
        [now, now, "PENDING", id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `project:${id}:delete:${now}`,
        entityType: "Project",
        entityId: id,
        operation: "DELETE",
        payloadRef: now,
        payloadJson: JSON.stringify({ id, deletedAt: now }),
        createdAt: now,
      });
    });
  }

  async getById(id: string): Promise<Project | null> {
    const row = await this.database.getFirst<ProjectRow>(
      "SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL",
      [id],
    );

    return row ? mapProject(row) : null;
  }

  async list(options: ProjectSearchOptions = {}): Promise<Project[]> {
    const where = ["deleted_at IS NULL"];
    const params: SqlValue[] = [];

    if (!options.includeArchived) {
      where.push("status != 'archived'");
    }

    if (options.query?.trim()) {
      const query = `%${options.query.trim().toLowerCase()}%`;
      where.push(
        "(LOWER(name) LIKE ? OR LOWER(COALESCE(customer_company, '')) LIKE ? OR LOWER(COALESCE(site_address, '')) LIKE ?)",
      );
      params.push(query, query, query);
    }

    const sort = normalizeSort(options);
    const rows = await this.database.getAll<ProjectRow>(
      `
        SELECT * FROM projects
        WHERE ${where.join(" AND ")}
        ORDER BY ${sort.column} ${sort.direction}, name ASC
      `,
      params,
    );

    return rows.map(mapProject);
  }

  private async mutateStatus(
    id: string,
    status: Project["status"],
    operation: "ARCHIVE",
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction(async (tx) => {
      await tx.run(
        "UPDATE projects SET status = ?, archived_at = ?, updated_at = ?, sync_state = ? WHERE id = ? AND deleted_at IS NULL",
        [status, now, now, "PENDING", id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `project:${id}:${operation.toLowerCase()}:${now}`,
        entityType: "Project",
        entityId: id,
        operation,
        payloadRef: now,
        payloadJson: JSON.stringify({ id, status, archivedAt: now }),
        createdAt: now,
      });
    });
  }
}
