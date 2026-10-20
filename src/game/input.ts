import { createInput } from "./engine";

/** Shared input state written by keyboard and touch controls, read by the engine. */
export const input = createInput();
export const touchMove = { x: 0, z: 0 };

const keys = new Set<string>();

function recompute() {
  let x = touchMove.x, z = touchMove.z;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) z += 1;
  input.moveX = x; input.moveZ = z;
  input.sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || touchSprint.on;
}
export const touchSprint = { on: false };
export const refreshInput = recompute;

export function bindKeyboard() {
  const down = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === "KeyJ" || e.code === "KeyX") input.pass = true;
    if (e.code === "KeyK" || e.code === "Space") input.shoot = true;
    if (e.code === "KeyL" || e.code === "KeyC") input.tackle = true;
    if (e.code === "KeyQ") input.switch = true;
    recompute();
  };
  const up = (e: KeyboardEvent) => { keys.delete(e.code); recompute(); };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    keys.clear();
  };
}
