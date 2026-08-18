import {
  defaultReportBranding,
  normalizeReportBranding,
  type ReportBranding,
  type ReportBrandingRepository,
  type SaveReportBrandingInput,
} from "@fielddoc/domain";

import type { LocalDatabase } from "./database";

const reportBrandingKey = "report_branding";

type LocalSettingRow = {
  value_json: string;
  updated_at: string;
};

export class SqliteReportBrandingRepository implements ReportBrandingRepository {
  constructor(private readonly database: LocalDatabase) {}

  async get(): Promise<ReportBranding> {
    const row = await this.database.getFirst<LocalSettingRow>(
      "SELECT value_json, updated_at FROM local_settings WHERE key = ?",
      [reportBrandingKey],
    );

    if (!row) return defaultReportBranding;

    try {
      const parsed = JSON.parse(row.value_json) as ReportBranding;

      return normalizeReportBranding(
        {
          companyName: parsed.companyName ?? undefined,
          preparedBy: parsed.preparedBy ?? undefined,
          footerText: parsed.footerText ?? undefined,
          accentColor: parsed.accentColor,
        },
        {
          existing: defaultReportBranding,
          now: parsed.updatedAt ?? row.updated_at,
        },
      );
    } catch {
      return defaultReportBranding;
    }
  }

  async save(input: SaveReportBrandingInput): Promise<ReportBranding> {
    const now = new Date().toISOString();
    const existing = await this.get();
    const branding = normalizeReportBranding(input, {
      existing,
      now,
    });

    await this.database.run(
      `
        INSERT INTO local_settings (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at
      `,
      [reportBrandingKey, JSON.stringify(branding), branding.updatedAt],
    );

    return branding;
  }
}
