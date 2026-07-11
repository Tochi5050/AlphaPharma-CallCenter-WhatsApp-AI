import type { Metadata } from 'next';
import { Layout } from '@/components/Layout';
import '@/styles/index.css';

export const metadata: Metadata = {
  title: 'Call center WhatsApp AI Handoff',
  description:
    'Manage and review AI-to-human handoff conversations from WhatsApp. Classify, log and resolve customer conversations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
