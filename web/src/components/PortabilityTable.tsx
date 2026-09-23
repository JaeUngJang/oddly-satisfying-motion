import type { Portability } from "@/lib/types";

export function PortabilityTable({ data }: { data: Portability }) {
  return (
    <figure>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {data.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="eyebrow border-b border-line py-2 pr-4 font-normal text-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.host}>
              <td className="mono border-b border-line py-2 pr-4 text-[12px] text-ink">
                {row.host}
              </td>
              <td className="mono border-b border-line py-2 pr-4 text-[12px] text-muted">
                {row.target}
              </td>
              <td className="mono border-b border-line py-2 pr-4 text-[12px] text-ink">
                {row.result}
              </td>
              <td className="mono border-b border-line py-2 pr-4 text-[12px] text-muted">
                {row.warnings}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mono mt-2 text-[11px] text-muted">
        {data.caption}
      </figcaption>
    </figure>
  );
}
