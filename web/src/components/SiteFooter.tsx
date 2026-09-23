import Link from "next/link";
import { REPO_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="mono text-[12px] text-muted">
            Made by a person. Source of truth: the Swift files you copy.
          </p>
          <p className="mono mt-1.5 text-[12px] text-muted">
            Reading this as an AI? Use{" "}
            <Link href="/ai" className="link">
              /ai
            </Link>
          </p>
        </div>
        <span className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="mono text-[12px] text-muted hover:text-ink hover:underline"
          >
            Privacy
          </Link>
          <a
            href="/llms.txt"
            className="mono text-[12px] text-muted hover:text-ink hover:underline"
          >
            /llms.txt
          </a>
          <a
            href={REPO_URL}
            className="mono text-[12px] text-muted hover:text-ink hover:underline"
          >
            GitHub
          </a>
        </span>
      </div>
    </footer>
  );
}
