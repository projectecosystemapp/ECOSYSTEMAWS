import type { Metadata } from "next";
import { Suspense } from 'react';

import "./globals.css";
import '@aws-amplify/ui-react/styles.css';
import ConfigureAmplifyClientSide from "./amplify-config";
import ClientLayout from "./client-layout";

export const metadata: Metadata = {
  title: "Ecosystem Global Solutions - Service Marketplace",
  description: "Find and book trusted local services with our 8% commission marketplace platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConfigureAmplifyClientSide />
        <Suspense fallback={null}>
          <ClientLayout>{children}</ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
