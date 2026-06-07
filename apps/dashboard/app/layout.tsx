import type { ReactNode } from 'react';

export const metadata = {
  title: 'POD Command Center',
  description: 'Private dashboard for the POD Agent OS.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
