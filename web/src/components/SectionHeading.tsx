export function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2
      id={id}
      className="scroll-mt-20 border-b border-line pb-2 text-[20px] font-semibold tracking-tight text-ink"
    >
      {title}
    </h2>
  );
}
