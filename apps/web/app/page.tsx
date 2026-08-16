import Link from "next/link";
import { evidenceCategories } from "@fielddoc/domain";
import { resolvePublicProductName } from "@fielddoc/config";

export default function Home() {
  const productName = resolvePublicProductName(
    process.env.NEXT_PUBLIC_PRODUCT_NAME,
  );

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Sprint 0 foundation</p>
        <h1>{productName}</h1>
        <p>
          Placeholder web surface for a field documentation and proof packet
          product. Product workflows start in later sprints.
        </p>
        <nav className="linkRow" aria-label="Primary">
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Create account</Link>
          <Link href="/app">App</Link>
          <Link href="/app/projects">Projects</Link>
          <Link href="/app/reports">Reports</Link>
          <Link href="/app/settings">Settings</Link>
        </nav>
        <p className="small">
          Shared evidence categories are loaded from the domain package:{" "}
          {evidenceCategories.join(", ")}.
        </p>
      </section>
    </main>
  );
}
