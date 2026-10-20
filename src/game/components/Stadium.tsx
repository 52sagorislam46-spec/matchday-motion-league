import { useMemo } from "react";
import * as THREE from "three";
import { PITCH } from "../engine";

function pitchTexture() {
  const W = 2048, H = 1340;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const X = (x: number) => ((x + 55) / 110) * W;
  const Z = (z: number) => ((z + 36) / 72) * H;
  for (let i = 0; i < 22; i++) {
    g.fillStyle = i % 2 ? "#3f8a3a" : "#479a40";
    g.fillRect((i * W) / 22, 0, W / 22 + 1, H);
  }
  // grain
  for (let i = 0; i < 40000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "20,50,20" : "120,170,90"},0.08)`;
    g.fillRect(Math.random() * W, Math.random() * H, 3, 3);
  }
  g.strokeStyle = "rgba(245,245,235,0.92)";
  g.lineWidth = 5;
  const L = PITCH.halfL, Wd = PITCH.halfW;
  g.strokeRect(X(-L), Z(-Wd), X(L) - X(-L), Z(Wd) - Z(-Wd));
  g.beginPath(); g.moveTo(X(0), Z(-Wd)); g.lineTo(X(0), Z(Wd)); g.stroke();
  const sx = W / 110;
  g.beginPath(); g.arc(X(0), Z(0), 9.15 * sx, 0, Math.PI * 2); g.stroke();
  for (const s of [-1, 1]) {
    const box = (d: number, w: number) => {
      const x0 = X(s * L), x1 = X(s * (L - d));
      g.strokeRect(Math.min(x0, x1), Z(-w), Math.abs(x1 - x0), Z(w) - Z(-w));
    };
    box(16.5, 20.15); box(5.5, 9.16);
    g.fillStyle = "rgba(245,245,235,0.92)";
    g.beginPath(); g.arc(X(s * (L - 11)), Z(0), 6, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.arc(X(s * (L - 11)), Z(0), 9.15 * sx, s > 0 ? Math.PI - 0.93 : -0.93, s > 0 ? Math.PI + 0.93 : 0.93);
    g.stroke();
  }
  g.beginPath(); g.arc(X(0), Z(0), 6, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function crowdTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2a2f3a"; g.fillRect(0, 0, 1024, 128);
  const cols = ["#d94a3a", "#f2d24a", "#e8e8e8", "#3a6ad9", "#2fa35a", "#1a1a1a", "#e8823a"];
  for (let y = 4; y < 128; y += 8) for (let x = 2; x < 1024; x += 6) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0]!;
    g.fillRect(x + Math.random() * 2, y + Math.random() * 2, 4, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}

function Goal({ side }: { side: 1 | -1 }) {
  const x = side * PITCH.halfL, w = PITCH.goalHalfW, h = PITCH.goalH, depth = 2;
  const post = new THREE.MeshStandardMaterial({ color: "#f5f5f0", roughness: 0.3 });
  return (
    <group>
      {[-w, w].map((z) => (
        <mesh key={z} position={[x, h / 2, z]} material={post} castShadow>
          <cylinderGeometry args={[0.07, 0.07, h, 10]} />
        </mesh>
      ))}
      <mesh position={[x, h, 0]} rotation-x={Math.PI / 2} material={post} castShadow>
        <cylinderGeometry args={[0.07, 0.07, w * 2, 10]} />
      </mesh>
      <mesh position={[x + side * depth / 2, h / 2, 0]}>
        <boxGeometry args={[depth, h, w * 2, 4, 6, 18]} />
        <meshBasicMaterial color="#e8e8e8" wireframe transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

export function Stadium() {
  const pitch = useMemo(pitchTexture, []);
  const crowd = useMemo(crowdTexture, []);
  const stands: [number, number, number, number][] = [
    [0, -44, 130, 0], [0, 44, 130, Math.PI], [-63, 0, 96, Math.PI / 2], [63, 0, 96, -Math.PI / 2],
  ];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[150, 110]} />
        <meshStandardMaterial color="#2f6b2c" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[110, 72]} />
        <meshStandardMaterial map={pitch} roughness={0.95} />
      </mesh>
      <Goal side={1} />
      <Goal side={-1} />
      {stands.map(([x, z, len, r], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={r}>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[0, 1 + k * 2.2, -k * 3]} receiveShadow>
              <boxGeometry args={[len, 2.2, 3]} />
              <meshStandardMaterial map={crowd} roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.5, 2]}>
            <boxGeometry args={[len, 1, 0.3]} />
            <meshStandardMaterial color="#c8102e" emissive="#5a0812" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
