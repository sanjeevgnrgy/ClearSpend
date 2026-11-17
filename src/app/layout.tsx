import type { Metadata } from 'next';
import {
  Bricolage_Grotesque,
  DM_Sans,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClearspendProvider } from '@/context/ClearspendProvider';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-bricolage',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Clearspend — Agentic Expense Tracker & Group Splits',
  description:
    'Voice-capture expenses, split receipt line items, prevent cash-flow collisions, and settle group tabs without spreadsheets.',
  openGraph: {
    title: 'Clearspend — Agentic Expense Tracker & Group Splits',
    description:
      'Voice-capture expenses, split receipt line items, prevent cash-flow collisions, and settle group tabs without spreadsheets.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable} scroll-smooth`}
    >
      <body className="bg-[#FAFAFA] text-zinc-900 antialiased selection:bg-emerald-700 selection:text-white">
        <ErrorBoundary>
          <ClearspendProvider>{children}</ClearspendProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
