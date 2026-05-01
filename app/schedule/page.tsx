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
          "flex items-center gap-3 py-3 px-3 rounded-xl transition-all",
          current
            ? "bg-amber-50 ring-1 ring-amber-200"
            : past
              ? "opacity-50"
              : "hover:bg-gray-50"
        )}
      >
        {/* Time */}
        <div className="w-12 shrink-0 text-right">
          <span className={cn(
            "text-[13px] font-mono font-bold",
            current ? "text-amber-600" : past ? "text-gray-300" : "text-gray-500"
          )}>
            {item.startTime}
          </span>
        </div>

        {/* Dot */}
        <div className="shrink-0">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            current ? "bg-amber-500 animate-pulse" : past ? "bg-gray-200" : "bg-gray-300"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[14px] font-semibold truncate",
              current ? "text-amber-900" : past ? "text-gray-400" : "text-gray-900"
            )}>
              {item.name}
            </span>
            {current && (
              <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide">
                Now
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">{t("title")}</h1>
          <p className="text-[15px] sm:text-base text-gray-400 mt-2 font-normal leading-snug">{t("subtitle")}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Morning section */}
            {morning.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">Morning</h2>
                </div>
                <div className="px-1 py-1 divide-y-0">
                  {morning.map(renderItem)}
                </div>
              </div>
            )}

            {/* Afternoon section */}
            {afternoon.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">Afternoon</h2>
                </div>
                <div className="px-1 py-1 divide-y-0">
                  {afternoon.map(renderItem)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
