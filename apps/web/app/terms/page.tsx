import Link from "next/link";
import { resolvePublicProductName } from "@fielddoc/config";

export default function TermsPage() {
  const productName = resolvePublicProductName(
    process.env.NEXT_PUBLIC_PRODUCT_NAME,
  );

  return (
    <main className="legalShell">
      <article className="legalDocument">
        <p className="eyebrow">Terms of Service</p>
        <h1>{productName} Terms of Service</h1>
        <p className="legalUpdated">Last updated: August 19, 2026</p>

        <section>
          <h2>Use of the Service</h2>
          <p>
            {productName} helps field-service teams organize job evidence,
            generate Proof Packets, and review synced workspace records. You are
            responsible for using the service lawfully and for ensuring that job
            records you capture are accurate and appropriate to share.
          </p>
        </section>

        <section>
          <h2>Customer Content</h2>
          <p>
            You retain responsibility for the photos, documents, notes, reports,
            and other job records you add to the service. Do not upload content
            you do not have permission to use, store, or share.
          </p>
        </section>

        <section>
          <h2>Reports and Evidence</h2>
          <p>
            Proof Packets are documentation tools. They do not create legal,
            engineering, insurance, inspection, or compliance conclusions unless
            your own qualified personnel add those conclusions separately.
          </p>
        </section>

        <section>
          <h2>Subscriptions</h2>
          <p>
            Paid features may require an active subscription. Subscription
            purchase, renewal, cancellation, and restoration depend on the app
            store or billing provider used for your account.
          </p>
        </section>

        <section>
          <h2>Availability</h2>
          <p>
            The mobile app is designed for local-first work, but cloud sync,
            report archive, sharing, account, and subscription features depend
            on external services and network availability.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For account, billing, or support questions, contact the product
            operator or support address associated with your deployment.
          </p>
        </section>

        <nav className="linkRow" aria-label="Legal navigation">
          <Link href="/">Home</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/app/settings">Readiness</Link>
        </nav>
      </article>
    </main>
  );
}
