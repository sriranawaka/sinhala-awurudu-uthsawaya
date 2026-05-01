"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Trophy, Users, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", key: "home" as const, icon: Home },
  { href: "/schedule", key: "schedule" as const, icon: Calendar },
  { href: "/participants", key: "participants" as const, icon: Users },
  { href: "/games", key: "games" as const, icon: Trophy },
  { href: "/more", key: "more" as const, icon: Menu },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  // Hide on admin pages
  if (pathname.startsWith("/admin") || pathname === "/qr") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/60">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-lg transition-colors",
                isActive
                  ? "text-accent"
                  : "text-muted hover:text-foreground/80"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] mt-0.5 font-medium">
                {t(tab.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
