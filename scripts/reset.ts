/**
 * Database Reset Script
 *
 * Resets all game-related runtime data to a clean "ready to start" state:
 * - All game event statuses → "not-started"
 * - Game-level status → "upcoming", votingOpen → false, guessOpen → false
 * - Removes correctAnswer and teams from game docs
 * - Deletes all registrations, scores, votes, guesses
 *
 * PRESERVES: participants, judges, games (structure), schedule, tasks, media, admins
 *
 * Usage:
 *   npx tsx scripts/reset.ts           # Dry run (shows what would happen)
 *   npx tsx scripts/reset.ts --confirm # Actually executes the reset
 *
 * Requires .env.local to be present with Firebase config.
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteField,
  writeBatch,
} from "firebase/firestore";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dryRun = !process.argv.includes("--confirm");

async function deleteCollection(name: string): Promise<number> {
  const snap = await getDocs(collection(db, name));
  if (snap.empty) return 0;

  // Firestore batch limit is 500
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = snap.docs.slice(i, i + 400);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    if (!dryRun) {
      await batch.commit();
    }
    deleted += chunk.length;
  }
  return deleted;
}

async function reset() {
  if (dryRun) {
    console.log("🔍 DRY RUN — no changes will be made. Use --confirm to execute.\n");
  } else {
    console.log("⚠️  LIVE RUN — resetting database...\n");
  }

  // 1. Reset all game docs
  const gamesSnap = await getDocs(collection(db, "games"));
  console.log(`📋 Found ${gamesSnap.size} games`);

  for (const gameDoc of gamesSnap.docs) {
    const data = gameDoc.data();
    const gameId = gameDoc.id;

    // Build the events map with all statuses reset to "not-started"
    const resetEvents: Record<string, { status: string }> = {};
    if (data.events) {
      for (const eventKey of Object.keys(data.events)) {
        resetEvents[eventKey] = { status: "not-started" };
      }
    }

    const updateData: Record<string, unknown> = {
      status: "upcoming",
      votingOpen: false,
      events: resetEvents,
    };

    // Reset guess-related fields if they exist
    if ("guessOpen" in data) {
      updateData.guessOpen = false;
    }
    if ("correctAnswer" in data) {
      updateData.correctAnswer = deleteField();
    }

    // Remove teams if they exist (kamba-adeema)
    if ("teams" in data) {
      updateData.teams = deleteField();
    }

    const eventKeys = Object.keys(resetEvents).join(", ") || "(none)";
    console.log(`  ✅ ${gameId}: status→upcoming, events[${eventKeys}]→not-started${data.teams ? ", teams→removed" : ""}${data.correctAnswer !== undefined ? ", correctAnswer→removed" : ""}`);

    if (!dryRun) {
      await updateDoc(doc(db, "games", gameId), updateData);
    }
  }

  // 2. Delete runtime collections
  console.log("");

  const registrationCount = await deleteCollection("registrations");
  console.log(`🗑️  Registrations: ${registrationCount} docs ${dryRun ? "would be" : ""} deleted`);

  const scoreCount = await deleteCollection("scores");
  console.log(`🗑️  Scores: ${scoreCount} docs ${dryRun ? "would be" : ""} deleted`);

  const voteCount = await deleteCollection("votes");
  console.log(`🗑️  Votes: ${voteCount} docs ${dryRun ? "would be" : ""} deleted`);

  const guessCount = await deleteCollection("guesses");
  console.log(`🗑️  Guesses: ${guessCount} docs ${dryRun ? "would be" : ""} deleted`);

  console.log("\n📊 Summary:");
  console.log(`   Games reset:          ${gamesSnap.size}`);
  console.log(`   Registrations deleted: ${registrationCount}`);
  console.log(`   Scores deleted:        ${scoreCount}`);
  console.log(`   Votes deleted:         ${voteCount}`);
  console.log(`   Guesses deleted:       ${guessCount}`);

  if (dryRun) {
    console.log("\n💡 Run with --confirm to execute these changes.");
  } else {
    console.log("\n🎉 Reset complete! Database is ready for a fresh start.");
  }

  process.exit(0);
}

reset().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
