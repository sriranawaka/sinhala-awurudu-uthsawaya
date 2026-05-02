"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getSchedule } from "@/lib/db";
import type { ScheduleItem } from "@/types";

function isCurrentItem(startTime: string, durationMins: number): boolean {
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMins * 60000);
  return now >= start && now < end;
}

function isPastItem(startTime: string, durationMins: number): boolean {
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMins * 60000);
  return now >= end;
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

  // Group items by time period
  const morning = items.filter((i) => {
    const h = parseInt(i.startTime.split(":")[0], 10);
    return h < 12;
  });
  const afternoon = items.filter((i) => {
    const h = parseInt(i.startTime.split(":")[0], 10);
    return h >= 12;
  });

  const renderItem = (item: ScheduleItem) => {
    const current = isCurrentItem(item.startTime, item.durationMins);
    const past = isPastItem(item.startTime, item.durationMins);

    return (
      <div
        key={item.id}
        className={cn(
          "block rounded-xl px-4 py-4 transition-colors",
          current
            ? "bg-amber-50 ring-1 ring-amber-200"
            : past
              ? "bg-gray-50 opacity-50"
              : "bg-gray-50 hover:bg-gray-100"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-[16px] font-bold truncate",
              current ? "text-amber-900" : "text-gray-900"
            )}>
              {item.name}
            </h3>
            {item.nameSi && (
              <p className={cn(
                "text-[13px] truncate leading-tight mt-0.5",
                current ? "text-amber-700" : "text-gray-400"
              )}>
                {item.nameSi}
              </p>
            )}
          </div>
          <span className={cn(
            "text-[13px] font-semibold px-2.5 py-0.5 rounded-full shrink-0",
            current
              ? "bg-amber-500 text-white"
              : past
                ? "bg-gray-200 text-gray-400"
                : "bg-primary/10 text-primary"
          )}>
            {item.startTime}
          </span>
        </div>
      </div>
    );
  };

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">{t("title")}</h1>
          <p className="text-[15px] sm:text-base text-gray-400 mt-2 font-normal leading-snug">{t("subtitle")}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Morning section */}
            {morning.length > 0 && (
              <>
                <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider px-1 pt-2 pb-1">Morning</p>
                {morning.map(renderItem)}
              </>
            )}

            {/* Afternoon section */}
            {afternoon.length > 0 && (
              <>
                <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider px-1 pt-4 pb-1">Afternoon</p>
                {afternoon.map(renderItem)}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
