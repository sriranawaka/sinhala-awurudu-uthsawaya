"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";
import { getGames, getRegistrationsByGame } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { Game, GameRegistration } from "@/types";

const groupConfig: Record<string, { label: string; bg: string; text: string; solid: string }> = {
  kid: { label: "Kids", bg: "bg-success/10", text: "text-success", solid: "bg-success" },
  teen: { label: "Teens", bg: "bg-info/10", text: "text-info", solid: "bg-info" },
  adult: { label: "Adults", bg: "bg-primary/10", text: "text-primary", solid: "bg-primary" },
};

export default function CompetePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const t = useTranslations("gameDetail");
  const tc = useTranslations("common");
  const [game, setGame] = useState<Game | null>(null);
  const [registrations, setRegistrations] = useState<GameRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getGames(),
      getRegistrationsByGame(gameId).catch(() => [] as GameRegistration[]),
    ]).then(([games, r]) => {
      setGame(games.find((g) => g.id === gameId) || null);
      setRegistrations(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center bg-white">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center p-6 bg-white">
        <p className="text-gray-400 text-sm">Game not found</p>
        <Link href="/games" className="text-gray-900 text-sm mt-2 underline">
          ← {t("backToGames")}
        </Link>
      </main>
    );
  }

  const ageGroups: { key: string; label: string; bg: string; text: string; solid: string }[] = [];
  if (game.eligibleGroups.kids) ageGroups.push({ key: "kid", ...groupConfig.kid, label: tc("kids") });
  if (game.eligibleGroups.teens) ageGroups.push({ key: "teen", ...groupConfig.teen, label: tc("teens") });
  if (game.eligibleGroups.adults) ageGroups.push({ key: "adult", ...groupConfig.adult, label: tc("adults") });

  const regByGroup: Record<string, GameRegistration[]> = {
    adult: registrations.filter((r) => r.ageGroup === "adult"),
    teen: registrations.filter((r) => r.ageGroup === "teen"),
    kid: registrations.filter((r) => r.ageGroup === "kid"),
  };

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-6 pb-24">
        {/* Back arrow */}
        <Link
          href={`/games/${gameId}`}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {game.name}
        </Link>

        {/* Header — nobank style */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-[36px] font-black tracking-tight text-gray-900 leading-[1.1]">
            {t("participants")}
          </h1>
          <p className="text-[15px] text-gray-400 mt-1.5 font-normal leading-snug">
            {t("participantsSubtext")}
          </p>
        </div>

        {/* Age Group Cards */}
        <div className="space-y-2 mb-6">
          {ageGroups.map((group) => {
            const regs = regByGroup[group.key] || [];
            return (
              <Link
                key={group.key}
                href={`/games/${gameId}/register/${group.key}`}
                className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-4 hover:bg-gray-100 transition-colors"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", group.solid)}>
                  <Users className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-gray-900">{group.label}</h3>
                  <p className="text-[12px] text-gray-400 truncate">
                    {regs.length > 0
                      ? regs.map((r) => r.participantName).slice(0, 3).join(", ") + (regs.length > 3 ? ` +${regs.length - 3}` : "")
                      : t("registerPrompt")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold", group.bg, group.text)}>
                    {regs.length}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
