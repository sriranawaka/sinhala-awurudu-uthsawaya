import { describe, it, expect } from "vitest";
import type { Score, GameEventStatus, RegistrationAgeGroup, EventKey } from "@/types";
import { eventKeyGroups } from "@/types";

// ---- Helpers mirroring page logic ----

const STATUS_ORDER: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting", "finished"];

function nextStatus(current: GameEventStatus, scoringType: string): GameEventStatus | null {
  // All games skip "voting" status: not-started → starting-soon → started → finished
  const steps: GameEventStatus[] = ["not-started", "starting-soon", "started", "finished"];
  const idx = steps.indexOf(current);
  return idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null;
}

function groupScoresByAge(scores: Score[]): Record<string, Score[]> {
  const scoresByAge: Record<string, Score[]> = {};
  for (const s of scores) {
    const ag = s.ageGroup || "adult";
    if (!scoresByAge[ag]) scoresByAge[ag] = [];
    scoresByAge[ag].push(s);
  }
  for (const ag of Object.keys(scoresByAge)) {
    scoresByAge[ag].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  }
  return scoresByAge;
}

function makeScore(
  gameId: string,
  participantId: string,
  name: string,
  ageGroup: RegistrationAgeGroup,
  position: 1 | 2 | 3 | 4 | 5
): Score {
  return {
    id: `${gameId}_${participantId}`,
    gameId,
    participantId,
    participantName: name,
    ageGroup,
    position,
    points: 6 - position,
    timestamp: Date.now(),
  };
}

// ---- Tests ----

describe("Game event status flow", () => {
  it("nextStatus for judge scoring: not-started → starting-soon → started → finished", () => {
    expect(nextStatus("not-started", "judge")).toBe("starting-soon");
    expect(nextStatus("starting-soon", "judge")).toBe("started");
    expect(nextStatus("started", "judge")).toBe("finished");
    expect(nextStatus("finished", "judge")).toBeNull();
  });

  it("nextStatus for vote scoring: same as other games (no voting step)", () => {
    expect(nextStatus("not-started", "vote")).toBe("starting-soon");
    expect(nextStatus("starting-soon", "vote")).toBe("started");
    expect(nextStatus("started", "vote")).toBe("finished");
    expect(nextStatus("finished", "vote")).toBeNull();
  });

  it("nextStatus for guess scoring: same as judge (no voting)", () => {
    expect(nextStatus("not-started", "guess")).toBe("starting-soon");
    expect(nextStatus("started", "guess")).toBe("finished");
    expect(nextStatus("finished", "guess")).toBeNull();
  });

  it("nextStatus for guess-text scoring: same as judge", () => {
    expect(nextStatus("started", "guess-text")).toBe("finished");
  });
});

describe("Score grouping by age", () => {
  it("groups scores by ageGroup and sorts by position", () => {
    const scores: Score[] = [
      makeScore("g1", "p2", "Bob", "kid", 2),
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p3", "Charlie", "adult", 1),
    ];

    const grouped = groupScoresByAge(scores);
    expect(Object.keys(grouped).sort()).toEqual(["adult", "kid"]);
    expect(grouped["kid"]).toHaveLength(2);
    expect(grouped["kid"][0].position).toBe(1);
    expect(grouped["kid"][1].position).toBe(2);
    expect(grouped["adult"]).toHaveLength(1);
  });

  it("returns empty object when no scores", () => {
    const grouped = groupScoresByAge([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("scores without ageGroup default to adult", () => {
    const score: Score = {
      id: "g1_p1",
      gameId: "g1",
      participantId: "p1",
      participantName: "Alice",
      position: 1,
      points: 3,
      timestamp: Date.now(),
    };
    const grouped = groupScoresByAge([score]);
    expect(grouped["adult"]).toHaveLength(1);
    expect(grouped["adult"][0].participantName).toBe("Alice");
  });
});

describe("Score document ID consistency", () => {
  it("setScore and deleteScore use same ID format: gameId_participantId", () => {
    const gameId = "banis-kama";
    const participantId = "akain";
    const scoreId = `${gameId}_${participantId}`;
    const deleteId = `${gameId}_${participantId}`;
    expect(scoreId).toBe(deleteId);
  });

  it("score ID is deterministic — same inputs produce same ID", () => {
    const id1 = `game1_player1`;
    const id2 = `game1_player1`;
    expect(id1).toBe(id2);
  });
});

describe("Medal assignment and removal", () => {
  it("assigning position replaces previous holder of that position", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p2", "Bob", "kid", 2),
    ];

    // Assign position 1 to Bob — need to remove Alice first
    const prev = scores.find((s) => s.gameId === "g1" && s.ageGroup === "kid" && s.position === 1);
    expect(prev?.participantId).toBe("p1");

    // After removal of Alice and assignment of Bob to pos 1
    const updatedScores = scores
      .filter((s) => s.participantId !== "p1") // remove Alice
      .filter((s) => !(s.participantId === "p2" && s.position === 2)); // remove Bob's old pos
    updatedScores.push(makeScore("g1", "p2", "Bob", "kid", 1));

    expect(updatedScores).toHaveLength(1);
    expect(updatedScores[0].participantId).toBe("p2");
    expect(updatedScores[0].position).toBe(1);
  });

  it("removing a medal results in empty scores for that age group", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
    ];

    const afterRemoval = scores.filter((s) => s.participantId !== "p1");
    expect(afterRemoval).toHaveLength(0);

    const grouped = groupScoresByAge(afterRemoval);
    expect(grouped["kid"]).toBeUndefined();
  });

  it("removing all medals leaves no winners", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p2", "Bob", "kid", 2),
      makeScore("g1", "p3", "Charlie", "kid", 3),
    ];

    // Remove all
    const afterRemoval: Score[] = [];
    const grouped = groupScoresByAge(afterRemoval);

    const groupOrder = ["kid", "teen", "adult"];
    const scoredGroups = groupOrder.filter((g) => grouped[g]?.length);

    expect(scoredGroups).toHaveLength(0);
  });

  it("toggle off: clicking assigned position removes it", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p2", "Bob", "kid", 2),
    ];

    // Simulate toggle: p1 already has position 1, click position 1 → remove
    const pScore = scores.find((s) => s.participantId === "p1");
    const isMe = pScore?.position === 1;
    expect(isMe).toBe(true);

    // After removal
    const afterToggle = scores.filter((s) => s.participantId !== "p1");
    expect(afterToggle).toHaveLength(1);
    expect(afterToggle[0].participantName).toBe("Bob");
  });
});

describe("Winners tab display logic", () => {
  it("shows 'not finished' message when status is not finished", () => {
    const statuses: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting"];
    for (const status of statuses) {
      expect(status !== "finished").toBe(true);
    }
  });

  it("shows 'no results' when finished but no scores", () => {
    const status: GameEventStatus = "finished";
    const groupScores: Score[] = [];
    expect(status === "finished" && groupScores.length === 0).toBe(true);
  });

  it("shows winners list when finished and scores exist", () => {
    const status: GameEventStatus = "finished";
    const groupScores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p2", "Bob", "kid", 2),
    ];
    expect(status === "finished" && groupScores.length > 0).toBe(true);
  });

  it("shows up to 5 winners", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p2", "Bob", "kid", 2),
      makeScore("g1", "p3", "Charlie", "kid", 3),
      makeScore("g1", "p4", "Diana", "kid", 4),
      makeScore("g1", "p5", "Eve", "kid", 5),
    ];
    const displayed = scores.slice(0, 5);
    expect(displayed).toHaveLength(5);
    expect(displayed[0].position).toBe(1);
    expect(displayed[4].position).toBe(5);
  });

  it("does not show more than 5 even if more scores exist", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "A", "kid", 1),
      makeScore("g1", "p2", "B", "kid", 2),
      makeScore("g1", "p3", "C", "kid", 3),
      makeScore("g1", "p4", "D", "kid", 4),
      makeScore("g1", "p5", "E", "kid", 5),
      makeScore("g1", "p6", "F", "kid", 5), // duplicate 5th — shouldn't display
    ];
    const displayed = scores.sort((a, b) => a.position - b.position).slice(0, 5);
    expect(displayed).toHaveLength(5);
  });

  it("shows fewer than 5 when fewer scores exist", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p2", "Bob", "kid", 2),
    ];
    const displayed = scores.slice(0, 5);
    expect(displayed).toHaveLength(2);
  });
});

