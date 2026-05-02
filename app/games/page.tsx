"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { onGamesSnapshot } from "@/lib/db";
import type { Game, GameEventStatus, EventKey } from "@/types";
import { eventKeyGroups } from "@/types";

const STATUS_ORDER: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting", "finished"];

function getLatestEventStatus(game: Game): { key: string; color: string } {
  if (!game.events || Object.keys(game.events).length === 0) {
    // Fallback to old game-level status
    if (game.status === "completed") return { key: "done", color: "bg-gray-100 text-gray-500" };
    if (game.votingOpen) return { key: "voteNow", color: "bg-amber-50 text-amber-600" };
    if (game.guessOpen) return { key: "guessNow", color: "bg-amber-50 text-amber-600" };
    if (game.status === "active") return { key: "live", color: "bg-emerald-50 text-emerald-600" };
    return { key: "upcoming", color: "bg-blue-50 text-blue-500" };
  }

  // Find the overall game status from event statuses
  const eventStatuses = Object.values(game.events).map((ev) => ev.status);
  const allFinished = eventStatuses.every((s) => s === "finished");
  let latestStatus: GameEventStatus;
  if (allFinished) {
    latestStatus = "finished";
  } else {
    // Take the least progressed (youngest) event status
    let minIdx = STATUS_ORDER.length - 1;
    for (const s of eventStatuses) {
      const idx = STATUS_ORDER.indexOf(s);
      if (idx < minIdx) minIdx = idx;
    }
    latestStatus = STATUS_ORDER[minIdx];
  }

  const statusMap: Record<GameEventStatus, { key: string; color: string }> = {
    "not-started": { key: "upcoming", color: "bg-blue-50 text-blue-500" },
    "starting-soon": { key: "upcoming", color: "bg-amber-50 text-amber-600" },
    "started": { key: "live", color: "bg-emerald-50 text-emerald-600" },
    "voting": { key: "voteNow", color: "bg-amber-50 text-amber-600" },
    "finished": { key: "done", color: "bg-gray-100 text-gray-500" },
  };
  return statusMap[latestStatus];
}

export default function GamesPage() {
  const t = useTranslations("games");
  const tc = useTranslations("common");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onGamesSnapshot((g) => {
      setGames(g);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24">
        {/* Header — nobank style */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">
            {t("title")}
          </h1>
          <p className="text-[15px] sm:text-base text-gray-400 mt-2 font-normal leading-snug">
            {t("subtitle", { count: games.length })}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game) => {
              // Derive event labels from game.events keys
              const eventLabels: { label: string; bg: string; text: string }[] = [];
              if (game.events && Object.keys(game.events).length > 0) {
                for (const key of Object.keys(game.events)) {
                  const groups = eventKeyGroups(key as EventKey);
                  const label = groups.map((g) => g === "kid" ? tc("kids") : g === "teen" ? tc("teens") : tc("adults")).join(" & ");
                  const firstGroup = groups[0];
                  const colorMap = {
                    kid: { bg: "bg-success/10", text: "text-success" },
                    teen: { bg: "bg-info/10", text: "text-info" },
                    adult: { bg: "bg-primary/10", text: "text-primary" },
                  };
                  eventLabels.push({ label, ...colorMap[firstGroup] });
                }
              } else {
                // Fallback: derive from eligibleGroups
                if (game.eligibleGroups.kids)
                  eventLabels.push({ label: tc("kids"), bg: "bg-success/10", text: "text-success" });
                if (game.eligibleGroups.teens)
                  eventLabels.push({ label: tc("teens"), bg: "bg-info/10", text: "text-info" });
                if (game.eligibleGroups.adults)
                  eventLabels.push({ label: tc("adults"), bg: "bg-primary/10", text: "text-primary" });
              }

              const status = getLatestEventStatus(game);

              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="block bg-gray-50 rounded-xl px-4 py-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-bold text-gray-900 truncate">
                        {game.name}
                      </h3>
                      <p className="text-[13px] text-gray-400 truncate leading-tight mt-0.5">
                        {game.nameSi}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {eventLabels.map((ev) => (
                      <span
                        key={ev.label}
                        className={cn(
                          "text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
                          ev.bg,
                          ev.text
                        )}
                      >
                        {ev.label}
                      </span>
                    ))}
                    <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold ml-auto", status.color)}>
                      {t(status.key)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
