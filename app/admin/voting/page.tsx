"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getGames, updateGame, onVotesSnapshot, getParticipants } from "@/lib/db";
import type { Game, Vote, Participant } from "@/types";

export default function AdminVotingPage() {
  const t = useTranslations("adminVoting");
  const [game, setGame] = useState<Game | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [participants, setParticipantsState] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getGames(), getParticipants()]).then(([games, parts]) => {
      const voteGame = games.find((g) => g.scoringType === "vote") || null;
      setGame(voteGame);
      setParticipantsState(parts);
      setLoading(false);
    });
  }, []);

  // Real-time vote listener
  useEffect(() => {
    if (!game) return;
    const unsub = onVotesSnapshot(game.id, setVotes);
    return unsub;
  }, [game]);

  const toggleVoting = async () => {
    if (!game) return;
    await updateGame(game.id, { votingOpen: !game.votingOpen });
    setGame({ ...game, votingOpen: !game.votingOpen });
  };

  if (loading) {
    return (
      <main className="p-4">
        <p className="text-foreground/40 text-sm text-center py-12">Loading...</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="p-4">
        <p className="text-foreground/60 text-center py-12">No vote-based game found</p>
      </main>
    );
  }

  // Tally votes by participant
  const voteCounts = new Map<string, number>();
  for (const v of votes) {
    voteCounts.set(v.participantId, (voteCounts.get(v.participantId) || 0) + 1);
  }

  const ranked = Array.from(voteCounts.entries())
    .map(([id, count]) => {
      const p = participants.find((pt) => pt.id === id);
      return { id, name: p?.name || id, familyGroup: p?.familyGroup || "", votes: count };
    })
    .sort((a, b) => b.votes - a.votes);

  const totalVotes = votes.length;
  const maxVotes = ranked[0]?.votes || 1;

  return (
    <main className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-xs text-foreground/50 mt-0.5">
          {game.name} / {game.nameSi}
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gold/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">{t("votingStatus")}</h2>
            <p className="text-xs text-foreground/50">
              {game.votingOpen ? t("audienceCanVote") : t("votingIsClosed")}
            </p>
          </div>
          <button
            onClick={toggleVoting}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              game.votingOpen
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-forest text-white hover:bg-forest/90"
            )}
          >
            {game.votingOpen ? t("closeVoting") : t("openVoting")}
          </button>
        </div>
      </div>

      {/* Vote Results (Admin always sees) */}
      <div className="bg-white rounded-xl shadow-sm border border-gold/10 overflow-hidden">
        <div className="p-4 border-b border-gold/10 flex items-center justify-between">
          <h2 className="font-semibold text-maroon">{t("voteResults")}</h2>
          <span className="text-xs text-foreground/50">
            {t("totalVotes", { count: totalVotes })}
          </span>
        </div>
        {ranked.length === 0 ? (
          <div className="p-8 text-center text-foreground/40 text-sm">
            {t("noVotesYet")}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {ranked.map((entry, i) => {
              const pct = Math.round((entry.votes / maxVotes) * 100);
              return (
                <div key={entry.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-1">
                      {i < 5 && i < 3 && (
                        <Image src={`/medals/${i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"}.png`} alt={`${i + 1}`} width={18} height={18} className="inline-block" />
                      )}
                      {i >= 3 && i < 5 && (
                        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{i + 1}</span>
                      )}
                      {entry.name}
                    </span>
                    <span className="text-foreground/60">{entry.votes} votes</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        i === 0
                          ? "bg-gold"
                          : i === 1
                            ? "bg-gray-400"
                            : i === 2
                              ? "bg-amber-600"
                              : "bg-blue-300"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
