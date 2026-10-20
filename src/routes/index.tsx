import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TEAMS } from "@/game/teams";
import type { Team } from "@/game/types";
import { GameView } from "@/game/components/GameView";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ফুটবল ১১ বনাম ১১ — ৩ডি ম্যাচ" },
      { name: "description", content: "দল বেছে নিন, ৩ বা ৬ মিনিটের পূর্ণাঙ্গ ১১ বনাম ১১ ৩ডি ফুটবল ম্যাচ খেলুন।" },
      { property: "og:title", content: "ফুটবল ১১ বনাম ১১ — ৩ডি ম্যাচ" },
      { property: "og:description", content: "দল বেছে নিন, ৩ বা ৬ মিনিটের পূর্ণাঙ্গ ১১ বনাম ১১ ৩ডি ফুটবল ম্যাচ খেলুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function TeamPicker({ label, value, onChange, disabled }: { label: string; value: Team; onChange: (t: Team) => void; disabled?: string }) {
  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {TEAMS.map((t) => (
          <button
            key={t.id}
            disabled={t.id === disabled}
            onClick={() => onChange(t)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition disabled:opacity-30 ${
              value.id === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/40"
            }`}
          >
            <span className="flex h-8 w-8 overflow-hidden rounded-full border border-border">
              <span className="w-1/2" style={{ background: t.shirt }} />
              <span className="w-1/2" style={{ background: t.shorts }} />
            </span>
            <span className="text-sm font-semibold">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Index() {
  const [home, setHome] = useState<Team>(TEAMS[0]!);
  const [away, setAway] = useState<Team>(TEAMS[1]!);
  const [minutes, setMinutes] = useState<3 | 6>(3);
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);

  if (playing) return <GameView key={round} home={home} away={away} minutes={minutes} onExit={() => setPlaying(false)} />;

  return (
    <main className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,var(--color-card),transparent_70%)] px-4 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-6xl tracking-wider text-primary md:text-8xl">ফুটবল ১১ v ১১</h1>
        <p className="mt-1 text-muted-foreground">দল বেছে নিন, সময় ঠিক করুন, মাঠে নামুন।</p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <TeamPicker label="আপনার দল" value={home} onChange={setHome} disabled={away.id} />
          <TeamPicker label="প্রতিপক্ষ" value={away} onChange={setAway} disabled={home.id} />
        </div>

        <div className="mt-8">
          <p className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">ম্যাচের সময়</p>
          <div className="flex gap-3">
            {([3, 6] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`rounded-lg border-2 px-6 py-3 text-lg font-semibold ${
                  minutes === m ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                {m === 3 ? "৩ মিনিট" : "৬ মিনিট"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setRound((r) => r + 1); setPlaying(true); }}
          className="mt-10 w-full rounded-lg bg-primary py-4 font-display text-3xl tracking-widest text-primary-foreground shadow-lg transition hover:brightness-110"
        >
          ম্যাচ শুরু
        </button>

        <div className="mt-8 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">কন্ট্রোল</p>
          <p className="mt-1">কিবোর্ড: WASD/তীর চিহ্ন দৌড়, Shift স্প্রিন্ট, J পাস, K বা Space শট, L ট্যাকল, Q খেলোয়াড় বদল।</p>
          <p>মোবাইল: বাঁ দিকে জয়স্টিক, ডান দিকে পাস / শট / ট্যাকল / দৌড় বোতাম।</p>
        </div>
      </div>
    </main>
  );
}
