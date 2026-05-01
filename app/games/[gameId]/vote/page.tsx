"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGames, getRegistrationsByGame, castVote, getVotesByVoter } from "@/lib/db";
import { getSessionId } from "@/lib/storage";
import type { Game, GameRegistration } from "@/types";

const MAX_VOTES = 3;

export default function VotePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const t = useTranslations("voting");
  const [game, setGame] = useState<Game | null>(null);
  const [registrations, setRegistrations] = useState<GameRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionId = getSessionId();
    Promise.all([
      getGames(),
      getRegistrationsByGame(gameId),
      getVotesByVoter(gameId, sessionId),
    ]).then(([games, regs, myVotes]) => {
      setGame(games.find((g) => g.id === gameId) || null);
      setRegistrations(regs);
      setVotedIds(new Set(myVotes.map((v) => v.participantId)));
      setLoading(false);
    });
  }, [gameId]);

  if (loading) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!game || game.scoringType !== "vote") {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center p-6">
        <p className="text-foreground/60">{t("votingNotAvailable")}</p>
        <Link href="/games" className="text-accent text-sm mt-2 underline">
          ← {t("backToGames")}
        </Link>
      </main>
    );
  }

  if (game.votingOpen) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center p-6">
        <div className="text-5xl mb-3">⏳</div>
        <p className="text-foreground/60 font-medium">{t("votingInProgress")}</p>
        <p className="text-foreground/40 text-sm mt-1">{t("votingInProgressDesc")}</p>
        <Link href={`/games/${gameId}`} className="text-accent text-sm mt-4 underline">
          ← {t("backToGame")}
        </Link>
      </main>
    );
  }

  const remainingVotes = MAX_VOTES - votedIds.size;

  const handleVote = async (participantId: string) => {
    if (submitting || votedIds.has(participantId) || remainingVotes <= 0) return;
    setSubmitting(participantId);
    setError("");
    try {
      const sessionId = getSessionId();
      await castVote({
        gameId,
        participantId,
        voterId: sessionId,
        timestamp: Date.now(),
      });
      setVotedIds((prev) => new Set([...prev, participantId]));
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Already voted")) {
        setVotedIds((prev) => new Set([...prev, participantId]));
      } else {
        setError(t("voteError"));
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary to-primary-light px-6 pt-6 pb-8 text-white">
        <div className="max-w-lg mx-auto">
          <Link href={`/games/${gameId}`} className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />
            {game.name}
          </Link>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-white/70 mt-1">
            {t("votesRemaining", { count: remainingVotes })}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 -mt-4 pb-6">
        {error && (
          <div className="bg-danger/10 text-danger rounded-xl p-3 mb-3 text-center text-sm">
            {error}
          </div>
        )}

        {remainingVotes <= 0 && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 mb-3">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold text-foreground">{t("allVotesUsed")}</p>
            <p className="text-xs text-muted mt-1">{t("thankYou")}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {registrations.map((r) => {
              const hasVoted = votedIds.has(r.participantId);
              const isSubmitting = submitting === r.participantId;
              return (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full shrink-0 bg-gray-100 flex items-center justify-center text-foreground/60 font-bold text-sm">
                    {r.participantName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{r.participantName}</p>
                  </div>
                  <button
                    onClick={() => handleVote(r.participantId)}
                    disabled={hasVoted || isSubmitting || remainingVotes <= 0}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50",
                      hasVoted
                        ? "bg-pink-100 text-pink-600 cursor-default"
                        : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Heart className={cn("w-3.5 h-3.5", hasVoted && "fill-current")} />
                    )}
                    {hasVoted ? t("voted") : t("voteButton")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
