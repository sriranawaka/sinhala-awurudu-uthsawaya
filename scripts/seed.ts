/**
 * Firebase Data Seeding Script
 *
 * Seeds Firestore with 2026 event data:
 * - 12 judge-scored games + 1 vote game (Vivida Adum)
 * - ~27 families / ~58 participants
 * - 26 schedule items
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires .env.local to be present with Firebase config.
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
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

// ---- GAMES ----
const games = [
  { id: "banis-kama", name: "Banis Kama", nameSi: "බනිස් කෑම", description: "A test of speed, agility, and hands-free hunger.\n- The Sprint: At the whistle, players dash to the opposite end of the course where a bun is waiting on a clean sheet or plate on the ground.\n- The Challenge: You must eat the entire bun without using your hands at all—keep them behind your back to stay in the game!\n- The Finish: Once the bun is fully swallowed, sprint back to the starting line as fast as you can.\n- The Win: The first person to return to the start after successfully eating their bun is the champion.", responsiblePersons: ["Sumudu", "Nayani"], eligibleGroups: { adults: true, teens: true, kids: true }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 1, events: { kid: { status: "not-started" }, teen: { status: "not-started" }, adult: { status: "not-started" } } },
  { id: "balloon-popping", name: "Balloon Popping", nameSi: "බැලුන් පිපිරවීම", description: "A thrilling race to the final pop.\n- The Inflation: Competitors must inflate their balloons as fast as possible. Stretching the balloon beforehand is helpful to increase elasticity for a quicker blow-up.\n- The Goal: You must keep blowing until the balloon bursts from the air pressure alone.\n- The Sprint: Once the balloon has successfully popped, you must sprint to the finish line to claim your victory.\n- Safety First: Always hold the balloon slightly away from your face while inflating to avoid potential injury from fragments when it pops.", responsiblePersons: ["Bovinda"], eligibleGroups: { adults: true, teens: true, kids: true }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 2, events: { kid: { status: "not-started" }, teen: { status: "not-started" }, adult: { status: "not-started" } } },
  { id: "sangeetha-thoppiya", name: "Sangeetha Thoppiya", nameSi: "සංගීත තොප්පිය", description: "The game follows a simple set of rules similar to other \"musical\" elimination games:\n- The Circle: Participants stand in a circle, facing inwards.\n- Passing the Hat: While music is played, a single hat is passed from person to person around the circle. Each player must put the hat on their head briefly before passing it to the next person.\n- The Music Stop: When the music stops, the person currently wearing the hat or holding it is eliminated from the game.\n- Winning: The game continues until only one player remains, who is declared the winner.", responsiblePersons: ["Bovinda"], eligibleGroups: { adults: true, teens: true, kids: true }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 3, events: { kid: { status: "not-started" }, "teen+adult": { status: "not-started" } } },
  { id: "goni-race", name: "Goni Race", nameSi: "ගෝනි රේස්", description: "A hilarious test of balance and hopping speed.\n- The Gear: Each racer steps into a large plastic bag and holds the edges up around their waist.\n- The Action: At the whistle, you must hop or jump toward the finish line; running inside the bag is impossible and usually leads to a tumble!\n- The Challenge: If you fall, you have to get back up while still inside the bag and keep hopping to stay in the race.\n- The Winner: The first person to cross the finish line while still inside the bag wins the gold.", responsiblePersons: ["Daham", "Yasas"], eligibleGroups: { adults: true, teens: true, kids: false }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 4, events: { teen: { status: "not-started" }, adult: { status: "not-started" } } },
  { id: "kiri-kaweema", name: "Kiri Kaweema", nameSi: "කිරි කැවීම", description: "A hilarious test of teamwork and blind coordination.\n- The Setup: One partner stays blindfolded at the \"Feeding Station,\" while the other starts at the \"Starting Line\" with the yogurt and spoon.\n- The Feeding: The partner runs to the blindfolded person and feeds them the entire cup of yogurt as quickly as possible.\n- The Dash: Once the cup is empty, the partner must grab the blindfolded person's hand and safely guide them on a run back to the finish line.\n- The Win: The first pair to cross the line—with the yogurt finished and the blindfolded partner safe—is the winner!", responsiblePersons: ["Manoj"], eligibleGroups: { adults: true, teens: true, kids: false }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 5, events: { "teen+adult": { status: "not-started" } } },
  { id: "tomato-on-the-spoon", name: "Tomato on the Spoon", nameSi: "හැන්දෙන් තක්කාලි", description: "\"Tomato on the Spoon\" is a test of balance, patience, and speed.\n- Equipment: Each player receives a spoon and one firm tomato.\n- The Position: Hold the spoon handle in your mouth and balance the tomato on the bowl.\n- The Race: At the signal, walk or run to the finish line without using your hands to touch the spoon or tomato.\n- Restart Rule: If your tomato falls, you must return to the starting point and restart.", responsiblePersons: ["Gamunu", "Janith", "Gaveen"], eligibleGroups: { adults: true, teens: true, kids: true }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 6, events: { kid: { status: "not-started" }, teen: { status: "not-started" }, adult: { status: "not-started" } } },
  { id: "thun-pimma", name: "Thun Pa", nameSi: "තුන් පා", description: "A test of synchronization and shared stride.\n- The Bond: Partners stand side-by-side, and their inside legs are tied together at the ankle using a soft cloth or strap.\n- The Action: To move effectively, pairs must coordinate their steps—usually by shouting \"inside, outside\"—to act as if they have three legs instead of four.\n- The Challenge: If one person moves too fast or out of sync, the pair will likely lose balance and tumble; they must help each other up before continuing.\n- The Winner: The first duo to cross the finish line without the leg tie coming loose wins.", responsiblePersons: ["Pamuditha"], eligibleGroups: { adults: true, teens: true, kids: false }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 7, events: { teen: { status: "not-started" }, adult: { status: "not-started" } } },
  { id: "eye-for-the-elephant", name: "Eye for the Elephant", nameSi: "අලියාට ඇස", description: "A blindfolded challenge of memory and precision.\n- The Setup: A large drawing of an elephant is placed on a board or wall, with its eye clearly missing or marked by a small dot.\n- The Action: Participants are blindfolded, spun around a few times to lose their sense of direction, and handed a chalk or a sticker.\n- The Goal: You must walk toward the drawing and attempt to place the \"eye\" in the exact correct spot on the elephant's face.\n- The Winner: The person who places the mark closest to the actual position of the eye is crowned the winner.", responsiblePersons: ["Charith", "Onaya"], eligibleGroups: { adults: true, teens: true, kids: true }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 8, events: { kid: { status: "not-started" }, "teen+adult": { status: "not-started" } } },
  { id: "wikata-adum", name: "Vivida Adum", nameSi: "විවිද ඇඳුම්", description: "Dress up in creative costumes and perform. The audience votes for their favourites!", responsiblePersons: ["Ranawaka", "Aravinda"], eligibleGroups: { adults: false, teens: false, kids: true }, scoringType: "vote", status: "upcoming", votingOpen: false, order: 9, events: { kid: { status: "not-started" } } },
  { id: "count-toffee-bottle", name: "Count Toffee Bottle", nameSi: "ටොෆි බෝතල් ගණන් කිරීම", description: "A visual estimation challenge that tests your \"eagle eye\".\n- The Setup: Fill a clear, transparent bottle or jar with a specific number of items (toffees, marbles, or beads) and count them accurately beforehand.\n- The Observation: Participants can pick up and examine the bottle from all angles to estimate the volume, but opening the seal is strictly forbidden.\n- The Submission: Guesses are submitted into a ballot box throughout the day; since it's a full-day event, you can allow one final guess per person to keep the tension high.\n- The Big Reveal: At the end of the day, the official count is announced, and the person with the closest guess (without necessarily being exact) is declared the winner.", responsiblePersons: ["Manoj", "Amila"], eligibleGroups: { adults: true, teens: true, kids: true }, scoringType: "guess", status: "upcoming", votingOpen: false, guessOpen: false, order: 10, events: { "kid+teen+adult": { status: "not-started" } } },
  { id: "kamba-adeema", name: "Kamba Adeema", nameSi: "කඹ ඇදීම", description: "A test of raw power and team rhythm.\n- The Setup: Two teams face off on opposite ends of a thick rope with a marked center point.\n- The Goal: Teams must pull the rope until its center marker crosses a designated line on their side of the field.\n- The Strategy: Success relies on synchronizing pulls to rhythmic chants like \"Hoo-ha! Hoo-ha!\" to maximize collective strength.", responsiblePersons: ["Daham", "Amila", "Charith"], eligibleGroups: { adults: true, teens: true, kids: false }, scoringType: "judge", status: "upcoming", votingOpen: false, order: 11, events: { "teen+adult": { status: "not-started" } } },
  { id: "guess-the-box", name: "Guess the Box", nameSi: "පෙට්ටියේ මොනවද?", description: "A brain-teasing challenge.\n- The Setup: A mysterious, everyday object is sealed inside a large box; the goal is to identify exactly what is hidden inside.\n- The Interaction: Players lift and shake the box to listen to the \"clatter\" or \"thud\" and feel how the weight shifts.\n- The Clues: Organizers reveal hints at scheduled intervals to help narrow down the possibilities.\n- The Submission: Users submit their guesses throughout the day, refining their answers as the clues get more descriptive.", responsiblePersons: ["Manoj", "Amila"], eligibleGroups: { adults: true, teens: true, kids: true }, scoringType: "guess-text", status: "upcoming", votingOpen: false, guessOpen: false, order: 12, events: { "kid+teen+adult": { status: "not-started" } } },
];

// ---- PARTICIPANTS ----
const participants = [
  { id: "manjula", name: "Manjula", ageGroup: "adult", gender: "male", familyGroup: "Manjula", kidsNames: ["Sanithu", "Newan"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "chinthaka", name: "Chinthaka", ageGroup: "adult", gender: "male", familyGroup: "Chinthaka", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "amar", name: "Amar", ageGroup: "adult", gender: "male", familyGroup: "Amar", kidsNames: ["Nethul", "Elisha"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "chameera", name: "Chameera", ageGroup: "adult", gender: "male", familyGroup: "Chameera", kidsNames: ["Onaya", "Onara", "Rowen"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "daham", name: "Daham", ageGroup: "adult", gender: "male", familyGroup: "Daham", kidsNames: ["Sanuthi", "Akain"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "ranawaka", name: "Ranawaka", ageGroup: "adult", gender: "male", familyGroup: "Ranawaka", kidsNames: ["Saneli", "Sonaya"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "gamunu", name: "Gamunu", ageGroup: "adult", gender: "male", familyGroup: "Gamunu", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "janith", name: "Janith", ageGroup: "adult", gender: "male", familyGroup: "Janith", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "sumudu", name: "Sumudu", ageGroup: "adult", gender: "male", familyGroup: "Sumudu", kidsNames: ["Nidev"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "thilina", name: "Thilina", ageGroup: "adult", gender: "male", familyGroup: "Thilina", kidsNames: ["Nisali"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "bovinda", name: "Bovinda", ageGroup: "adult", gender: "male", familyGroup: "Bovinda", kidsNames: ["Nuvee", "Nulan"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "amila-ruwan", name: "Amila Ruwan", ageGroup: "adult", gender: "male", familyGroup: "Amila Ruwan", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "kushila", name: "Kushila", ageGroup: "adult", gender: "male", familyGroup: "Kushila", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "viraj", name: "Viraj", ageGroup: "adult", gender: "male", familyGroup: "Viraj", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "prasanna", name: "Prasanna", ageGroup: "adult", gender: "male", familyGroup: "Prasanna", kidsNames: ["Lilly", "Roy"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "gaveen", name: "Gaveen & Parami", ageGroup: "adult", gender: "male", familyGroup: "Gaveen", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "sithara", name: "Sithara", ageGroup: "adult", gender: "male", familyGroup: "Sithara", kidsNames: ["Chanuli", "Nethuki"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "ruchindra", name: "Ruchindra & Nethmi", ageGroup: "adult", gender: "male", familyGroup: "Ruchindra", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "hemal", name: "Hemal", ageGroup: "adult", gender: "male", familyGroup: "Hemal", kidsNames: ["Akein", "Kiwen"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "nikitha", name: "Nikitha & Ashvini", ageGroup: "adult", gender: "male", familyGroup: "Nikitha", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "yasas", name: "Yasas & Pringa", ageGroup: "adult", gender: "male", familyGroup: "Yasas", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "mahesh", name: "Mahesh", ageGroup: "adult", gender: "male", familyGroup: "Mahesh", kidsNames: ["Oneth", "Oneli"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "aravinda", name: "Aravinda", ageGroup: "adult", gender: "male", familyGroup: "Aravinda", kidsNames: ["Ameli", "Rahel"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "anushka", name: "Anushka", ageGroup: "adult", gender: "male", familyGroup: "Anushka", kidsNames: ["Eline"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "charith", name: "Charith", ageGroup: "adult", gender: "male", familyGroup: "Charith", kidsNames: ["Theo"], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "thanushi", name: "Thanushi", ageGroup: "adult", gender: "female", familyGroup: "Thanushi", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "vasan", name: "Vasan", ageGroup: "adult", gender: "male", familyGroup: "Vasan", kidsNames: ["Thanaiya"], participationStatus: "confirmed", createdAt: Date.now() },
  // Kids as individual participants (for Vivida Adum voting)
  { id: "sanithu", name: "Sanithu", ageGroup: "kid", gender: "male", familyGroup: "Manjula", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "newan", name: "Newan", ageGroup: "kid", gender: "male", familyGroup: "Manjula", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "nethul", name: "Nethul", ageGroup: "kid", gender: "male", familyGroup: "Amar", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "elisha", name: "Elisha", ageGroup: "kid", gender: "female", familyGroup: "Amar", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "onaya", name: "Onaya", ageGroup: "teen", gender: "female", familyGroup: "Chameera", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "onara", name: "Onara", ageGroup: "kid", gender: "male", familyGroup: "Chameera", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "rowen", name: "Rowen", ageGroup: "kid", gender: "male", familyGroup: "Chameera", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "sanuthi", name: "Sanuthi", ageGroup: "teen", gender: "female", familyGroup: "Daham", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "akain", name: "Akain", ageGroup: "kid", gender: "male", familyGroup: "Daham", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "saneli", name: "Saneli", ageGroup: "kid", gender: "female", familyGroup: "Ranawaka", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "sonaya", name: "Sonaya", ageGroup: "toddler", gender: "female", familyGroup: "Ranawaka", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "nidev", name: "Nidev", ageGroup: "kid", gender: "male", familyGroup: "Sumudu", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "nisali", name: "Nisali", ageGroup: "kid", gender: "female", familyGroup: "Thilina", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "nuvee", name: "Nuvee", ageGroup: "kid", gender: "female", familyGroup: "Bovinda", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "nulan", name: "Nulan", ageGroup: "kid", gender: "male", familyGroup: "Bovinda", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "lilly", name: "Lilly", ageGroup: "kid", gender: "female", familyGroup: "Prasanna", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "roy", name: "Roy", ageGroup: "kid", gender: "male", familyGroup: "Prasanna", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "chanuli", name: "Chanuli", ageGroup: "teen", gender: "female", familyGroup: "Sithara", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "nethuki", name: "Nethuki", ageGroup: "kid", gender: "female", familyGroup: "Sithara", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "akein", name: "Akein", ageGroup: "kid", gender: "male", familyGroup: "Hemal", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "kiwen", name: "Kiwen", ageGroup: "kid", gender: "male", familyGroup: "Hemal", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "oneth", name: "Oneth", ageGroup: "kid", gender: "male", familyGroup: "Mahesh", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "oneli", name: "Oneli", ageGroup: "toddler", gender: "female", familyGroup: "Mahesh", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "ameli", name: "Ameli", ageGroup: "teen", gender: "female", familyGroup: "Aravinda", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "rahel", name: "Rahel", ageGroup: "kid", gender: "female", familyGroup: "Aravinda", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "eline", name: "Eline", ageGroup: "kid", gender: "female", familyGroup: "Anushka", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "theo", name: "Theo", ageGroup: "infant", gender: "male", familyGroup: "Charith", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
  { id: "thanaiya", name: "Thanaiya", ageGroup: "toddler", gender: "male", familyGroup: "Vasan", kidsNames: [], participationStatus: "confirmed", createdAt: Date.now() },
];

// ---- SCHEDULE ----
const schedule = [
  { id: "s01", itemNumber: 1, name: "People Entering", nameSi: "පැමිණීම", startTime: "09:30", durationMins: 30, applicableTo: { kids: true, teens: true, adults: true }, screen: "Wallpaper", music: "Awurudu Songs" },
  { id: "s02", itemNumber: 2, name: "Welcome", nameSi: "පිළිගැනීම", startTime: "10:00", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true }, screen: "Photos", music: "Off", responsible: "Chameera ayya" },
  { id: "s03", itemNumber: 3, name: "One Minute Silence", nameSi: "එක් මිනිත්තු නිහඬතාව", startTime: "10:05", durationMins: 2, applicableTo: { kids: true, teens: true, adults: true }, music: "Off" },
  { id: "s04", itemNumber: 4, name: "Pol Thel Pahana", nameSi: "පොල් තෙල් පහන", startTime: "10:15", durationMins: 10, applicableTo: { kids: true, teens: true, adults: true }, music: "Music", responsible: "Manoj/Swarna" },
  { id: "s05", itemNumber: 5, name: "Safety Guidelines", nameSi: "ආරක්ෂිත මාර්ගෝපදේශ", startTime: "10:25", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true }, responsible: "Chinthaka" },
  { id: "s06", itemNumber: 6, name: "Game Introductions", nameSi: "ක්‍රීඩා හඳුන්වාදීම", startTime: "10:30", durationMins: 10, applicableTo: { kids: true, teens: true, adults: true }, responsible: "Prasanna/Ranawaka" },
  { id: "s07", itemNumber: 7, name: "Count Toffee Bottle", nameSi: "ටොෆි බෝතල් ගණන් කිරීම", startTime: "10:40", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true }, responsible: "Manoj" },
  { id: "s08", itemNumber: 8, name: "Guess What's in the Box", nameSi: "පෙට්ටියේ මොනවද?", startTime: "10:45", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true }, responsible: "Swarna" },
  { id: "s09", itemNumber: 9, name: "Banis Kama", nameSi: "බනිස් කෑම", startTime: "10:50", durationMins: 20, applicableTo: { kids: false, teens: true, adults: true } },
  { id: "s10", itemNumber: 10, name: "Balloon Popping", nameSi: "බැලුන් පිපිරවීම", startTime: "11:10", durationMins: 15, applicableTo: { kids: false, teens: true, adults: true } },
  { id: "s11", itemNumber: 11, name: "Tomato on the Spoon", nameSi: "හැන්දෙන් තක්කාලි", startTime: "11:25", durationMins: 15, applicableTo: { kids: false, teens: true, adults: true } },
  { id: "s12", itemNumber: 12, name: "Song by Children", nameSi: "ළමා ගීතය", startTime: "11:40", durationMins: 10, applicableTo: { kids: true, teens: false, adults: false } },
  { id: "s13", itemNumber: 13, name: "Lunch", nameSi: "දිවා ආහාරය", startTime: "11:50", durationMins: 45, applicableTo: { kids: true, teens: true, adults: true } },
  { id: "s14", itemNumber: 14, name: "Vivida Adum", nameSi: "විවිද ඇඳුම්", startTime: "12:35", durationMins: 30, applicableTo: { kids: true, teens: true, adults: false } },
  { id: "s15", itemNumber: 15, name: "Goni Race", nameSi: "ගෝනි රේස්", startTime: "13:15", durationMins: 15, applicableTo: { kids: false, teens: true, adults: true } },
  { id: "s16", itemNumber: 16, name: "Thun Paa", nameSi: "තුන් පා", startTime: "13:30", durationMins: 10, applicableTo: { kids: false, teens: false, adults: true } },
  { id: "s17", itemNumber: 17, name: "Eye for the Elephant", nameSi: "අලියාට ඇස", startTime: "13:40", durationMins: 20, applicableTo: { kids: false, teens: true, adults: true } },
  { id: "s18", itemNumber: 18, name: "Kiri Kaweema", nameSi: "කිරි කැවීම", startTime: "14:10", durationMins: 20, applicableTo: { kids: true, teens: true, adults: true } },
  { id: "s19", itemNumber: 19, name: "Kamba Adeema", nameSi: "කඹ ඇදීම", startTime: "14:30", durationMins: 20, applicableTo: { kids: false, teens: false, adults: true } },
  { id: "s20", itemNumber: 20, name: "Sangeetha Thoppiya", nameSi: "සංගීත තොප්පිය", startTime: "14:50", durationMins: 15, applicableTo: { kids: false, teens: true, adults: true } },
  { id: "s21", itemNumber: 21, name: "Box Results", nameSi: "පෙට්ටි ප්‍රතිඵල", startTime: "15:05", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true } },
  { id: "s22", itemNumber: 22, name: "Toffee Results", nameSi: "ටොෆි ප්‍රතිඵල", startTime: "15:10", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true } },
  { id: "s23", itemNumber: 23, name: "Award Ceremony", nameSi: "සම්මාන ප්‍රදානෝත්සවය", startTime: "15:05", durationMins: 10, applicableTo: { kids: true, teens: true, adults: true }, music: "Celebration music" },
  { id: "s24", itemNumber: 24, name: "Thanks Speech", nameSi: "ස්තුති කථාව", startTime: "15:15", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true }, responsible: "Mahesh" },
  { id: "s25", itemNumber: 25, name: "National Anthem", nameSi: "ජාතික ගීය", startTime: "15:20", durationMins: 5, applicableTo: { kids: true, teens: true, adults: true }, responsible: "Viraj" },
  { id: "s26", itemNumber: 26, name: "End & Cleaning", nameSi: "අවසානය", startTime: "15:25", durationMins: 60, applicableTo: { kids: true, teens: true, adults: true }, responsible: "Charith/Chinthaka" },
];

// ---- TASKS ----
const tasks = [
  { id: "t01", name: "Hall booking", responsible: ["Sumudu", "Chameera"], status: "done" },
  { id: "t02", name: "Make lunch table ready", responsible: ["Sanjana", "Parami"], status: "pending" },
  { id: "t03", name: "Compearing", responsible: ["Ranawaka", "Aravinda", "Charith"], status: "pending" },
  { id: "t04", name: "Photography", responsible: ["Sithara", "Gamunu"], status: "pending" },
  { id: "t05", name: "Presentation/sounds", responsible: ["Charith", "Amila"], status: "pending" },
  { id: "t06", name: "Entertainment / Lap", responsible: ["Amila"], status: "pending" },
  { id: "t07", name: "Polthel pahana/tea pot", responsible: ["Pamuditha", "Manoj"], status: "pending" },
  { id: "t08", name: "Decoration", responsible: ["Manoj", "Mahesh"], status: "pending" },
  { id: "t09", name: "Wrapping gifts", responsible: ["Pamuditha", "Pasrami", "Sanjana", "Vasan"], status: "pending" },
  { id: "t10", name: "Buy gifts", responsible: ["Chameera", "Dilini"], status: "pending" },
  { id: "t11", name: "Cleaning arrangement", responsible: ["Bovinda", "Manoj", "Sumudu"], status: "pending" },
  { id: "t12", name: "Arrange the hall", responsible: ["Students"], status: "pending" },
  { id: "t13", name: "HSE", responsible: ["Gaveen"], status: "pending" },
  { id: "t14", name: "Schedule plan", responsible: ["Mahesh", "Charith"], status: "done" },
  { id: "t15", name: "Coordination", responsible: ["Viraj"], status: "pending" },
];

async function seed() {
  console.log("🌱 Starting Firestore seed...\n");

  // Seed games
  const gamesBatch = writeBatch(db);
  for (const game of games) {
    const { id, ...data } = game;
    gamesBatch.set(doc(db, "games", id), data);
  }
  await gamesBatch.commit();
  console.log(`✅ Seeded ${games.length} games`);

  // Seed participants in batches of 20 (Firestore batch limit is 500)
  for (let i = 0; i < participants.length; i += 20) {
    const batch = writeBatch(db);
    const chunk = participants.slice(i, i + 20);
    for (const p of chunk) {
      const { id, ...data } = p;
      batch.set(doc(db, "participants", id), data);
    }
    await batch.commit();
  }
  console.log(`✅ Seeded ${participants.length} participants`);

  // Seed schedule
  const scheduleBatch = writeBatch(db);
  for (const item of schedule) {
    const { id, ...data } = item;
    scheduleBatch.set(doc(db, "schedule", id), data);
  }
  await scheduleBatch.commit();
  console.log(`✅ Seeded ${schedule.length} schedule items`);

  // Seed tasks
  const tasksBatch = writeBatch(db);
  for (const task of tasks) {
    const { id, ...data } = task;
    tasksBatch.set(doc(db, "tasks", id), data);
  }
  await tasksBatch.commit();
  console.log(`✅ Seeded ${tasks.length} tasks`);

  console.log("\n🎉 Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
