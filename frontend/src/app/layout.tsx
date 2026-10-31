import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FixMyCity — Municipal Incident Reporting',
  description: 'Civic incident-reporting and municipal resolution platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
