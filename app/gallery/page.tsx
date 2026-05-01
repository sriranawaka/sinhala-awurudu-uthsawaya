"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getMedia, getGames } from "@/lib/db";
import type { MediaItem, Game } from "@/types";

export default function GalleryPage() {
  const t = useTranslations("gallery");
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  useEffect(() => {
    Promise.all([getMedia(), getGames()]).then(([m, g]) => {
      setPhotos(m);
      setGames(g);
      setLoading(false);
    });
  }, []);

  const gameMap = new Map(games.map((g) => [g.id, g]));

  // Group photos by gameId
  const grouped = new Map<string, MediaItem[]>();
  for (const p of photos) {
    const list = grouped.get(p.gameId) || [];
    list.push(p);
    grouped.set(p.gameId, list);
  }

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">{t("title")}</h1>
          <p className="text-[15px] sm:text-base text-gray-400 mt-2 font-normal leading-snug">
            {t("subtitle")} &bull; {photos.length} {t("photosCount")}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-muted text-sm">{t("noPhotos")}</p>
            <p className="text-muted/60 text-xs mt-1">
              {t("photosAppearLater")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([gameId, items]) => {
              const game = gameMap.get(gameId);
              return (
                <div key={gameId}>
                  <h2 className="font-semibold text-foreground text-sm mb-2">
                    {game?.name || gameId}
                    {game?.nameSi && (
                      <span className="text-muted font-normal ml-1.5">
                        {game.nameSi}
                      </span>
                    )}
                  </h2>
                  <div className="grid grid-cols-3 gap-1.5">
                    {items.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => setLightbox(photo)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                      >
                        <img
                          src={photo.photoUrl}
                          alt={photo.caption || "Photo"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.photoUrl}
              alt={lightbox.caption || "Photo"}
              className="w-full rounded-lg"
            />
            <div className="text-white/70 text-xs mt-3 text-center">
              {lightbox.uploadedByName}
              {lightbox.caption && ` — ${lightbox.caption}`}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
