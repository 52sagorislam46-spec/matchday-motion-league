import { useEffect, useRef, useState } from "react";
import type { Match } from "../engine";
import { input, refreshInput, touchMove, touchSprint } from "../input";

const fmt = (s: number) => {
  const t = Math.ceil(s);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2, l = Math.hypot(dx, dy);
    if (l > max) { dx = (dx / l) * max; dy = (dy / l) * max; }
    setKnob({ x: dx, y: dy });
    touchMove.x = dx / max; touchMove.z = dy / max;
    refreshInput();
  };
  const end = () => { setKnob({ x: 0, y: 0 }); touchMove.x = 0; touchMove.z = 0; refreshInput(); };
  return (
    <div
      ref={base}
      className="pointer-events-auto relative h-36 w-36 touch-none rounded-full border-2 border-foreground/30 bg-background/40 backdrop-blur"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); update(e); }}
      onPointerMove={(e) => e.buttons && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-primary/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

function Btn({ label, onPress, hold, className = "" }: { label: string; onPress?: () => void; hold?: (on: boolean) => void; className?: string }) {
  return (
    <button
      className={`pointer-events-auto flex touch-none select-none items-center justify-center rounded-full border-2 border-foreground/30 font-bold text-foreground shadow-lg active:scale-95 ${className}`}
      onPointerDown={(e) => { e.preventDefault(); onPress?.(); hold?.(true); }}
      onPointerUp={() => hold?.(false)}
      onPointerLeave={() => hold?.(false)}
    >
      {label}
    </button>
  );
}

export function Hud({ match, onExit }: { match: Match; onExit: () => void }) {
  const [, force] = useState(0);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const i = setInterval(() => force((n) => n + 1), 120);
    return () => clearInterval(i);
  }, []);
  const [h, a] = match.teams;
  const last = match.events.at(-1);
  const sinceLast = last ? match.duration - match.timeLeft - last.t : 99;
  const ctl = match.players[match.controlled]!;

  let banner: string | null = null;
  if (match.phase === "goal") banner = `গোল! ${match.teams[last?.team ?? 0].name}`;
  else if (last?.type === "out" && sinceLast < 1.5)
    banner = ({ corner: "কর্নার", goalkick: "গোল কিক", throwin: "থ্রো-ইন" } as Record<string, string>)[String(last.data?.["kind"])] ?? null;
  else if (match.phase === "kickoff") banner = "কিক-অফ";

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-sans">
      {/* scoreboard */}
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-stretch overflow-hidden rounded-md bg-card/90 text-card-foreground shadow-xl backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="h-4 w-4 rounded-sm" style={{ background: h.shirt }} />
          <span className="font-display text-2xl tracking-wider">{h.short}</span>
        </div>
        <div className="flex items-center bg-primary px-3 font-display text-3xl text-primary-foreground">
          {match.score[0]} - {match.score[1]}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="font-display text-2xl tracking-wider">{a.short}</span>
          <span className="h-4 w-4 rounded-sm" style={{ background: a.shirt }} />
        </div>
        <div className="flex items-center border-l border-border px-3 font-display text-2xl tabular-nums">
          {fmt(match.timeLeft)}
        </div>
      </div>

      <button
        onClick={onExit}
        className="pointer-events-auto absolute right-3 top-3 rounded-md bg-card/80 px-3 py-1.5 text-sm text-card-foreground backdrop-blur hover:bg-card"
      >
        মেনু
      </button>

      {ctl && match.phase !== "ended" && (
        <div className="absolute left-3 top-3 rounded-md bg-card/80 px-3 py-1.5 text-sm text-card-foreground backdrop-blur">
          নিয়ন্ত্রণে: #{ctl.number} ({ctl.role})
        </div>
      )}

      {banner && match.phase !== "ended" && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 font-display text-6xl tracking-widest text-primary drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] md:text-8xl">
          {banner}
        </div>
      )}

      {match.phase === "ended" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-xl bg-card p-8 text-center text-card-foreground shadow-2xl">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">ফুল টাইম</p>
            <p className="mt-2 font-display text-6xl">{h.short} {match.score[0]} - {match.score[1]} {a.short}</p>
            <p className="mt-2 text-lg">
              {match.score[0] === match.score[1] ? "ম্যাচ ড্র!" : `${match.score[0] > match.score[1] ? h.name : a.name} জিতেছে!`}
            </p>
            <button onClick={onExit} className="mt-6 rounded-md bg-primary px-6 py-2 font-semibold text-primary-foreground">
              আবার খেলুন
            </button>
          </div>
        </div>
      )}

      {!touch && match.phase !== "ended" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-card/70 px-4 py-2 text-xs text-card-foreground backdrop-blur">
          WASD/তীর: দৌড় · Shift: স্প্রিন্ট · J: পাস · K/Space: শট · L: ট্যাকল · Q: খেলোয়াড় বদল
        </div>
      )}

      {touch && match.phase !== "ended" && (
        <>
          <div className="absolute bottom-6 left-6"><Joystick /></div>
          <div className="absolute bottom-6 right-6 grid grid-cols-2 gap-3">
            <Btn label="পাস" className="h-16 w-16 bg-secondary/80" onPress={() => (input.pass = true)} />
            <Btn label="শট" className="h-20 w-20 bg-destructive/80" onPress={() => (input.shoot = true)} />
            <Btn label="ট্যাকল" className="h-16 w-16 bg-accent/80 text-sm" onPress={() => (input.tackle = true)} />
            <Btn label="দৌড়" className="h-16 w-16 bg-primary/70 text-primary-foreground" hold={(on) => { touchSprint.on = on; refreshInput(); }} />
          </div>
        </>
      )}
    </div>
  );
}
