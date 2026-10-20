import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Match } from "../engine";
import type { Team } from "../types";
import { bindKeyboard, input } from "../input";
import { Stadium } from "./Stadium";
import { PlayerMesh } from "./PlayerMesh";
import { BallMesh } from "./BallMesh";
import { Hud } from "./Hud";

function Sim({ match }: { match: Match }) {
  useFrame((_, d) => match.tick(d, input));
  return null;
}

function CameraRig({ match }: { match: Match }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  useFrame((_, d) => {
    const b = match.ball;
    const k = 1 - Math.exp(-3 * d);
    const tx = THREE.MathUtils.clamp(b.x, -38, 38), tz = b.z * 0.35;
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (27 - camera.position.y) * k;
    camera.position.z += (tz + 36 - camera.position.z) * k;
    look.current.x += (tx - look.current.x) * k;
    look.current.z += (tz - look.current.z) * k;
    camera.lookAt(look.current);
  });
  return null;
}

export function GameView({ home, away, minutes, onExit }: { home: Team; away: Team; minutes: 3 | 6; onExit: () => void }) {
  const match = useMemo(() => new Match({ home, away, minutes }), [home, away, minutes]);
  useEffect(() => bindKeyboard(), []);
  return (
    <div className="fixed inset-0 bg-background">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 27, 36], fov: 42 }}>
        <color attach="background" args={["#0f1a24"]} />
        <fog attach="fog" args={["#0f1a24", 90, 170]} />
        <hemisphereLight args={["#cfe3ff", "#2f4a2a", 0.7]} />
        <directionalLight
          position={[25, 50, 30]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={45}
          shadow-camera-bottom={-45}
          shadow-bias={-0.0005}
        />
        <Environment>
          <Lightformer intensity={2} position={[0, 10, 0]} scale={[20, 20, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={1} color="#ffe9c0" position={[-10, 3, 5]} rotation-y={Math.PI / 2} scale={[30, 2, 1]} />
        </Environment>
        <Sim match={match} />
        <CameraRig match={match} />
        <Stadium />
        {match.players.map((p) => (
          <PlayerMesh key={p.id} match={match} id={p.id} />
        ))}
        <BallMesh match={match} />
      </Canvas>
      <Hud match={match} onExit={onExit} />
    </div>
  );
}
