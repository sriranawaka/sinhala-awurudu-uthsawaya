import Link from "next/link";
import Image from "next/image";
import { Calendar, Trophy, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero — minimalist, centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Awurudu illustration */}
        <div className="mb-6 w-full max-w-sm">
          <Image
            src="/sun.jpg"
            alt="සුභ අලුත් අවුරුද්දක් වේවා"
            width={400}
            height={400}
            className="mx-auto w-full h-auto rounded-2xl"
            priority
          />
        </div>

        {/* Title — bold, minimal */}
        <h1 className="text-[40px] sm:text-[48px] font-black tracking-tight text-gray-900 leading-[1.05] text-center">
          {t("title")}
        </h1>
        <p className="text-[17px] text-gray-400 mt-3 font-normal text-center leading-relaxed">
          {t("subtitle")}
        </p>
        <p className="text-[13px] text-gray-300 mt-2 text-center">
          {t("date")}
        </p>

        {/* Get Started button */}
        <Link
          href="/games"
          className="mt-10 px-8 py-3.5 bg-gray-900 text-white rounded-full text-[15px] font-semibold hover:bg-gray-800 transition-colors shadow-sm"
        >
          Get Started
        </Link>
      </div>

      {/* Quick links — bottom section, subtle */}
      <div className="max-w-lg mx-auto w-full px-6 pb-28">
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/schedule"
            className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
          >
            <Calendar className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-gray-500">{t("schedule")}</span>
          </Link>
          <Link
            href="/games"
            className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
          >
            <Trophy className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-gray-500">{t("gamesLeaderboard")}</span>
          </Link>
          <Link
            href="/participants"
            className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
          >
            <Users className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-gray-500">{t("participants")}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
