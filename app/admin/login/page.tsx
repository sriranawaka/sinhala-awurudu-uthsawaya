"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { signIn } = await import("@/lib/auth");
      await signIn(email, password);
      router.push("/admin");
    } catch {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { signInWithGoogle } = await import("@/lib/auth");
      const { isRegisteredJudge } = await import("@/lib/db");
      const result = await signInWithGoogle();
      const userEmail = result.user.email;
      if (!userEmail) {
        const { signOut } = await import("@/lib/auth");
        await signOut();
        setError("Could not retrieve email from Google account.");
        return;
      }
      const isJudge = await isRegisteredJudge(userEmail);
      if (!isJudge) {
        const { signOut } = await import("@/lib/auth");
        await signOut();
        setError("You are not registered as a judge. Ask an admin or judge to add you.");
        return;
      }
      if (result.user.displayName) {
        const { updateJudgeName } = await import("@/lib/db");
        await updateJudgeName(userEmail, result.user.displayName);
      }
      router.push("/admin");
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen items-center justify-center p-6 bg-gradient-to-b from-cream to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-maroon">🔐 Judge / Admin Login</h1>
          <p className="text-sm text-foreground/50 mt-1">
            For judges and organizers
          </p>
        </div>

        {/* Google Sign-In */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gold/10 space-y-4 mb-4">
          <p className="text-xs text-foreground/50 text-center">
            Judges: sign in with your registered Google account
          </p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-foreground/30">or admin email/password</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Email/Password Form */}
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-xl p-6 shadow-sm border border-gold/10 space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-foreground/70 block mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gold/20 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
              placeholder="admin@awurudu.lk"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground/70 block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gold/20 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon text-white py-2.5 rounded-lg text-sm font-medium hover:bg-maroon/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg mt-4 text-center">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
