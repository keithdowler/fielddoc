import Link from "next/link";
import { resolvePublicProductName } from "@fielddoc/config";

export default function PrivacyPage() {
  const productName = resolvePublicProductName(
    process.env.NEXT_PUBLIC_PRODUCT_NAME,
  );

  return (
    <main className="legalShell">
      <article className="legalDocument">
        <p className="eyebrow">Privacy Policy</p>
        <h1>{productName} Privacy Policy</h1>
        <p className="legalUpdated">Last updated: August 19, 2026</p>

        <section>
          <h2>What We Store</h2>
          <p>
            {productName} stores job documentation that you choose to create,
            capture, upload, or sync, including project details, evidence
            captions, notes, media metadata, report drafts, generated reports,
            and account information needed to operate your workspace.
          </p>
        </section>

        <section>
          <h2>Photos, Documents, and Reports</h2>
          <p>
            Original job media and generated Proof Packets are treated as
            private workspace records. They are used to provide capture, backup,
            report generation, download, and sharing features that you request.
          </p>
        </section>

        <section>
          <h2>Authentication and Billing</h2>
          <p>
            Authentication is handled through Clerk. Subscription status may be
            checked through RevenueCat. These providers process account or
            entitlement data so the app can sign users in and protect paid cloud
            features.
          </p>
        </section>

        <section>
          <h2>Offline Data</h2>
          <p>
            Mobile work may be saved locally on your device before it is backed
            up. Deleting the app or clearing local data can remove device-local
            records that have not yet been synced.
          </p>
        </section>

        <section>
          <h2>Support and Deletion</h2>
          <p>
            Account export and deletion requests should be sent to the support
            contact configured for your workspace. We will use that request to
            locate account records and remove or export data where required by
            applicable law and operational constraints.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy questions, contact the product operator or support
            address associated with your deployment.
          </p>
        </section>

        <nav className="linkRow" aria-label="Legal navigation">
          <Link href="/">Home</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/app/settings">Readiness</Link>
        </nav>
      </article>
    </main>
  );
}
