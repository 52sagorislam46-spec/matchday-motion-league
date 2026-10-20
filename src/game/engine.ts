import type { Ball, Input, MatchEvent, MatchRule, Phase, Player, Role, Team, TeamId } from "./types";

export const PITCH = { halfL: 50, halfW: 32, goalHalfW: 3.66, goalH: 2.44 };
export const BALL_R = 0.22;
const BASE_SPEED = 7;
const SPRINT = 1.35;
const ACCEL = 7;

// 4-4-2, team 0 attacks +x (own goal at -x)
const FORMATION: [Role, number, number, number][] = [
  ["GK", 1, -47, 0],
  ["DF", 2, -35, -20],
  ["DF", 4, -37, -7],
  ["DF", 5, -37, 7],
  ["DF", 3, -35, 20],
  ["MF", 7, -20, -22],
  ["MF", 8, -22, -7],
  ["MF", 6, -22, 7],
  ["MF", 11, -20, 22],
  ["FW", 9, -10, -6],
  ["FW", 10, -10, 6],
];

export interface MatchConfig {
  home: Team;
  away: Team;
  minutes: 3 | 6;
  rules?: MatchRule[];
  rng?: () => number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

export class Match {
  teams: [Team, Team];
  players: Player[] = [];
  ball: Ball = { x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: 0, lastKicker: -1, cooldown: 0 };
  score: [number, number] = [0, 0];
  duration: number;
  timeLeft: number;
  phase: Phase = "kickoff";
  phaseT = 0;
  events: MatchEvent[] = [];
  userTeam: TeamId = 0;
  controlled = 9;
  rules: MatchRule[];
  rng: () => number;
  private switchCd = 0;

  constructor(cfg: MatchConfig) {
    this.teams = [cfg.home, cfg.away];
    this.duration = cfg.minutes * 60;
    this.timeLeft = this.duration;
    this.rules = cfg.rules ?? [];
    this.rng = cfg.rng ?? Math.random;
    let id = 0;
    for (const team of [0, 1] as TeamId[]) {
      const s = team === 0 ? 1 : -1;
      for (const [role, number, x, z] of FORMATION) {
        this.players.push({
          id: id++, team, number, role, hx: x * s, hz: z * s, x: x * s, z: z * s,
          vx: 0, vz: 0, facing: s > 0 ? Math.PI / 2 : -Math.PI / 2, anim: "idle", animT: 0,
          stun: 0, aiCd: 0, active: true, yellowCards: 0,
        });
      }
    }
    this.kickoff(0);
  }

  dir(team: TeamId) {
    return team === 0 ? 1 : -1;
  }
  teamPlayers(team: TeamId) {
    return this.players.filter((p) => p.team === team && p.active);
  }

  emit(e: Omit<MatchEvent, "t">) {
    const ev = { ...e, t: this.duration - this.timeLeft };
    this.events.push(ev);
    for (const r of this.rules) r.onEvent?.(this, ev);
  }

  kickoff(team: TeamId) {
    for (const p of this.players) {
      p.x = p.hx; p.z = p.hz; p.vx = p.vz = 0; p.anim = "idle"; p.animT = 0; p.stun = 0;
      p.facing = this.dir(p.team) > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    const taker = this.teamPlayers(team).find((p) => p.number === 9)!;
    taker.x = -this.dir(team) * 0.6; taker.z = 0;
    Object.assign(this.ball, { x: 0, y: BALL_R, z: 0, vx: 0, vy: 0, vz: 0, owner: taker.id, lastTouch: team, cooldown: 0 });
    taker.aiCd = 1.2;
    this.phase = "kickoff";
    this.phaseT = 1.2;
    if (team === this.userTeam) this.controlled = taker.id;
    this.emit({ type: "kickoff", team });
  }

  tick(rawDt: number, inp: Input) {
    const dt = Math.min(rawDt, 0.05);
    if (this.phase === "ended") {
      this.stepPlayers(dt, inp, true);
      return;
    }
    if (this.phase === "goal") {
      this.phaseT -= dt;
      this.stepPlayers(dt, inp, true);
      this.stepBall(dt);
      if (this.phaseT <= 0) this.kickoff(this.score[0] + this.score[1] > 0 ? (1 - (this.events.filter((e) => e.type === "goal").at(-1)!.team!)) as TeamId : 0);
      return;
    }
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.phase = "ended";
      this.emit({ type: "end" });
      return;
    }
    if (this.phase === "kickoff") {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.phase = "play";
    }
    for (const r of this.rules) r.onTick?.(this, dt);
    this.stepPlayers(dt, inp, this.phase === "kickoff");
    this.stepBall(dt);
    this.checkPickup();
    this.checkBounds();
  }

