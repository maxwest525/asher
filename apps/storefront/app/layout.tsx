import type { ReactNode } from 'react';

export const metadata = {
  title: 'POD Store',
  description: 'Print-on-demand storefront powered by headless Shopify.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui' }}>
        <header style={{ borderBottom: '1px solid #e0e0e0', padding: '0 3rem' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24, height: 56 }}>
            <a href="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: 'none', color: '#111' }}>POD Store</a>
            <nav style={{ display: 'flex', gap: 16 }}>
              <a href="/collections/all" style={{ color: '#555', textDecoration: 'none' }}>All Products</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
