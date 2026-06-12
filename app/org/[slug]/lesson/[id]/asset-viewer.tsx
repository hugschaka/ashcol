"use client";

import { useState } from "react";
import { FullAssetView } from "@/components/asset-view";

type Asset = { type: string; content: unknown; fileUrl?: string | null };

const TYPE_META: Record<string, { label: string; icon: string }> = {
  PRESENTATION: { label: "מצגת", icon: "📊" },
  QUIZ: { label: "שאלון", icon: "📝" },
  FLASHCARDS: { label: "כרטיסיות", icon: "🃏" },
  INFOGRAPHIC: { label: "אינפוגרפיה", icon: "🎨" },
};

export function AssetViewer({ assets }: { assets: Asset[] }) {
  const [activeType, setActiveType] = useState(assets[0]?.type);
  const active = assets.find((a) => a.type === activeType);

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 flex-wrap">
        {assets.map((asset) => {
          const meta = TYPE_META[asset.type] ?? { label: asset.type, icon: "📄" };
          const isActive = asset.type === activeType;
          return (
            <button
              key={asset.type}
              onClick={() => setActiveType(asset.type)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "border border-neutral-300 text-neutral-600 hover:border-accent"
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          );
        })}
      </nav>

      {active && (
        <div className="rounded-2xl border border-neutral-200 p-4">
          <FullAssetView
            type={active.type}
            content={active.content}
            fileUrl={active.fileUrl}
          />
        </div>
      )}
    </div>
  );
}
