import type { AppProps } from 'next/app'
import Head from 'next/head'
import { SessionProvider } from 'next-auth/react'
import ErrorBoundary from '../components/ErrorBoundary'
import { DXOSProvider } from '../lib/dxos/context'
import '../styles/globals.css'
import '../styles/online-users-debug.css'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        <DXOSProvider autoInitialize={true}>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#D4AF37" />
            <meta name="description" content="Etherith - Local-first social media ecosystem powered by peer-to-peer technology" />
            <link rel="manifest" href="/manifest.json" />
            <link rel="apple-touch-icon" href="/icon.svg" />
            <title>Etherith - Social Media Ecosystem</title>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  // Preload Automerge to ensure it's available globally
                  if (typeof window !== 'undefined') {
                    window.__AUTOMERGE_PRELOAD__ = true;
                  }
                `,
              }}
            />
          </Head>
          <Component {...pageProps} />
        </DXOSProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}
