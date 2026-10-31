import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'FixMyCity — Municipal Incident Reporting Platform',
  description:
    'Civic incident-reporting and municipal resolution platform connecting citizens with city maintenance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>© {new Date().getFullYear()} FixMyCity Municipal Platform. All rights reserved.</p>
              <p className="text-slate-400">
                Civic Service • Rapid Resolution • City Transparency
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
