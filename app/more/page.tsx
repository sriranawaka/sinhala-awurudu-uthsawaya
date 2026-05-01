"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { onAuthChange, getCurrentUser, signIn, signInWithGoogle, signOut } from "@/lib/auth";
import { getJudges, addJudge, removeJudge, isRegisteredJudge, updateJudgeName } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { Judge } from "@/types";

export default function MorePage() {
  const t = useTranslations("more");
  const [isJudge, setIsJudge] = useState(false);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [judgeEmail, setJudgeEmail] = useState("");
  const [addingJudge, setAddingJudge] = useState(false);
  const [judgeError, setJudgeError] = useState("");

  // Admin login state
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // QR state
  const [showQR, setShowQR] = useState(false);
  const [showJudges, setShowJudges] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://awurudu.vercel.app";

  useEffect(() => {
    return onAuthChange(async (user) => {
      if (user?.email) {
        const registered = await isRegisteredJudge(user.email);
        setIsJudge(registered || user.email.endsWith("@awurudu.lk"));
      } else {
        setIsJudge(!!user);
      }
    });
  }, []);

  useEffect(() => {
    getJudges().then(setJudges);
  }, []);

  const handleAddJudge = async () => {
    const trimmedEmail = judgeEmail.trim().toLowerCase();
    if (!trimmedEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setJudgeError("Please enter a valid email address");
      return;
    }
    setAddingJudge(true);
    setJudgeError("");
    try {
      const user = getCurrentUser();
      await addJudge({
        email: trimmedEmail,
        name: trimmedEmail.split("@")[0],
        addedBy: user?.email || "unknown",
        addedAt: Date.now(),
      });
      setJudges(await getJudges());
      setJudgeEmail("");
    } catch (err: unknown) {
      setJudgeError(err instanceof Error ? err.message : "Failed to add judge");
    } finally {
      setAddingJudge(false);
    }
  };

  const handleRemoveJudge = async (judgeId: string) => {
    await removeJudge(judgeId);
    setJudges(await getJudges());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      await signIn(email, password);
      setEmail("");
      setPassword("");
      setShowLogin(false);
    } catch {
      setLoginError("Invalid credentials");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setLoggingIn(true);
    try {
      const result = await signInWithGoogle();
      const userEmail = result.user.email;
      if (!userEmail) {
        await signOut();
        setLoginError("Could not retrieve email from Google account.");
        return;
      }
      const registered = await isRegisteredJudge(userEmail);
      if (!registered) {
        await signOut();
        setLoginError("You are not registered as a judge. Ask an admin or judge to add you.");
        return;
      }
      if (result.user.displayName) {
        await updateJudgeName(userEmail, result.user.displayName);
      }
      setShowLogin(false);
    } catch {
      setLoginError("Google sign-in failed.");
    } finally {
      setLoggingIn(false);
    }
  };

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
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">{t("title")}</h1>
        </div>

        <div className="space-y-3">

        {/* ---- Admin Login (expandable) ---- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowLogin(!showLogin)}
            className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-lg">🔐</div>
            <div className="flex-1">
              <h3 className="font-medium">Judge / Admin Login</h3>
              <p className="text-xs text-gray-400">{isJudge ? "Signed in as Judge" : "Sign in to manage games"}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showLogin && "rotate-180")} />
          </button>
          {showLogin && (
            <div className="px-4 pb-4 border-t border-gray-50">
              {isJudge ? (
                <div className="pt-3 space-y-2">
                  <p className="text-[13px] text-green-600 font-medium">You are signed in as a judge/admin.</p>
                  <button
                    onClick={() => signOut()}
                    className="w-full py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-3 space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loggingIn}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {loggingIn ? "..." : "Sign in with Google"}
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-gray-100" />
                    <span className="text-[10px] text-gray-300">or admin</span>
                    <div className="flex-1 border-t border-gray-100" />
                  </div>
                  <form onSubmit={handleLogin} className="space-y-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Email"
                      className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Password"
                      className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={loggingIn}
                      className="w-full py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {loggingIn ? "..." : "Sign In"}
                    </button>
                  </form>
                  {loginError && <p className="text-[12px] text-red-500">{loginError}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---- QR Code (expandable) ---- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 text-lg">📱</div>
            <div className="flex-1">
              <h3 className="font-medium">{t("qrCode")}</h3>
              <p className="text-xs text-gray-400">{t("qrDesc")}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showQR && "rotate-180")} />
          </button>
          {showQR && (
            <div className="px-4 pb-4 border-t border-gray-50">
              <div className="pt-3 flex flex-col items-center">
                <div ref={qrRef} className="bg-white rounded-xl p-4 border border-gray-100 inline-block">
                  <QRCodeSVG
                    aria-label="QR code to join Awurudu Festival 2026"
                    value={appUrl}
                    size={180}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#1F2937"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-2 break-all text-center">{appUrl}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={downloadQR}
                    className="px-4 py-2 bg-gray-900 text-white rounded-full text-[12px] font-medium hover:bg-gray-800 transition-colors"
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: "Awurudu Festival 2026", url: appUrl });
                      } else {
                        navigator.clipboard.writeText(appUrl);
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-[12px] font-medium hover:bg-gray-200 transition-colors"
                  >
                    Share Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Manage Judges (expandable) ---- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowJudges(!showJudges)}
            className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-lg">👨‍⚖️</div>
            <div className="flex-1">
              <h3 className="font-medium">Judges</h3>
              <p className="text-xs text-gray-400">Manage who can judge games ({judges.length} registered)</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showJudges && "rotate-180")} />
          </button>
          {showJudges && (
          <div className="px-4 pb-4 border-t border-gray-50">

          {/* Judge list */}
          {judges.length > 0 ? (
            <div className="space-y-1.5 mb-4">
              {judges
                .sort((a, b) => b.addedAt - a.addedAt)
                .map((j) => (
                  <div key={j.id} className="flex items-center gap-2 py-2 px-2.5 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[11px] font-bold text-amber-700">
                      {j.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{j.email}</p>
                    </div>
                    {isJudge && (
                      <button
                        onClick={() => handleRemoveJudge(j.id)}
                        className="text-[11px] px-2.5 py-1 bg-red-50 text-red-500 rounded-full hover:bg-red-100 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-[12px] text-gray-300 mb-4 text-center py-2">No judges assigned yet</p>
          )}

          {/* Add judge — only for logged-in judges/admins */}
          {isJudge ? (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[11px] text-gray-400 mb-2">Enter judge&apos;s Gmail address:</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={judgeEmail}
                  onChange={(e) => setJudgeEmail(e.target.value)}
                  placeholder="judge@gmail.com"
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={handleAddJudge}
                  disabled={addingJudge || !judgeEmail.trim()}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[12px] font-bold hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  {addingJudge ? "..." : "Add"}
                </button>
              </div>
              {judgeError && <p className="text-[12px] text-red-500 mt-1">{judgeError}</p>}
            </div>
          ) : (
            <p className="text-[11px] text-gray-300 text-center border-t border-gray-100 pt-3">Sign in as admin to manage judges</p>
          )}
          </div>
          )}
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-medium mb-1">{t("about")}</h3>
          <p className="text-xs text-gray-400">{t("aboutText")}</p>
          <p className="text-xs text-gray-300 mt-1">{t("builtWith")}</p>
        </div>
        </div>
      </div>
    </main>
  );
}
