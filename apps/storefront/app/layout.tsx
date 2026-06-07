import type { ReactNode } from 'react';

export const metadata = {
  title: 'POD Store',
  description: 'Print-on-demand storefront powered by headless Shopify.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
