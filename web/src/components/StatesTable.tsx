import type { UnitState } from "@/lib/types";

const COLUMNS = ["state", "motion", "haptic"] as const;

/**
 * unit.json `states` as a hairline table (CONTRIBUTING.md rule 9). The state name stays on
 * one line; motion and haptic wrap, so the three columns fit at phone width.
 */
export function StatesTable({ states }: { states: UnitState[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th
              key={column}
              scope="col"
              className="eyebrow border-b border-line py-2 pr-4 font-normal text-muted last:pr-0"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {states.map((row, index) => (
          <tr key={`${row.state}-${index}`}>
            <td className="mono whitespace-nowrap border-b border-line py-2 pr-4 align-top text-[12px] text-ink">
              {row.state}
            </td>
            <td className="mono border-b border-line py-2 pr-4 align-top text-[12px] text-muted [overflow-wrap:anywhere]">
              {row.motion}
            </td>
            <td className="mono border-b border-line py-2 align-top text-[12px] text-muted [overflow-wrap:anywhere]">
              {row.haptic}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
