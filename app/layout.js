import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'Pool Competitie',
  description: 'Vriendschappelijke poolcompetitie - klassement, kalender, wedstrijden',
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
