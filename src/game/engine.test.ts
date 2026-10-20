import { describe, it, expect } from "vitest";
import { Match, createInput } from "./engine";
import { TEAMS } from "./teams";

describe("match rules", () => {
  it("3-minute match lasts 180 seconds", () => {
    expect(new Match({ home: TEAMS[0]!, away: TEAMS[1]!, minutes: 3 }).timeLeft).toBe(180);
  });
  it("6-minute match lasts 360 seconds", () => {
    expect(new Match({ home: TEAMS[0]!, away: TEAMS[1]!, minutes: 6 }).timeLeft).toBe(360);
  });
  it("has 11 players per team", () => {
    const m = new Match({ home: TEAMS[0]!, away: TEAMS[1]!, minutes: 3 });
    expect(m.teamPlayers(0).length).toBe(11);
    expect(m.teamPlayers(1).length).toBe(11);
  });
  it("match ends when time runs out", () => {
    const m = new Match({ home: TEAMS[0]!, away: TEAMS[1]!, minutes: 3 });
    const inp = createInput();
    // clock pauses during goal celebrations, so run until it stops
    for (let i = 0; i < 20000 && m.phase !== "ended"; i++) m.tick(0.05, inp);
    expect(m.phase).toBe("ended");
    expect(m.timeLeft).toBe(0);
  });
});
