"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getParticipants, addParticipant, updateParticipant, deleteParticipant } from "@/lib/db";
import { onAuthChange } from "@/lib/auth";
import { AvatarIcon } from "@/components/avatar-icon";
import type { Participant, Gender } from "@/types";

type Filter = "all" | "adult" | "teen" | "kid";

const ageGroupOrder: Record<string, number> = { kid: 0, teen: 1, adult: 2 };
const ageGroupColor: Record<string, { bg: string; text: string }> = {
  kid: { bg: "bg-success/10", text: "text-success" },
  teen: { bg: "bg-info/10", text: "text-info" },
  adult: { bg: "bg-primary/10", text: "text-primary" },
};

export default function ParticipantsPage() {
  const t = useTranslations("participants");
  const tc = useTranslations("common");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("kid");
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regGender, setRegGender] = useState("");
  const [regFamily, setRegFamily] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameWarning, setNameWarning] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editFamily, setEditFamily] = useState("");
  const [saving, setSaving] = useState(false);
  const [isJudge, setIsJudge] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    return onAuthChange((user) => setIsJudge(!!user));
  }, []);

  useEffect(() => {
    getParticipants().then((data) => {
      setParticipants(data);
      setLoading(false);
    });
  }, []);

  const adults = participants.filter((p) => p.ageGroup === "adult");

  const filtered = participants.filter((p) => {
    if (filter === "all") return true;
    return p.ageGroup === filter;
  });

  // Sort: kids first, then teens, then adults; within each group alphabetical
  const sorted = [...filtered].sort((a, b) => {
    const orderDiff = (ageGroupOrder[a.ageGroup] ?? 3) - (ageGroupOrder[b.ageGroup] ?? 3);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });

  // Find parent name for kids/teens (adults in same family group)
  const getParentName = (p: Participant): string | null => {
    if (p.ageGroup === "adult") return null;
    const parent = participants.find(
      (a) => a.ageGroup === "adult" && a.familyGroup === p.familyGroup
    );
    return parent?.name || null;
  };

  // Check for duplicate first name
  const checkFirstNameDuplicate = (firstName: string) => {
    if (!firstName.trim()) {
      setNameWarning("");
      return;
    }
    const lower = firstName.trim().toLowerCase();
    const match = participants.find(
      (p) => p.name.toLowerCase() === lower
    );
    if (match) {
      setNameWarning(t("nameExists", { name: match.name }));
    } else {
      setNameWarning("");
    }
  };

  const handleRegister = async () => {
    const family = regAge === "adult" ? `${regName.trim()}'s family` : regFamily;
    if (!regName || !regAge || !regGender || (regAge !== "adult" && !regFamily)) return;
    setSubmitting(true);
    try {
      await addParticipant({
        name: regName.trim(),
        ageGroup: regAge as Participant["ageGroup"],
        gender: regGender as Gender,
        familyGroup: family,
        participationStatus: "pending",
        selfRegistered: true,
        createdAt: Date.now(),
      });
      const data = await getParticipants();
      setParticipants(data);
      setRegName("");
      setRegAge("");
      setRegGender("");
      setRegFamily("");
      setNameWarning("");
      setShowRegister(false);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditAge(p.ageGroup);
    setEditGender(p.gender);
    setEditFamily(p.familyGroup);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    const family = editAge === "adult" ? `${editName.trim()}'s family` : editFamily;
    if (!editingId || !editName || !editAge || !editGender || (editAge !== "adult" && !editFamily)) return;
    setSaving(true);
    try {
      await updateParticipant(editingId, {
        name: editName.trim(),
        ageGroup: editAge as Participant["ageGroup"],
        gender: editGender as Gender,
        familyGroup: family,
      });
      const data = await getParticipants();
      setParticipants(data);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isJudge) return;
    setDeleting(id);
    try {
      await deleteParticipant(id);
      const data = await getParticipants();
      setParticipants(data);
      setEditingId(null);
    } finally {
      setDeleting(null);
    }
  };

  const filters: { value: Filter; label: string; activeClass: string }[] = [
    { value: "kid", label: tc("kids"), activeClass: "bg-success text-white" },
    { value: "teen", label: tc("teens"), activeClass: "bg-info text-white" },
    { value: "adult", label: tc("adults"), activeClass: "bg-primary text-white" },
    { value: "all", label: t("all"), activeClass: "bg-accent text-white" },
  ];

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-44">
        {/* Header — nobank style: centered, large bold title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">
            {t("title")}
          </h1>
          <p className="text-[15px] sm:text-base text-gray-400 mt-2 font-normal leading-snug">
            {t("totalRegistered", { count: participants.length })}
          </p>
        </div>

        {/* Filters — pill style, flat */}
        <div className="flex items-center gap-1.5 mb-5">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors",
                filter === f.value
                  ? f.activeClass
                  : "text-gray-400 hover:text-gray-600 bg-gray-50"
              )}
            >
              {f.label}
            </button>
          ))}
          {filter !== "all" && (
            <span className="ml-auto text-[13px] text-gray-400">
              {t("groupRegistered", { count: filtered.length, group: filter === "kid" ? tc("kids") : filter === "teen" ? tc("teens") : tc("adults") })}
            </span>
          )}
        </div>
        {/* Registration form — clean, flat card */}
        {showRegister && (
          <div className="bg-gray-50 rounded-xl p-5 mb-5">
            <h3 className="text-lg font-bold text-gray-900 mb-0.5">{t("registerTitle")}</h3>
            <p className="text-[12px] text-gray-400 mb-4">{t("firstNameOnly")}</p>
            <div className="space-y-2.5">
              <div>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    checkFirstNameDuplicate(e.target.value);
                  }}
                  placeholder={t("yourName")}
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
                />
                {nameWarning && (
                  <p className="text-[12px] text-amber-600 mt-1.5">{nameWarning}</p>
                )}
              </div>
              <select
                value={regAge}
                onChange={(e) => setRegAge(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors"
              >
                <option value="" className="text-gray-300">{t("ageGroup")}</option>
                <option value="adult">{tc("adults")} (18+)</option>
                <option value="teen">{tc("teens")} (11-17)</option>
                <option value="kid">{tc("kids")} (5-10)</option>
              </select>
              <select
                value={regGender}
                onChange={(e) => setRegGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors"
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {regAge !== "adult" && regAge !== "" && (
                <select
                  value={regFamily}
                  onChange={(e) => setRegFamily(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors"
                >
                  <option value="">{t("selectParent")}</option>
                  {adults.map((a) => (
                    <option key={a.id} value={a.familyGroup}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleRegister}
                  disabled={submitting || !regName || !regAge || !regGender || (regAge !== "adult" && !regFamily)}
                  className="flex-1 bg-gray-900 text-white py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-30"
                >
                  {submitting ? tc("loading") : tc("submit")}
                </button>
                <button
                  onClick={() => {
                    setShowRegister(false);
                    setRegName("");
                    setRegAge("");
                    setRegGender("");
                    setRegFamily("");
                    setNameWarning("");
                  }}
                  className="flex-1 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  {tc("cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {sorted.map((p) => {
              const colors = ageGroupColor[p.ageGroup] || ageGroupColor.adult;
              const parentName = getParentName(p);
              const isEditing = editingId === p.id;

              if (isEditing) {
                return (
                  <div key={p.id} className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                    />
                    <div className="flex gap-2">
                      <select
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm"
                      >
                        <option value="adult">{tc("adults")}</option>
                        <option value="teen">{tc("teens")}</option>
                        <option value="kid">{tc("kids")}</option>
                      </select>
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    {editAge !== "adult" && (
                      <select
                        value={editFamily}
                        onChange={(e) => setEditFamily(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm"
                      >
                        <option value="">{t("selectParent")}</option>
                        {adults.map((a) => (
                          <option key={a.id} value={a.familyGroup}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveEdit}
                        disabled={saving || !editName || !editAge || !editGender || (editAge !== "adult" && !editFamily)}
                        className="flex-1 bg-gray-900 text-white py-2 rounded-full text-sm font-medium disabled:opacity-30"
                      >
                        {saving ? tc("loading") : tc("save")}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-full text-sm font-medium hover:bg-gray-100"
                      >
                        {tc("cancel")}
                      </button>
                      {isJudge && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium hover:bg-red-100 disabled:opacity-30"
                        >
                          {deleting === p.id ? "..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-1 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => startEdit(p)}
                >
                  <AvatarIcon gender={p.gender} ageGroup={p.ageGroup} size={46} className="rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-bold text-gray-900 truncate">
                      {p.name}
                    </h3>
                    {parentName && (
                      <p className="text-[13px] text-gray-400 truncate leading-tight">
                        {parentName}&apos;s family
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[15px] px-4 py-1.5 rounded-full font-semibold shrink-0",
                      colors.bg,
                      colors.text
                    )}
                  >
                    {p.ageGroup === "kid" ? tc("kids") : p.ageGroup === "teen" ? tc("teens") : tc("adults")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom register button */}
      {!showRegister && (
        <div className="fixed bottom-16 left-0 right-0 z-10">
          <div className="max-w-lg mx-auto">
            <div className="h-8 bg-gradient-to-t from-white to-transparent" />
            <div className="bg-white px-5 pb-3">
              <button
                onClick={() => setShowRegister(true)}
                className="w-full bg-gray-900 text-white text-[15px] font-semibold py-3.5 rounded-full hover:bg-gray-800 transition-colors"
              >
                {t("register")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
