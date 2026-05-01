"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getGames, getParticipants, setScore, getScoresByGame, deleteScoresByGame } from "@/lib/db";
import type { Game, Participant, Score, RegistrationAgeGroup } from "@/types";

type Position = 1 | 2 | 3;
const POINTS: Record<Position, number> = { 1: 3, 2: 2, 3: 1 };

interface ScoreState {
  [participantId: string]: Position | undefined;
}

export default function AdminScoringPage() {
  const t = useTranslations("adminScoring");
  const [games, setGamesState] = useState<Game[]>([]);
  const [participants, setParticipantsState] = useState<Participant[]>([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [localScores, setLocalScores] = useState<ScoreState>({});
  const [existingScores, setExistingScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getGames(), getParticipants()]).then(([g, p]) => {
      // Exclude vote-scored games
      const judgeGames = g.filter((game) => game.scoringType === "judge");
      setGamesState(judgeGames);
      setParticipantsState(p);
      if (judgeGames.length > 0) setSelectedGame(judgeGames[0].id);
      setLoading(false);
    });
  }, []);

  // Load existing scores when game changes
  useEffect(() => {
    if (!selectedGame) return;
    getScoresByGame(selectedGame).then((scores) => {
      setExistingScores(scores);
      const state: ScoreState = {};
      for (const s of scores) {
        state[s.participantId] = s.position;
      }
      setLocalScores(state);
      setSaved(false);
    });
  }, [selectedGame]);

  const positionLabels: Record<Position, { src: string; label: string; color: string }> = {
    1: { src: "/medals/1st.png", label: t("first"), color: "bg-yellow-400 text-yellow-900" },
    2: { src: "/medals/2nd.png", label: t("second"), color: "bg-gray-300 text-gray-800" },
    3: { src: "/medals/3rd.png", label: t("third"), color: "bg-amber-600 text-white" },
  };

  const assignPosition = (participantId: string, pos: Position) => {
    setSaved(false);
    setLocalScores((prev) => {
      const next = { ...prev };
      // Remove this position from anyone else
      for (const key of Object.keys(next)) {
        if (next[key] === pos) {
          next[key] = undefined;
        }
      }
      // Toggle or assign
      if (prev[participantId] === pos) {
        next[participantId] = undefined;
      } else {
        next[participantId] = pos;
      }
      return next;
    });
  };

  const handleSave = async () => {
    const assigned = Object.entries(localScores).filter(([, v]) => v !== undefined);
    if (assigned.length === 0) return;
    setSaving(true);

    // Clear existing scores for this game first, then write new ones
    await deleteScoresByGame(selectedGame);

    for (const [participantId, position] of assigned) {
      if (!position) continue;
      const participant = participants.find((p) => p.id === participantId);
      if (!participant) continue;
      await setScore({
        gameId: selectedGame,
        participantId,
        participantName: participant.name,
        ageGroup: (participant.ageGroup === "teen" ? "teen" : participant.ageGroup === "kid" || participant.ageGroup === "toddler" || participant.ageGroup === "infant" ? "kid" : "adult") as RegistrationAgeGroup,
        position,
        points: POINTS[position],
        timestamp: Date.now(),
      });
    }

    // Reload existing
    const fresh = await getScoresByGame(selectedGame);
    setExistingScores(fresh);
    setSaving(false);
    setSaved(true);
  };

  // Filter participants eligible for this game
  const currentGame = games.find((g) => g.id === selectedGame);
  const eligible = participants.filter((p) => {
    if (!currentGame) return false;
    if (p.ageGroup === "adult" && currentGame.eligibleGroups.adults) return true;
    if (p.ageGroup === "teen" && currentGame.eligibleGroups.teens) return true;
    if (p.ageGroup === "kid" && currentGame.eligibleGroups.kids) return true;
    return false;
  });

  if (loading) {
    return (
      <main className="p-4">
        <p className="text-foreground/40 text-sm text-center py-12">Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-xs text-foreground/50 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Game Selector */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 pb-2">
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGame(g.id)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors",
                selectedGame === g.id
                  ? "bg-maroon text-white"
                  : "bg-white text-foreground/60 border border-gold/20"
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Position Legend */}
      <div className="flex gap-2 text-xs">
        {([1, 2, 3] as Position[]).map((pos) => (
          <span key={pos} className={cn("px-3 py-1 rounded-full", positionLabels[pos].color)}>
            <Image src={positionLabels[pos].src} alt={positionLabels[pos].label} width={16} height={16} className="inline-block" /> {positionLabels[pos].label}
          </span>
        ))}
      </div>

      {/* Participant List */}
      <div className="space-y-2">
        {eligible.map((p) => {
          const currentPos = localScores[p.id];
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl p-3 shadow-sm border border-gold/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {currentPos && (
                  <Image src={positionLabels[currentPos].src} alt={positionLabels[currentPos].label} width={22} height={22} />
                )}
                <div>
                  <span className={cn("text-sm font-medium", currentPos && "text-maroon")}>
                    {p.name}
                  </span>
                  <span className="text-[10px] text-foreground/40 ml-1.5">{p.ageGroup}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {([1, 2, 3] as Position[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => assignPosition(p.id, pos)}
                    className={cn(
                      "w-8 h-8 rounded-full text-xs font-bold transition-all",
                      currentPos === pos
                        ? positionLabels[pos].color + " ring-2 ring-offset-1 ring-maroon"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    )}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "w-full py-3 rounded-xl font-medium shadow-lg transition-colors",
            saved
              ? "bg-forest text-white"
              : "bg-maroon text-white hover:bg-maroon/90",
            saving && "opacity-50"
          )}
        >
          {saving ? t("saving") : saved ? t("saved") : t("saveScores")}
        </button>
      </div>
    </main>
  );
}
