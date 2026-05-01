"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { getGames, getParticipants, getRegistrationsByGame, getScoresByGame, setScore, deleteScore } from "@/lib/db";
import { onAuthChange } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AvatarIcon } from "@/components/avatar-icon";
import type { Game, Participant, GameRegistration, RegistrationAgeGroup, Score } from "@/types";

const positionPoints: Record<1 | 2 | 3, number> = { 1: 3, 2: 2, 3: 1 };
const positionLabel: Record<1 | 2 | 3, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
const positionMedalSrc: Record<1 | 2 | 3, string> = { 1: "/medals/1st.png", 2: "/medals/2nd.png", 3: "/medals/3rd.png" };

const groupConfig: Record<string, { label: string; color: string; lightColor: string }> = {
  adult: { label: "Adults", color: "bg-primary", lightColor: "bg-primary/10 text-primary" },
  teen: { label: "Teens", color: "bg-info", lightColor: "bg-info/10 text-info" },
  kid: { label: "Kids", color: "bg-success", lightColor: "bg-success/10 text-success" },
};

export default function JudgingPage({
  params,
}: {
  params: Promise<{ gameId: string; ageGroup: string }>;
}) {
  const { gameId, ageGroup } = use(params);
  const t = useTranslations("judging");
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registrations, setRegistrations] = useState<GameRegistration[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreBusy, setScoreBusy] = useState(false);
  const [isJudge, setIsJudge] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    return onAuthChange((user) => {
      setIsJudge(!!user);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    Promise.all([
      getGames(),
      getParticipants(),
      getRegistrationsByGame(gameId),
      getScoresByGame(gameId),
    ]).then(([games, p, r, s]) => {
      setGame(games.find((g) => g.id === gameId) || null);
      setParticipants(p);
      setRegistrations(r);
      setScores(s);
      setLoading(false);
    });
  }, [gameId]);

  const config = groupConfig[ageGroup] || groupConfig.adult;

  // Filter registrations for this age group
  const ageRegs = registrations.filter((r) => r.ageGroup === ageGroup);
  const registeredIds = new Set(ageRegs.map((r) => r.participantId));

  // Get registered participants
  const registered = participants.filter((p) => registeredIds.has(p.id));

  // Scores filtered to this age group
  const ageScores = scores.filter((s) => (s.ageGroup || "adult") === ageGroup);
  const scoreByParticipant = new Map(ageScores.map((s) => [s.participantId, s]));
  const scoreByPosition = new Map(ageScores.map((s) => [s.position, s]));

  const handlePosition = async (participant: Participant, position: 1 | 2 | 3) => {
    setScoreBusy(true);
    try {
      const existing = scoreByParticipant.get(participant.id);
      // If already has this position, remove it (toggle off)
      if (existing?.position === position) {
        await deleteScore(gameId, participant.id);
      } else {
        // If someone else has this position in same age group, remove them first
        const holder = scoreByPosition.get(position);
        if (holder && holder.participantId !== participant.id) {
          await deleteScore(gameId, holder.participantId);
        }
        // If this participant had a different position, remove it
        if (existing) {
          await deleteScore(gameId, participant.id);
        }
        // Assign new position
        await setScore({
          gameId,
          participantId: participant.id,
          participantName: participant.name,
          ageGroup: ageGroup as RegistrationAgeGroup,
          position,
          points: positionPoints[position],
          timestamp: Date.now(),
        });
      }
      const freshScores = await getScoresByGame(gameId);
      setScores(freshScores);
    } finally {
      setScoreBusy(false);
    }
  };

  if (loading || !authChecked) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!isJudge) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center p-6">
        <p className="text-foreground/60">Access restricted to judges and admins</p>
        <Link href={`/games/${gameId}`} className="text-accent text-sm mt-2 underline">{t("backToGame")}</Link>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center p-6">
        <p className="text-foreground/60">Game not found</p>
        <Link href="/games" className="text-accent text-sm mt-2 underline">← Back</Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-6 pb-24">
        {/* Back arrow */}
        <Link
          href={`/games/${gameId}`}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToGame")}
        </Link>

        {/* Header — nobank style */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-[36px] font-black tracking-tight text-gray-900 leading-[1.1]">
            {t("title")}
          </h1>
          <p className="text-[15px] text-gray-400 mt-1.5 font-normal leading-snug">
            {game.name} — {game.nameSi}
          </p>
          <span className={cn("inline-block mt-2 text-[11px] px-2.5 py-0.5 rounded-full font-semibold", config.lightColor)}>
            {config.label}
          </span>
        </div>

        <div className="bg-gray-50 rounded-xl overflow-hidden">
          {registered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted">{t("noParticipants")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {[...registered].sort((a, b) => {
                const aPos = scoreByParticipant.get(a.id)?.position ?? Infinity;
                const bPos = scoreByParticipant.get(b.id)?.position ?? Infinity;
                if (aPos !== bPos) return aPos - bPos;
                return a.name.localeCompare(b.name);
              }).map((p) => {
                const pScore = scoreByParticipant.get(p.id);
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={40} className="rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                        {pScore && (
                          <p className="text-xs text-muted">
                            {positionLabel[pScore.position]} — {t("assigned")}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Position buttons */}
                    <div className="flex items-center gap-1.5 mt-2 ml-[52px]">
                      {([1, 2, 3] as const).map((pos) => {
                        const isActive = pScore?.position === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() => handlePosition(p, pos)}
                            disabled={scoreBusy}
                            className={cn(
                              "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all disabled:opacity-50",
                              isActive
                                ? "border-amber-400 bg-amber-50 shadow-sm scale-105"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 opacity-60 hover:opacity-100"
                            )}
                          >
                            <Image src={positionMedalSrc[pos]} alt={positionLabel[pos]} width={18} height={18} className={cn(isActive ? "" : "grayscale opacity-50")} />
                            <span className={cn("text-[10px] font-medium", isActive ? "text-amber-700" : "text-gray-400")}>{positionLabel[pos]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
