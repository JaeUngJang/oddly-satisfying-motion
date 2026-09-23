import type { Metadata } from "next";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site stores: nothing. No cookies, no accounts, and analytics events that never leave the page.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "No cookies",
    body: [
      "This site sets no cookies and runs no third-party tag, pixel or analytics vendor. The fonts are served from this domain, so loading a page does not call anyone else.",
    ],
  },
  {
    heading: "No accounts, nothing stored",
    body: [
      "There is nothing to sign up for and nothing to log in to. The site writes nothing to your browser's storage, so there is nothing to clear.",
    ],
  },
  {
    heading: "Analytics",
    body: [
      "A handful of events (page view, copying a file, a usage line or the AI page, pressing a live example, opening a GitHub link) are pushed into an in-page JavaScript array called dataLayer. Nothing reads that array yet and nothing sends it anywhere; it is gone when you close the tab. It exists so a vendor can be added later without rewriting the site. If that day comes, this page changes first.",
    ],
  },
  {
    heading: "GitHub",
    body: [
      "Requesting a unit, contributing and following releases happen on GitHub, under your GitHub account and GitHub's own privacy terms. This site only notes, in the same in-page array, that one of those links was opened.",
    ],
  },
  {
    heading: "Files you copy",
    body: [
      "The Swift files are static text served from this domain. Copying one is a clipboard action in your browser: no request is made, and the copy event never leaves the page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16 sm:px-6">
      <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
        Privacy
      </h1>

      <p className="prose-measure mt-4 text-[15px] text-muted">
        Short version: this is a static site with no server of its own and no
        accounts, so there is nothing for it to store about you.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="border-b border-line pb-2 text-[20px] font-semibold tracking-tight text-ink">
            {section.heading}
          </h2>
          {section.body.map((paragraph) => (
            <p
              key={paragraph}
              className="prose-measure mt-4 text-[15px] text-muted"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <p className="mono mt-12 text-[12px] text-muted">
        A question, or something here that stopped being true?{" "}
        <a href={REPO_URL} className="link">
          Raise it on GitHub
        </a>
      </p>
    </div>
  );
}