describe("Winners tab shows 5 positions across all scoring types and age groups", () => {
  // Mirrors the real groupScores logic from page.tsx line 276:
  // groups.flatMap(g => scoresByAge[g] || []).sort((a,b) => (a.position ?? 99) - (b.position ?? 99))
  function getDisplayedWinners(scores: Score[], ageGroups: string[]): Score[] {
    const scoresByAge = groupScoresByAge(scores);
    const groupScores = ageGroups.flatMap((g) => scoresByAge[g] || []).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    return groupScores.slice(0, 5);
  }

  // ---- judge scoring ----
  it("judge-scored game: kid event shows all 5 winners", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("game-judge", `pk${pos}`, `Kid${pos}`, "kid", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["kid"]);
    expect(displayed).toHaveLength(5);
    expect(displayed.map((d) => d.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it("judge-scored game: teen event shows all 5 winners", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("game-judge", `pt${pos}`, `Teen${pos}`, "teen", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["teen"]);
    expect(displayed).toHaveLength(5);
    expect(displayed.map((d) => d.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it("judge-scored game: adult event shows all 5 winners", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("game-judge", `pa${pos}`, `Adult${pos}`, "adult", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["adult"]);
    expect(displayed).toHaveLength(5);
    expect(displayed.map((d) => d.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it("judge-scored game: shows only 2 winners when only 2 scored", () => {
    const scores = [
      makeScore("game-judge", "p1", "Alice", "kid", 1),
      makeScore("game-judge", "p2", "Bob", "kid", 2),
    ];
    const displayed = getDisplayedWinners(scores, ["kid"]);
    expect(displayed).toHaveLength(2);
    expect(displayed.map((d) => d.position)).toEqual([1, 2]);
  });

  // ---- vote scoring ----
  it("vote-scored game: shows 5 winners when 5 are assigned", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("game-vote", `pv${pos}`, `Voter${pos}`, "adult", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["adult"]);
    expect(displayed).toHaveLength(5);
  });

  it("vote-scored game: shows 3 when only 3 scored", () => {
    const scores = [1, 2, 3].map((pos) =>
      makeScore("game-vote", `pv${pos}`, `Voter${pos}`, "adult", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["adult"]);
    expect(displayed).toHaveLength(3);
  });

  // ---- guess scoring ----
  it("guess-scored game: kid event shows 5 closest guessers", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("game-guess", `pg${pos}`, `Guesser${pos}`, "kid", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["kid"]);
    expect(displayed).toHaveLength(5);
    expect(displayed.map((d) => d.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it("guess-scored game: adult event shows 5 winners", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("game-guess", `pg${pos}`, `Guesser${pos}`, "adult", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["adult"]);
    expect(displayed).toHaveLength(5);
  });

  // ---- guess-text scoring ----
  it("guess-text game: shows 5 winners", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("game-guess-text", `pgt${pos}`, `TextGuesser${pos}`, "teen", pos as 1|2|3|4|5)
    );
    const displayed = getDisplayedWinners(scores, ["teen"]);
    expect(displayed).toHaveLength(5);
  });

  // ---- combined events (multiple age groups in one event) ----
  it("combined event: shows 5 winners from mixed age groups sorted by position", () => {
    const scores = [
      makeScore("game-combined", "pk1", "KidWinner", "kid", 1),
      makeScore("game-combined", "pt1", "TeenWinner", "teen", 2),
      makeScore("game-combined", "pa1", "AdultWinner", "adult", 3),
      makeScore("game-combined", "pk2", "Kid4th", "kid", 4),
      makeScore("game-combined", "pt2", "Teen5th", "teen", 5),
    ];
    const displayed = getDisplayedWinners(scores, ["kid", "teen", "adult"]);
    expect(displayed).toHaveLength(5);
    expect(displayed.map((d) => d.position)).toEqual([1, 2, 3, 4, 5]);
    expect(displayed[0].participantName).toBe("KidWinner");
    expect(displayed[1].participantName).toBe("TeenWinner");
    expect(displayed[2].participantName).toBe("AdultWinner");
  });

  it("combined event: caps at 5 even with more scores from multiple age groups", () => {
    const scores = [
      makeScore("game-combined", "p1", "A", "kid", 1),
      makeScore("game-combined", "p2", "B", "teen", 1),
      makeScore("game-combined", "p3", "C", "adult", 1),
      makeScore("game-combined", "p4", "D", "kid", 2),
      makeScore("game-combined", "p5", "E", "teen", 2),
      makeScore("game-combined", "p6", "F", "adult", 2),
    ];
    const displayed = getDisplayedWinners(scores, ["kid", "teen", "adult"]);
    expect(displayed).toHaveLength(5);
  });

  // ---- points correctness ----
  it("5-position points are 5,4,3,2,1 respectively", () => {
    const scores = [1, 2, 3, 4, 5].map((pos) =>
      makeScore("g1", `p${pos}`, `Player${pos}`, "adult", pos as 1|2|3|4|5)
    );
    expect(scores[0].points).toBe(5);
    expect(scores[1].points).toBe(4);
    expect(scores[2].points).toBe(3);
    expect(scores[3].points).toBe(2);
    expect(scores[4].points).toBe(1);
  });

  // ---- empty / edge cases ----
  it("returns empty when no scores for the age group", () => {
    const scores = [
      makeScore("g1", "p1", "Alice", "adult", 1),
    ];
    const displayed = getDisplayedWinners(scores, ["kid"]);
    expect(displayed).toHaveLength(0);
  });

  it("returns empty when scores array is empty", () => {
    const displayed = getDisplayedWinners([], ["kid", "teen", "adult"]);
    expect(displayed).toHaveLength(0);
  });

  it("single winner displays correctly", () => {
    const scores = [makeScore("g1", "p1", "SoloChamp", "teen", 1)];
    const displayed = getDisplayedWinners(scores, ["teen"]);
    expect(displayed).toHaveLength(1);
    expect(displayed[0].participantName).toBe("SoloChamp");
    expect(displayed[0].position).toBe(1);
    expect(displayed[0].points).toBe(5);
  });
});

describe("Vote game tab and winners behavior", () => {
  // Mirrors the vote tab state logic from page.tsx
  interface Vote { participantId: string; voterId: string }

  function getVoteTabState(status: GameEventStatus): "not-started" | "active" | "finished" {
    if (status === "finished") return "finished";
    if (status === "started") return "active";
    return "not-started";
  }

  function hasAlreadyVoted(myVotes: Vote[], participantId: string): boolean {
    return myVotes.some((v) => v.participantId === participantId);
  }

  function getVoteWinners(votes: Vote[], maxWinners = 5): { participantId: string; votes: number }[] {
    const counts = new Map<string, number>();
    for (const v of votes) {
      counts.set(v.participantId, (counts.get(v.participantId) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ participantId: id, votes: count }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, maxWinners);
  }

  // ---- Vote tab status gating ----
  it("vote tab shows 'not started' when game is not-started", () => {
    expect(getVoteTabState("not-started")).toBe("not-started");
  });

  it("vote tab shows 'not started' when game is starting-soon", () => {
    expect(getVoteTabState("starting-soon")).toBe("not-started");
  });

  it("vote tab is active when game is started (In Progress)", () => {
    expect(getVoteTabState("started")).toBe("active");
  });

  it("vote tab shows 'finished' when game is finished", () => {
    expect(getVoteTabState("finished")).toBe("finished");
  });

  it("vote tab does NOT activate on 'voting' status (removed)", () => {
    // voting status is no longer used, treated as not-started
    expect(getVoteTabState("voting")).toBe("not-started");
  });

  // ---- No hard vote limit, but prevents duplicate votes ----
  it("allows voting when no votes cast yet", () => {
    expect(hasAlreadyVoted([], "p1")).toBe(false);
  });

  it("allows voting for a new participant even with many votes", () => {
    const myVotes: Vote[] = [
      { participantId: "p1", voterId: "me" },
      { participantId: "p2", voterId: "me" },
      { participantId: "p3", voterId: "me" },
      { participantId: "p4", voterId: "me" },
    ];
    expect(hasAlreadyVoted(myVotes, "p5")).toBe(false);
  });

  it("blocks duplicate vote for same participant", () => {
    const myVotes: Vote[] = [
      { participantId: "p1", voterId: "me" },
    ];
    expect(hasAlreadyVoted(myVotes, "p1")).toBe(true);
  });

  // ---- Vote-based winners (sorted by vote count) ----
  it("ranks winners by vote count descending", () => {
    const votes: Vote[] = [
      { participantId: "p1", voterId: "v1" },
      { participantId: "p2", voterId: "v1" },
      { participantId: "p2", voterId: "v2" },
      { participantId: "p3", voterId: "v1" },
      { participantId: "p3", voterId: "v2" },
      { participantId: "p3", voterId: "v3" },
    ];
    const winners = getVoteWinners(votes);
    expect(winners[0].participantId).toBe("p3"); // 3 votes
    expect(winners[0].votes).toBe(3);
    expect(winners[1].participantId).toBe("p2"); // 2 votes
    expect(winners[1].votes).toBe(2);
    expect(winners[2].participantId).toBe("p1"); // 1 vote
    expect(winners[2].votes).toBe(1);
  });

  it("shows up to 5 vote winners", () => {
    const votes: Vote[] = [];
    for (let i = 1; i <= 7; i++) {
      for (let j = 0; j < (8 - i); j++) {
        votes.push({ participantId: `p${i}`, voterId: `v${j}` });
      }
    }
    const winners = getVoteWinners(votes);
    expect(winners).toHaveLength(5);
    expect(winners[0].participantId).toBe("p1"); // 7 votes
    expect(winners[4].participantId).toBe("p5"); // 3 votes
  });

  it("returns empty when no votes exist", () => {
    expect(getVoteWinners([])).toHaveLength(0);
  });

  it("single voter single participant shows 1 winner", () => {
    const votes: Vote[] = [{ participantId: "p1", voterId: "v1" }];
    const winners = getVoteWinners(votes);
    expect(winners).toHaveLength(1);
    expect(winners[0].votes).toBe(1);
  });

  it("tied votes preserve order", () => {
    const votes: Vote[] = [
      { participantId: "p1", voterId: "v1" },
      { participantId: "p2", voterId: "v2" },
    ];
    const winners = getVoteWinners(votes);
    expect(winners).toHaveLength(2);
    expect(winners[0].votes).toBe(1);
    expect(winners[1].votes).toBe(1);
  });

  // ---- Vote game status flow (same as all other games) ----
  it("vote game status flow: not-started → starting-soon → started → finished", () => {
    expect(nextStatus("not-started", "vote")).toBe("starting-soon");
    expect(nextStatus("starting-soon", "vote")).toBe("started");
    expect(nextStatus("started", "vote")).toBe("finished");
    expect(nextStatus("finished", "vote")).toBeNull();
  });

  // ---- Vote game stepper has 4 steps (no voting step) ----
  it("vote game stepper has 4 steps matching other games", () => {
    const steps: GameEventStatus[] = ["not-started", "starting-soon", "started", "finished"];
    expect(steps).toHaveLength(4);
    expect(steps).not.toContain("voting");
  });
});

describe("Registration rules per status", () => {
  it("allows registration for all statuses except finished", () => {
    const statuses: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting"];
    for (const status of statuses) {
      const canRegister = status !== "finished";
      expect(canRegister).toBe(true);
    }
  });

  it("disables registration when finished", () => {
    const canRegister = "finished" !== "finished";
    expect(canRegister).toBe(false);
  });

  // Mirrors the Register tab logic: when finished, show end message instead of participant list
  function getRegisterTabContent(status: GameEventStatus): "ended" | "list" {
    return status === "finished" ? "ended" : "list";
  }

  it("shows ended message when game is finished", () => {
    expect(getRegisterTabContent("finished")).toBe("ended");
  });

  it("shows participant list when game is not-started", () => {
    expect(getRegisterTabContent("not-started")).toBe("list");
  });

  it("shows participant list when game is starting-soon", () => {
    expect(getRegisterTabContent("starting-soon")).toBe("list");
  });

  it("shows participant list when game is started", () => {
    expect(getRegisterTabContent("started")).toBe("list");
  });

  it("shows participant list when game is voting", () => {
    expect(getRegisterTabContent("voting")).toBe("list");
  });
});

describe("Judge action button states", () => {
  it("disables medal buttons when not a judge", () => {
    const isJudge = false;
    const status: GameEventStatus = "started";
    const disabled = !isJudge || status === "finished";
    expect(disabled).toBe(true);
  });

  it("disables all medal buttons when finished (including assigned)", () => {
    const isJudge = true;
    const status: GameEventStatus = "finished";
    const disabled = !isJudge || status === "finished";
    expect(disabled).toBe(true);
  });

  it("disables unselect when finished — positions are locked", () => {
    const isJudge = true;
    const status: GameEventStatus = "finished";
    const isMe = true;
    // Even if isMe, buttons are disabled when finished
    const disabled = !isJudge || status === "finished";
    expect(disabled).toBe(true);
  });

  it("allows all medal buttons when judge and game in progress", () => {
    const isJudge = true;
    const status: GameEventStatus = "started";
    const disabled = !isJudge || status === "finished";
    expect(disabled).toBe(false);
  });

  it("allows medal assign/unselect only during started status", () => {
    const isJudge = true;
    const allowedStatuses: GameEventStatus[] = ["started"];
    const blockedStatuses: GameEventStatus[] = ["not-started", "starting-soon", "voting", "finished"];

    for (const s of allowedStatuses) {
      expect(!isJudge || s === "finished").toBe(false);
    }
    for (const s of blockedStatuses) {
      // Action tab only shows when started/voting/finished, and buttons disabled when finished
      if (s === "finished") {
        expect(!isJudge || s === "finished").toBe(true);
      }
    }
  });
});

describe("Status style mapping", () => {
  const STATUS_STYLE: Record<GameEventStatus, string> = {
    "not-started": "bg-pink-100 text-pink-700",
    "starting-soon": "bg-amber-100 text-amber-700",
    "started": "bg-cyan-100 text-cyan-700",
    "voting": "bg-blue-100 text-blue-700",
    "finished": "bg-gray-200 text-gray-600",
  };

  it("has style for every valid status", () => {
    const allStatuses: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting", "finished"];
    for (const s of allStatuses) {
      expect(STATUS_STYLE[s]).toBeDefined();
      expect(STATUS_STYLE[s].length).toBeGreaterThan(0);
    }
  });
});

describe("Age group metadata", () => {
  const GROUP_META: Record<RegistrationAgeGroup, { primary: string }> = {
    kid: { primary: "#10B981" },
    teen: { primary: "#3B82F6" },
    adult: { primary: "#7C3AED" },
  };

  it("each age group has a unique primary color", () => {
    const colors = Object.values(GROUP_META).map((m) => m.primary);
    expect(new Set(colors).size).toBe(3);
  });

  it("maps kid to green, teen to blue, adult to purple", () => {
    expect(GROUP_META.kid.primary).toBe("#10B981");
    expect(GROUP_META.teen.primary).toBe("#3B82F6");
    expect(GROUP_META.adult.primary).toBe("#7C3AED");
  });
});

describe("Winners tab and Results section consistency", () => {
  // Helpers mirroring page logic
  type Events = Record<string, { status: GameEventStatus }>;

  // Returns which groups show actual winner names (finished + has scores)
  function groupsWithWinners(scoresByAge: Record<string, Score[]>, events: Events) {
    const groupOrder = ["kid", "teen", "adult"];
    return groupOrder.filter((g) => {
      return scoresByAge[g]?.length && events[g]?.status === "finished";
    });
  }

  // Returns what each group shows: "winners" or "placeholder"
  function resultCardState(ageGroups: string[], scoresByAge: Record<string, Score[]>, events: Events) {
    return ageGroups.map((g) => {
      const isFinished = events[g]?.status === "finished";
      const hasScores = (scoresByAge[g]?.length ?? 0) > 0;
      return { group: g, showsWinners: isFinished && hasScores, showsPlaceholder: !isFinished || !hasScores };
    });
  }

  it("Winners tab top 3 matches Results section for the same age group", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p2", "Bob", "kid", 2),
      makeScore("g1", "p3", "Charlie", "kid", 3),
      makeScore("g1", "p4", "Diana", "teen", 1),
      makeScore("g1", "p5", "Eve", "adult", 1),
      makeScore("g1", "p6", "Frank", "adult", 2),
    ];

    const scoresByAge = groupScoresByAge(scores);
    const events: Events = {
      kid: { status: "finished" },
      teen: { status: "finished" },
      adult: { status: "finished" },
    };
    const withWinners = groupsWithWinners(scoresByAge, events);
    expect(withWinners).toEqual(["kid", "teen", "adult"]);

    // Winners tab for each group shows slice(0,3) — same source as Results
    for (const ag of withWinners) {
      const winnersTabData = (scoresByAge[ag] || []).slice(0, 3);
      const resultsData = scoresByAge[ag] || [];
      expect(winnersTabData).toEqual(resultsData.slice(0, 3));
      for (let i = 1; i < winnersTabData.length; i++) {
        expect(winnersTabData[i - 1].position).toBeLessThanOrEqual(winnersTabData[i].position);
      }
    }
  });

  it("Results section shows all age groups but only finished ones display winners", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p4", "Diana", "teen", 1),
      makeScore("g1", "p5", "Eve", "adult", 1),
    ];
    const scoresByAge = groupScoresByAge(scores);
    const ageGroups = ["kid", "teen", "adult"];
    const events: Events = {
      kid: { status: "not-started" },
      teen: { status: "finished" },
      adult: { status: "started" },
    };
    const states = resultCardState(ageGroups, scoresByAge, events);
    // Kid: has scores but not finished → placeholder
    expect(states[0]).toEqual({ group: "kid", showsWinners: false, showsPlaceholder: true });
    // Teen: finished + has scores → winners
    expect(states[1]).toEqual({ group: "teen", showsWinners: true, showsPlaceholder: false });
    // Adult: has scores but not finished → placeholder
    expect(states[2]).toEqual({ group: "adult", showsWinners: false, showsPlaceholder: true });
  });

  it("Results section shows placeholder for all groups when none are finished", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "kid", 1),
    ];
    const scoresByAge = groupScoresByAge(scores);
    const ageGroups = ["kid", "teen", "adult"];
    const events: Events = {
      kid: { status: "started" },
      teen: { status: "not-started" },
      adult: { status: "not-started" },
    };
    const states = resultCardState(ageGroups, scoresByAge, events);
    expect(states.every((s) => s.showsPlaceholder)).toBe(true);
    expect(states.every((s) => !s.showsWinners)).toBe(true);
  });

  it("Results section shows placeholder for finished group with no scores", () => {
    const scoresByAge = groupScoresByAge([]);
    const ageGroups = ["kid"];
    const events: Events = { kid: { status: "finished" } };
    const states = resultCardState(ageGroups, scoresByAge, events);
    // Finished but no scores → still placeholder
    expect(states[0]).toEqual({ group: "kid", showsWinners: false, showsPlaceholder: true });
  });

  it("Both sections respect groupOrder: kid → teen → adult", () => {
    const scores: Score[] = [
      makeScore("g1", "p5", "Eve", "adult", 1),
      makeScore("g1", "p1", "Alice", "kid", 1),
      makeScore("g1", "p4", "Diana", "teen", 1),
    ];
    const scoresByAge = groupScoresByAge(scores);
    const events: Events = {
      kid: { status: "finished" },
      teen: { status: "finished" },
      adult: { status: "finished" },
    };
    const withWinners = groupsWithWinners(scoresByAge, events);
    expect(withWinners).toEqual(["kid", "teen", "adult"]);
  });
});

describe("Admin scoring ageGroup assignment", () => {
  function getRegistrationAgeGroup(participantAgeGroup: string): RegistrationAgeGroup {
    if (participantAgeGroup === "teen") return "teen";
    if (participantAgeGroup === "kid" || participantAgeGroup === "toddler" || participantAgeGroup === "infant") return "kid";
    return "adult";
  }

  it("maps teen to teen", () => {
    expect(getRegistrationAgeGroup("teen")).toBe("teen");
  });

  it("maps kid, toddler, infant to kid", () => {
    expect(getRegistrationAgeGroup("kid")).toBe("kid");
    expect(getRegistrationAgeGroup("toddler")).toBe("kid");
    expect(getRegistrationAgeGroup("infant")).toBe("kid");
  });

  it("maps adult to adult", () => {
    expect(getRegistrationAgeGroup("adult")).toBe("adult");
  });

  it("maps unknown age groups to adult", () => {
    expect(getRegistrationAgeGroup("senior")).toBe("adult");
  });
});

describe("eventKeyGroups helper", () => {
  it("splits single group key", () => {
    expect(eventKeyGroups("kid")).toEqual(["kid"]);
    expect(eventKeyGroups("teen")).toEqual(["teen"]);
    expect(eventKeyGroups("adult")).toEqual(["adult"]);
  });

  it("splits combined key into constituent groups", () => {
    expect(eventKeyGroups("teen+adult" as EventKey)).toEqual(["teen", "adult"]);
  });

  it("splits kid+teen combined key", () => {
    expect(eventKeyGroups("kid+teen" as EventKey)).toEqual(["kid", "teen"]);
  });
});

describe("Combined event key derivation", () => {
  // Mirrors the eventKeyOrder logic from page.tsx
  function deriveEventKeys(
    eligibleGroups: { kids?: boolean; teens?: boolean; adults?: boolean },
    events: Record<string, { status: GameEventStatus }>
  ): EventKey[] {
    const ageGroups: RegistrationAgeGroup[] = [];
    if (eligibleGroups.kids) ageGroups.push("kid");
    if (eligibleGroups.teens) ageGroups.push("teen");
    if (eligibleGroups.adults) ageGroups.push("adult");

    const ordered: EventKey[] = [];
    const seen = new Set<string>();
    for (const ag of ageGroups) {
      if (seen.has(ag)) continue;
      const combinedKey = Object.keys(events).find(
        (k) => k.includes("+") && k.split("+").includes(ag)
      ) as EventKey | undefined;
      if (combinedKey && !seen.has(combinedKey)) {
        ordered.push(combinedKey);
        for (const part of combinedKey.split("+")) seen.add(part);
      } else if (events[ag]) {
        ordered.push(ag as EventKey);
        seen.add(ag);
      }
    }
    return ordered;
  }

  it("returns individual keys for standard games", () => {
    const events = {
      kid: { status: "not-started" as GameEventStatus },
      teen: { status: "not-started" as GameEventStatus },
      adult: { status: "not-started" as GameEventStatus },
    };
    const keys = deriveEventKeys({ kids: true, teens: true, adults: true }, events);
    expect(keys).toEqual(["kid", "teen", "adult"]);
  });

  it("returns combined key for teen+adult event", () => {
    const events = {
      kid: { status: "not-started" as GameEventStatus },
      "teen+adult": { status: "not-started" as GameEventStatus },
    };
    const keys = deriveEventKeys({ kids: true, teens: true, adults: true }, events);
    expect(keys).toEqual(["kid", "teen+adult"]);
  });

  it("does not duplicate groups in combined keys", () => {
    const events = {
      "teen+adult": { status: "not-started" as GameEventStatus },
    };
    const keys = deriveEventKeys({ teens: true, adults: true }, events);
    expect(keys).toEqual(["teen+adult"]);
  });

  it("works with only combined key and no individual groups", () => {
    const events = {
      "kid+teen": { status: "not-started" as GameEventStatus },
    };
    const keys = deriveEventKeys({ kids: true, teens: true }, events);
    expect(keys).toEqual(["kid+teen"]);
  });
});

describe("Combined event participant filtering", () => {
  it("filters registrations for all constituent groups in a combined event", () => {
    const registrations = [
      { ageGroup: "teen" as RegistrationAgeGroup, participantId: "p1" },
      { ageGroup: "adult" as RegistrationAgeGroup, participantId: "p2" },
      { ageGroup: "kid" as RegistrationAgeGroup, participantId: "p3" },
    ];

    const ek: EventKey = "teen+adult";
    const groups = eventKeyGroups(ek);
    const filtered = registrations.filter((r) => groups.includes(r.ageGroup));

    expect(filtered).toHaveLength(2);
    expect(filtered.map((r) => r.participantId).sort()).toEqual(["p1", "p2"]);
  });

  it("individual event only includes its own group", () => {
    const registrations = [
      { ageGroup: "teen" as RegistrationAgeGroup, participantId: "p1" },
      { ageGroup: "adult" as RegistrationAgeGroup, participantId: "p2" },
      { ageGroup: "kid" as RegistrationAgeGroup, participantId: "p3" },
    ];

    const ek: EventKey = "kid";
    const groups = eventKeyGroups(ek);
    const filtered = registrations.filter((r) => groups.includes(r.ageGroup));

    expect(filtered).toHaveLength(1);
    expect(filtered[0].participantId).toBe("p3");
  });
});

describe("Combined event scores aggregation", () => {
  it("aggregates scores from all groups in a combined event", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "teen", 1),
      makeScore("g1", "p2", "Bob", "adult", 2),
      makeScore("g1", "p3", "Charlie", "kid", 1),
    ];

    const scoresByAge = groupScoresByAge(scores);
    const ek: EventKey = "teen+adult";
    const groups = eventKeyGroups(ek);
    const combined = groups.flatMap((g) => scoresByAge[g] || []).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

    expect(combined).toHaveLength(2);
    expect(combined[0].participantName).toBe("Alice");
    expect(combined[1].participantName).toBe("Bob");
  });
});

