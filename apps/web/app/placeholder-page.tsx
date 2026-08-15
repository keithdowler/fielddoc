import Link from "next/link";
import { resolvePublicProductName } from "@fielddoc/config";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const productName = resolvePublicProductName(
    process.env.NEXT_PUBLIC_PRODUCT_NAME,
  );

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">{productName}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link href="/">Back home</Link>
      </section>
    </main>
  );
}
