import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6">
      <p className="mono text-[13px] text-ink">
        404. That page is not in the catalog.
      </p>
      <p className="mono mt-3 text-[13px] text-muted">
        <Link href="/" className="link">
          Back to the units
        </Link>
      </p>
    </div>
  );
}