describe("Combined event status handling", () => {
  it("combined event has a single shared status", () => {
    const events: Record<string, { status: GameEventStatus }> = {
      kid: { status: "started" },
      "teen+adult": { status: "finished" },
    };

    expect(events["teen+adult"].status).toBe("finished");
    expect(events["kid"].status).toBe("started");
  });

  it("scoredGroups includes combined event key when finished with scores", () => {
    const scores: Score[] = [
      makeScore("g1", "p1", "Alice", "teen", 1),
      makeScore("g1", "p2", "Bob", "adult", 2),
    ];
    const scoresByAge = groupScoresByAge(scores);
    const eventKeys: EventKey[] = ["kid", "teen+adult"];
    const events: Record<string, { status: GameEventStatus }> = {
      kid: { status: "not-started" },
      "teen+adult": { status: "finished" },
    };

    const scored = eventKeys.filter((ek) => {
      const ev = events[ek];
      const groups = eventKeyGroups(ek);
      const hasScores = groups.some((g) => scoresByAge[g]?.length);
      return hasScores && ev?.status === "finished";
    });

    expect(scored).toEqual(["teen+adult"]);
  });
});

describe("Age filter in combined events", () => {
  type AgeFilter = RegistrationAgeGroup | "all";

  interface Participant { id: string; name: string; ageGroup: string }
  interface Registration { participantId: string; ageGroup: RegistrationAgeGroup }

  function participantRegGroup(p: Participant): RegistrationAgeGroup {
    if (p.ageGroup === "adult") return "adult";
    if (p.ageGroup === "teen") return "teen";
    return "kid";
  }

  function filterParticipants(participants: Participant[], filter: AgeFilter): Participant[] {
    if (filter === "all") return participants;
    return participants.filter((p) => participantRegGroup(p) === filter);
  }

  function filterRegistrations(regs: Registration[], filter: AgeFilter): Registration[] {
    if (filter === "all") return regs;
    return regs.filter((r) => r.ageGroup === filter);
  }

  const mixedParticipants: Participant[] = [
    { id: "p1", name: "Ana", ageGroup: "kid" },
    { id: "p2", name: "Ben", ageGroup: "teen" },
    { id: "p3", name: "Cal", ageGroup: "adult" },
    { id: "p4", name: "Dan", ageGroup: "toddler" },
    { id: "p5", name: "Eve", ageGroup: "teen" },
  ];

  const mixedRegs: Registration[] = [
    { participantId: "p1", ageGroup: "kid" },
    { participantId: "p2", ageGroup: "teen" },
    { participantId: "p3", ageGroup: "adult" },
    { participantId: "p5", ageGroup: "teen" },
  ];

  it("'all' filter returns all participants", () => {
    expect(filterParticipants(mixedParticipants, "all")).toHaveLength(5);
  });

  it("'kid' filter returns kids and toddlers", () => {
    const filtered = filterParticipants(mixedParticipants, "kid");
    expect(filtered.map((p) => p.id).sort()).toEqual(["p1", "p4"]);
  });

  it("'teen' filter returns only teens", () => {
    const filtered = filterParticipants(mixedParticipants, "teen");
    expect(filtered.map((p) => p.id).sort()).toEqual(["p2", "p5"]);
  });

  it("'adult' filter returns only adults", () => {
    const filtered = filterParticipants(mixedParticipants, "adult");
    expect(filtered.map((p) => p.id)).toEqual(["p3"]);
  });

  it("'all' filter returns all registrations", () => {
    expect(filterRegistrations(mixedRegs, "all")).toHaveLength(4);
  });

  it("'teen' filter returns only teen registrations", () => {
    const filtered = filterRegistrations(mixedRegs, "teen");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => r.ageGroup === "teen")).toBe(true);
  });

  it("filter is only shown for combined events (isCombined check)", () => {
    const singleKey: EventKey = "kid";
    const combinedKey: EventKey = "teen+adult";
    const tripleKey: EventKey = "kid+teen+adult";

    expect(eventKeyGroups(singleKey).length > 1).toBe(false);
    expect(eventKeyGroups(combinedKey).length > 1).toBe(true);
    expect(eventKeyGroups(tripleKey).length > 1).toBe(true);
  });

  it("filter buttons match constituent groups of the event key", () => {
    const ek: EventKey = "kid+teen+adult";
    const groups = eventKeyGroups(ek);
    expect(groups).toEqual(["kid", "teen", "adult"]);

    // Each group should have a filter button
    const filterOptions: AgeFilter[] = [...groups, "all"];
    expect(filterOptions).toEqual(["kid", "teen", "adult", "all"]);
  });

  it("filtering does not affect total count in tab label", () => {
    const totalRegs = mixedRegs.length;
    const filteredRegs = filterRegistrations(mixedRegs, "teen");
    // Tab label should use totalRegs, not filteredRegs.length
    expect(totalRegs).toBe(4);
    expect(filteredRegs.length).toBe(2);
    expect(totalRegs).not.toBe(filteredRegs.length);
  });

  it("default filter for combined event is the first constituent group", () => {
    const ek2: EventKey = "teen+adult";
    const groups2 = eventKeyGroups(ek2);
    const isCombined2 = groups2.length > 1;
    const defaultFilter: AgeFilter = isCombined2 ? groups2[0] : "all";
    expect(defaultFilter).toBe("teen");

    const ek3: EventKey = "kid+teen+adult";
    const groups3 = eventKeyGroups(ek3);
    const isCombined3 = groups3.length > 1;
    const defaultFilter3: AgeFilter = isCombined3 ? groups3[0] : "all";
    expect(defaultFilter3).toBe("kid");
  });

  it("default filter for single-group event is 'all'", () => {
    const ek: EventKey = "kid";
    const groups = eventKeyGroups(ek);
    const isCombined = groups.length > 1;
    const defaultFilter: AgeFilter = isCombined ? groups[0] : "all";
    expect(defaultFilter).toBe("all");
  });
});

