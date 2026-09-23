import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Pageview } from "@/components/Pageview";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Oddly Satisfying Motion";
const DESCRIPTION =
  "Animated SwiftUI button units with haptics and timing. Copy two files. Nothing to configure.";

export const metadata: Metadata = {
  title: {
    default: `${TITLE}: animated SwiftUI buttons with haptics`,
    template: `%s · ${TITLE}`,
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: `${TITLE}: animated SwiftUI buttons with haptics`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: `${TITLE}: animated SwiftUI buttons with haptics`,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full ${GeistSans.variable} ${GeistMono.variable}`}
      // Browser extensions (screen recorders, translators) add attributes to <html> before
      // React hydrates; that is not a rendering bug, so only this element suppresses the warning.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a href="#content" className="skip-link mono rounded-[6px] bg-ink px-3 py-2 text-[12px] text-bg">
          Skip to content
        </a>
        <Pageview />
        <SiteNav />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
