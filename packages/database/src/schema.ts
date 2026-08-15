import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const databaseProvider = "neon-postgres";
export const migrationPolicy = "deterministic-source-controlled";
export const initialSyncMigrationId = "0001_sync_foundation";

export const evidenceCategoryEnum = pgEnum("evidence_category", [
  "BEFORE",
  "WORK",
  "AFTER",
  "DOCUMENT",
  "OTHER",
]);

export const mediaSourceTypeEnum = pgEnum("media_source_type", [
  "CAMERA_PHOTO",
  "PHOTO_LIBRARY",
  "DOCUMENT_SCAN",
  "FILE_IMPORT",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "IMAGE",
  "VIDEO",
  "DOCUMENT",
  "OTHER",
]);

export const syncStateEnum = pgEnum("sync_state", [
  "LOCAL_ONLY",
  "PENDING",
  "SYNCED",
  "FAILED",
  "CONFLICT",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "active",
  "archived",
]);

export const localMutationOperationEnum = pgEnum("local_mutation_operation", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ARCHIVE",
]);

export const localMutationEntityTypeEnum = pgEnum(
  "local_mutation_entity_type",
  [
    "Project",
    "Customer",
    "Site",
    "EvidenceItem",
    "MediaAsset",
    "Annotation",
    "Document",
    "ReportDraft",
  ],
);

export const serverMutationStatusEnum = pgEnum("server_mutation_status", [
  "accepted",
  "duplicate",
  "rejected",
  "conflict",
]);

const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  ...timestampColumns,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    externalAuthId: text("external_auth_id").notNull(),
    email: text("email"),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uniq_users_external_auth_id").on(table.externalAuthId),
  ],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("idx_organization_members_user").on(table.userId),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    serverVersion: integer("server_version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("idx_customers_organization").on(table.organizationId),
    uniqueIndex("uniq_customers_org_id").on(table.organizationId, table.id),
  ],
);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    customerId: uuid("customer_id").references(() => customers.id),
    name: text("name"),
    address: text("address"),
    serverVersion: integer("server_version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("idx_sites_organization").on(table.organizationId),
    index("idx_sites_customer").on(table.customerId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    customerId: uuid("customer_id").references(() => customers.id),
    siteId: uuid("site_id").references(() => sites.id),
    name: text("name").notNull(),
    customerCompany: text("customer_company"),
    siteAddress: text("site_address"),
    workOrderReference: text("work_order_reference"),
    scheduledDate: text("scheduled_date"),
    notes: text("notes"),
    status: projectStatusEnum("status").notNull().default("active"),
    serverVersion: integer("server_version").notNull().default(1),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    index("idx_projects_organization_updated").on(
      table.organizationId,
      table.updatedAt,
    ),
    index("idx_projects_customer").on(table.customerId),
    index("idx_projects_site").on(table.siteId),
  ],
);

export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    category: evidenceCategoryEnum("category").notNull(),
    title: text("title"),
    caption: text("caption"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    captureTimestamp: timestamp("capture_timestamp", {
      withTimezone: true,
    }).notNull(),
    serverVersion: integer("server_version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("idx_evidence_project_order").on(
      table.projectId,
      table.captureTimestamp,
      table.sortOrder,
    ),
    index("idx_evidence_organization").on(table.organizationId),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    evidenceItemId: uuid("evidence_item_id")
      .notNull()
      .references(() => evidenceItems.id),
    storageObjectKey: text("storage_object_key"),
    mediaType: mediaTypeEnum("media_type").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption"),
    notes: text("notes"),
    captureTimestamp: timestamp("capture_timestamp", {
      withTimezone: true,
    }).notNull(),
    sourceType: mediaSourceTypeEnum("source_type").notNull(),
    originalAssetId: text("original_asset_id"),
    derivativeType: text("derivative_type"),
    isOriginal: boolean("is_original").notNull().default(true),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    serverVersion: integer("server_version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("idx_media_assets_evidence").on(table.evidenceItemId),
    index("idx_media_assets_organization").on(table.organizationId),
    index("idx_media_assets_org_sha").on(table.organizationId, table.sha256),
  ],
);

export const annotations = pgTable(
  "annotations",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    evidenceItemId: uuid("evidence_item_id")
      .notNull()
      .references(() => evidenceItems.id),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id),
    body: text("body").notNull(),
    serverVersion: integer("server_version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("idx_annotations_evidence").on(table.evidenceItemId),
    index("idx_annotations_media").on(table.mediaAssetId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    evidenceItemId: uuid("evidence_item_id").references(() => evidenceItems.id),
    title: text("title").notNull(),
    notes: text("notes"),
    serverVersion: integer("server_version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("idx_documents_project").on(table.projectId),
    index("idx_documents_evidence").on(table.evidenceItemId),
  ],
);

export const reportDrafts = pgTable(
  "report_drafts",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    title: text("title").notNull(),
    notes: text("notes"),
    sectionsJson: jsonb("sections_json").notNull(),
    status: text("status").notNull(),
    generatedPdfObjectKey: text("generated_pdf_object_key"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    serverVersion: integer("server_version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("idx_report_drafts_project_updated").on(
      table.projectId,
      table.updatedAt,
    ),
    index("idx_report_drafts_organization").on(table.organizationId),
  ],
);

export const receivedLocalMutations = pgTable(
  "received_local_mutations",
  {
    mutationId: text("mutation_id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    deviceId: text("device_id").notNull(),
    entityType: localMutationEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    operation: localMutationOperationEnum("operation").notNull(),
    payloadRef: text("payload_ref").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    clientCreatedAt: timestamp("client_created_at", {
      withTimezone: true,
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: serverMutationStatusEnum("status").notNull().default("accepted"),
    rejectionCode: text("rejection_code"),
  },
  (table) => [
    index("idx_received_mutations_org_received").on(
      table.organizationId,
      table.receivedAt,
    ),
    index("idx_received_mutations_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export const syncConflicts = pgTable(
  "sync_conflicts",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    mutationId: text("mutation_id")
      .notNull()
      .references(() => receivedLocalMutations.mutationId),
    entityType: localMutationEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    clientPayloadJson: jsonb("client_payload_json").notNull(),
    serverPayloadJson: jsonb("server_payload_json").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sync_conflicts_org").on(table.organizationId, table.createdAt),
    index("idx_sync_conflicts_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId,
    ),
  ],
);
