"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, UserPlus, UserCheck, ThumbsUp } from "lucide-react";
import {
  getGames,
  getScoresByGame,
  getRegistrationsByGame,
  getParticipants,
  getGuessesByGame,
  getVotesByGame,
  getVotesByVoter,
  updateGameEventStatus,
  registerForGame,
  unregisterFromGame,
  castVote,
  submitGuess,
  setScore,
  deleteScore,
  deleteScoresByGame,
  updateGame,
} from "@/lib/db";
import { onAuthChange } from "@/lib/auth";
import { getSessionId } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { AvatarIcon } from "@/components/avatar-icon";
import type { Game, Score, GameRegistration, Guess, Vote, Participant, RegistrationAgeGroup, GameEventStatus, EventKey } from "@/types";
import { eventKeyGroups } from "@/types";

const MAX_VOTES = 3;

const STATUS_ORDER: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting", "finished"];

function nextStatus(current: GameEventStatus, scoringType: string): GameEventStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1) return null;
  let next = idx + 1;
  if (next >= STATUS_ORDER.length) return null;
  if (STATUS_ORDER[next] === "voting" && scoringType !== "vote") next++;
  if (next >= STATUS_ORDER.length) return null;
  return STATUS_ORDER[next];
}

const STATUS_STYLE: Record<GameEventStatus, string> = {
  "not-started": "bg-pink-100 text-pink-700",
  "starting-soon": "bg-amber-100 text-amber-700",
  "started": "bg-cyan-100 text-cyan-700",
  "voting": "bg-blue-100 text-blue-700",
  "finished": "bg-gray-200 text-gray-600",
};

