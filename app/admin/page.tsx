import Link from "next/link";

export default function AdminDashboard() {
  const cards = [
    {
      title: "Scoring",
      desc: "Assign 1st, 2nd, 3rd places",
      icon: "🏆",
      href: "/admin/scoring",
      color: "bg-gold",
    },
    {
      title: "Voting Control",
      desc: "Open/close Vivida Adum voting",
      icon: "🗳",
      href: "/admin/voting",
      color: "bg-sunset-orange",
    },
    {
      title: "Games",
      desc: "View all games",
      icon: "🎮",
      href: "/games",
      color: "bg-forest",
    },
    {
      title: "Schedule",
      desc: "View schedule",
      icon: "📅",
      href: "/schedule",
      color: "bg-blue-500",
    },
    {
      title: "Judges",
      desc: "Manage judges for games",
      icon: "👨‍⚖️",
      href: "/admin/judges",
      color: "bg-purple-500",
    },
  ];

  return (
    <main className="p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-foreground/50 mt-1">
          Manage the festival games and scoring
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white rounded-xl p-4 shadow-sm border border-gold/10 hover:shadow-md transition-shadow"
          >
            <div
              className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center text-white text-xl mb-3`}
            >
              {card.icon}
            </div>
            <h3 className="font-semibold text-sm">{card.title}</h3>
            <p className="text-xs text-foreground/50 mt-0.5">{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gold/10">
        <h2 className="font-semibold text-maroon mb-3">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-maroon">12</div>
            <div className="text-xs text-foreground/50">Games</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-forest">27</div>
            <div className="text-xs text-foreground/50">Families</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gold">0</div>
            <div className="text-xs text-foreground/50">Scored</div>
          </div>
        </div>
      </div>
    </main>
  );
}
