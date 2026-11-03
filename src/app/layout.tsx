// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext'; // Add this import
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SearchProvider } from '@/contexts/SearchContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import MaintenanceGate from '@/components/MaintenanceGate';
import localFont from 'next/font/local';

const inter = Inter({ subsets: ['latin'] });

// Load Vezla font locally
const vezla = localFont({
  src: '../../public/fonts/Vezla.ttf', // Path to your TTF file
  variable: '--font-vezla',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sportrz - Play Amazing HTML5 Games',
  description: 'Discover and play over 500 amazing HTML5 games on Sportrz. From action to puzzle games, we have something for everyone!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${vezla.variable}`}>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <NotificationProvider>
              <SubscriptionProvider>
              <AdminProvider> {/* Add this wrapper */}
                <SearchProvider>
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <Navbar />
                    <main className="flex-1">
                      <MaintenanceGate>{children}</MaintenanceGate>
                    </main>
                    <Footer />
                  </div>
                </SearchProvider>
              </AdminProvider> {/* Close the wrapper */}
              </SubscriptionProvider>
                          </NotificationProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}