import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Participant,
  Game,
  ScheduleItem,
  Score,
  Vote,
  Guess,
  MediaItem,
  Task,
  GameRegistration,
  Judge,
  RegistrationAgeGroup,
  GameEventStatus,
  EventKey,
} from "@/types";

// ---- Collections ----
const col = (name: string) => collection(db, name);

// ---- Participants ----
export async function getParticipants(): Promise<Participant[]> {
  const snap = await getDocs(query(col("participants"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Participant);
}

export async function addParticipant(p: Omit<Participant, "id">): Promise<string> {
  const ref = doc(col("participants"));
  await setDoc(ref, p);
  return ref.id;
}

export async function updateParticipant(id: string, data: Partial<Participant>) {
  await updateDoc(doc(db, "participants", id), data);
}

export async function deleteParticipant(id: string) {
  await deleteDoc(doc(db, "participants", id));
}

// ---- Games ----
export async function getGames(): Promise<Game[]> {
  const snap = await getDocs(query(col("games"), orderBy("order")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Game);
}

export async function updateGame(id: string, data: Partial<Game>) {
  await updateDoc(doc(db, "games", id), data);
}

export function onGamesSnapshot(cb: (games: Game[]) => void): Unsubscribe {
  return onSnapshot(query(col("games"), orderBy("order")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Game));
  });
}

export async function updateGameEventStatus(
  gameId: string,
  eventKey: EventKey,
  status: GameEventStatus,
) {
  await updateDoc(doc(db, "games", gameId), {
    [`events.${eventKey}.status`]: status,
  });
}

export async function saveTeams(
  gameId: string,
  eventKey: EventKey,
  team1: string[],
  team2: string[],
) {
  await updateDoc(doc(db, "games", gameId), {
    [`teams.${eventKey}.team1`]: team1,
    [`teams.${eventKey}.team2`]: team2,
  });
}

// ---- Schedule ----
export async function getSchedule(): Promise<ScheduleItem[]> {
  const snap = await getDocs(query(col("schedule"), orderBy("itemNumber")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScheduleItem);
}

// ---- Scores ----
export async function getScores(): Promise<Score[]> {
  const snap = await getDocs(col("scores"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Score);
}

export async function getScoresByGame(gameId: string): Promise<Score[]> {
  const snap = await getDocs(
    query(col("scores"), where("gameId", "==", gameId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Score)
    .sort((a, b) => a.position - b.position);
}

export async function setScore(score: Omit<Score, "id">): Promise<string> {
  const id = `${score.gameId}_${score.participantId}`;
  await setDoc(doc(db, "scores", id), score);
  return id;
}

export async function deleteScore(gameId: string, participantId: string): Promise<void> {
  const id = `${gameId}_${participantId}`;
  await deleteDoc(doc(db, "scores", id));
}

export async function deleteScoresByGame(gameId: string) {
  const scores = await getScoresByGame(gameId);
  for (const s of scores) {
    await deleteDoc(doc(db, "scores", s.id));
  }
}

export function onScoresSnapshot(cb: (scores: Score[]) => void): Unsubscribe {
  return onSnapshot(col("scores"), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Score));
  });
}

// ---- Guesses ----
export async function getGuessesByGame(gameId: string): Promise<Guess[]> {
  const snap = await getDocs(
    query(col("guesses"), where("gameId", "==", gameId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Guess);
}

export async function submitGuess(guess: Omit<Guess, "id">): Promise<string> {
  const id = `${guess.gameId}_${guess.participantId}`;
  await setDoc(doc(db, "guesses", id), guess);
  return id;
}

export async function getGuessByParticipant(gameId: string, participantId: string): Promise<Guess | null> {
  const id = `${gameId}_${participantId}`;
  const snap = await getDoc(doc(db, "guesses", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Guess;
}

// ---- Votes ----
export async function getVotesByGame(gameId: string): Promise<Vote[]> {
  const snap = await getDocs(
    query(col("votes"), where("gameId", "==", gameId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vote);
}

export async function castVote(vote: Omit<Vote, "id">): Promise<string> {
  const id = `${vote.gameId}_${vote.voterId}_${vote.participantId}`;
  const existing = await getDoc(doc(db, "votes", id));
  if (existing.exists()) {
    throw new Error("Already voted for this participant");
  }
  await setDoc(doc(db, "votes", id), vote);
  return id;
}

export async function getVotesByVoter(gameId: string, voterId: string): Promise<Vote[]> {
  const snap = await getDocs(
    query(col("votes"), where("gameId", "==", gameId), where("voterId", "==", voterId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vote);
}

export function onVotesSnapshot(
  gameId: string,
  cb: (votes: Vote[]) => void
): Unsubscribe {
  return onSnapshot(
    query(col("votes"), where("gameId", "==", gameId)),
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vote));
    }
  );
}

// ---- Media ----
export async function getMedia(): Promise<MediaItem[]> {
  const snap = await getDocs(query(col("media"), orderBy("timestamp", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MediaItem);
}

export async function getMediaByGame(gameId: string): Promise<MediaItem[]> {
  const snap = await getDocs(
    query(col("media"), where("gameId", "==", gameId))
  );
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MediaItem);
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export async function addMedia(item: Omit<MediaItem, "id">): Promise<string> {
  const ref = doc(col("media"));
  await setDoc(ref, item);
  return ref.id;
}

export async function deleteMedia(id: string) {
  await deleteDoc(doc(db, "media", id));
}

export async function getMediaCountForUser(
  gameId: string,
  sessionId: string
): Promise<number> {
  const snap = await getDocs(
    query(
      col("media"),
      where("gameId", "==", gameId),
      where("uploaderSessionId", "==", sessionId)
    )
  );
  return snap.size;
}

// ---- Tasks ----
export async function getTasks(): Promise<Task[]> {
  const snap = await getDocs(col("tasks"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
}

// ---- Game Registrations ----
export async function getRegistrationsByGame(gameId: string): Promise<GameRegistration[]> {
  const snap = await getDocs(
    query(col("registrations"), where("gameId", "==", gameId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRegistration);
}

export async function getRegistrationsByParticipant(participantId: string): Promise<GameRegistration[]> {
  const snap = await getDocs(
    query(col("registrations"), where("participantId", "==", participantId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRegistration);
}

export async function registerForGame(reg: Omit<GameRegistration, "id">): Promise<string> {
  const id = `${reg.gameId}_${reg.participantId}`;
  const existing = await getDoc(doc(db, "registrations", id));
  if (existing.exists()) {
    throw new Error("Already registered");
  }
  await setDoc(doc(db, "registrations", id), reg);
  return id;
}

export async function unregisterFromGame(gameId: string, participantId: string): Promise<void> {
  const id = `${gameId}_${participantId}`;
  await deleteDoc(doc(db, "registrations", id));
}

// ---- Judges ----
export async function getJudges(): Promise<Judge[]> {
  const snap = await getDocs(col("judges"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Judge);
}

export async function addJudge(judge: Omit<Judge, "id">): Promise<string> {
  const id = judge.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const existing = await getDoc(doc(db, "judges", id));
  if (existing.exists()) {
    throw new Error("Judge already exists");
  }
  await setDoc(doc(db, "judges", id), { ...judge, email: judge.email.toLowerCase() });
  return id;
}

export async function isRegisteredJudge(email: string): Promise<boolean> {
  const id = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const existing = await getDoc(doc(db, "judges", id));
  return existing.exists();
}

export async function updateJudgeName(email: string, name: string): Promise<void> {
  const id = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const ref = doc(db, "judges", id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await setDoc(ref, { ...existing.data(), name }, { merge: true });
  }
}

export async function removeJudge(judgeId: string): Promise<void> {
  await deleteDoc(doc(db, "judges", judgeId));
}