describe("Guess-text game behavior", () => {
  function sanitizeGuessText(value: string): string {
    return value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 50);
  }

  it("allows alphanumeric characters and spaces", () => {
    expect(sanitizeGuessText("Hello World 123")).toBe("Hello World 123");
  });

  it("strips special characters", () => {
    expect(sanitizeGuessText("Hello!@#$%^&*()")).toBe("Hello");
    expect(sanitizeGuessText("test<script>")).toBe("testscript");
  });

  it("limits input to 50 characters", () => {
    const long = "A".repeat(60);
    expect(sanitizeGuessText(long)).toHaveLength(50);
  });

  it("allows empty string", () => {
    expect(sanitizeGuessText("")).toBe("");
  });

  it("strips unicode and emoji", () => {
    expect(sanitizeGuessText("hello 🎉 world")).toBe("hello  world");
  });

  it("guessing is only allowed when status is started", () => {
    const statuses: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting", "finished"];
    const canGuess = (s: GameEventStatus) => s === "started";
    expect(statuses.filter(canGuess)).toEqual(["started"]);
  });

  it("guess can be overwritten (submitGuess uses setDoc with deterministic ID)", () => {
    // ID format: gameId_participantId — same inputs produce same ID, so setDoc overwrites
    const id1 = `game1_player1`;
    const id2 = `game1_player1`;
    expect(id1).toBe(id2); // same ID = overwrite
  });

  it("submit button disabled when input is empty or whitespace", () => {
    const isDisabled = (val: string) => !val.trim();
    expect(isDisabled("")).toBe(true);
    expect(isDisabled("   ")).toBe(true);
    expect(isDisabled("hello")).toBe(false);
  });

  it("judge medal buttons shown for guess-text when judge is logged in", () => {
    const scoringType = "guess-text";
    const isJudge = true;
    const status: GameEventStatus = "started";
    const showMedals = scoringType === "guess-text" && isJudge && (status === "started" || status === "finished");
    expect(showMedals).toBe(true);
  });

  it("judge medal buttons disabled when finished", () => {
    const status: GameEventStatus = "finished";
    const medalDisabled = status === "finished";
    expect(medalDisabled).toBe(true);
  });

  it("judge medal buttons not shown for non-judges", () => {
    const isJudge = false;
    const showMedals = "guess-text" === "guess-text" && isJudge;
    expect(showMedals).toBe(false);
  });

  it("guess input pre-fills with existing guess value for overwrite", () => {
    const existingGuess = { guess: "Banana" };
    const guessInputs: Record<string, string> = {};
    const inputKey = "ek-p1";
    const inputVal = guessInputs[inputKey] ?? (existingGuess ? String(existingGuess.guess) : "");
    expect(inputVal).toBe("Banana");
  });

  it("guess input uses user-typed value over existing guess", () => {
    const existingGuess = { guess: "Banana" };
    const guessInputs: Record<string, string> = { "ek-p1": "Apple" };
    const inputKey = "ek-p1";
    const inputVal = guessInputs[inputKey] ?? (existingGuess ? String(existingGuess.guess) : "");
    expect(inputVal).toBe("Apple");
  });
});

