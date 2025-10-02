"use client";
import React from "react";
import { CampaignRow } from "./CampaignRow";
import { CampaignRow as CampaignRowData} from "../../../lib/types";
import SkeletonRow from "../SkeletonRow";
import { UiRec } from "../../../features/campaigns/mapRecToUi";

type SortKey =
  | "channel"
  | "name"
  | "spend"
  | "revenue"
  | "roas"
  | "cpa"
  | "ctr"
  | "frequency"
  | "recommendation";

  export type CampaignRowUI = Omit<CampaignRowData, "recommendation"> & {
    recommendation?: UiRec;
  };

export default function CampaignTable({
  rows,
  sortBy,
  sortDir,
  onSort,
  onOpenCampaign,
  loading,
  emptyMessage = "No results found for current filters. Reset filters or modify your search.",
  onGenerateAction,
}: {
  rows: CampaignRowUI[];
  sortBy: SortKey | null;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onOpenCampaign: (row: CampaignRowData) => void;
  loading?: boolean;
  emptyMessage?: string;
  onGenerateAction?: (row: CampaignRowData) => void;
}) {
  const settings = { compact: false };
  const cellBase = `p-3 ${settings.compact ? "py-1.5" : ""}`;

  return (
    <section className="panel p-0 rounded-2xl overflow-hidden border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="max-h-[60vh] w-full overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 muted sticky top-0">
            <tr>
              <Th text="Channel"   align="left"  cellBase={cellBase} onClick={() => onSort("channel")}   active={sortBy==="channel"} dir={sortDir} />
              <Th text="Campaign"  align="left"  cellBase={cellBase} onClick={() => onSort("name")}      active={sortBy==="name"} dir={sortDir} />
              <Th text="Spend"     align="right" cellBase={cellBase} onClick={() => onSort("spend")}     active={sortBy==="spend"} dir={sortDir} />
              <Th text="Revenue"   align="right" cellBase={cellBase} onClick={() => onSort("revenue")}   active={sortBy==="revenue"} dir={sortDir} />
              <Th text="ROAS"      align="right" cellBase={cellBase} onClick={() => onSort("roas")}      active={sortBy==="roas"} dir={sortDir} />
              <Th text="CPA"       align="right" cellBase={cellBase} onClick={() => onSort("cpa")}       active={sortBy==="cpa"} dir={sortDir} />
              <Th text="CTR"       align="right" cellBase={cellBase} onClick={() => onSort("ctr")}       active={sortBy==="ctr"} dir={sortDir} />
              <Th text="Freq"      align="right" cellBase={cellBase} onClick={() => onSort("frequency")} active={sortBy==="frequency"} dir={sortDir} />
              <Th text="Recommendation" align="left" cellBase={cellBase} onClick={() => onSort("recommendation")} active={sortBy==="recommendation"} dir={sortDir} />
              <th className={`text-right ${cellBase}`}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {rows.map((r) => (
              <CampaignRow key={r.id} row={r} onOpen={onOpenCampaign} onGenerateAction={onGenerateAction} />
            ))}

            {loading && (
              // <tr>
              //   <td colSpan={10} className="p-6 text-center text-gray-500">
              //     Loading…
              //   </td>
              // </tr>
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({
  text,
  align,
  cellBase,
  onClick,
  active,
  dir,
}: {
  text: string;
  align: "left" | "right";
  cellBase: string;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th
      className={`text-${align} ${cellBase} select-none cursor-pointer`}
      onClick={onClick}
      title="Sort"
    >
      <span className="inline-flex items-center gap-1">
        {text}
        <SortGlyph active={active} dir={dir} />
      </span>
    </th>
  );
}

function SortGlyph({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-300">↕</span>;
  return <span>{dir === "asc" ? "↑" : "↓"}</span>;
}
