import type { AppProps } from 'next/app'
import Head from 'next/head'
import { SessionProvider } from 'next-auth/react'
import ErrorBoundary from '../components/ErrorBoundary'
import '../styles/globals.css'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <meta name="description" content="Your work, untouchable. From upload to eternity." />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icon.svg" />
          <title>Etherith - Permanent Storage, Future-Proofed</title>
        </Head>
        <Component {...pageProps} />
      </SessionProvider>
    </ErrorBoundary>
  )
}
