"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, UserPlus, UserMinus, CheckCircle, Heart } from "lucide-react";
import { getGames, getParticipants, getRegistrationsByGame, registerForGame, unregisterFromGame, getScoresByGame, castVote, getVotesByVoter, getVotesByGame, getGuessesByGame, submitGuess } from "@/lib/db";
import { getSessionId } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { AvatarIcon } from "@/components/avatar-icon";
import type { Game, Participant, GameRegistration, RegistrationAgeGroup, Score, Guess } from "@/types";

const MAX_VOTES = 3;

const groupConfig: Record<string, { label: string; color: string; lightColor: string }> = {
  adult: { label: "Adults", color: "bg-primary", lightColor: "bg-primary/10 text-primary" },
  teen: { label: "Teens", color: "bg-info", lightColor: "bg-info/10 text-info" },
  kid: { label: "Kids", color: "bg-success", lightColor: "bg-success/10 text-success" },
};

export default function GameRegistrationPage({
  params,
}: {
  params: Promise<{ gameId: string; ageGroup: string }>;
}) {
  const { gameId, ageGroup } = use(params);
  const t = useTranslations("gameRegistration");
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registrations, setRegistrations] = useState<GameRegistration[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [votedParticipantIds, setVotedParticipantIds] = useState<Set<string>>(new Set());
  const [voteSubmitting, setVoteSubmitting] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<Map<string, number | string>>(new Map());
  const [guessInputs, setGuessInputs] = useState<Map<string, string>>(new Map());
  const [guessSubmitting, setGuessSubmitting] = useState<string | null>(null);

  const config = groupConfig[ageGroup] || groupConfig.adult;

  useEffect(() => {
    const sessionId = getSessionId();
    Promise.all([
      getGames(),
      getParticipants(),
      getRegistrationsByGame(gameId),
      getScoresByGame(gameId),
      getVotesByVoter(gameId, sessionId),
      getVotesByGame(gameId),
      getGuessesByGame(gameId).catch(() => [] as Guess[]),
    ])
      .then(([games, p, r, s, myVotes, allVotes, allGuesses]) => {
        setGame(games.find((g) => g.id === gameId) || null);
        setParticipants(p);
        setRegistrations(r);
        setScores(s);
        setVotedIds(new Set(myVotes.map((v) => v.participantId)));
        setVotedParticipantIds(new Set(allVotes.map((v) => v.participantId)));
        const guessMap = new Map<string, number | string>();
        const inputMap = new Map<string, string>();
        for (const g of allGuesses) {
          guessMap.set(g.participantId, g.guess);
          inputMap.set(g.participantId, String(g.guess));
        }
        setGuesses(guessMap);
        setGuessInputs(inputMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId]);

  // Filter participants matching this age group, sort registered to top
  const eligible = participants.filter((p) => p.ageGroup === ageGroup);
  const registeredIds = new Set(
    registrations.filter((r) => r.ageGroup === ageGroup).map((r) => r.participantId)
  );
  const sorted = [...eligible].sort((a, b) => {
    const aReg = registeredIds.has(a.id) ? 0 : 1;
    const bReg = registeredIds.has(b.id) ? 0 : 1;
    return aReg - bReg || a.name.localeCompare(b.name);
  });

  const handleRegister = async (participant: Participant) => {
    setBusy(participant.id);
    try {
      await registerForGame({
        gameId,
        participantId: participant.id,
        participantName: participant.name,
        ageGroup: ageGroup as RegistrationAgeGroup,
        registeredBy: "self",
        timestamp: Date.now(),
      });
      const fresh = await getRegistrationsByGame(gameId);
      setRegistrations(fresh);
    } catch {
      // Already registered — refresh
      const fresh = await getRegistrationsByGame(gameId);
      setRegistrations(fresh);
    } finally {
      setBusy(null);
    }
  };

  const handleUnregister = async (participantId: string) => {
    // Don't allow unregistering if participant has a position, has received votes, or has guessed
    if (scoreByParticipant.has(participantId)) return;
    if (votedParticipantIds.has(participantId)) return;
    if (guesses.has(participantId)) return;
    setBusy(participantId);
    try {
      await unregisterFromGame(gameId, participantId);
      const fresh = await getRegistrationsByGame(gameId);
      setRegistrations(fresh);
    } finally {
      setBusy(null);
    }
  };
  const isVoteGame = game?.scoringType === "vote";
  const votingEnabled = isVoteGame && !!game?.votingOpen;
  const remainingVotes = MAX_VOTES - votedIds.size;

  const handleVote = async (participantId: string) => {
    if (voteSubmitting || votedIds.has(participantId) || remainingVotes <= 0) return;
    setVoteSubmitting(participantId);
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
      }
    } finally {
      setVoteSubmitting(null);
    }
  };

  const isGuessGame = game?.scoringType === "guess" || game?.scoringType === "guess-text";
  const isGuessTextGame = game?.scoringType === "guess-text";
  const guessEnabled = isGuessGame && !!game?.guessOpen;

  const handleGuessSubmit = async (participant: Participant) => {
    const inputVal = guessInputs.get(participant.id) || "";
    if (!inputVal.trim()) return;
    if (isGuessTextGame) {
      if (inputVal.length > 50) return;
    } else {
      const num = parseInt(inputVal, 10);
      if (isNaN(num) || num < 0) return;
    }
    setGuessSubmitting(participant.id);
    try {
      const guessValue = isGuessTextGame ? inputVal.trim() : parseInt(inputVal, 10);
      await submitGuess({
        gameId,
        participantId: participant.id,
        participantName: participant.name,
        guess: guessValue,
        timestamp: Date.now(),
      });
      setGuesses((prev) => new Map([...prev, [participant.id, guessValue]]));
    } finally {
      setGuessSubmitting(null);
    }
  };

  // Scores filtered to this age group
  const ageScores = scores.filter((s) => (s.ageGroup || "adult") === ageGroup);
  const scoreByParticipant = new Map(ageScores.map((s) => [s.participantId, s]));

  if (loading) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex flex-col min-h-screen items-center justify-center p-6">
        <p className="text-foreground/60">Game not found</p>
        <Link href="/games" className="text-accent text-sm mt-2 underline">Back to Games</Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-6 pb-24">
        {/* Back arrow */}
        <Link
          href={`/games/${gameId}/compete`}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {game.name}
        </Link>

        {/* Header — nobank style */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-[36px] font-black tracking-tight text-gray-900 leading-[1.1]">
            {config.label}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold", config.lightColor)}>
              {t("registeredCount", { count: registeredIds.size })}
            </span>
          </div>
          {votingEnabled && (
            <p className="text-[13px] text-gray-400 mt-1.5">
              {t("votesRemaining", { count: remainingVotes })}
            </p>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl overflow-hidden">
          {sorted.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted text-sm">{t("noEligible")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sorted.map((p) => {
                const isRegistered = registeredIds.has(p.id);
                const isBusy = busy === p.id;
                const pScore = scoreByParticipant.get(p.id);
                const hasReceivedVotes = votedParticipantIds.has(p.id);
                const hasGuessed = guesses.has(p.id);
                const cantUnregister = !!pScore || hasReceivedVotes || hasGuessed;

                return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={40} className="rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                        {ageGroup !== "adult" && (
                          <p className="text-xs text-muted">{p.familyGroup}</p>
                        )}
                      </div>
                      {isRegistered ? (
                        <button
                          onClick={() => handleUnregister(p.id)}
                          disabled={isBusy || cantUnregister}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50",
                            cantUnregister
                              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                              : "text-amber-800 bg-amber-400 hover:bg-danger hover:text-white"
                          )}
                        >
                          {isBusy ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          {t("alreadyRegistered")}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegister(p)}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          {isBusy ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          {t("register")}
                        </button>
                      )}
                    </div>
                    {/* Vote button — for registered participants in vote-type games */}
                    {isRegistered && votingEnabled && (() => {
                      const hasVoted = votedIds.has(p.id);
                      const isVoteSubmitting = voteSubmitting === p.id;
                      return (
                        <div className="flex items-center gap-1.5 mt-2 ml-[52px]">
                          <button
                            onClick={() => handleVote(p.id)}
                            disabled={hasVoted || isVoteSubmitting || remainingVotes <= 0}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50",
                              hasVoted
                                ? "bg-pink-100 text-pink-600 cursor-default"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                          >
                            {isVoteSubmitting ? (
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Heart className={cn("w-3.5 h-3.5", hasVoted && "fill-current")} />
                            )}
                            {hasVoted ? t("voted") : t("vote")}
                          </button>
                        </div>
                      );
                    })()}
                    {/* Guess input — for registered participants in guess-type games */}
                    {isRegistered && isGuessGame && (() => {
                      const existingGuess = guesses.get(p.id);
                      const inputVal = guessInputs.get(p.id) || "";
                      const isSubmitting = guessSubmitting === p.id;
                      const locked = !guessEnabled;
                      const hasChanged = existingGuess != null && inputVal !== String(existingGuess);
                      return (
                        <div className="flex items-center gap-2 mt-2 ml-[52px]">
                          <input
                            type={isGuessTextGame ? "text" : "number"}
                            value={inputVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (existingGuess != null && val === "") return;
                              if (isGuessTextGame && val.length > 50) return;
                              setGuessInputs((prev) => new Map([...prev, [p.id, val]]));
                            }}
                            disabled={locked}
                            placeholder={t("enterGuess")}
                            {...(!isGuessTextGame && { min: 0 })}
                            maxLength={isGuessTextGame ? 50 : undefined}
                            className={cn(
                              "border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30",
                              isGuessTextGame ? "w-40" : "w-24",
                              locked ? "border-gray-100 bg-gray-50 text-foreground/60" : "border-gray-200"
                            )}
                          />
                          {locked && existingGuess != null ? (
                            <span className="text-xs text-slate-500 font-medium">{t("guessSubmitted")}</span>
                          ) : existingGuess != null ? (
                            <button
                              onClick={() => handleGuessSubmit(p)}
                              disabled={isSubmitting || !guessEnabled || !hasChanged}
                              className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? "..." : t("modifyGuess")}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGuessSubmit(p)}
                              disabled={isSubmitting || !guessEnabled || !inputVal}
                              className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? "..." : t("submitGuess")}
                            </button>
                          )}
                        </div>
                      );
                    })()}
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
