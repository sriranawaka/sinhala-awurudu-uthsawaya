"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";

export default function QRPage() {
  const t = useTranslations("qr");
  const qrRef = useRef<HTMLDivElement>(null);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://awurudu.vercel.app";

  const downloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 40, 40, 520, 520);
      }
      const link = document.createElement("a");
      link.download = "awurudu-2026-qr.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-b from-cream to-white items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-bold text-maroon mb-2">
          අවුරුදු උළෙල 2026
        </h1>
        <p className="text-sm text-foreground/50 mb-8">
          {t("scanToJoin")}
        </p>

        <div ref={qrRef} className="bg-white rounded-2xl p-6 shadow-lg border border-gold/20 inline-block">
          <QRCodeSVG
            aria-label="QR code to join Awurudu Festival 2026"
            value={appUrl}
            size={220}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#8B1A1A"
            className="mx-auto"
          />
        </div>

        <p className="text-xs text-foreground/40 mt-6 break-all">{appUrl}</p>

        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={downloadQR}
            className="bg-gold text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-gold/90 transition-colors"
          >
            {t("downloadPNG")}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Awurudu Festival 2026", url: appUrl });
              } else {
                navigator.clipboard.writeText(appUrl);
              }
            }}
            className="bg-maroon text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-maroon/90 transition-colors"
          >
            {t("shareLink")}
          </button>
        </div>
      </div>
    </main>
  );
}