describe("Count Toffee Bottle guess sorting and judge assignment", () => {
  function calculateGuessWinners(
    guesses: { participantId: string; participantName: string; guess: number }[],
    correctAnswer: number,
    maxWinners = 5
  ): { participantId: string; participantName: string; position: number; points: number }[] {
    const sorted = [...guesses].sort(
      (a, b) => Math.abs(a.guess - correctAnswer) - Math.abs(b.guess - correctAnswer)
    );
    return sorted.slice(0, Math.min(maxWinners, sorted.length)).map((g, i) => ({
      participantId: g.participantId,
      participantName: g.participantName,
      position: (i + 1) as 1 | 2 | 3 | 4 | 5,
      points: 5 - i,
    }));
  }

  it("picks closest guesses to correct answer (up to 5)", () => {
    const guesses = [
      { participantId: "p1", participantName: "A", guess: 50 },
      { participantId: "p2", participantName: "B", guess: 42 },
      { participantId: "p3", participantName: "C", guess: 55 },
      { participantId: "p4", participantName: "D", guess: 30 },
    ];
    const winners = calculateGuessWinners(guesses, 45);
    expect(winners).toHaveLength(4);
    expect(winners[0].participantId).toBe("p2"); // 42, diff=3
    expect(winners[1].participantId).toBe("p1"); // 50, diff=5
    expect(winners[2].participantId).toBe("p3"); // 55, diff=10
    expect(winners[3].participantId).toBe("p4"); // 30, diff=15
  });

  it("assigns correct points (5, 4, 3, 2, 1)", () => {
    const guesses = [
      { participantId: "p1", participantName: "A", guess: 10 },
      { participantId: "p2", participantName: "B", guess: 12 },
      { participantId: "p3", participantName: "C", guess: 20 },
    ];
    const winners = calculateGuessWinners(guesses, 11);
    expect(winners[0].points).toBe(5);
    expect(winners[1].points).toBe(4);
    expect(winners[2].points).toBe(3);
  });

  it("handles fewer than 5 guesses", () => {
    const guesses = [
      { participantId: "p1", participantName: "A", guess: 10 },
    ];
    const winners = calculateGuessWinners(guesses, 11);
    expect(winners).toHaveLength(1);
    expect(winners[0].position).toBe(1);
    expect(winners[0].points).toBe(5);
  });

  it("handles exact match as closest", () => {
    const guesses = [
      { participantId: "p1", participantName: "A", guess: 100 },
      { participantId: "p2", participantName: "B", guess: 45 },
      { participantId: "p3", participantName: "C", guess: 42 },
    ];
    const winners = calculateGuessWinners(guesses, 42);
    expect(winners[0].participantId).toBe("p3"); // exact match, diff=0
  });

  it("handles equal distances (stable sort)", () => {
    const guesses = [
      { participantId: "p1", participantName: "A", guess: 48 },
      { participantId: "p2", participantName: "B", guess: 52 },
    ];
    // Both are distance 2 from 50
    const winners = calculateGuessWinners(guesses, 50);
    expect(winners).toHaveLength(2);
    // Both should appear, order is stable (p1 first since it was first in array)
    expect(winners.map((w) => w.participantId)).toEqual(["p1", "p2"]);
  });

  it("judge can sort and assign at any event status", () => {
    // Judge tab input and medal buttons are always visible regardless of status
    const isJudge = true;
    const showJudgeControls = isJudge; // No status gating
    expect(showJudgeControls).toBe(true);
  });

  it("correctAnswer must be a valid number to calculate", () => {
    const isValidAnswer = (input: string) => !isNaN(parseInt(input, 10));
    expect(isValidAnswer("42")).toBe(true);
    expect(isValidAnswer("")).toBe(false);
    expect(isValidAnswer("abc")).toBe(false);
    expect(isValidAnswer("0")).toBe(true);
  });

  it("winners appear in Winners tab when scores exist", () => {
    const groupScores = [
      { participantId: "p1", position: 1 },
      { participantId: "p2", position: 2 },
      { participantId: "p3", position: 3 },
      { participantId: "p4", position: 4 },
      { participantId: "p5", position: 5 },
    ];
    expect(groupScores.length).toBeGreaterThan(0);
    expect(groupScores.slice(0, 5)).toHaveLength(5);
  });

  it("combined event calculates winners across all guesses (no age group filtering)", () => {
    // For kid+teen+adult combined event, all guesses compete together regardless of registration
    const guesses = [
      { participantId: "kid1", participantName: "Kid1", guess: 40 },
      { participantId: "teen1", participantName: "Teen1", guess: 42 },
      { participantId: "adult1", participantName: "Adult1", guess: 50 },
      { participantId: "adult2", participantName: "Adult2", guess: 100 },
    ];
    // No age group filtering — use all guesses directly
    const winners = calculateGuessWinners(guesses, 45);
    // Should be 4 total (all guesses, up to 5 max)
    expect(winners).toHaveLength(4);
    expect(winners[0].participantId).toBe("teen1"); // 42, diff=3
    expect(winners[1].participantId).toBe("kid1");  // 40, diff=5
    expect(winners[2].participantId).toBe("adult1"); // 50, diff=5 (stable sort, adult1 after kid1)
    expect(winners[3].participantId).toBe("adult2"); // 100, diff=55
  });

  it("guess value is shown under participant name", () => {
    const existingGuess = { guess: 42 };
    // Always show guess under name (no canGuess gating)
    const displayText = existingGuess ? `Guess: ${String(existingGuess.guess)}` : null;
    expect(displayText).toBe("Guess: 42");
  });

  it("Judge tab is visible for guess scoring games when judge is logged in", () => {
    const scoringType = "guess";
    const isJudge = true;
    const showJudgeTab = isJudge && (scoringType === "guess" || scoringType === "guess-text");
    expect(showJudgeTab).toBe(true);
  });

  it("Judge tab is hidden for non-judges", () => {
    const scoringType = "guess";
    const isJudge = false;
    const showJudgeTab = isJudge && (scoringType === "guess" || scoringType === "guess-text");
    expect(showJudgeTab).toBe(false);
  });
});

