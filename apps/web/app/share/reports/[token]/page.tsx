import { resolvePublicProductName } from "@fielddoc/config";
import Link from "next/link";

import { getPublicReportShareView } from "../../../api/reports/report-service";
import { createReportRouteDependencies } from "../../../api/reports/route-dependencies";

type SharedReportPageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharedReportPage({
  params,
}: SharedReportPageProps) {
  const { token } = await params;
  const productName = resolvePublicProductName(
    process.env.NEXT_PUBLIC_PRODUCT_NAME,
  );
  const share = await getPublicReportShareView(
    token,
    createReportRouteDependencies(),
  );

  if (!share.ok) {
    return (
      <main className="shareShell">
        <section className="sharePanel">
          <p className="eyebrow">{productName}</p>
          <h1>FieldDoc report unavailable</h1>
          <p>{share.message}</p>
          <dl className="shareMeta">
            <div>
              <dt>Status</dt>
              <dd>{share.status}</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>{share.code}</dd>
            </div>
          </dl>
        </section>
      </main>
    );
  }

  return (
    <main className="shareShell">
      <section className="sharePanel">
        <p className="eyebrow">{productName}</p>
        <div className="sectionTitleRow detailHeader">
          <div>
            <h1>FieldDoc report ready</h1>
            <p>
              This link provides temporary access to a private archived PDF.
              Download it before the link expires.
            </p>
          </div>
          <span className="statusPill ready">Verified link</span>
        </div>

        <dl className="shareMeta">
          <div>
            <dt>File</dt>
            <dd>
              {share.mimeType} / {formatBytes(share.sizeBytes)}
            </dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>{formatDate(share.generatedAt)}</dd>
          </div>
          <div>
            <dt>Archived</dt>
            <dd>{formatDate(share.uploadedAt)}</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{formatDate(share.expiresAt)}</dd>
          </div>
          <div>
            <dt>SHA-256</dt>
            <dd>{share.sha256}</dd>
          </div>
        </dl>

        <div className="shareNotice">
          <strong>Integrity note</strong>
          <p>
            FieldDoc stores report PDFs in private object storage and issues a
            short-lived storage URL only when you download.
          </p>
        </div>

        <div className="linkRow">
          <Link
            className="primaryLinkButton"
            href={share.downloadPath}
            prefetch={false}
          >
            Download FieldDoc Report
          </Link>
        </div>
      </section>
    </main>
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
