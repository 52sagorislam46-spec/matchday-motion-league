import type { Team } from "./types";

export const TEAMS: Team[] = [
  { id: "ban", name: "বাংলাদেশ", short: "BAN", shirt: "#0a7d43", shorts: "#c8102e", gk: "#f2c400", speed: 1.0, skill: 0.6 },
  { id: "bra", name: "ব্রাজিল", short: "BRA", shirt: "#f7d417", shorts: "#1a46a8", gk: "#2e2e2e", speed: 1.06, skill: 0.85 },
  { id: "arg", name: "আর্জেন্টিনা", short: "ARG", shirt: "#8cc8f0", shorts: "#1b1b2a", gk: "#e8582a", speed: 1.05, skill: 0.88 },
  { id: "ger", name: "জার্মানি", short: "GER", shirt: "#f4f4f0", shorts: "#151515", gk: "#3a9a3a", speed: 1.02, skill: 0.82 },
  { id: "fra", name: "ফ্রান্স", short: "FRA", shirt: "#1d2d6b", shorts: "#f4f4f0", gk: "#d9d93a", speed: 1.06, skill: 0.84 },
  { id: "esp", name: "স্পেন", short: "ESP", shirt: "#c41b25", shorts: "#14234f", gk: "#7f3fbf", speed: 1.0, skill: 0.83 },
];

export const teamById = (id: string) => TEAMS.find((t) => t.id === id) ?? TEAMS[0]!;