  nearestTo(team: TeamId, x: number, z: number, skipGK = true, exclude = -1) {
    let best: Player | null = null, bd = Infinity;
    for (const p of this.teamPlayers(team)) {
      if ((skipGK && p.role === "GK") || p.id === exclude) continue;
      const d = dist(p.x, p.z, x, z);
      if (d < bd) { bd = d; best = p; }
    }
    return best!;
  }

  private stepPlayers(dt: number, inp: Input, frozen: boolean) {
    const b = this.ball;
    const ownerTeam = b.owner !== null ? this.players[b.owner]!.team : null;
    // human control switching
    this.switchCd -= dt;
    if (inp.switch) {
      inp.switch = false;
      if (ownerTeam !== this.userTeam) {
        this.controlled = this.nearestTo(this.userTeam, b.x, b.z, true, this.controlled).id;
      }
    }
    if (!frozen && ownerTeam !== this.userTeam && this.switchCd <= 0) {
      const n = this.nearestTo(this.userTeam, b.x, b.z);
      const c = this.players[this.controlled]!;
      if (dist(c.x, c.z, b.x, b.z) > dist(n.x, n.z, b.x, b.z) + 7) {
        this.controlled = n.id;
        this.switchCd = 1;
      }
    }
    const chaser: (number)[] = [
      this.userTeam === 0 ? -1 : this.nearestTo(0, b.x + b.vx * 0.3, b.z + b.vz * 0.3).id,
      this.userTeam === 1 ? -1 : this.nearestTo(1, b.x + b.vx * 0.3, b.z + b.vz * 0.3).id,
    ];

    for (const p of this.players) {
      if (!p.active) continue;
      p.stun -= dt; p.animT -= dt; p.aiCd -= dt;
      const max = BASE_SPEED * this.teams[p.team].speed;
      let dvx = 0, dvz = 0;
      const seek = (tx: number, tz: number, sp: number) => {
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.3) return;
        const s = Math.min(sp, d * 2);
        dvx = (dx / d) * s; dvz = (dz / d) * s;
      };

      if (frozen) {
        if (this.phase !== "ended" && !(b.owner === p.id && this.phase === "kickoff")) seek(p.hx, p.hz, max * 0.8);
        if (this.phase === "ended") { dvx = 0; dvz = 0; }
      } else if (p.team === this.userTeam && p.id === this.controlled) {
        const m = Math.hypot(inp.moveX, inp.moveZ);
        const nx = m > 1 ? inp.moveX / m : inp.moveX, nz = m > 1 ? inp.moveZ / m : inp.moveZ;
        const sp = max * (inp.sprint ? SPRINT : 1) * (b.owner === p.id ? 0.9 : 1);
        dvx = nx * sp; dvz = nz * sp;
        if (inp.pass) { inp.pass = false; if (b.owner === p.id) this.pass(p, nx, nz); else inp.switch = true; }
        if (inp.shoot) { inp.shoot = false; if (b.owner === p.id) this.shoot(p); }
        if (inp.tackle) { inp.tackle = false; if (b.owner !== p.id) this.tackle(p); }
      } else {
        const r = this.ai(p, chaser[p.team] === p.id, max);
        dvx = r[0]; dvz = r[1];
      }

      if (p.stun > 0) { dvx *= 0.15; dvz *= 0.15; }
      if (p.anim === "tackle" && p.animT > 0) {
        p.vx *= Math.exp(-2.5 * dt); p.vz *= Math.exp(-2.5 * dt);
      } else {
        const k = 1 - Math.exp(-ACCEL * dt);
        p.vx += (dvx - p.vx) * k; p.vz += (dvz - p.vz) * k;
      }
      p.x = clamp(p.x + p.vx * dt, -PITCH.halfL - 3, PITCH.halfL + 3);
      p.z = clamp(p.z + p.vz * dt, -PITCH.halfW - 2, PITCH.halfW + 2);
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0.4 && p.anim !== "tackle") {
        const target = Math.atan2(p.vx, p.vz);
        let d = target - p.facing;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        p.facing += d * (1 - Math.exp(-12 * dt));
      }
      if (p.animT <= 0) p.anim = sp > 0.6 ? "run" : "idle";
    }
  }

  private ai(p: Player, isChaser: boolean, max: number): [number, number] {
    const b = this.ball;
    const s = this.dir(p.team);
    const oppGoalX = PITCH.halfL * s;
    const team = this.teams[p.team];
    const ownerTeam = b.owner !== null ? this.players[b.owner]!.team : null;
    const to = (tx: number, tz: number, sp: number): [number, number] => {
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.4) return [0, 0];
      const v = Math.min(sp, d * 1.8);
      return [(dx / d) * v, (dz / d) * v];
    };

    if (b.owner === p.id) {
      if (p.aiCd <= 0 && this.phase === "play") {
        p.aiCd = 0.35;
        const dGoal = dist(p.x, p.z, oppGoalX, 0);
        const opp = this.nearestTo((1 - p.team) as TeamId, p.x, p.z, false);
        const press = dist(p.x, p.z, opp.x, opp.z);
        if (p.role === "GK") { this.pass(p, s, 0); return [0, 0]; }
        if (dGoal < 24 && this.rng() < 0.35 + team.skill * 0.3) { this.shoot(p); return [0, 0]; }
        if (press < 3.5 && this.rng() < 0.4 + team.skill * 0.3) { this.pass(p, s, 0); return [0, 0]; }
        if (this.rng() < 0.06) { this.pass(p, s, 0); return [0, 0]; }
      }
      const tz = clamp(p.z * 0.9, -15, 15);
      return to(oppGoalX, tz, max * 0.85);
    }

    if (p.role === "GK") {
      const gx = -oppGoalX + s * 1.5;
      const inBox = Math.abs(b.x - -oppGoalX) < 16 && Math.abs(b.z) < 20;
      if (b.owner === null && inBox && dist(p.x, p.z, b.x, b.z) < 12) return to(b.x, b.z, max);
      return to(gx, clamp(b.z * 0.25, -3, 3), max * 0.8);
    }

    if (isChaser) {
      if (ownerTeam !== null && ownerTeam !== p.team) {
        const o = this.players[b.owner!]!;
        if (dist(p.x, p.z, o.x, o.z) < 1.9 && p.aiCd <= 0) {
          p.aiCd = 0.9;
          if (this.rng() < 0.3 + team.skill * 0.25) this.tackle(p);
        }
      }
      return to(b.x + b.vx * 0.3, b.z + b.vz * 0.3, max * (ownerTeam === p.team ? 0.7 : 1));
    }

    const shift = clamp(b.x * 0.55, -22, 22) + (ownerTeam === p.team ? s * 7 : ownerTeam !== null ? -s * 3 : 0);
    const hx = clamp(p.hx + shift, -PITCH.halfL + 3, PITCH.halfL - 3);
    const hz = p.hz + (b.z - p.hz) * 0.18;
    return to(hx, hz, max * 0.75);
  }

  private kick(p: Player, vx: number, vz: number, vy: number, anim: "pass" | "shoot") {
    const b = this.ball;
    b.owner = null;
    b.vx = vx; b.vz = vz; b.vy = vy;
    b.lastTouch = p.team; b.lastKicker = p.id; b.cooldown = 0.35;
    p.anim = anim; p.animT = anim === "shoot" ? 0.45 : 0.35;
    p.facing = Math.atan2(vx, vz);
  }

  pass(p: Player, hx: number, hz: number) {
    let dx = hx, dz = hz;
    if (Math.hypot(dx, dz) < 0.2) { dx = Math.sin(p.facing); dz = Math.cos(p.facing); }
    const dl = Math.hypot(dx, dz); dx /= dl; dz /= dl;
    let best: Player | null = null, bs = Infinity;
    for (const t of this.teamPlayers(p.team)) {
      if (t.id === p.id) continue;
      const tx = t.x - p.x, tz = t.z - p.z, d = Math.hypot(tx, tz);
      if (d < 4 || d > 45) continue;
      const ang = Math.acos(clamp((tx * dx + tz * dz) / d, -1, 1));
      if (ang > 1.2) continue;
      const score = ang * 2.2 + d * 0.03 + (t.role === "GK" ? 3 : 0);
      if (score < bs) { bs = score; best = t; }
    }
    if (!best) { this.kick(p, dx * 14, dz * 14, 0.5, "pass"); return; }
    const tx = best.x + best.vx * 0.6 - p.x, tz = best.z + best.vz * 0.6 - p.z, d = Math.hypot(tx, tz);
    const power = clamp(7 + d * 0.75, 10, 26);
    this.kick(p, (tx / d) * power, (tz / d) * power, d > 25 ? 4.5 : 0.6, "pass");
    if (p.team === this.userTeam) { this.controlled = best.id; this.switchCd = 1.2; }
  }

  shoot(p: Player) {
    const s = this.dir(p.team);
    const gx = PITCH.halfL * s;
    const d = dist(p.x, p.z, gx, 0);
    const spread = 0.08 + d * 0.004;
    const gz = (this.rng() - 0.5) * PITCH.goalHalfW * 1.6;
    let dx = gx - p.x, dz = gz - p.z;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    const a = (this.rng() - 0.5) * spread;
    const rx = dx * Math.cos(a) - dz * Math.sin(a), rz = dx * Math.sin(a) + dz * Math.cos(a);
    const power = 26 + this.rng() * 6;
    this.kick(p, rx * power, rz * power, 1.5 + this.rng() * 3.5, "shoot");
  }

  tackle(p: Player) {
    if (p.anim === "tackle" && p.animT > 0) return;
    p.anim = "tackle"; p.animT = 0.6;
    const b = this.ball;
    // face the ball
    p.facing = Math.atan2(b.x - p.x, b.z - p.z);
    p.vx = Math.sin(p.facing) * 10; p.vz = Math.cos(p.facing) * 10;
    if (b.owner === null) return;
    const v = this.players[b.owner]!;
    if (v.team === p.team || dist(p.x, p.z, v.x, v.z) > 2.2) return;
    let result: "clean" | "foul" = "clean";
    for (const r of this.rules) { const o = r.resolveTackle?.(this, p, v); if (o) { result = o; break; } }
    if (result === "foul") { this.emit({ type: "foul", team: p.team, playerId: p.id, data: { victim: v.id } }); return; }
    v.stun = 0.8;
    b.owner = null;
    b.vx = Math.sin(p.facing) * 4 + (this.rng() - 0.5) * 2;
    b.vz = Math.cos(p.facing) * 4 + (this.rng() - 0.5) * 2;
    b.vy = 0.5; b.lastTouch = p.team; b.lastKicker = -1; b.cooldown = 0;
  }

  private stepBall(dt: number) {
    const b = this.ball;
    b.cooldown -= dt;
    if (b.owner !== null) {
      const p = this.players[b.owner]!;
      b.x = p.x + Math.sin(p.facing) * 0.75;
      b.z = p.z + Math.cos(p.facing) * 0.75;
      b.y = BALL_R; b.vx = p.vx; b.vz = p.vz; b.vy = 0;
      return;
    }
    b.vy -= 9.8 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < BALL_R) {
      b.y = BALL_R;
      b.vy = Math.abs(b.vy) > 1 ? -b.vy * 0.5 : 0;
      const f = Math.exp(-0.9 * dt);
      b.vx *= f; b.vz *= f;
    } else {
      const f = Math.exp(-0.1 * dt);
      b.vx *= f; b.vz *= f;
    }
    // net
    if (this.phase === "goal" && Math.abs(b.x) > PITCH.halfL + 1.8) {
      b.x = Math.sign(b.x) * (PITCH.halfL + 1.8);
      b.vx *= -0.15; b.vz *= 0.3;
    }
  }

  private checkPickup() {
    const b = this.ball;
    if (b.owner !== null || this.phase !== "play") return;
    const speed = Math.hypot(b.vx, b.vz);
    let best: Player | null = null, bd = Infinity;
    for (const p of this.players) {
      if (!p.active || p.stun > 0) continue;
      if (p.id === b.lastKicker && b.cooldown > 0) continue;
      const reachY = p.role === "GK" ? 2.4 : 1.0;
      if (b.y > reachY) continue;
      const d = dist(p.x, p.z, b.x, b.z);
      const reach = p.role === "GK" ? 1.6 : speed > 22 ? 0.7 : 1.0;
      if (d < reach && d < bd) { bd = d; best = p; }
    }
    if (best) {
      b.owner = best.id; b.lastTouch = best.team;
      if (best.team === this.userTeam) this.controlled = best.id;
      if (best.role === "GK") best.aiCd = 0.8;
    }
  }

  private giveBall(p: Player, x: number, z: number) {
    p.x = x; p.z = z; p.vx = p.vz = 0; p.stun = 0;
    p.facing = Math.atan2(-x, -z * 0.5 + 0.0001);
    const b = this.ball;
    Object.assign(b, { owner: p.id, vx: 0, vy: 0, vz: 0, y: BALL_R, lastTouch: p.team });
    p.aiCd = 0.9;
    if (p.team === this.userTeam) this.controlled = p.id;
    this.stepBall(0);
  }

  private checkBounds() {
    const b = this.ball;
    if (b.owner !== null && this.phase === "play") {
      // dribbled out — treat ball position the same way
    }
    const restartTeam = (1 - b.lastTouch) as TeamId;
    if (Math.abs(b.x) > PITCH.halfL) {
      const side = Math.sign(b.x);
      if (Math.abs(b.z) < PITCH.goalHalfW && b.y < PITCH.goalH && b.owner === null) {
        const scorer: TeamId = side > 0 ? 0 : 1;
        this.score[scorer]++;
        this.phase = "goal"; this.phaseT = 3.2;
        this.emit({ type: "goal", team: scorer, playerId: b.lastKicker });
        return;
      }
      const defending: TeamId = side > 0 ? 1 : 0;
      this.emit({ type: "out", team: restartTeam, data: { kind: restartTeam === defending ? "goalkick" : "corner" } });
      if (restartTeam === defending) {
        const gk = this.teamPlayers(defending).find((p) => p.role === "GK")!;
        this.giveBall(gk, side * (PITCH.halfL - 5), 0);
      } else {
        const cz = Math.sign(b.z || 1) * (PITCH.halfW - 0.5);
        const cx = side * (PITCH.halfL - 0.5);
        this.giveBall(this.nearestTo(restartTeam, cx, cz), cx, cz);
      }
      return;
    }
    if (Math.abs(b.z) > PITCH.halfW) {
      const z = Math.sign(b.z) * (PITCH.halfW - 0.4);
      const x = clamp(b.x, -PITCH.halfL + 1, PITCH.halfL - 1);
      this.emit({ type: "out", team: restartTeam, data: { kind: "throwin" } });
      this.giveBall(this.nearestTo(restartTeam, x, z), x, z);
    }
  }
}

export function createInput(): Input {
  return { moveX: 0, moveZ: 0, sprint: false, pass: false, shoot: false, tackle: false, switch: false };
}
