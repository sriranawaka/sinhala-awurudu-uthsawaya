// ---- Participant ----
export type AgeGroup = "adult" | "teen" | "kid" | "toddler" | "infant";

export type Gender = "male" | "female";

export interface Participant {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  gender: Gender;
  familyGroup: string;
  avatarUrl?: string;
  photoUrl?: string;
  kidsNames?: string[];
  participationStatus: "confirmed" | "pending" | "declined";
  selfRegistered?: boolean;
  createdAt: number;
}

// ---- Game ----
export type ScoringType = "judge" | "vote" | "guess" | "guess-text";
export type GameStatus = "upcoming" | "active" | "voting" | "completed";
export type GameEventStatus = "not-started" | "starting-soon" | "started" | "voting" | "finished";

export interface Game {
  id: string;
  name: string;
  nameSi: string;
  description?: string;
  responsiblePersons: string[];
  eligibleGroups: {
    adults: boolean;
    teens: boolean;
    kids: boolean;
  };
  scoringType: ScoringType;
  status: GameStatus;
  votingOpen: boolean;
  guessOpen?: boolean;
  correctAnswer?: number | string | null;
  order: number;
  events?: Record<string, { status: GameEventStatus }>;
}

// ---- Schedule ----
export interface ScheduleItem {
  id: string;
  itemNumber: number;
  name: string;
  nameSi: string;
  startTime: string; // "HH:mm"
  durationMins: number;
  applicableTo: {
    kids: boolean;
    teens: boolean;
    adults: boolean;
  };
  screen?: string;
  music?: string;
  responsible?: string;
  remarks?: string;
}

// ---- Score ----
export interface Score {
  id: string;
  gameId: string;
  participantId: string;
  participantName: string;
  ageGroup?: RegistrationAgeGroup;
  position: 1 | 2 | 3;
  points: number; // 3, 2, or 1
  judgedBy?: string;
  timestamp: number;
}

// ---- Guess ----
export interface Guess {
  id: string;
  gameId: string;
  participantId: string;
  participantName: string;
  guess: number | string;
  timestamp: number;
}

// ---- Vote ----
export interface Vote {
  id: string;
  gameId: string;
  participantId: string;
  voterId: string; // session ID
  timestamp: number;
}

// ---- Media ----
export interface MediaItem {
  id: string;
  gameId: string;
  uploadedByName: string;
  photoUrl: string;
  caption?: string;
  uploaderSessionId: string;
  timestamp: number;
}

// ---- Task ----
export interface Task {
  id: string;
  name: string;
  responsible: string[];
  status: "pending" | "in-progress" | "done";
}

// ---- Game Registration ----
export type RegistrationAgeGroup = "adult" | "teen" | "kid";

/** Event key — single age group or combined (e.g. "teen+adult", "kid+teen+adult") */
export type EventKey =
  | RegistrationAgeGroup
  | `${RegistrationAgeGroup}+${RegistrationAgeGroup}`
  | `${RegistrationAgeGroup}+${RegistrationAgeGroup}+${RegistrationAgeGroup}`;

/** Parse an EventKey into its constituent RegistrationAgeGroups */
export function eventKeyGroups(key: EventKey): RegistrationAgeGroup[] {
  return key.split("+") as RegistrationAgeGroup[];
}

export interface GameRegistration {
  id: string;
  gameId: string;
  participantId: string;
  participantName: string;
  ageGroup: RegistrationAgeGroup;
  registeredBy: "self" | "admin" | "judge";
  timestamp: number;
}

export interface Judge {
  id: string;
  email: string;
  name: string;
  addedBy: string;
  addedAt: number;
}