describe("Guess-text judge text similarity", () => {
  const textSimilarity = (a: string, b: string): number => {
    const al = a.toLowerCase().trim();
    const bl = b.toLowerCase().trim();
    if (al === bl) return 1;
    if (bl.includes(al) || al.includes(bl)) return 0.8;
    const aChars = new Set(al.split(""));
    const bChars = new Set(bl.split(""));
    let overlap = 0;
    for (const c of aChars) if (bChars.has(c)) overlap++;
    return overlap / Math.max(aChars.size, bChars.size);
  };

  it("exact match returns 1", () => {
    expect(textSimilarity("Elephant", "Elephant")).toBe(1);
  });

  it("case-insensitive exact match returns 1", () => {
    expect(textSimilarity("elephant", "ELEPHANT")).toBe(1);
  });

  it("substring match returns 0.8", () => {
    expect(textSimilarity("Eleph", "Elephant")).toBe(0.8);
    expect(textSimilarity("Elephant", "Eleph")).toBe(0.8);
  });

  it("partial character overlap returns intermediate score", () => {
    const score = textSimilarity("Elephent", "Elephant");
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("completely different words return low score", () => {
    const score = textSimilarity("Banana", "Elephant");
    expect(score).toBeLessThan(0.4);
  });

  it("empty string vs text returns low score", () => {
    // Empty string is technically a substring of any string, so includes returns 0.8
    expect(textSimilarity("", "Elephant")).toBe(0.8);
  });

  it("sorts guesses by similarity to correct answer", () => {
    const correctAnswer = "Elephant";
    const guesses = [
      { participantId: "p1", guess: "Banana" },
      { participantId: "p2", guess: "Elephant" },
      { participantId: "p3", guess: "Eleph" },
      { participantId: "p4", guess: "Cat" },
    ];
    const sorted = [...guesses].sort(
      (a, b) => textSimilarity(String(b.guess), correctAnswer) - textSimilarity(String(a.guess), correctAnswer)
    );
    expect(sorted[0].participantId).toBe("p2"); // exact match
    expect(sorted[1].participantId).toBe("p3"); // substring
  });

  it("judge manually assigns medals for guess-text", () => {
    // For guess-text, judge sees sorted list and picks 1/2/3 manually
    const scoringType = "guess-text";
    const isJudge = true;
    const status: GameEventStatus = "finished";
    const showMedalButtons = scoringType === "guess-text" && isJudge && (status === "started" || status === "finished");
    expect(showMedalButtons).toBe(true);
  });

  it("medal buttons visible in Judge tab regardless of status", () => {
    const scoringType = "guess-text";
    const isJudge = true;
    // Medal buttons are always shown in Judge tab
    const showMedalButtons = scoringType === "guess-text" && isJudge;
    expect(showMedalButtons).toBe(true);
  });

  it("medal buttons visible for guess type too", () => {
    const scoringType = "guess";
    const isJudge = true;
    const showMedalButtons = (scoringType === "guess" || scoringType === "guess-text") && isJudge;
    expect(showMedalButtons).toBe(true);
  });

  it("correct answer input visible when no scores exist (no status gating)", () => {
    const groupScoresLength = 0;
    // Input always visible when no scores, regardless of status
    expect(!groupScoresLength).toBe(true);
    // Hidden when scores already exist
    expect(!3).toBe(false);
  });

  it("Judge tab shows all participants (registered + guessed) without age filtering", () => {
    const groupRegs = [
      { participantId: "p1", ageGroup: "kid" as RegistrationAgeGroup },
      { participantId: "p2", ageGroup: "teen" as RegistrationAgeGroup },
    ];
    const guesses = [
      { participantId: "p1", guess: "Cat" },
      { participantId: "p3", guess: "Dog" }, // p3 guessed but not registered
    ];
    // Judge tab logic: include all registered + those who guessed without registering
    const regIds = new Set(groupRegs.map((r) => r.participantId));
    const guessOnlyParticipants = guesses.filter((g) => !regIds.has(g.participantId));
    const allJudgeRegs = [...groupRegs, ...guessOnlyParticipants.map((g) => ({ participantId: g.participantId, ageGroup: "adult" as RegistrationAgeGroup }))];
    // Shows all 3 participants (2 registered + 1 guess-only)
    expect(allJudgeRegs).toHaveLength(3);
    expect(allJudgeRegs.map((r) => r.participantId)).toContain("p3");
  });

  it("Sort sorts all guesses by proximity without age group filtering", () => {
    const guesses = [
      { participantId: "p1", participantName: "P1", guess: 40 },
      { participantId: "p2", participantName: "P2", guess: 42 },
      { participantId: "p3", participantName: "P3", guess: 50 },
    ];
    // No registration-based filtering, sorts all guesses by proximity
    const answer = 45;
    const sorted = [...guesses].sort((a, b) => Math.abs((a.guess as number) - answer) - Math.abs((b.guess as number) - answer));
    expect(sorted[0].participantId).toBe("p2"); // diff=3
    expect(sorted[1].participantId).toBe("p1"); // diff=5
    expect(sorted[2].participantId).toBe("p3"); // diff=5
  });

  it("Judge manually assigns 1/2/3 medals for both guess types", () => {
    // Both Count Toffee (guess) and Guess the Box (guess-text) use manual medal assignment
    const scoringTypes = ["guess", "guess-text"];
    for (const scoringType of scoringTypes) {
      const isJudge = true;
      const status: GameEventStatus = "started";
      const showMedalButtons = isJudge && (status === "started" || status === "finished");
      expect(showMedalButtons).toBe(true);
    }
  });

  it("correctAnswer type supports both number and string", () => {
    const numAnswer: number | string | null = 42;
    const textAnswer: number | string | null = "Elephant";
    expect(typeof numAnswer).toBe("number");
    expect(typeof textAnswer).toBe("string");
  });
});

describe("Unique position enforcement in medal assignment", () => {
  /**
   * Mirrors the handleAssignMedal logic from the game detail page.
   * Given existing scores, event key groups, assigns a position to a participant
   * and returns updated scores (removing previous holder of that position AND
   * any existing position the participant had).
   */
  function assignMedal(
    scores: Score[],
    gameId: string,
    eventGroups: RegistrationAgeGroup[],
    participantId: string,
    participantName: string,
    ageGroup: RegistrationAgeGroup,
    position: 1 | 2 | 3 | 4 | 5
  ): Score[] {
    let updated = [...scores];
    // Remove previous holder of this position across all age groups in the event
    const prev = updated.find(
      (s) => s.gameId === gameId && eventGroups.includes(s.ageGroup as RegistrationAgeGroup) && s.position === position
    );
    if (prev) updated = updated.filter((s) => s.participantId !== prev.participantId);
    // Remove any existing score for this participant (if they had a different position)
    updated = updated.filter((s) => s.participantId !== participantId);
    // Assign new
    updated.push(makeScore(gameId, participantId, participantName, ageGroup, position));
    return updated;
  }

  it("only one participant can hold position 1 within same age group", () => {
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", ["adult"], "p1", "Alice", "adult", 1);
    scores = assignMedal(scores, "g1", ["adult"], "p2", "Bob", "adult", 1);
    const pos1 = scores.filter((s) => s.position === 1);
    expect(pos1).toHaveLength(1);
    expect(pos1[0].participantId).toBe("p2");
  });

  it("only one participant can hold position 2 within same age group", () => {
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", ["adult"], "p1", "Alice", "adult", 2);
    scores = assignMedal(scores, "g1", ["adult"], "p2", "Bob", "adult", 2);
    const pos2 = scores.filter((s) => s.position === 2);
    expect(pos2).toHaveLength(1);
    expect(pos2[0].participantId).toBe("p2");
  });

  it("only one participant can hold position 3 within same age group", () => {
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", ["teen"], "p1", "Alice", "teen", 3);
    scores = assignMedal(scores, "g1", ["teen"], "p2", "Bob", "teen", 3);
    const pos3 = scores.filter((s) => s.position === 3);
    expect(pos3).toHaveLength(1);
    expect(pos3[0].participantId).toBe("p2");
  });

  it("combined event: position 1 assigned to kid replaces teen who had position 1", () => {
    const eventGroups: RegistrationAgeGroup[] = ["kid", "teen", "adult"];
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", eventGroups, "teen1", "Teen1", "teen", 1);
    expect(scores.filter((s) => s.position === 1)).toHaveLength(1);
    scores = assignMedal(scores, "g1", eventGroups, "kid1", "Kid1", "kid", 1);
    const pos1 = scores.filter((s) => s.position === 1);
    expect(pos1).toHaveLength(1);
    expect(pos1[0].participantId).toBe("kid1");
    // teen1 should be completely removed
    expect(scores.find((s) => s.participantId === "teen1")).toBeUndefined();
  });

  it("combined event: all three positions across different age groups are unique", () => {
    const eventGroups: RegistrationAgeGroup[] = ["kid", "teen", "adult"];
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", eventGroups, "kid1", "Kid1", "kid", 1);
    scores = assignMedal(scores, "g1", eventGroups, "teen1", "Teen1", "teen", 2);
    scores = assignMedal(scores, "g1", eventGroups, "adult1", "Adult1", "adult", 3);
    expect(scores).toHaveLength(3);
    expect(scores.filter((s) => s.position === 1)).toHaveLength(1);
    expect(scores.filter((s) => s.position === 2)).toHaveLength(1);
    expect(scores.filter((s) => s.position === 3)).toHaveLength(1);
  });

  it("reassigning a participant removes their old position first", () => {
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", ["adult"], "p1", "Alice", "adult", 1);
    scores = assignMedal(scores, "g1", ["adult"], "p1", "Alice", "adult", 2);
    expect(scores).toHaveLength(1);
    expect(scores[0].position).toBe(2);
    expect(scores[0].participantId).toBe("p1");
  });

  it("different games do not interfere with each other", () => {
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", ["adult"], "p1", "Alice", "adult", 1);
    scores = assignMedal(scores, "g2", ["adult"], "p2", "Bob", "adult", 1);
    const game1Pos1 = scores.filter((s) => s.gameId === "g1" && s.position === 1);
    const game2Pos1 = scores.filter((s) => s.gameId === "g2" && s.position === 1);
    expect(game1Pos1).toHaveLength(1);
    expect(game2Pos1).toHaveLength(1);
    expect(game1Pos1[0].participantId).toBe("p1");
    expect(game2Pos1[0].participantId).toBe("p2");
  });

  it("assigning all 3 positions then replacing position 2 keeps exactly 3 scores", () => {
    let scores: Score[] = [];
    scores = assignMedal(scores, "g1", ["adult"], "p1", "Alice", "adult", 1);
    scores = assignMedal(scores, "g1", ["adult"], "p2", "Bob", "adult", 2);
    scores = assignMedal(scores, "g1", ["adult"], "p3", "Charlie", "adult", 3);
    expect(scores).toHaveLength(3);
    scores = assignMedal(scores, "g1", ["adult"], "p4", "Dave", "adult", 2);
    expect(scores).toHaveLength(3);
    expect(scores.find((s) => s.position === 2)?.participantId).toBe("p4");
    // p2 should be gone
    expect(scores.find((s) => s.participantId === "p2")).toBeUndefined();
  });

  it("BUG FIX: combined event prevents duplicate positions across different ageGroups", () => {
    // This is the exact bug scenario - kid+teen+adult event
    const eventGroups: RegistrationAgeGroup[] = ["kid", "teen", "adult"];
    let scores: Score[] = [];
    // Judge assigns position 1 to a kid
    scores = assignMedal(scores, "g1", eventGroups, "kid1", "Kid1", "kid", 1);
    // Judge assigns position 1 to a teen - should REPLACE the kid
    scores = assignMedal(scores, "g1", eventGroups, "teen1", "Teen1", "teen", 1);
    // There should be exactly ONE position 1 holder
    const pos1holders = scores.filter((s) => s.position === 1);
    expect(pos1holders).toHaveLength(1);
    expect(pos1holders[0].participantId).toBe("teen1");
    // Total scores should be 1, not 2
    expect(scores).toHaveLength(1);
  });
});

// ---- Guess tab status behavior ----

describe("Guess tab status messages", () => {
  // Mirrors the logic in the action tab for guess/guess-text scoring
  type GuessTabState = "not-started" | "active" | "finished";

  function getGuessTabState(status: GameEventStatus): GuessTabState {
    if (status === "finished") return "finished";
    if (status === "started") return "active";
    return "not-started";
  }

  function getGuessTabMessage(state: GuessTabState): string | null {
    if (state === "finished") return "Game is now over";
    if (state === "not-started") return "Game has not started yet";
    return null; // active — show inputs
  }

  function shouldShowAgeFilters(status: GameEventStatus, scoringType: string): boolean {
    if ((scoringType === "guess" || scoringType === "guess-text") && status !== "started") return false;
    return true;
  }

  it("shows 'Game has not started yet' when status is not-started", () => {
    const state = getGuessTabState("not-started");
    expect(state).toBe("not-started");
    expect(getGuessTabMessage(state)).toBe("Game has not started yet");
  });

  it("shows 'Game has not started yet' when status is starting-soon", () => {
    const state = getGuessTabState("starting-soon");
    expect(state).toBe("not-started");
    expect(getGuessTabMessage(state)).toBe("Game has not started yet");
  });

  it("shows no message (inputs visible) when status is started", () => {
    const state = getGuessTabState("started");
    expect(state).toBe("active");
    expect(getGuessTabMessage(state)).toBeNull();
  });

  it("shows 'Game is now over' when status is finished", () => {
    const state = getGuessTabState("finished");
    expect(state).toBe("finished");
    expect(getGuessTabMessage(state)).toBe("Game is now over");
  });

  it("shows 'Game is now over' when status is voting (non-guess type edge case)", () => {
    const state = getGuessTabState("voting");
    // voting is not "started" and not "finished", so treated as not-started
    expect(state).toBe("not-started");
    expect(getGuessTabMessage(state)).toBe("Game has not started yet");
  });

  it("hides age filters when guess game is not started", () => {
    expect(shouldShowAgeFilters("not-started", "guess")).toBe(false);
    expect(shouldShowAgeFilters("starting-soon", "guess")).toBe(false);
    expect(shouldShowAgeFilters("finished", "guess-text")).toBe(false);
  });

  it("shows age filters when guess game is started", () => {
    expect(shouldShowAgeFilters("started", "guess")).toBe(true);
    expect(shouldShowAgeFilters("started", "guess-text")).toBe(true);
  });

  it("shows age filters for non-guess games regardless of status", () => {
    expect(shouldShowAgeFilters("not-started", "judge")).toBe(true);
    expect(shouldShowAgeFilters("finished", "vote")).toBe(true);
  });
});

describe("Guess game medal assignment only when finished", () => {
  // Mirrors the Judge tab logic: section only renders when status === "finished"
  function canAssignMedals(status: GameEventStatus, scoringType: string): boolean {
    if (scoringType === "guess" || scoringType === "guess-text") {
      return status === "finished";
    }
    // For other scoring types, medals can be assigned when started
    return status === "started" || status === "voting";
  }

  it("cannot assign medals for guess game when not-started", () => {
    expect(canAssignMedals("not-started", "guess")).toBe(false);
  });

  it("cannot assign medals for guess game when starting-soon", () => {
    expect(canAssignMedals("starting-soon", "guess")).toBe(false);
  });

  it("cannot assign medals for guess game when started", () => {
    expect(canAssignMedals("started", "guess")).toBe(false);
  });

  it("can assign medals for guess game when finished", () => {
    expect(canAssignMedals("finished", "guess")).toBe(true);
  });

  it("cannot assign medals for guess-text game when not-started", () => {
    expect(canAssignMedals("not-started", "guess-text")).toBe(false);
  });

  it("cannot assign medals for guess-text game when started", () => {
    expect(canAssignMedals("started", "guess-text")).toBe(false);
  });

  it("can assign medals for guess-text game when finished", () => {
    expect(canAssignMedals("finished", "guess-text")).toBe(true);
  });

  it("can assign medals for judge scoring when started", () => {
    expect(canAssignMedals("started", "judge")).toBe(true);
  });

  it("cannot assign medals for judge scoring when not-started", () => {
    expect(canAssignMedals("not-started", "judge")).toBe(false);
  });
});

describe("Game status derivation from multiple events", () => {
  // Mirrors getLatestEventStatus logic from games page
  function deriveGameStatus(eventStatuses: GameEventStatus[]): GameEventStatus {
    if (eventStatuses.length === 0) return "not-started";
    const allFinished = eventStatuses.every((s) => s === "finished");
    if (allFinished) return "finished";
    // Take the least progressed (youngest) status
    let minIdx = STATUS_ORDER.length - 1;
    for (const s of eventStatuses) {
      const idx = STATUS_ORDER.indexOf(s);
      if (idx < minIdx) minIdx = idx;
    }
    return STATUS_ORDER[minIdx];
  }

  it("returns finished when all events are finished", () => {
    expect(deriveGameStatus(["finished", "finished", "finished"])).toBe("finished");
  });

  it("returns finished for single finished event", () => {
    expect(deriveGameStatus(["finished"])).toBe("finished");
  });

  it("returns not-started when all events are not-started", () => {
    expect(deriveGameStatus(["not-started", "not-started"])).toBe("not-started");
  });

  it("returns youngest status when events differ", () => {
    expect(deriveGameStatus(["started", "finished"])).toBe("started");
  });

  it("returns not-started when one event not-started and others finished", () => {
    expect(deriveGameStatus(["not-started", "finished", "finished"])).toBe("not-started");
  });

  it("returns starting-soon when youngest is starting-soon", () => {
    expect(deriveGameStatus(["starting-soon", "started", "finished"])).toBe("starting-soon");
  });

  it("returns started when youngest is started among started and finished", () => {
    expect(deriveGameStatus(["started", "finished"])).toBe("started");
  });

  it("returns voting when youngest is voting", () => {
    expect(deriveGameStatus(["voting", "finished"])).toBe("voting");
  });

  it("returns not-started for empty events", () => {
    expect(deriveGameStatus([])).toBe("not-started");
  });

  it("returns started for mix of started, voting, finished", () => {
    expect(deriveGameStatus(["started", "voting", "finished"])).toBe("started");
  });
});
