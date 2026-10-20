export type TeamId = 0 | 1;
export type Role = "GK" | "DF" | "MF" | "FW";
export type Anim = "idle" | "run" | "pass" | "shoot" | "tackle";
export type Phase = "kickoff" | "play" | "goal" | "ended";

export interface Team {
  id: string;
  name: string;
  short: string;
  shirt: string;
  shorts: string;
  gk: string;
  speed: number; // multiplier
  skill: number; // 0..1 AI decision quality
}

export interface Player {
  id: number;
  team: TeamId;
  number: number;
  role: Role;
  hx: number; // formation home (world)
  hz: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  anim: Anim;
  animT: number;
  stun: number;
  aiCd: number;
  /** false when substituted off / sent off — future-proof for subs & red cards */
  active: boolean;
  yellowCards: number;
}

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  owner: number | null;
  lastTouch: TeamId;
  lastKicker: number;
  cooldown: number;
}

export type MatchEventType =
  | "kickoff"
  | "goal"
  | "out"
  | "foul"
  | "card"
  | "substitution"
  | "end";

export interface MatchEvent {
  t: number;
  type: MatchEventType;
  team?: TeamId;
  playerId?: number;
  data?: Record<string, unknown>;
}

export interface Input {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  pass: boolean;
  shoot: boolean;
  tackle: boolean;
  switch: boolean;
}

/**
 * Plug-in rule hook. Referee, fouls, cards and substitutions are added by
 * registering rules — the engine core never needs to change.
 */
export interface MatchRule {
  name: string;
  onTick?(m: import("./engine").Match, dt: number): void;
  resolveTackle?(
    m: import("./engine").Match,
    tackler: Player,
    victim: Player,
  ): "clean" | "foul" | null;
  onEvent?(m: import("./engine").Match, e: MatchEvent): void;
}
