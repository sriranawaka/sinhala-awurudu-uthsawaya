import Link from "next/link";
import Image from "next/image";
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
          href="/schedule"
          className="mt-10 px-8 py-3.5 bg-gray-900 text-white rounded-full text-[15px] font-semibold hover:bg-gray-800 transition-colors shadow-sm"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
