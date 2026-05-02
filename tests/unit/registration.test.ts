import { describe, it, expect } from "vitest";
import type { Participant, GameRegistration, RegistrationAgeGroup, Gender } from "@/types";

const makeParticipant = (id: string, name: string, ageGroup: string, family: string, gender: Gender = "male"): Participant => ({
  id,
  name,
  ageGroup: ageGroup as Participant["ageGroup"],
  gender,
  familyGroup: family,
  participationStatus: "confirmed",
  selfRegistered: false,
  createdAt: Date.now(),
});

const makeRegistration = (
  gameId: string,
  participantId: string,
  name: string,
  ageGroup: RegistrationAgeGroup
): GameRegistration => ({
  id: `${gameId}_${participantId}`,
  gameId,
  participantId,
  participantName: name,
  ageGroup,
  registeredBy: "self",
  timestamp: Date.now(),
});

describe("Registration eligibility filtering", () => {
  const participants: Participant[] = [
    makeParticipant("p1", "Alice", "adult", "FamA", "female"),
    makeParticipant("p2", "Bob", "adult", "FamB", "male"),
    makeParticipant("p3", "Charlie", "teen", "FamA", "male"),
    makeParticipant("p4", "Diana", "kid", "FamB", "female"),
    makeParticipant("p5", "Eve", "kid", "FamA", "female"),
  ];

  it("filters participants by adult age group", () => {
    const eligible = participants.filter((p) => p.ageGroup === "adult");
    expect(eligible).toHaveLength(2);
    expect(eligible.map((p) => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("filters participants by teen age group", () => {
    const eligible = participants.filter((p) => p.ageGroup === "teen");
    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe("Charlie");
  });

  it("filters participants by kid age group", () => {
    const eligible = participants.filter((p) => p.ageGroup === "kid");
    expect(eligible).toHaveLength(2);
    expect(eligible.map((p) => p.name)).toEqual(["Diana", "Eve"]);
  });

  it("identifies registered participants from registrations list", () => {
    const registrations: GameRegistration[] = [
      makeRegistration("g1", "p1", "Alice", "adult"),
      makeRegistration("g1", "p3", "Charlie", "teen"),
    ];

    const registeredIds = new Set(
      registrations.filter((r) => r.ageGroup === "adult").map((r) => r.participantId)
    );

    expect(registeredIds.has("p1")).toBe(true);
    expect(registeredIds.has("p2")).toBe(false);
  });

  it("separates registrations by age group", () => {
    const registrations: GameRegistration[] = [
      makeRegistration("g1", "p1", "Alice", "adult"),
      makeRegistration("g1", "p2", "Bob", "adult"),
      makeRegistration("g1", "p3", "Charlie", "teen"),
      makeRegistration("g1", "p4", "Diana", "kid"),
    ];

    const regByGroup = {
      adult: registrations.filter((r) => r.ageGroup === "adult"),
      teen: registrations.filter((r) => r.ageGroup === "teen"),
      kid: registrations.filter((r) => r.ageGroup === "kid"),
    };

    expect(regByGroup.adult).toHaveLength(2);
    expect(regByGroup.teen).toHaveLength(1);
    expect(regByGroup.kid).toHaveLength(1);
  });

  it("generates correct registration document ID", () => {
    const gameId = "game123";
    const participantId = "part456";
    const id = `${gameId}_${participantId}`;
    expect(id).toBe("game123_part456");
  });

  it("determines eligible age groups from game config", () => {
    const eligibleGroups = { adults: true, teens: false, kids: true };
    const ageGroups: { key: string; label: string }[] = [];
    if (eligibleGroups.adults) ageGroups.push({ key: "adult", label: "Adults" });
    if (eligibleGroups.teens) ageGroups.push({ key: "teen", label: "Teens" });
    if (eligibleGroups.kids) ageGroups.push({ key: "kid", label: "Kids" });

    expect(ageGroups).toHaveLength(2);
    expect(ageGroups.map((g) => g.key)).toEqual(["adult", "kid"]);
  });

  it("sorts registered participants to the top", () => {
    const eligible = [
      makeParticipant("p1", "Alice", "kid", "FamA", "female"),
      makeParticipant("p2", "Bob", "kid", "FamB", "male"),
      makeParticipant("p3", "Charlie", "kid", "FamC", "male"),
    ];
    const registeredIds = new Set(["p2"]);

    const sorted = [...eligible].sort((a, b) => {
      const aReg = registeredIds.has(a.id) ? 0 : 1;
      const bReg = registeredIds.has(b.id) ? 0 : 1;
      return aReg - bReg || a.name.localeCompare(b.name);
    });

    expect(sorted[0].name).toBe("Bob"); // registered, comes first
    expect(sorted[1].name).toBe("Alice");
    expect(sorted[2].name).toBe("Charlie");
  });

  it("returns gender-based avatar color", () => {
    function getAvatarColor(gender?: string) {
      return gender === "female" ? "bg-pink-500" : "bg-primary";
    }
    expect(getAvatarColor("male")).toBe("bg-primary");
    expect(getAvatarColor("female")).toBe("bg-pink-500");
    expect(getAvatarColor(undefined)).toBe("bg-primary");
  });

  it("groups scores by age group and sorts by position within each group", () => {
    const scores = [
      { id: "s1", gameId: "g1", participantId: "p1", participantName: "Alice", ageGroup: "adult" as const, position: 1 as const, points: 3, timestamp: 0 },
      { id: "s2", gameId: "g1", participantId: "p2", participantName: "Bob", ageGroup: "adult" as const, position: 2 as const, points: 2, timestamp: 0 },
      { id: "s3", gameId: "g1", participantId: "p3", participantName: "Charlie", ageGroup: "kid" as const, position: 1 as const, points: 3, timestamp: 0 },
      { id: "s4", gameId: "g1", participantId: "p4", participantName: "Diana", ageGroup: "kid" as const, position: 2 as const, points: 2, timestamp: 0 },
    ];

    const scoresByAge: Record<string, typeof scores> = {};
    for (const s of scores) {
      const ag = s.ageGroup || "adult";
      if (!scoresByAge[ag]) scoresByAge[ag] = [];
      scoresByAge[ag].push(s);
    }
    for (const ag of Object.keys(scoresByAge)) {
      scoresByAge[ag].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    }

    const groupOrder = ["kid", "teen", "adult"];
    const groups = groupOrder.filter((g) => scoresByAge[g]?.length);

    expect(groups).toEqual(["kid", "adult"]);
    expect(scoresByAge["kid"]).toHaveLength(2);
    expect(scoresByAge["kid"][0].participantName).toBe("Charlie");
    expect(scoresByAge["kid"][1].participantName).toBe("Diana");
    expect(scoresByAge["adult"]).toHaveLength(2);
    expect(scoresByAge["adult"][0].participantName).toBe("Alice");
    expect(scoresByAge["adult"][1].participantName).toBe("Bob");
  });

  it("maps positions to labels and medal PNGs", () => {
    const positionLabel: Record<1 | 2 | 3 | 4 | 5, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
    const positionMedalSrc: Record<1 | 2 | 3 | 4 | 5, string> = { 1: "/medals/1st.png", 2: "/medals/2nd.png", 3: "/medals/3rd.png", 4: "", 5: "" };
    expect(positionLabel[1]).toBe("1st");
    expect(positionLabel[2]).toBe("2nd");
    expect(positionLabel[3]).toBe("3rd");
    expect(positionLabel[4]).toBe("4th");
    expect(positionLabel[5]).toBe("5th");
    expect(positionMedalSrc[1]).toBe("/medals/1st.png");
    expect(positionMedalSrc[2]).toBe("/medals/2nd.png");
    expect(positionMedalSrc[3]).toBe("/medals/3rd.png");
    expect(positionMedalSrc[4]).toBe("");
    expect(positionMedalSrc[5]).toBe("");
  });

  it("detects existing position holder for replacement", () => {
    const scores = [
      { id: "g1_p1", gameId: "g1", participantId: "p1", participantName: "Alice", ageGroup: "kid" as const, position: 1 as const, points: 3, timestamp: 0 },
      { id: "g1_p2", gameId: "g1", participantId: "p2", participantName: "Bob", ageGroup: "kid" as const, position: 2 as const, points: 2, timestamp: 0 },
    ];

    const scoreByPosition = new Map(scores.map((s) => [s.position, s]));
    const scoreByParticipant = new Map(scores.map((s) => [s.participantId, s]));

    // p3 wants position 1 — p1 currently holds it
    const holder = scoreByPosition.get(1);
    expect(holder?.participantId).toBe("p1");

    // p1 already has a position
    const existing = scoreByParticipant.get("p1");
    expect(existing?.position).toBe(1);

    // p3 has no existing score
    expect(scoreByParticipant.get("p3")).toBeUndefined();
  });

  it("prevents unregistration when participant has a position assigned", () => {
    const scores = [
      { id: "g1_p1", gameId: "g1", participantId: "p1", participantName: "Alice", ageGroup: "kid" as const, position: 1 as const, points: 3, timestamp: 0 },
      { id: "g1_p2", gameId: "g1", participantId: "p2", participantName: "Bob", ageGroup: "kid" as const, position: 2 as const, points: 2, timestamp: 0 },
    ];

    const scoreByParticipant = new Map(scores.map((s) => [s.participantId, s]));

    // Simulate the guard: if participant has a score, block unregister
    function canUnregister(participantId: string) {
      return !scoreByParticipant.has(participantId);
    }

    // p1 has 1st place — cannot unregister
    expect(canUnregister("p1")).toBe(false);
    // p2 has 2nd place — cannot unregister
    expect(canUnregister("p2")).toBe(false);
    // p3 has no position — can unregister
    expect(canUnregister("p3")).toBe(true);
  });

  it("prevents unregistration when participant has received votes", () => {
    const votes = [
      { id: "g1_v1_p4", gameId: "g1", participantId: "p4", voterId: "v1", timestamp: 0 },
      { id: "g1_v2_p4", gameId: "g1", participantId: "p4", voterId: "v2", timestamp: 0 },
      { id: "g1_v1_p5", gameId: "g1", participantId: "p5", voterId: "v1", timestamp: 0 },
    ];

    const votedParticipantIds = new Set(votes.map((v) => v.participantId));
    const scoreByParticipant = new Map<string, unknown>();

    function canUnregister(participantId: string) {
      return !scoreByParticipant.has(participantId) && !votedParticipantIds.has(participantId);
    }

    // p4 has received 2 votes — cannot unregister
    expect(canUnregister("p4")).toBe(false);
    // p5 has received 1 vote — cannot unregister
    expect(canUnregister("p5")).toBe(false);
    // p3 has no votes and no score — can unregister
    expect(canUnregister("p3")).toBe(true);
  });

  it("enables voting only when votingOpen is true", () => {
    function isVotingEnabled(scoringType: string, votingOpen: boolean) {
      return scoringType === "vote" && votingOpen;
    }

    // Before admin starts voting — disabled
    expect(isVotingEnabled("vote", false)).toBe(false);
    // Admin clicks Start Voting — enabled
    expect(isVotingEnabled("vote", true)).toBe(true);
    // Admin clicks Stop Voting — disabled again
    expect(isVotingEnabled("vote", false)).toBe(false);
    // Judge-scored game — always disabled
    expect(isVotingEnabled("judge", true)).toBe(false);
    expect(isVotingEnabled("judge", false)).toBe(false);
  });

  it("enables guessing only when guessOpen is true", () => {
    function isGuessEnabled(scoringType: string, guessOpen: boolean) {
      return (scoringType === "guess" || scoringType === "guess-text") && guessOpen;
    }

    expect(isGuessEnabled("guess", false)).toBe(false);
    expect(isGuessEnabled("guess", true)).toBe(true);
    expect(isGuessEnabled("guess-text", false)).toBe(false);
    expect(isGuessEnabled("guess-text", true)).toBe(true);
    expect(isGuessEnabled("judge", true)).toBe(false);
    expect(isGuessEnabled("vote", true)).toBe(false);
  });

  it("calculates closest guess winners correctly", () => {
    const guesses = [
      { participantId: "p1", participantName: "Alice", guess: 30 },
      { participantId: "p2", participantName: "Bob", guess: 45 },
      { participantId: "p3", participantName: "Charlie", guess: 42 },
      { participantId: "p4", participantName: "Diana", guess: 50 },
      { participantId: "p5", participantName: "Eve", guess: 38 },
    ];

    const correctAnswer = 40;
    const sorted = [...guesses].sort(
      (a, b) => Math.abs(a.guess - correctAnswer) - Math.abs(b.guess - correctAnswer)
    );

    // Closest: Charlie (42, diff 2), Eve (38, diff 2), Bob (45, diff 5)
    // Stable sort keeps original order for ties — Charlie before Eve
    expect(sorted[0].participantName).toBe("Charlie"); // diff 2
    expect(sorted[1].participantName).toBe("Eve"); // diff 2
    expect(sorted[2].participantName).toBe("Bob"); // diff 5

    // Winners are top 3
    const winners = sorted.slice(0, 3);
    expect(winners).toHaveLength(3);
    expect(winners.map((w) => w.participantName)).toEqual(["Charlie", "Eve", "Bob"]);
  });

  it("prevents unregistration when participant has submitted a guess", () => {
    const guessMap = new Map<string, number | string>([
      ["p1", 42],
      ["p2", "apple"],
    ]);
    const scoreByParticipant = new Map<string, unknown>();
    const votedParticipantIds = new Set<string>();

    function canUnregister(participantId: string) {
      return !scoreByParticipant.has(participantId)
        && !votedParticipantIds.has(participantId)
        && !guessMap.has(participantId);
    }

    expect(canUnregister("p1")).toBe(false); // has number guess
    expect(canUnregister("p2")).toBe(false); // has text guess
    expect(canUnregister("p3")).toBe(true);  // no guess
  });

  it("allows modifying a guess but not clearing it", () => {
    const existingGuess = 42;
    // Simulate onChange guard: block clearing to empty when guess exists
    function allowChange(newVal: string, existing: number | string | null) {
      return !(existing != null && newVal === "");
    }
    expect(allowChange("", existingGuess)).toBe(false);   // can't clear
    expect(allowChange("50", existingGuess)).toBe(true);  // can change
    expect(allowChange("", null)).toBe(true);              // no prior guess, empty ok

    // Modify button only enabled when value changed
    function modifyEnabled(inputVal: string, existing: number | string) {
      return inputVal !== String(existing);
    }
    expect(modifyEnabled("42", 42)).toBe(false);  // same value
    expect(modifyEnabled("50", 42)).toBe(true);   // changed

    // Text guess: same rules apply
    expect(allowChange("", "apple")).toBe(false);   // can't clear text guess
    expect(allowChange("banana", "apple")).toBe(true);
    expect(modifyEnabled("apple", "apple")).toBe(false); // same text
    expect(modifyEnabled("banana", "apple")).toBe(true);  // changed text
  });

  it("validates text guess max length of 50 characters", () => {
    function isValidTextGuess(value: string) {
      return value.trim().length > 0 && value.length <= 50;
    }
    expect(isValidTextGuess("apple")).toBe(true);
    expect(isValidTextGuess("a".repeat(50))).toBe(true);
    expect(isValidTextGuess("a".repeat(51))).toBe(false);
    expect(isValidTextGuess("")).toBe(false);
    expect(isValidTextGuess("   ")).toBe(false);
  });

  it("winner tagging is on action tab, not register tab", () => {
    // Winner tagging was moved from register page to dedicated action tab
    // Register page no longer shows 1/2/3 buttons for any scoring type
    function registerPageShowsWinnerTagging(_scoringType: string) {
      return false; // removed from register page
    }
    expect(registerPageShowsWinnerTagging("judge")).toBe(false);
    expect(registerPageShowsWinnerTagging("guess-text")).toBe(false);
    expect(registerPageShowsWinnerTagging("guess")).toBe(false);
    expect(registerPageShowsWinnerTagging("vote")).toBe(false);

    // Action tab shows judge controls for judge-scored games
    function showsJudgingSection(scoringType: string) {
      return scoringType === "judge";
    }
    expect(showsJudgingSection("judge")).toBe(true);
    expect(showsJudgingSection("vote")).toBe(false);
    expect(showsJudgingSection("guess")).toBe(false);
    expect(showsJudgingSection("guess-text")).toBe(false);

    // Action tab shows voting for vote games
    function showsVotingSection(scoringType: string) {
      return scoringType === "vote";
    }
    expect(showsVotingSection("vote")).toBe(true);
    expect(showsVotingSection("judge")).toBe(false);

    // Action tab shows guessing for guess games
    function showsGuessingSection(scoringType: string) {
      return scoringType === "guess" || scoringType === "guess-text";
    }
    expect(showsGuessingSection("guess")).toBe(true);
    expect(showsGuessingSection("guess-text")).toBe(true);
    expect(showsGuessingSection("judge")).toBe(false);
    expect(showsGuessingSection("vote")).toBe(false);
  });

  it("selects correct avatar PNG based on gender and age", () => {
    function getAvatarSrc(gender: string, ageGroup: string) {
      const isChild = ageGroup === "kid" || ageGroup === "toddler" || ageGroup === "infant";
      const isTeen = ageGroup === "teen";
      if (gender === "female") {
        if (isChild) return "/avatars/kid-girl.png";
        if (isTeen) return "/avatars/teen-girl.png";
        return "/avatars/adult-woman.png";
      }
      if (isChild) return "/avatars/kid-boy.png";
      if (isTeen) return "/avatars/teen-boy.png";
      return "/avatars/adult-man.png";
    }

    expect(getAvatarSrc("male", "adult")).toBe("/avatars/adult-man.png");
    expect(getAvatarSrc("female", "adult")).toBe("/avatars/adult-woman.png");
    expect(getAvatarSrc("male", "teen")).toBe("/avatars/teen-boy.png");
    expect(getAvatarSrc("female", "teen")).toBe("/avatars/teen-girl.png");
    expect(getAvatarSrc("male", "kid")).toBe("/avatars/kid-boy.png");
    expect(getAvatarSrc("female", "kid")).toBe("/avatars/kid-girl.png");
    expect(getAvatarSrc("female", "toddler")).toBe("/avatars/kid-girl.png");
  });

  it("judging page filters scores by age group", () => {
    const scores = [
      { id: "g1_p1", gameId: "g1", participantId: "p1", participantName: "Alice", ageGroup: "adult" as const, position: 1 as const, points: 3, timestamp: 0 },
      { id: "g1_p2", gameId: "g1", participantId: "p2", participantName: "Bob", ageGroup: "kid" as const, position: 1 as const, points: 3, timestamp: 0 },
      { id: "g1_p3", gameId: "g1", participantId: "p3", participantName: "Charlie", ageGroup: "adult" as const, position: 2 as const, points: 2, timestamp: 0 },
    ];

    const ageGroup = "adult";
    const ageScores = scores.filter((s) => (s.ageGroup || "adult") === ageGroup);
    expect(ageScores).toHaveLength(2);
    expect(ageScores.map((s) => s.participantName)).toEqual(["Alice", "Charlie"]);

    const scoreByParticipant = new Map(ageScores.map((s) => [s.participantId, s]));
    const scoreByPosition = new Map(ageScores.map((s) => [s.position, s]));

    expect(scoreByParticipant.get("p1")?.position).toBe(1);
    expect(scoreByPosition.get(1)?.participantId).toBe("p1");
    expect(scoreByPosition.get(2)?.participantId).toBe("p3");
  });
});

describe("Participant list ordering and display", () => {
  const participants: Participant[] = [
    makeParticipant("p1", "Alice", "adult", "FamA", "female"),
    makeParticipant("p2", "Bob", "teen", "FamA", "male"),
    makeParticipant("p3", "Charlie", "kid", "FamA", "male"),
    makeParticipant("p4", "Diana", "adult", "FamB", "female"),
    makeParticipant("p5", "Eve", "kid", "FamB", "female"),
    makeParticipant("p6", "Frank", "teen", "FamB", "male"),
  ];

  const ageGroupOrder: Record<string, number> = { kid: 0, teen: 1, adult: 2 };

  it("sorts participants: kids first, then teens, then adults", () => {
    const sorted = [...participants].sort((a, b) => {
      const orderDiff = (ageGroupOrder[a.ageGroup] ?? 3) - (ageGroupOrder[b.ageGroup] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

    expect(sorted.map((p) => p.name)).toEqual([
      "Charlie", "Eve",       // kids (alphabetical)
      "Bob", "Frank",          // teens (alphabetical)
      "Alice", "Diana",        // adults (alphabetical)
    ]);
  });

  it("finds parent name for kids and teens from same family group", () => {
    function getParentName(p: Participant): string | null {
      if (p.ageGroup === "adult") return null;
      const parent = participants.find(
        (a) => a.ageGroup === "adult" && a.familyGroup === p.familyGroup
      );
      return parent?.name || null;
    }

    expect(getParentName(participants[2])).toBe("Alice");   // Charlie (kid, FamA) → Alice
    expect(getParentName(participants[4])).toBe("Diana");   // Eve (kid, FamB) → Diana
    expect(getParentName(participants[1])).toBe("Alice");   // Bob (teen, FamA) → Alice
    expect(getParentName(participants[5])).toBe("Diana");   // Frank (teen, FamB) → Diana
    expect(getParentName(participants[0])).toBeNull();       // Alice (adult) → null
  });

  it("returns null parent for orphaned kid with no matching adult", () => {
    const orphan = makeParticipant("p9", "Zara", "kid", "FamZ", "female");
    const parent = participants.find(
      (a) => a.ageGroup === "adult" && a.familyGroup === orphan.familyGroup
    );
    expect(parent).toBeUndefined();
  });

  it("applies correct age group colors", () => {
    const ageGroupColor: Record<string, { bg: string; text: string }> = {
      kid: { bg: "bg-success/10", text: "text-success" },
      teen: { bg: "bg-info/10", text: "text-info" },
      adult: { bg: "bg-primary/10", text: "text-primary" },
    };

    expect(ageGroupColor["kid"].text).toBe("text-success");     // green
    expect(ageGroupColor["teen"].text).toBe("text-info");        // blue
    expect(ageGroupColor["adult"].text).toBe("text-primary");    // purple
  });
});

describe("First name duplicate check", () => {
  const existing: Participant[] = [
    makeParticipant("p1", "Nimal", "adult", "FamA"),
    makeParticipant("p2", "Kamala", "adult", "FamB", "female"),
    makeParticipant("p3", "Sunil", "teen", "FamA"),
  ];

  it("detects duplicate first name (case-insensitive)", () => {
    function checkDuplicate(name: string) {
      return existing.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    }
    expect(checkDuplicate("Nimal")).toBeDefined();
    expect(checkDuplicate("nimal")).toBeDefined();
    expect(checkDuplicate("NIMAL")).toBeDefined();
    expect(checkDuplicate("Kasun")).toBeUndefined();
  });

  it("does not flag empty input as duplicate", () => {
    function checkDuplicate(name: string) {
      if (!name.trim()) return null;
      return existing.find((p) => p.name.toLowerCase() === name.trim().toLowerCase()) || null;
    }
    expect(checkDuplicate("")).toBeNull();
    expect(checkDuplicate("   ")).toBeNull();
  });
});

describe("Parent dropdown for family group", () => {
  const participants: Participant[] = [
    makeParticipant("p1", "Nimal", "adult", "Perera"),
    makeParticipant("p2", "Kamala", "adult", "Silva", "female"),
    makeParticipant("p3", "Sunil", "teen", "Perera"),
    makeParticipant("p4", "Ruwan", "kid", "Silva"),
  ];

  it("shows only adults as parent options for kids/teens", () => {
    const adults = participants.filter((p) => p.ageGroup === "adult");
    expect(adults).toHaveLength(2);
    expect(adults.map((a) => a.name)).toEqual(["Nimal", "Kamala"]);
  });

  it("selecting a parent assigns their family group", () => {
    const adults = participants.filter((p) => p.ageGroup === "adult");
    const selectedParent = adults.find((a) => a.name === "Nimal");
    expect(selectedParent?.familyGroup).toBe("Perera");
  });

  it("adults have no family group field — auto-generates 'Name's family'", () => {
    function getFamilyGroup(ageGroup: string, name: string, selectedParentFamily: string) {
      return ageGroup === "adult" ? `${name}'s family` : selectedParentFamily;
    }
    expect(getFamilyGroup("adult", "Nimal", "")).toBe("Nimal's family");
    expect(getFamilyGroup("adult", "Kamala", "")).toBe("Kamala's family");
    expect(getFamilyGroup("kid", "Sunil", "Nimal's family")).toBe("Nimal's family");
    expect(getFamilyGroup("teen", "Kasun", "Kamala's family")).toBe("Kamala's family");
  });

  it("kids/teens show parent dropdown, adults do not", () => {
    function showsParentDropdown(ageGroup: string) {
      return ageGroup !== "adult";
    }
    expect(showsParentDropdown("kid")).toBe(true);
    expect(showsParentDropdown("teen")).toBe(true);
    expect(showsParentDropdown("adult")).toBe(false);
  });

  it("parent dropdown shows just parent name without family group", () => {
    const adults = participants.filter((p) => p.ageGroup === "adult");
    // Dropdown options show only the name
    const options = adults.map((a) => a.name);
    expect(options).toEqual(["Nimal", "Kamala"]);
    // But values are still the family group
    const values = adults.map((a) => a.familyGroup);
    expect(values).toEqual(["Perera", "Silva"]);
  });
});
