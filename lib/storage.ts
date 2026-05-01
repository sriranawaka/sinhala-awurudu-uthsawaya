import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { addMedia, getMediaCountForUser } from "./db";

const MAX_PHOTOS_PER_GAME = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESS_TARGET = 1 * 1024 * 1024; // 1MB

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("awurudu_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("awurudu_session_id", id);
  }
  return id;
}

export { getSessionId };

async function compressImage(file: File): Promise<File> {
  // Skip if already small enough
  if (file.size <= COMPRESS_TARGET) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      // Scale down to max 1200px on longest side
      let { width, height } = img;
      const maxDim = 1200;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };
    img.src = url;
  });
}

export async function uploadPhoto(
  gameId: string,
  file: File,
  uploadedByName: string,
  caption?: string
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum 5MB.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const sessionId = getSessionId();
  const count = await getMediaCountForUser(gameId, sessionId);
  if (count >= MAX_PHOTOS_PER_GAME) {
    throw new Error("Maximum 2 photos per game reached.");
  }

  // Compress before upload
  const compressed = await compressImage(file);

  const filename = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `photos/${gameId}/${sessionId}/${filename}`);
  await uploadBytes(storageRef, compressed);
  const photoUrl = await getDownloadURL(storageRef);

  await addMedia({
    gameId,
    uploadedByName,
    photoUrl,
    caption: caption || "",
    uploaderSessionId: sessionId,
    timestamp: Date.now(),
  });

  return photoUrl;
}
