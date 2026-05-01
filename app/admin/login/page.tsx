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
      setError("Invalid credentials. Access is for organizers only.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen items-center justify-center p-6 bg-gradient-to-b from-cream to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-maroon">🔐 Admin Login</h1>
          <p className="text-sm text-foreground/50 mt-1">
            For organizers and judges only
          </p>
        </div>

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

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon text-white py-2.5 rounded-lg text-sm font-medium hover:bg-maroon/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
