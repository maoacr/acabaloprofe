import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Acabalo Juez',
    template: '%s · Acabalo Juez',
  },
  description:
    'Plataforma de predicciones futboleras — compite con amigos pronosticando marcadores. Gratis, sin apuestas, puro fútbol.',
  applicationName: 'Acabalo Juez',
  keywords: ['polla futbolera', 'predicciones', 'fútbol', 'mundial', 'copa américa'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Acabalo Juez',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">{children}</body>
    </html>
  );
}
