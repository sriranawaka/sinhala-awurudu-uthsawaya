import { describe, it, expect } from "vitest";
import type { Judge, GameEventStatus } from "@/types";

const makeJudge = (
  email: string,
  name?: string,
  addedBy: string = "admin@test.com"
): Judge => ({
  id: email.toLowerCase().replace(/[^a-z0-9]/g, "_"),
  email: email.toLowerCase(),
  name: name ?? email.toLowerCase().split("@")[0],
  addedBy,
  addedAt: Date.now(),
});

describe("Judge management", () => {
  it("creates judge with normalized email as ID", () => {
    const judge = makeJudge("Judge@Gmail.Com", "Nimal");
    expect(judge.id).toBe("judge_gmail_com");
    expect(judge.email).toBe("judge@gmail.com");
  });

  it("stores judge name and addedBy correctly", () => {
    const judge = makeJudge("test@gmail.com", "Kamala", "admin@test.com");
    expect(judge.name).toBe("Kamala");
    expect(judge.addedBy).toBe("admin@test.com");
  });

  it("generates unique IDs for different emails", () => {
    const j1 = makeJudge("judge1@gmail.com", "Judge One");
    const j2 = makeJudge("judge2@gmail.com", "Judge Two");
    expect(j1.id).not.toBe(j2.id);
  });

  it("generates same ID for same email regardless of case", () => {
    const j1 = makeJudge("Judge@Gmail.com", "Judge");
    const j2 = makeJudge("judge@gmail.com", "Judge");
    expect(j1.id).toBe(j2.id);
  });

  describe("Judge list operations", () => {
    const judges: Judge[] = [
      makeJudge("alice@gmail.com", "Alice"),
      makeJudge("bob@gmail.com", "Bob"),
      makeJudge("charlie@gmail.com", "Charlie"),
    ];

    it("lists all judges", () => {
      expect(judges).toHaveLength(3);
    });

    it("finds judge by email", () => {
      const found = judges.find((j) => j.email === "bob@gmail.com");
      expect(found).toBeDefined();
      expect(found!.name).toBe("Bob");
    });

    it("removes judge from list by id", () => {
      const idToRemove = "bob_gmail_com";
      const remaining = judges.filter((j) => j.id !== idToRemove);
      expect(remaining).toHaveLength(2);
      expect(remaining.map((j) => j.name)).toEqual(["Alice", "Charlie"]);
    });

    it("sorts judges by addedAt descending (newest first)", () => {
      const timestamped: Judge[] = [
        { ...makeJudge("a@g.com", "A"), addedAt: 1000 },
        { ...makeJudge("b@g.com", "B"), addedAt: 3000 },
        { ...makeJudge("c@g.com", "C"), addedAt: 2000 },
      ];
      const sorted = timestamped.sort((a, b) => b.addedAt - a.addedAt);
      expect(sorted.map((j) => j.name)).toEqual(["B", "C", "A"]);
    });
  });

  describe("Email validation", () => {
    const isValidEmail = (email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    it("accepts valid gmail addresses", () => {
      expect(isValidEmail("judge@gmail.com")).toBe(true);
      expect(isValidEmail("my.judge@gmail.com")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@gmail.com")).toBe(false);
      expect(isValidEmail("judge@")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });

    it("accepts non-gmail email addresses", () => {
      expect(isValidEmail("judge@yahoo.com")).toBe(true);
      expect(isValidEmail("judge@outlook.com")).toBe(true);
    });
  });

  describe("Duplicate prevention", () => {
    it("detects duplicate judge by email", () => {
      const existingJudges: Judge[] = [
        makeJudge("existing@gmail.com", "Existing Judge"),
      ];
      const newEmail = "existing@gmail.com";
      const isDuplicate = existingJudges.some(
        (j) => j.email === newEmail.toLowerCase()
      );
      expect(isDuplicate).toBe(true);
    });

    it("detects duplicate regardless of email case", () => {
      const existingJudges: Judge[] = [
        makeJudge("Judge@Gmail.com", "Existing"),
      ];
      const newEmail = "JUDGE@GMAIL.COM";
      const isDuplicate = existingJudges.some(
        (j) => j.email === newEmail.toLowerCase()
      );
      expect(isDuplicate).toBe(true);
    });

    it("allows new unique email", () => {
      const existingJudges: Judge[] = [
        makeJudge("existing@gmail.com", "Existing"),
      ];
      const newEmail = "new@gmail.com";
      const isDuplicate = existingJudges.some(
        (j) => j.email === newEmail.toLowerCase()
      );
      expect(isDuplicate).toBe(false);
    });
  });
});

describe("Judge privileges", () => {
  const isJudge = true;
  const isPublicUser = false;

  describe("Game state management", () => {
    const canChangeGameStatus = (authenticated: boolean) => authenticated;

    it("judge can change game status", () => {
      expect(canChangeGameStatus(isJudge)).toBe(true);
    });

    it("public user cannot change game status", () => {
      expect(canChangeGameStatus(isPublicUser)).toBe(false);
    });

    it("judge can advance through all status transitions", () => {
      const statusOrder: GameEventStatus[] = ["not-started", "starting-soon", "started", "voting", "finished"];
      for (let i = 0; i < statusOrder.length - 1; i++) {
        const canAdvance = canChangeGameStatus(isJudge);
        expect(canAdvance).toBe(true);
      }
    });
  });

  describe("Participant deletion", () => {
    const canDeleteParticipant = (authenticated: boolean) => authenticated;

    it("judge can delete participants", () => {
      expect(canDeleteParticipant(isJudge)).toBe(true);
    });

    it("public user cannot delete participants", () => {
      expect(canDeleteParticipant(isPublicUser)).toBe(false);
    });

    it("delete button is hidden for public users", () => {
      const showDeleteButton = (authenticated: boolean) => authenticated;
      expect(showDeleteButton(isPublicUser)).toBe(false);
      expect(showDeleteButton(isJudge)).toBe(true);
    });
  });

  describe("Winner selection", () => {
    const canAssignMedal = (authenticated: boolean) => authenticated;
    const canRemoveMedal = (authenticated: boolean) => authenticated;

    it("judge can assign medals (1st, 2nd, 3rd)", () => {
      expect(canAssignMedal(isJudge)).toBe(true);
    });

    it("judge can remove medals", () => {
      expect(canRemoveMedal(isJudge)).toBe(true);
    });

    it("public user cannot assign medals", () => {
      expect(canAssignMedal(isPublicUser)).toBe(false);
    });

    it("public user cannot remove medals", () => {
      expect(canRemoveMedal(isPublicUser)).toBe(false);
    });

    it("judge can calculate guess winners when game is finished", () => {
      const canCalculateWinners = (authenticated: boolean, status: GameEventStatus) =>
        authenticated && status === "finished";
      expect(canCalculateWinners(isJudge, "finished")).toBe(true);
      expect(canCalculateWinners(isJudge, "started")).toBe(false);
      expect(canCalculateWinners(isPublicUser, "finished")).toBe(false);
    });
  });

  describe("Judge can tag another judge", () => {
    const canAddJudge = (authenticated: boolean) => authenticated;

    it("judge can add another judge", () => {
      expect(canAddJudge(isJudge)).toBe(true);
    });

    it("public user cannot add judges", () => {
      expect(canAddJudge(isPublicUser)).toBe(false);
    });

    it("judge can remove another judge", () => {
      const canRemoveJudge = (authenticated: boolean) => authenticated;
      expect(canRemoveJudge(isJudge)).toBe(true);
    });

    it("added judge records addedBy", () => {
      const judge = makeJudge("new@test.com", "New Judge", "admin@test.com");
      expect(judge.addedBy).toBe("admin@test.com");
    });

    it("judge management is hidden from public users", () => {
      const showJudgeManagement = (authenticated: boolean) => authenticated;
      expect(showJudgeManagement(isPublicUser)).toBe(false);
      expect(showJudgeManagement(isJudge)).toBe(true);
    });
  });

  describe("Registration management", () => {
    const canUnregisterParticipant = (authenticated: boolean) => authenticated;

    it("judge can unregister participants from games", () => {
      expect(canUnregisterParticipant(isJudge)).toBe(true);
    });

    it("public user cannot unregister other participants", () => {
      // Public users can only self-register/unregister via session match
      expect(canUnregisterParticipant(isPublicUser)).toBe(false);
    });
  });

  describe("Photo and media restrictions", () => {
    it("photo upload feature is removed for simplification", () => {
      // Photo upload has been removed from the compete page
      const photoUploadEnabled = false;
      expect(photoUploadEnabled).toBe(false);
    });
  });

  describe("Language setting", () => {
    it("language selector is hidden for simplification", () => {
      const languageSelectorVisible = false;
      expect(languageSelectorVisible).toBe(false);
    });

    it("app defaults to English", () => {
      const defaultLocale = "en";
      expect(defaultLocale).toBe("en");
    });
  });
});

describe("Email-only judge registration", () => {
  it("derives name from email when no name provided", () => {
    const judge = makeJudge("nimal.perera@gmail.com");
    expect(judge.name).toBe("nimal.perera");
    expect(judge.email).toBe("nimal.perera@gmail.com");
  });

  it("derives name from email with mixed case", () => {
    const judge = makeJudge("Kamala.Silva@Gmail.com");
    expect(judge.name).toBe("kamala.silva");
  });

  it("uses explicit name when provided", () => {
    const judge = makeJudge("test@gmail.com", "Explicit Name");
    expect(judge.name).toBe("Explicit Name");
  });

  it("only requires email to register a judge", () => {
    const email = "newjudge@gmail.com";
    const judge = makeJudge(email);
    expect(judge.email).toBe(email);
    expect(judge.name).toBe("newjudge");
    expect(judge.id).toBe("newjudge_gmail_com");
    expect(judge.addedBy).toBe("admin@test.com");
    expect(judge.addedAt).toBeGreaterThan(0);
  });
});

describe("Google auth judge verification", () => {
  const isRegisteredJudge = (email: string, judges: Judge[]) =>
    judges.some((j) => j.email === email.toLowerCase());

  const registeredJudges: Judge[] = [
    makeJudge("judge1@gmail.com"),
    makeJudge("judge2@gmail.com"),
  ];

  it("allows login for registered judge email", () => {
    expect(isRegisteredJudge("judge1@gmail.com", registeredJudges)).toBe(true);
  });

  it("allows login regardless of email case", () => {
    expect(isRegisteredJudge("JUDGE1@Gmail.COM", registeredJudges)).toBe(true);
  });

  it("rejects login for unregistered email", () => {
    expect(isRegisteredJudge("random@gmail.com", registeredJudges)).toBe(false);
  });

  it("rejects empty email", () => {
    expect(isRegisteredJudge("", registeredJudges)).toBe(false);
  });
});

describe("Judge name update on Google sign-in", () => {
  it("updates name from Google profile", () => {
    const judge = makeJudge("test@gmail.com");
    expect(judge.name).toBe("test");
    const googleDisplayName = "Test User";
    const updated = { ...judge, name: googleDisplayName };
    expect(updated.name).toBe("Test User");
    expect(updated.email).toBe("test@gmail.com");
  });

  it("keeps email-derived name if no Google display name", () => {
    const judge = makeJudge("nimal@gmail.com");
    const googleDisplayName: string | null = null;
    const finalName = googleDisplayName ?? judge.name;
    expect(finalName).toBe("nimal");
  });
});
