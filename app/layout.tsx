import type { Metadata } from "next"
import { Noto_Sans_JP } from "next/font/google"
import "./globals.css"

const noto = Noto_Sans_JP({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "テンポをキープするやつ！",
  twitter: {
    card: "summary",
    site: "@hashedhyphen",
    creator: "@hashedhyphen",
  },
  openGraph: {
    url: "https://tempo-test-128.vercel.app/",
    title: "テンポをキープするやつ！",
    images:
      "https://raw.githubusercontent.com/hashedhyphen/tempo-test/master/public/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={noto.className}>{children}</body>
    </html>
  )
}
