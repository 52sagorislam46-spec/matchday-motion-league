import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Match } from "../engine";

const SKINS = ["#f1c9a5", "#d9a47a", "#a8724a", "#6e4528", "#e8b98f"];
const HAIR = ["#1a1208", "#3b2412", "#0d0d0d", "#6b4a22", "#d9b25a"];

export function PlayerMesh({ match, id }: { match: Match; id: number }) {
  const p0 = match.players[id]!;
  const team = match.teams[p0.team];
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const phase = useRef(Math.random() * 6);

  const mats = useMemo(() => {
    const shirt = p0.role === "GK" ? team.gk : team.shirt;
    return {
      shirt: new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7 }),
      shorts: new THREE.MeshStandardMaterial({ color: team.shorts, roughness: 0.8 }),
      skin: new THREE.MeshStandardMaterial({ color: SKINS[id % SKINS.length]!, roughness: 0.6 }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR[(id * 7) % HAIR.length]!, roughness: 0.9 }),
      sock: new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 }),
      boot: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.4 }),
    };
  }, [id, p0.role, team]);

  useFrame((_, d) => {
    const p = match.players[id]!;
    const r = root.current!;
    r.visible = p.active;
    r.position.set(p.x, 0, p.z);
    r.rotation.y = p.facing;
    const sp = Math.hypot(p.vx, p.vz);
    phase.current += d * (2 + sp * 1.5);
    const amp = Math.min(sp / 6, 1);
    const sw = Math.sin(phase.current) * amp * 0.9;
    let lL = sw, lR = -sw, aL = -sw * 0.8, aR = sw * 0.8, lean = amp * 0.15, by = Math.abs(Math.cos(phase.current)) * amp * 0.06;
    if ((p.anim === "shoot" || p.anim === "pass") && p.animT > 0) {
      const total = p.anim === "shoot" ? 0.45 : 0.35;
      const k = 1 - p.animT / total;
      const reach = p.anim === "shoot" ? 2.3 : 1.5;
      lR = k < 0.35 ? (k / 0.35) * 0.9 : 0.9 - ((k - 0.35) / 0.65) * reach;
      lL = 0.1; aL = -0.6; aR = 0.7; lean = p.anim === "shoot" ? -0.15 : 0;
    } else if (p.anim === "tackle" && p.animT > 0) {
      lean = -0.9; by = -0.45; lR = -1.3; lL = -0.5; aL = -1.2; aR = 0.4;
    } else if (p.stun > 0) {
      lean = 0.5; aL = -1; aR = -1;
    }
    body.current!.rotation.x = lean;
    body.current!.position.y = by;
    legL.current!.rotation.x = lL;
    legR.current!.rotation.x = lR;
    armL.current!.rotation.x = aL;
    armR.current!.rotation.x = aR;
    const ctl = match.controlled === id && p.team === match.userTeam && match.phase !== "ended";
    ring.current!.visible = ctl;
    if (ctl) ring.current!.rotation.z += d * 2;
  });

  const Leg = ({ x, refObj }: { x: number; refObj: React.RefObject<THREE.Group | null> }) => (
    <group ref={refObj} position={[x, 0.95, 0]}>
      <mesh position={[0, -0.2, 0]} material={mats.shorts} castShadow>
        <boxGeometry args={[0.2, 0.4, 0.22]} />
      </mesh>
      <mesh position={[0, -0.47, 0]} material={mats.skin} castShadow>
        <boxGeometry args={[0.13, 0.18, 0.14]} />
      </mesh>
      <mesh position={[0, -0.72, 0]} material={mats.sock} castShadow>
        <boxGeometry args={[0.14, 0.34, 0.15]} />
      </mesh>
      <mesh position={[0, -0.9, 0.05]} material={mats.boot} castShadow>
        <boxGeometry args={[0.14, 0.1, 0.28]} />
      </mesh>
    </group>
  );
  const Arm = ({ x, refObj }: { x: number; refObj: React.RefObject<THREE.Group | null> }) => (
    <group ref={refObj} position={[x, 1.5, 0]}>
      <mesh position={[0, -0.13, 0]} material={mats.shirt} castShadow>
        <boxGeometry args={[0.14, 0.26, 0.15]} />
      </mesh>
      <mesh position={[0, -0.42, 0]} material={mats.skin} castShadow>
        <boxGeometry args={[0.11, 0.34, 0.12]} />
      </mesh>
    </group>
  );

  return (
    <group ref={root} scale={1.25}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.55, 0.72, 32, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color="#ffe14a" />
      </mesh>
      <group ref={body}>
        <Leg x={-0.12} refObj={legL} />
        <Leg x={0.12} refObj={legR} />
        <mesh position={[0, 1.24, 0]} material={mats.shirt} castShadow>
          <boxGeometry args={[0.48, 0.6, 0.27]} />
        </mesh>
        <Arm x={-0.31} refObj={armL} />
        <Arm x={0.31} refObj={armR} />
        <mesh position={[0, 1.6, 0]} material={mats.skin}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 8]} />
        </mesh>
        <mesh position={[0, 1.76, 0]} material={mats.skin} castShadow>
          <sphereGeometry args={[0.14, 14, 12]} />
        </mesh>
        <mesh position={[0, 1.81, -0.02]} material={mats.hair}>
          <sphereGeometry args={[0.145, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  );
}
