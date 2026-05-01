"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getSchedule } from "@/lib/db";
import type { ScheduleItem } from "@/types";

function getAgeGroupBadges(a: { kids: boolean; teens: boolean; adults: boolean }) {
  const badges = [];
  if (a.kids) badges.push({ label: "Kids", color: "bg-success/10 text-success" });
  if (a.teens) badges.push({ label: "Teens", color: "bg-info/10 text-info" });
  if (a.adults) badges.push({ label: "Adults", color: "bg-primary/10 text-primary" });
  return badges;
}

function isCurrentItem(startTime: string, durationMins: number): boolean {
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMins * 60000);
  return now >= start && now < end;
}

export default function SchedulePage() {
  const t = useTranslations("schedule");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    getSchedule().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  // Refresh every minute for "NOW" indicator
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">{t("title")}</h1>
          <p className="text-[15px] sm:text-base text-gray-400 mt-2 font-normal leading-snug">{t("subtitle")}</p>
        </div>

        {/* Timeline */}
        <div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {items.map((item) => {
            const isCurrent = isCurrentItem(item.startTime, item.durationMins);
            const badges = getAgeGroupBadges(item.applicableTo);
            return (
              <div key={item.id} className="relative flex gap-4 mb-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 mt-4">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border-2 ml-[18px]",
                      isCurrent
                        ? "bg-accent border-accent animate-pulse"
                        : "bg-white border-gray-300"
                    )}
                  />
                </div>

                {/* Card */}
                <div
                  className={cn(
                    "flex-1 bg-white rounded-2xl p-4 shadow-sm border transition-all",
                    isCurrent
                      ? "border-accent ring-2 ring-accent/20"
                      : "border-gray-100"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted">
                          {item.startTime}
                        </span>
                        <span className="text-xs text-muted">
                          ({item.durationMins}min)
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full">
                            NOW
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mt-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted">{item.nameSi}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${b.color}`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>

                  {item.responsible && (
                    <p className="text-xs text-muted mt-2">
                      {item.responsible}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
        </div>
      </div>
    </main>
  );
}