const GROUP_META: Record<RegistrationAgeGroup, { label: (tc: ReturnType<typeof useTranslations>) => string; solid: string; bg: string; text: string; ring: string; border: string }> = {
  kid: { label: (tc) => tc("kids"), solid: "bg-success", bg: "bg-success/10", text: "text-success", ring: "ring-success/30", border: "border-success/30" },
  teen: { label: (tc) => tc("teens"), solid: "bg-info", bg: "bg-info/10", text: "text-info", ring: "ring-info/30", border: "border-info/30" },
  adult: { label: (tc) => tc("adults"), solid: "bg-primary", bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/30", border: "border-primary/30" },
};

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const t = useTranslations("gameDetail");
  const tc = useTranslations("common");

  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [registrations, setRegistrations] = useState<GameRegistration[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJudge, setIsJudge] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<EventKey | null>(null);
  const [activeTab, setActiveTab] = useState<"register" | "action" | "judge" | "winners">("register");
  const [ageFilter, setAgeFilter] = useState<RegistrationAgeGroup | "all">("all");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [guessInputs, setGuessInputs] = useState<Record<string, string>>({});
  const [correctAnswerInput, setCorrectAnswerInput] = useState("");
  const [sortedAnswer, setSortedAnswer] = useState("");

  const sessionId = typeof window !== "undefined" ? getSessionId() : "";

  useEffect(() => {
    return onAuthChange((user) => setIsJudge(!!user));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [games, s, r, p, g, v] = await Promise.all([
        getGames(),
        getScoresByGame(gameId),
        getRegistrationsByGame(gameId).catch(() => [] as GameRegistration[]),
        getParticipants(),
        getGuessesByGame(gameId).catch(() => [] as Guess[]),
        getVotesByGame(gameId).catch(() => [] as Vote[]),
      ]);
      const foundGame = games.find((gm) => gm.id === gameId) || null;
      setGame(foundGame);
      setScores(s);
      setRegistrations(r);
      setParticipants(p);
      setGuesses(g);
      setVotes(v);
      if (sessionId) {
        const mv = await getVotesByVoter(gameId, sessionId).catch(() => [] as Vote[]);
        setMyVotes(mv);
      }
    } catch (err) {
      console.error("GameDetail fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [gameId, sessionId, expandedGroup]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // ---- Handlers ----
  const handleStatusChange = async (eventKey: EventKey, targetStatus?: GameEventStatus) => {
    if (!game?.events?.[eventKey]) return;
    const ns = targetStatus || nextStatus(game.events[eventKey]!.status, game.scoringType);
    if (!ns) return;
    setBusyAction(`status-${eventKey}-${ns}`);
    await updateGameEventStatus(gameId, eventKey, ns);
    await refreshData();
    setBusyAction(null);
  };

  const handleRegister = async (participantId: string, participantName: string, ageGroup: RegistrationAgeGroup) => {
    setBusyAction(`reg-${participantId}`);
    try {
      await registerForGame({ gameId, participantId, participantName, ageGroup, registeredBy: "self", timestamp: Date.now() });
    } catch { /* already registered */ }
    await refreshData();
    setBusyAction(null);
  };

  const handleUnregister = async (participantId: string) => {
    setBusyAction(`reg-${participantId}`);
    await unregisterFromGame(gameId, participantId);
    await refreshData();
    setBusyAction(null);
  };

  const handleVote = async (participantId: string) => {
    setBusyAction(`vote-${participantId}`);
    try {
      await castVote({ gameId, participantId, voterId: sessionId, timestamp: Date.now() });
    } catch { /* already voted */ }
    await refreshData();
    setBusyAction(null);
  };

  const handleGuessSubmit = async (participantId: string, participantName: string, value: string) => {
    if (!value.trim()) return;
    setBusyAction(`guess-${participantId}`);
    const guessVal = game?.scoringType === "guess" ? Number(value) : value;
    await submitGuess({ gameId, participantId, participantName, guess: guessVal, timestamp: Date.now() });
    await refreshData();
    setBusyAction(null);
  };

  const handleAssignMedal = async (participantId: string, participantName: string, position: 1 | 2 | 3, ageGroup: RegistrationAgeGroup) => {
    setBusyAction(`medal-${participantId}-${position}`);
    // Find all age groups in this event to check for duplicate positions across combined events
    const eventAgeGroups = eventKeyOrder
      .filter((ek) => eventKeyGroups(ek).includes(ageGroup))
      .flatMap((ek) => eventKeyGroups(ek));
    // Remove previous holder of this position across all age groups in the event
    const prev = scores.find((s) => s.gameId === gameId && eventAgeGroups.includes(s.ageGroup as RegistrationAgeGroup) && s.position === position);
    if (prev) await deleteScore(gameId, prev.participantId);
    // Also remove any existing score for this participant (if they had a different position)
    const existing = scores.find((s) => s.gameId === gameId && s.participantId === participantId);
    if (existing) await deleteScore(gameId, existing.participantId);
    await setScore({ gameId, participantId, participantName, ageGroup, position, points: position === 1 ? 3 : position === 2 ? 2 : 1, timestamp: Date.now() });
    await refreshData();
    setBusyAction(null);
  };

  const handleRemoveMedal = async (participantId: string, ageGroup: RegistrationAgeGroup) => {
    setBusyAction(`medal-${participantId}-remove`);
    await deleteScore(gameId, participantId);
    await refreshData();
    setBusyAction(null);
  };

  // ---- Rendering ----
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

  const ageGroups: RegistrationAgeGroup[] = [];
  if (game.eligibleGroups.kids) ageGroups.push("kid");
  if (game.eligibleGroups.teens) ageGroups.push("teen");
  if (game.eligibleGroups.adults) ageGroups.push("adult");

  // Derive event keys from the events map (e.g. ["kid", "teen+adult"])
  const eventKeyOrder: EventKey[] = (() => {
    if (!game.events) return ageGroups as EventKey[];
    const ordered: EventKey[] = [];
    const seen = new Set<string>();
    for (const ag of ageGroups) {
      if (seen.has(ag)) continue;
      // Check if this group appears in a combined key
      const combinedKey = Object.keys(game.events).find(
        (k) => k.includes("+") && k.split("+").includes(ag)
      ) as EventKey | undefined;
      if (combinedKey && !seen.has(combinedKey)) {
        ordered.push(combinedKey);
        for (const part of combinedKey.split("+")) seen.add(part);
      } else if (game.events[ag]) {
        ordered.push(ag as EventKey);
        seen.add(ag);
      }
    }
    return ordered;
  })();

  const groupOrder = ["kid", "teen", "adult"];
  const scoresByAge: Record<string, Score[]> = {};
  for (const s of scores) {
    const ag = s.ageGroup || "adult";
    if (!scoresByAge[ag]) scoresByAge[ag] = [];
    scoresByAge[ag].push(s);
  }
  for (const ag of Object.keys(scoresByAge)) {
    scoresByAge[ag].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  }
  const scoredGroups = eventKeyOrder.filter((ek) => {
    const ev = game.events?.[ek];
    const groups = eventKeyGroups(ek);
    const hasScores = groups.some((g) => scoresByAge[g]?.length);
    return hasScores && ev?.status === "finished";
  });

  const statusLabel = (s: GameEventStatus, scoring?: string) => {
    if (s === "voting" && scoring && scoring !== "vote") return t("judgingActive");
    const map: Record<GameEventStatus, string> = {
      "not-started": t("notStarted"),
      "starting-soon": t("startingSoon"),
      "started": t("inProgress"),
      "voting": t("votingActive"),
      "finished": t("eventFinished"),
    };
    return map[s] || s;
  };

  const renderEventCard = (ek: EventKey) => {
    const groups = eventKeyGroups(ek);
    const isCombined = groups.length > 1;
    const meta = GROUP_META[groups[0]];
    const combinedLabel = isCombined ? groups.map((g) => GROUP_META[g].label(tc)).join(" & ") : meta.label(tc);
    const event = game.events?.[ek];
    const status: GameEventStatus = event?.status || "not-started";
    const isExpanded = expandedGroup === ek;
    const groupRegs = registrations.filter((r) => groups.includes(r.ageGroup));
    const groupScores = groups.flatMap((g) => scoresByAge[g] || []).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    const groupParticipants = participants.filter((p) => {
      const pAgeGroup = p.ageGroup === "adult" ? "adult" : p.ageGroup === "teen" ? "teen" : (p.ageGroup === "kid" || p.ageGroup === "toddler" || p.ageGroup === "infant") ? "kid" : null;
      return pAgeGroup !== null && groups.includes(pAgeGroup);
    }).sort((a, b) => {
      const order: Record<string, number> = { kid: 0, toddler: 0, infant: 0, teen: 1, adult: 2 };
      return (order[a.ageGroup] ?? 2) - (order[b.ageGroup] ?? 2);
    });
    const ns = nextStatus(status, game.scoringType);

    /** Get the registration age group for a participant */
    const participantRegGroup = (p: Participant): RegistrationAgeGroup => {
      if (p.ageGroup === "adult") return "adult";
      if (p.ageGroup === "teen") return "teen";
      return "kid";
    };

    return (
      <div key={ek} className={cn("rounded-xl border overflow-hidden mb-3", isExpanded ? meta.border : "border-gray-100")}>
        {/* Accordion header */}
        <button
          onClick={() => { setExpandedGroup(isExpanded ? null : ek); setActiveTab("register"); setAgeFilter(isCombined ? groups[0] : "all"); }}
          className={cn("w-full flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors", isExpanded && "sticky top-0 z-10 border-b border-gray-100")}
        >
          <span className={cn("w-[60px] text-center py-1.5 rounded-lg text-[11px] font-extrabold shrink-0", meta.bg, meta.text)}>
            {isCombined ? groups.map((g) => GROUP_META[g].label(tc)).map((l) => l.charAt(0)).join("+") : meta.label(tc)}
          </span>
          <div className="flex-1 text-left">
            <span className="text-[15px] font-bold text-gray-900">{game.name} — {combinedLabel}</span>
            <span className="block text-[11px] text-gray-400 mt-0.5">{groupRegs.length} {t("registered")}</span>
            {/* Inline status hint */}
            {!isExpanded && (
              <span className={cn("block text-[11px] font-semibold mt-0.5", status === "finished" ? "text-gray-400" : meta.text)}>
                {status === "not-started" && t("registerHintUpcoming")}
                {status === "starting-soon" && t("registerHintStartingSoon")}
                {status === "started" && t("registerHintInProgress")}
                {status === "voting" && t("registerHintVoting")}
                {status === "finished" && <>{t("registerHintFinished")} <span className={meta.text}>{t("registerHintFinishedCta")}</span></>}
              </span>
            )}
          </div>
          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold", STATUS_STYLE[status], (status === "starting-soon" || status === "voting") && "animate-pulse")}>
            {statusLabel(status, game.scoringType)}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
        </button>

        {/* Stepper — inside header area, visible only when expanded */}
        {isExpanded && (() => {
          const steps: GameEventStatus[] = game.scoringType === "vote"
            ? ["not-started", "starting-soon", "started", "voting", "finished"]
            : ["not-started", "starting-soon", "started", "finished"];
          const currentIdx = steps.indexOf(status);

          return (
            <div className="px-4 pt-2 pb-2 bg-white border-t border-gray-100">
              <div className="flex items-center gap-1">
                {steps.map((step, i) => {
                  const isCurrent = i === currentIdx;
                  const isLast = i === steps.length - 1;

                  return (
                    <div key={step} className={cn("flex items-center", !isLast && "flex-1")}>
                      {isJudge && !isCurrent ? (
                        <button
                          onClick={() => handleStatusChange(ek, step)}
                          disabled={!!busyAction?.startsWith("status-")}
                          className="px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {busyAction === `status-${ek}-${step}` ? "..." : statusLabel(step, game.scoringType)}
                        </button>
                      ) : (
                        <span className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                          isCurrent
                            ? "bg-gray-100 border-2 border-gray-500 text-gray-900 font-bold"
                            : "bg-gray-100 text-gray-400 border border-gray-200"
                        )}>
                          {statusLabel(step, game.scoringType)}
                        </span>
                      )}
                      {!isLast && (
                        <div className="flex-1 h-0.5 mx-1.5 bg-gray-200" />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-gray-400 mt-2.5 text-left">⭐ {t("judgeOnlyNote")}</p>
            </div>
          );
        })()}

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-4">
              {(() => {
                const tabs: ("register" | "action" | "judge" | "winners")[] = ["register", "action"];
                if (isJudge && (game.scoringType === "guess" || game.scoringType === "guess-text")) tabs.push("judge");
                tabs.push("winners");
                return tabs;
              })().map((tab) => {
                const label = tab === "register"
                  ? `${t("tabRegister")} (${groupRegs.length}/${groupParticipants.length})`
                  : tab === "action"
                    ? game.scoringType === "vote" ? t("tabVoting") : game.scoringType === "guess" || game.scoringType === "guess-text" ? t("tabGuessing") : t("tabJudging")
                    : tab === "judge"
                      ? t("tabJudging")
                      : t("tabJudge");
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-2 text-[12px] font-bold text-center transition-colors border-b-2 -mb-px",
                      activeTab === tab
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="px-4 pb-4 pt-3">
              {/* Age filter buttons for combined events */}
              {isCombined && (activeTab === "register" || (activeTab === "action" && !((game.scoringType === "guess" || game.scoringType === "guess-text") && status !== "started"))) && (
                <div className="flex items-center gap-1.5 mb-3">
                  {groups.map((g) => (
                    <button
                      key={g}
                      onClick={() => setAgeFilter(ageFilter === g ? "all" : g)}
                      className={cn(
                        "px-3.5 py-1 text-[11px] font-bold rounded-full transition-colors",
                        ageFilter === g
                          ? cn(GROUP_META[g].solid, "text-white")
                          : "text-gray-400 hover:text-gray-600 bg-gray-100"
                      )}
                    >
                      {GROUP_META[g].label(tc)}
                    </button>
                  ))}
                  {ageFilter !== "all" && (
                    <button
                      onClick={() => setAgeFilter("all")}
                      className="px-3.5 py-1 text-[11px] font-bold rounded-full text-gray-400 hover:text-gray-600 bg-gray-100"
                    >
                      {tc("all")}
                    </button>
                  )}
                </div>
              )}
              {/* ---- Register tab ---- */}
              {activeTab === "register" && (() => {
                const filteredParticipants = ageFilter === "all" ? groupParticipants : groupParticipants.filter((p) => participantRegGroup(p) === ageFilter);
                const filteredRegs = ageFilter === "all" ? groupRegs : groupRegs.filter((r) => r.ageGroup === ageFilter);
                return (
                filteredParticipants.length === 0 ? (
                  <p className="text-[13px] text-gray-400 py-3 text-center">{t("noParticipants")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {/* Status hint */}
                    <p className={cn(
                      "text-[11px] font-semibold px-1 pb-1",
                      status === "finished" ? "text-gray-400" : meta.text
                    )}>
                      {status === "not-started" && t("registerHintUpcoming")}
                      {status === "starting-soon" && t("registerHintStartingSoon")}
                      {status === "started" && t("registerHintInProgress")}
                      {status === "voting" && t("registerHintVoting")}
                      {status === "finished" && <>{t("registerHintFinished")} <span className={meta.text}>{t("registerHintFinishedCta")}</span></>}
                    </p>
                    {filteredParticipants.map((p) => {
                      const isRegistered = groupRegs.some((r) => r.participantId === p.id);
                      const canRegister = status !== "finished";

                      return (
                        <div key={p.id} className="flex items-center gap-2.5 py-2.5 px-3 bg-white rounded-lg">
                          <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={32} className="shrink-0 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-gray-900 truncate block">{p.name}</span>
                            {isRegistered && <span className="text-[10px] font-semibold text-gray-500">✓ {t("registeredBtn")}</span>}
                          </div>
                          <div className="shrink-0">
                            {!isRegistered && (
                              <button
                                onClick={() => handleRegister(p.id, p.name, participantRegGroup(p))}
                                disabled={!canRegister || busyAction === `reg-${p.id}`}
                                className="px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors disabled:opacity-40 shadow-sm bg-gray-900 text-white hover:bg-gray-800"
                              >
                                {busyAction === `reg-${p.id}` ? "..." : <><UserPlus className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />{t("registerBtn")}</>}
                              </button>
                            )}
                            {canRegister && isRegistered && (
                              <button
                                onClick={() => handleUnregister(p.id)}
                                disabled={busyAction === `reg-${p.id}`}
                                className="px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors disabled:opacity-50 border border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                              >
                                {busyAction === `reg-${p.id}` ? "..." : <><UserCheck className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />{t("registeredBtn")}</>}
                              </button>
                            )}
                            {!canRegister && isRegistered && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
                                <UserCheck className="w-3 h-3 inline mr-0.5 -mt-0.5" />{t("registeredBtn")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
                );
              })()}

              {/* ---- Action tab (Judge / Vote / Guess) ---- */}
              {activeTab === "action" && (() => {
                const filteredRegs = ageFilter === "all" ? groupRegs : groupRegs.filter((r) => r.ageGroup === ageFilter);
                return (
                (status !== "started" && status !== "voting" && status !== "finished") ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-[14px] text-gray-400 text-center">{t("tabNotActive")}</p>
                  </div>
                ) : filteredRegs.length === 0 ? (
                  <p className="text-[13px] text-gray-400 py-3 text-center">{t("noRegistered")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {/* Judge finished hint */}
                    {game.scoringType === "judge" && status === "finished" && isJudge && (
                      <p className="text-[12px] font-medium px-3 py-2 text-gray-400">{t("judgeFinishedHint")}</p>
                    )}
                    {/* Judge scoring type — show all registered with 1/2/3 buttons */}
                    {game.scoringType === "judge" && filteredRegs.map((r) => {
                      const p = participants.find((pp) => pp.id === r.participantId);
                      if (!p) return null;
                      const pScore = groupScores.find((sc) => sc.participantId === p.id);
                      return (
                        <div key={p.id} className="flex items-center gap-2.5 py-2.5 px-3 bg-white rounded-lg">
                          <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={32} className="shrink-0 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-gray-900 truncate block">{p.name}</span>
                            {pScore && <span className="text-[10px] font-semibold text-amber-600">#{pScore.position}</span>}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {([1, 2, 3] as const).map((pos) => {
                              const taken = groupScores.some((sc) => sc.position === pos);
                              const isMe = pScore?.position === pos;
                              return (
                                <button
                                  key={pos}
                                  onClick={() => isMe ? handleRemoveMedal(p.id, participantRegGroup(p)) : handleAssignMedal(p.id, p.name, pos, participantRegGroup(p))}
                                  disabled={!isJudge || status === "finished" || busyAction === `medal-${p.id}-${pos}` || busyAction === `medal-${p.id}-remove`}
                                  className={cn(
                                    "w-7 h-7 rounded-full text-[11px] font-bold transition-colors",
                                    isMe
                                      ? status === "finished"
                                        ? cn("text-white opacity-60", meta.solid)
                                        : cn("text-white", meta.solid)
                                      : (!isJudge || status === "finished")
                                        ? "bg-gray-100 text-gray-400 opacity-40 cursor-default"
                                        : taken
                                          ? "bg-gray-100 text-gray-400 hover:text-white"
                                          : "bg-gray-100 text-gray-500 hover:text-white",
                                    !isMe && isJudge && status !== "finished" && groups.includes("kid") && !isCombined && "hover:bg-success",
                                    !isMe && isJudge && status !== "finished" && groups.includes("teen") && !isCombined && "hover:bg-info",
                                    !isMe && isJudge && status !== "finished" && (groups.includes("adult") || isCombined) && "hover:bg-primary"
                                  )}
                                >
                                  {pos}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Vote scoring type — show all registered with vote button */}
                    {game.scoringType === "vote" && filteredRegs.map((r) => {
                      const p = participants.find((pp) => pp.id === r.participantId);
                      if (!p) return null;
                      const voteCount = votes.filter((v) => v.participantId === p.id).length;
                      const alreadyVoted = myVotes.some((v) => v.participantId === p.id);
                      const votesUsed = myVotes.length;
                      return (
                        <div key={p.id} className="flex items-center gap-2.5 py-2.5 px-3 bg-white rounded-lg">
                          <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={32} className="shrink-0 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-gray-900 truncate block">{p.name}</span>
                            <span className="text-[10px] text-gray-400">{voteCount} {t("vote")}</span>
                          </div>
                          <div className="shrink-0">
                            {status === "voting" && !alreadyVoted && votesUsed < MAX_VOTES && (
                              <button
                                onClick={() => handleVote(p.id)}
                                disabled={busyAction === `vote-${p.id}`}
                                className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                              >
                                {busyAction === `vote-${p.id}` ? "..." : <><ThumbsUp className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />{t("vote")}</>}
                              </button>
                            )}
                            {alreadyVoted && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">{t("voted")}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Guess scoring type — show all registered with guess input */}
                    {(game.scoringType === "guess" || game.scoringType === "guess-text") && (
                      status === "finished" ? (
                        <p className="text-[13px] text-gray-400 text-center py-6">Game is now over</p>
                      ) : status !== "started" ? (
                        <p className="text-[13px] text-gray-400 text-center py-6">Game has not started yet</p>
                      ) : (
                        filteredRegs.map((r) => {
                      const p = participants.find((pp) => pp.id === r.participantId);
                      if (!p) return null;
                      const existingGuess = guesses.find((g) => g.participantId === p.id);
                      const pScore = groupScores.find((sc) => sc.participantId === p.id);
                      const inputKey = `${ek}-${p.id}`;
                      const inputVal = guessInputs[inputKey] ?? (existingGuess ? String(existingGuess.guess) : "");
                      return (
                        <div key={p.id} className="flex items-center gap-2.5 py-2.5 px-3 bg-white rounded-lg">
                          <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={32} className="shrink-0 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-gray-900 truncate block">{p.name}</span>
                            {existingGuess && <span className="text-[10px] text-gray-400">{t("guessPlaceholder")}: {String(existingGuess.guess)}</span>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                              <>
                                <input
                                  type={game.scoringType === "guess" ? "number" : "text"}
                                  value={inputVal}
                                  onChange={(e) => {
                                    let v = e.target.value;
                                    if (game.scoringType === "guess-text") {
                                      v = v.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 50);
                                    }
                                    setGuessInputs((prev) => ({ ...prev, [inputKey]: v }));
                                  }}
                                  maxLength={game.scoringType === "guess-text" ? 50 : undefined}
                                  placeholder={t("guessPlaceholder")}
                                  className="w-20 px-2 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                                <button
                                  onClick={() => handleGuessSubmit(p.id, p.name, guessInputs[inputKey] ?? (existingGuess ? String(existingGuess.guess) : ""))}
                                  disabled={!(guessInputs[inputKey] ?? (existingGuess ? String(existingGuess.guess) : "")).trim() || busyAction === `guess-${p.id}`}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                                >
                                  {busyAction === `guess-${p.id}` ? "..." : t("submitGuess")}
                                </button>
                              </>
                          </div>
                        </div>
                      );
                    })
                      )
                    )}


                  </div>
                )
                );
              })()}

              {/* ---- Judge tab (guess/guess-text games, judge only) ---- */}
              {activeTab === "judge" && isJudge && (game.scoringType === "guess" || game.scoringType === "guess-text") && (() => {
                // Single event — show all participants who have registered OR guessed
                const regIds = new Set(groupRegs.map((r) => r.participantId));
                const guessOnlyParticipants = guesses
                  .filter((g) => !regIds.has(g.participantId))
                  .map((g) => ({ participantId: g.participantId, ageGroup: (participants.find((p) => p.id === g.participantId)?.ageGroup === "adult" ? "adult" : participants.find((p) => p.id === g.participantId)?.ageGroup === "teen" ? "teen" : "kid") as RegistrationAgeGroup }));
                const allJudgeRegs = [...groupRegs, ...guessOnlyParticipants.map((g) => ({ ...g, id: g.participantId, gameId, participantName: participants.find((p) => p.id === g.participantId)?.name || "", registeredBy: "self" as const, timestamp: 0 }))];

                // Text similarity scoring for guess-text
                const textSimilarity = (a: string, b: string): number => {
                  const al = a.toLowerCase().trim();
                  const bl = b.toLowerCase().trim();
                  if (al === bl) return 1;
                  if (bl.includes(al) || al.includes(bl)) return 0.8;
                  // Simple character overlap score
                  const aChars = new Set(al.split(""));
                  const bChars = new Set(bl.split(""));
                  let overlap = 0;
                  for (const c of aChars) if (bChars.has(c)) overlap++;
                  return overlap / Math.max(aChars.size, bChars.size);
                };

                // Sort guesses by relevance only when Sort button was pressed
                const correctText = correctAnswerInput.trim();
                const sortedRegs = sortedAnswer
                  ? [...allJudgeRegs].sort((a, b) => {
                      const gA = guesses.find((g) => g.participantId === a.participantId);
                      const gB = guesses.find((g) => g.participantId === b.participantId);
                      if (!gA && !gB) return 0;
                      if (!gA) return 1;
                      if (!gB) return -1;
                      if (game.scoringType === "guess") {
                        const answer = parseInt(sortedAnswer, 10);
                        if (!isNaN(answer)) return Math.abs((gA.guess as number) - answer) - Math.abs((gB.guess as number) - answer);
                      }
                      const simA = textSimilarity(String(gA.guess), sortedAnswer);
                      const simB = textSimilarity(String(gB.guess), sortedAnswer);
                      return simB - simA;
                    })
                  : allJudgeRegs;

                return (
                  <div className="space-y-3">
                    {/* Show message when game not finished */}
                    {status !== "finished" ? (
                      <p className="text-[13px] text-gray-400 text-center py-6">
                        Judges will be able to judge when the game is in progress
                      </p>
                    ) : (
                    <>
                    {/* Correct answer input — visible for judge when finished */}
                    <div className="space-y-2 pb-3 border-b border-gray-100">
                        <p className="text-[12px] text-gray-500 font-medium">
                          {game.scoringType === "guess" ? "Enter the correct toffee count:" : "Enter the correct object name:"}
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type={game.scoringType === "guess" ? "number" : "text"}
                            value={correctAnswerInput}
                            onChange={(e) => setCorrectAnswerInput(e.target.value)}
                            placeholder={game.scoringType === "guess" ? "e.g. 42" : "e.g. Elephant"}
                            className="flex-1 px-3 py-2.5 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                          <button
                            onClick={async () => {
                              const answer = game.scoringType === "guess" ? parseInt(correctText, 10) : correctText;
                              await updateGame(gameId, { correctAnswer: answer });
                              setSortedAnswer(correctText);
                            }}
                            disabled={!correctText}
                            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-[13px] font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            Sort
                          </button>
                        </div>
                        {sortedAnswer && (
                          <p className="text-[11px] text-gray-400">
                            {game.scoringType === "guess"
                              ? "Sorted by closest guess. Assign 1st, 2nd, 3rd using the buttons."
                              : "Sorted by similarity. Assign 1st, 2nd, 3rd using the buttons."}
                          </p>
                        )}
                      </div>

                    {/* List all guesses (sorted for guess-text when answer entered) */}
                    <div className="space-y-1">
                    {sortedRegs.map((r) => {
                      const p = participants.find((pp) => pp.id === r.participantId);
                      if (!p) return null;
                      const existingGuess = guesses.find((g) => g.participantId === p.id);
                      const pScore = groupScores.find((sc) => sc.participantId === p.id);
                      const similarity = correctText && existingGuess && game.scoringType === "guess-text"
                        ? textSimilarity(String(existingGuess.guess), correctText)
                        : null;
                      const numDiff = correctText && existingGuess && game.scoringType === "guess"
                        ? Math.abs((existingGuess.guess as number) - parseInt(correctText, 10))
                        : null;
                      return (
                        <div key={p.id} className="flex items-center gap-2.5 py-2.5 px-3 bg-white rounded-lg">
                          <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={32} className="shrink-0 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-gray-900 truncate block">{p.name}</span>
                            <div className="flex items-center gap-1.5">
                              {existingGuess
                                ? <span className="text-[11px] text-gray-500">{t("guessPlaceholder")}: <strong>{String(existingGuess.guess)}</strong></span>
                                : <span className="text-[10px] text-gray-300 italic">No guess</span>
                              }
                              {similarity != null && similarity > 0 && (
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                  similarity >= 0.8 ? "bg-green-50 text-green-600" : similarity >= 0.4 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"
                                )}>
                                  {Math.round(similarity * 100)}%
                                </span>
                              )}
                              {numDiff != null && !isNaN(numDiff) && (
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                  numDiff === 0 ? "bg-green-50 text-green-600" : numDiff <= 5 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"
                                )}>
                                  ±{numDiff}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Medal buttons for judge to assign 1/2/3 */}
                          <div className="flex items-center gap-0.5 shrink-0">
                              {([1, 2, 3] as const).map((pos) => {
                                const taken = groupScores.some((sc) => sc.position === pos);
                                const isMe = pScore?.position === pos;
                                return (
                                  <button
                                    key={pos}
                                    onClick={() => isMe ? handleRemoveMedal(p.id, participantRegGroup(p)) : handleAssignMedal(p.id, p.name, pos, participantRegGroup(p))}
                                    disabled={status === "finished" || busyAction === `medal-${p.id}-${pos}` || busyAction === `medal-${p.id}-remove`}
                                    className={cn(
                                      "w-7 h-7 rounded-full text-[11px] font-bold transition-colors",
                                      isMe
                                        ? status === "finished"
                                          ? cn("text-white opacity-60", meta.solid)
                                          : cn("text-white", meta.solid)
                                        : status === "finished"
                                          ? "bg-gray-100 text-gray-300 opacity-40 cursor-default"
                                          : taken
                                            ? "bg-gray-100 text-gray-300"
                                            : "bg-gray-100 text-gray-500 hover:text-white hover:bg-gray-500"
                                    )}
                                  >
                                    {pos}
                                  </button>
                                );
                              })}
                            </div>
                        </div>
                      );
                    })}
                    </div>
                    </>
                    )}
                  </div>
                );
              })()}

              {/* ---- Winners tab ---- */}
              {activeTab === "winners" && (
                status !== "finished" ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-[14px] text-gray-400 text-center">{t("winnersOnlyWhenFinished")}</p>
                  </div>
                ) : groupScores.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-[14px] text-gray-400 text-center">{t("noResultsYet")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Celebration intro */}
                    <div className="text-center py-3">
                      <p className="text-[13px] text-gray-500">{t("winnerIntro1")}</p>
                      <p className="text-[13px] font-bold text-amber-600 animate-bounce">{t("winnerIntro2")}</p>
                      <p className="text-[12px] text-gray-400 mt-1">{t("winnerIntro3")}</p>
                    </div>
                    {groupScores.slice(0, 3).map((s) => {
                      const p = participants.find((pp) => pp.id === s.participantId);
                      if (!p) return null;
                      return (
                        <div key={s.id} className="flex items-center gap-2.5 py-3 px-3 rounded-lg">
                          <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={32} className="shrink-0 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[14px] font-bold text-gray-900 truncate block">{s.participantName}</span>
                            <span className={cn("text-[12px] font-semibold animate-bounce inline-block", meta.text)}><span className="text-[14px]">🎉</span> {t("congratsWinner")}</span>
                          </div>
                          <span className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black text-white shrink-0",
                            meta.solid
                          )}>
                            {s.position}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-6 pb-10">
        {/* Back arrow */}
        <Link
          href="/games"
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToGames")}
        </Link>

        {/* Header — nobank style */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-[36px] font-black tracking-tight text-gray-900 leading-[1.1]">
            {game.name}
          </h1>
          <p className="text-[15px] text-gray-400 mt-1.5 font-normal leading-snug">
            {game.nameSi}
          </p>
        </div>

        {/* How to Play */}
        {game.description && (() => {
          const lines = game.description.split("\n");
          const intro = lines.filter((l: string) => !l.startsWith("- "));
          const bullets = lines.filter((l: string) => l.startsWith("- ")).map((l: string) => l.slice(2));
          return (
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-5 py-5 mb-3">
              <h2 className="text-[16px] font-extrabold text-teal-900 tracking-tight mb-2">{t("howToPlay")}</h2>
              {intro.length > 0 && (
                <p className="text-[15px] text-teal-800 leading-relaxed font-medium">{intro.join(" ")}</p>
              )}
              {bullets.length > 0 && (
                <ul className="mt-2 space-y-1.5 list-disc list-inside">
                  {bullets.map((b: string, i: number) => (
                    <li key={i} className="text-[14px] text-teal-800 leading-relaxed font-medium">{b}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}

        {/* Game Info — compact single line */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-400 px-2 mb-5">
          <span>{t("scoring")}: <span className="font-medium text-gray-600">{game.scoringType === "vote" ? t("audienceVote") : game.scoringType === "guess" ? t("guessGame") : game.scoringType === "guess-text" ? t("guessTextGame") : t("judgeScored")}</span></span>
          <span className="text-gray-200">·</span>
          <span>{t("responsible")}: <span className="font-medium text-gray-600">{game.responsiblePersons.join(", ")}</span></span>
        </div>

        {/* Events heading */}
        <div className="mb-3">
          <h2 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{t("eventsHeading")}</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">{t("eventsSubtitle")}</p>
        </div>

        {/* Age Group Event Cards (accordion) */}
        {eventKeyOrder.map((ek) => renderEventCard(ek))}

        {/* Results */}
        <div className="mb-3 mt-5">
          <h2 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{t("results")}</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">{t("resultsSubtext")}</p>
        </div>
        <div className="space-y-3">
          {eventKeyOrder.map((ek) => {
            const groups = eventKeyGroups(ek);
            const isCombined = groups.length > 1;
            const meta = GROUP_META[groups[0]];
            const combinedLabel = isCombined ? groups.map((g) => GROUP_META[g].label(tc)).join(" & ") : meta.label(tc);
            const ev = game.events?.[ek];
            const isFinished = ev?.status === "finished";
            const groupResults = groups.flatMap((g) => scoresByAge[g] || []).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
            return (
              <div key={ek} className={cn("rounded-xl border overflow-hidden", isFinished && groupResults.length ? meta.border : "border-gray-100")}>
                <div className="flex items-center gap-3 px-4 py-3 bg-white">
                  <span className={cn("w-[60px] text-center py-1.5 rounded-lg text-[11px] font-extrabold shrink-0", meta.bg, meta.text)}>
                    {isCombined ? groups.map((g) => GROUP_META[g].label(tc)).map((l) => l.charAt(0)).join("+") : meta.label(tc)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-bold text-gray-900 block truncate">{game.name} — {combinedLabel}</span>
                    {isFinished && groupResults.length > 0 ? (
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {groupResults.map((s) => {
                          const guessVal = (game.scoringType === "guess" || game.scoringType === "guess-text")
                            ? guesses.find((gl) => gl.participantId === s.participantId)?.guess
                            : undefined;
                          return (
                            <span key={s.id} className="flex items-center gap-1">
                              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0", meta.solid)}>
                                {s.position}
                              </span>
                              <span className="text-[12px] text-gray-700">{s.participantName}</span>
                              {guessVal != null && <span className="text-[10px] text-gray-400">({guessVal})</span>}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-0.5">{t("resultsAppearLater")}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
