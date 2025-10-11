import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/toaster'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GKICKS - Premium Shoe Store',
  description: 'Discover the latest collection of premium shoes for men, women, and kids at GKICKS. Quality footwear with style and comfort.',
  keywords: 'shoes, sneakers, footwear, men shoes, women shoes, kids shoes, premium shoes',
  authors: [{ name: 'GKICKS Team' }],
  icons: {
    icon: '/images/gkicks-transparent-logo.png',
    shortcut: '/images/gkicks-transparent-logo.png',
    apple: '/images/gkicks-transparent-logo.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      <link 
        rel="preload" 
        href="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js" 
        as="script" 
        crossOrigin="anonymous"
      />
      <Script 
        src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"
        strategy="beforeInteractive"
        type="module"
      />
      <Providers>
          <Header />
        {children}
        <Footer />
        <Toaster />
      </Providers>
    </div>
  )
}