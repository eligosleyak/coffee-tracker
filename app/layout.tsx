import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coffee Tracker',
  description: 'Track my coffee expenses',
  generator: 'eligosleyak',
}

const svgFavicon = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="30" fill="#6f4e37" />
    <text x="50%" y="50%" text-anchor="middle" fill="#fff" font-size="24" font-family="Arial" dy=".35em">☕</text>
  </svg>
`;

const encodedFavicon = `data:image/svg+xml;base64,${Buffer.from(svgFavicon).toString('base64')}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href={encodedFavicon} />
      </head>
      <body>{children}</body>
    </html>
  )
}
