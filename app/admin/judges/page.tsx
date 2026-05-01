"use client";

import { useEffect, useState } from "react";
import { getJudges, addJudge, removeJudge } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Judge } from "@/types";

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const loadJudges = async () => {
    const j = await getJudges();
    setJudges(j.sort((a, b) => b.addedAt - a.addedAt));
    setLoading(false);
  };

  useEffect(() => {
    loadJudges();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setAdding(true);
    try {
      const user = getCurrentUser();
      await addJudge({
        email: trimmedEmail,
        name: trimmedEmail.split("@")[0],
        addedBy: user?.email || "admin",
        addedAt: Date.now(),
      });
      setEmail("");
      await loadJudges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add judge");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (judgeId: string) => {
    setRemoving(judgeId);
    try {
      await removeJudge(judgeId);
      await loadJudges();
    } finally {
      setRemoving(null);
    }
  };

  return (
    <main className="p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-foreground">Judges</h1>
        <p className="text-sm text-foreground/50 mt-1">
          Register judges who can select winners for games
        </p>
      </div>

      {/* Add Judge Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gold/10">
        <h2 className="font-semibold text-maroon mb-3">Add a Judge</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground/70 block mb-1">
              Gmail Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. judge@gmail.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={adding}
            className="w-full bg-accent text-white rounded-lg py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Judge"}
          </button>
        </form>
      </div>

      {/* Judges List */}
      <div className="bg-white rounded-xl shadow-sm border border-gold/10 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-maroon">
            Registered Judges ({judges.length})
          </h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : judges.length === 0 ? (
          <div className="p-8 text-center text-foreground/40 text-sm">
            No judges registered yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {judges.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {j.name}
                  </p>
                  <p className="text-xs text-foreground/50">{j.email}</p>
                  <p className="text-[10px] text-foreground/30 mt-0.5">
                    Added by {j.addedBy}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(j.id)}
                  disabled={removing === j.id}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {removing === j.id ? "..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
