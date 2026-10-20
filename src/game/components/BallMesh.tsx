import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BALL_R, type Match } from "../engine";

export function BallMesh({ match }: { match: Match }) {
  const ref = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f8f8f4"; g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#1a1a1a";
    for (let i = 0; i < 12; i++) {
      const x = (i % 6) * 43 + (i > 5 ? 21 : 0), y = i > 5 ? 90 : 38;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
      }
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const axis = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, d) => {
    const b = match.ball;
    const m = ref.current!;
    m.position.set(b.x, b.y, b.z);
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 0.05) {
      axis.set(b.vz, 0, -b.vx).normalize();
      m.rotateOnWorldAxis(axis, (sp * d) / BALL_R);
    }
    shadow.current!.position.set(b.x, 0.02, b.z);
    const s = 1 / (1 + b.y * 0.3);
    shadow.current!.scale.setScalar(s);
  });

  return (
    <>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[BALL_R, 24, 16]} />
        <meshStandardMaterial map={tex} roughness={0.4} />
      </mesh>
      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[BALL_R * 1.1, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>
    </>
  );
}
