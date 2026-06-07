import type { ReactNode } from 'react';

export const metadata = {
  title: 'POD API',
  description: 'Webhooks and Inngest workflows for the POD Agent OS.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
