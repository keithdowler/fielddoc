import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolvePublicProductName } from "@fielddoc/config";
import "./globals.css";

export const metadata: Metadata = {
  title: resolvePublicProductName(process.env.NEXT_PUBLIC_PRODUCT_NAME),
  description: "Field documentation and customer report workspace.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
