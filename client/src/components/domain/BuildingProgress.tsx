// Pieza "wow" para la demo: un edificio 3D (Three.js via React Three Fiber) que gana un piso
// solido por cada hito aprobado por el DAO. Piso 0 abajo, ultimo hito arriba, como un edificio
// real construyendose de abajo hacia arriba. El volumen (cara iluminada / cara en sombra) sale
// de la luz real sobre la geometria, no de colores duotono elegidos a mano.
//
// Cuando un piso pasa de fantasma (wireframe, sin construir) a construido entre un render y el
// siguiente, no lo hacemos aparecer en su lugar: nace arriba (fuera de cuadro, "sin que se
// vea") y CAE hasta su posicion, y al impactar la escena tiembla y suelta una nube de polvo.
// Sin techo: la caida entra desde arriba del edificio, asi que no puede haber nada fijo tapando
// ese espacio. Igual que Reveal.tsx, usamos GSAP directo (no react-spring): tweenea las
// propiedades de los objetos three.js (position, scale, emissiveIntensity) directamente, mas un
// puñado de mesh efimeros (humo) manejados a mano fuera de React. Respeta prefers-reduced-motion
// (ahi el piso aparece directo en su lugar, sin caida/temblor/humo).
import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MilestoneResponse } from "@shared/schemas/project.schema";

const FLOOR_HEIGHT = 1;
const FLOOR_WIDTH = 2.4;
const FLOOR_DEPTH = 1.6;
const CORNICE_HEIGHT = 0.05;
// Junta de dilatacion entre pisos: sin este hueco, cajas apiladas exactamente pegadas hacen que
// las aristas verticales de pisos consecutivos se fundan en una sola linea continua (se pierde
// la lectura de "un piso = una caja"), sobre todo en los pisos fantasma (wireframe).
const FLOOR_GAP = 0.1;
const BODY_HEIGHT = FLOOR_HEIGHT - CORNICE_HEIGHT - FLOOR_GAP;
// Cuanto mas arriba del edificio nace un piso recien aprobado antes de caer -- suficiente para
// quedar afuera del cuadro de camara mientras "espera" caer.
const FALL_DISTANCE = 7;
const FALL_DURATION = 0.5;
// Geometria compartida por todos los pisos fantasma (misma caja, solo dibujamos sus aristas via
// EdgesGeometry). Una sola instancia a nivel de modulo: no cambia entre renders.
const GHOST_EDGES = new THREE.EdgesGeometry(new THREE.BoxGeometry(FLOOR_WIDTH, BODY_HEIGHT, FLOOR_DEPTH));
// Rejilla de ventanas sobre la cara frontal de cada piso construido (x, y relativos al centro).
const WINDOW_GRID: [number, number][] = [
  [-0.72, 0.22],
  [0, 0.22],
  [0.72, 0.22],
  [-0.72, -0.24],
  [0.72, -0.24],
];

// Los tokens --fen-* son la unica fuente de color del design system (client/src/index.css);
// los leemos del DOM en vez de hardcodear hex nuevos para que la escena 3D sea siempre coherente
// con el resto de la UI si la paleta cambia.
function cssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

interface Palette {
  built: string;
  accent: string;
  ghost: string;
  ground: string;
  frame: string;
}

// Temblor breve del contenido de la escena (no de la camara: OrbitControls reescribe la posicion
// de la camara cada frame, asi que sacudirla a mano no serviria de nada). Un puñado de sacudidas
// XZ con amplitud decreciente, terminando siempre en (0, y, 0).
function shakeScene(group: THREE.Group | null) {
  if (!group) return;
  const baseY = group.position.y;
  const tl = gsap.timeline();
  const kicks = 6;
  for (let i = 0; i < kicks; i++) {
    const decay = 1 - i / kicks;
    tl.to(group.position, {
      x: (Math.random() - 0.5) * 0.14 * decay,
      z: (Math.random() - 0.5) * 0.14 * decay,
      duration: 0.045,
      ease: "sine.inOut",
    });
  }
  tl.to(group.position, { x: 0, y: baseY, z: 0, duration: 0.06 });
}

// Nube de polvo al impacto: unas pocas esferas grises efimeras que crecen, suben y se desvanecen.
// Se manejan directo sobre la escena three.js (no como estado de React) porque son puramente
// decorativas y se auto-destruyen solas; agregarlas al arbol declarativo solo para sacarlas medio
// segundo despues seria mas complicado que util.
function spawnSmoke(scene: THREE.Scene | null, atY: number, color: string) {
  if (!scene) return;
  const group = new THREE.Group();
  group.position.set(0, atY, FLOOR_DEPTH / 2 + 0.15);
  scene.add(group);

  const puffCount = 7;
  let remaining = puffCount;
  for (let i = 0; i < puffCount; i++) {
    const geometry = new THREE.SphereGeometry(0.22, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const puff = new THREE.Mesh(geometry, material);
    puff.position.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.5);
    puff.scale.setScalar(0.35 + Math.random() * 0.25);
    group.add(puff);

    gsap.to(puff.position, {
      x: puff.position.x + (Math.random() - 0.5) * 0.9,
      y: puff.position.y + 0.8 + Math.random() * 0.7,
      duration: 1 + Math.random() * 0.4,
      ease: "power1.out",
    });
    gsap.to(puff.scale, { x: "+=1.3", y: "+=1.3", z: "+=1.3", duration: 1.2, ease: "power1.out" });
    gsap.to(material, {
      opacity: 0,
      duration: 1.2,
      ease: "power1.out",
      onComplete: () => {
        geometry.dispose();
        material.dispose();
        remaining -= 1;
        if (remaining <= 0) scene.remove(group);
      },
    });
  }
}

// Moldura horizontal entre pisos: da ritmo de fachada real. Solo la pintamos en pisos
// construidos -- en un piso fantasma seria una placa solida dominando sobre el contorno
// wireframe (que es lo que de verdad tiene que leerse ahi: "todavia no construido").
function Cornice({ y, palette }: { y: number; palette: Palette }) {
  return (
    <mesh position={[0, y, 0]} receiveShadow>
      <boxGeometry args={[FLOOR_WIDTH + 0.1, CORNICE_HEIGHT, FLOOR_DEPTH + 0.1]} />
      <meshStandardMaterial color={palette.frame} roughness={0.9} />
    </mesh>
  );
}

function Window({ x, y, palette }: { x: number; y: number; palette: Palette }) {
  return (
    <group position={[x, y, FLOOR_DEPTH / 2]}>
      {/* Marco: caja oscura, ligeramente mas grande, apoyada contra la fachada. */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.38, 0.3, 0.03]} />
        <meshStandardMaterial color={palette.frame} roughness={0.8} />
      </mesh>
      {/* Vidrio: sobresale un poco del marco, con un leve brillo (glass-like). */}
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[0.3, 0.22]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          emissiveIntensity={0.22}
          roughness={0.2}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}

function GroundDoor({ palette }: { palette: Palette }) {
  return (
    <group position={[0, 0, FLOOR_DEPTH / 2]}>
      <mesh position={[0, 0.29, 0]}>
        <boxGeometry args={[0.52, 0.6, 0.04]} />
        <meshStandardMaterial color={palette.frame} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.29, 0.025]}>
        <planeGeometry args={[0.42, 0.5]} />
        <meshStandardMaterial color={palette.built} roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

function Floor({
  index,
  built,
  palette,
  onGroupRef,
  onMaterialRef,
}: {
  index: number;
  built: boolean;
  palette: Palette;
  onGroupRef: (index: number, el: THREE.Group | null) => void;
  onMaterialRef: (index: number, el: THREE.MeshStandardMaterial | null) => void;
}) {
  const y = index * FLOOR_HEIGHT;

  if (!built) {
    // Piso todavia no aprobado: solo el contorno (wireframe), sin relleno -- el equivalente 3D
    // del borde punteado de la version plana. La moldura de arriba ya marca el limite del piso.
    return (
      <group position={[0, y, 0]}>
        <lineSegments position={[0, BODY_HEIGHT / 2, 0]} geometry={GHOST_EDGES}>
          <lineBasicMaterial color={palette.ghost} transparent opacity={0.6} />
        </lineSegments>
      </group>
    );
  }

  return (
    <group ref={(el) => onGroupRef(index, el)} position={[0, y, 0]}>
      <RoundedBox
        args={[FLOOR_WIDTH, BODY_HEIGHT, FLOOR_DEPTH]}
        radius={0.02}
        smoothness={2}
        position={[0, BODY_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          ref={(el) => onMaterialRef(index, el)}
          color={palette.built}
          emissive={palette.accent}
          emissiveIntensity={0}
          roughness={0.7}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Ventanas con marco; en planta baja (piso 0) una de las posiciones centrales se */}
      {/* reemplaza por la puerta de entrada. */}
      {WINDOW_GRID.map(([x, yy], i) => (
        <Window key={i} x={x} y={BODY_HEIGHT / 2 + yy} palette={palette} />
      ))}
      {index === 0 && <GroundDoor palette={palette} />}

      {/* Moldura + fina linea verde de logro: marca "este piso esta construido". */}
      <Cornice y={BODY_HEIGHT + CORNICE_HEIGHT / 2} palette={palette} />
      <mesh position={[0, BODY_HEIGHT + CORNICE_HEIGHT + 0.005, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.1, 0.015, FLOOR_DEPTH + 0.1]} />
        <meshStandardMaterial color={palette.accent} />
      </mesh>
    </group>
  );
}

export function BuildingProgress({
  milestones,
  className,
}: {
  milestones: MilestoneResponse[];
  className?: string;
}) {
  const groupRefs = useRef<Map<number, THREE.Group>>(new Map());
  const materialRefs = useRef<Map<number, THREE.MeshStandardMaterial>>(new Map());
  // Contenido de la escena (todos los pisos + base): lo que tiembla al impacto.
  const contentGroupRef = useRef<THREE.Group>(null);
  // Escena three.js real, capturada via Canvas.onCreated -- la necesitamos para agregar/sacar
  // los meshes efimeros del humo por fuera del arbol declarativo de React.
  const sceneRef = useRef<THREE.Scene | null>(null);
  // Set de indices aprobados en el render anterior. `null` = todavia no corrio ningun efecto
  // (mount inicial): ahi solo registramos el estado de partida, sin animar nada.
  const prevApprovedRef = useRef<Set<number> | null>(null);

  const approvedCount = milestones.filter((m) => m.status === "Approved").length;
  const sortedBottomUp = [...milestones].sort((a, b) => a.milestoneIndex - b.milestoneIndex);
  const totalHeight = milestones.length * FLOOR_HEIGHT;

  const palette = useMemo<Palette>(
    () => ({
      built: cssColor("--fen-surface-2", "#e9ece9"),
      accent: cssColor("--fen-accent", "#0f7a52"),
      ghost: cssColor("--fen-border-strong", "#cdd2ce"),
      ground: cssColor("--fen-ink", "#1b2430"),
      frame: cssColor("--fen-ink-2", "#38414c"),
    }),
    [],
  );

  useLayoutEffect(() => {
    const currentApproved = new Set(
      milestones.filter((m) => m.status === "Approved").map((m) => m.milestoneIndex),
    );
    const prevApproved = prevApprovedRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prevApproved && !reduceMotion) {
      // Solo los pisos que ACABAN de pasar a Approved respecto del render anterior -- no
      // reanimamos pisos que ya estaban construidos.
      const newlyApproved = [...currentApproved].filter((index) => !prevApproved.has(index));
      const ctx = gsap.context(() => {
        for (const index of newlyApproved) {
          const group = groupRefs.current.get(index);
          const material = materialRefs.current.get(index);
          if (!group) continue;
          const targetY = index * FLOOR_HEIGHT;
          // Nace arriba, fuera de cuadro (sin que se vea), y cae hasta su lugar acelerando
          // como si fuera peso real -- por eso "power2.in" (arranca lento, llega rapido).
          group.position.y = targetY + FALL_DISTANCE;
          gsap.to(group.position, {
            y: targetY,
            duration: FALL_DURATION,
            ease: "power2.in",
            onComplete: () => {
              // Impacto: la escena tiembla, sale una nube de polvo, y un breve aplastamiento
              // + flash verde marcan "listo, este piso quedo construido".
              shakeScene(contentGroupRef.current);
              spawnSmoke(sceneRef.current, targetY, palette.ghost);
              gsap.fromTo(group.scale, { y: 0.82 }, { y: 1, duration: 0.3, ease: "back.out(3)" });
              if (material) {
                gsap.fromTo(
                  material,
                  { emissiveIntensity: 1.4 },
                  { emissiveIntensity: 0, duration: 1.2, ease: "power2.out" },
                );
              }
            },
          });
        }
      });
      // Registramos el nuevo estado ya en este render: si no, el proximo cambio de milestones
      // volveria a comparar contra el Set viejo y re-animaria pisos que ya se aprobaron aca.
      prevApprovedRef.current = currentApproved;
      return () => ctx.revert();
    }

    prevApprovedRef.current = currentApproved;
  }, [milestones, palette]);

  if (milestones.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Progreso de la obra</CardTitle>
        <p className="text-sm text-muted-foreground">
          {approvedCount} de {milestones.length} hitos aprobados
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full sm:h-96">
          <Canvas
            shadows="soft"
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            camera={{ position: [4.8, totalHeight * 0.7 + 1.4, 6.4], fov: 34 }}
            onCreated={(state) => {
              sceneRef.current = state.scene;
            }}
          >
            <hemisphereLight args={["#ffffff", "#c7cdd2", 0.55]} />
            <ambientLight intensity={0.25} />
            <directionalLight
              position={[5, 8, 4]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0004}
            />
            <directionalLight position={[-6, 3, -4]} intensity={0.3} />

            {/* Sin techo a proposito: los pisos nuevos caen desde arriba del edificio, y un */}
            {/* remate fijo ahi arriba taparia la caida. */}
            <group ref={contentGroupRef} position={[0, 0, 0]}>
              {sortedBottomUp.map((milestone) => (
                <Floor
                  key={milestone.milestoneIndex}
                  index={milestone.milestoneIndex}
                  built={milestone.status === "Approved"}
                  palette={palette}
                  onGroupRef={(i, el) => {
                    if (el) groupRefs.current.set(i, el);
                    else groupRefs.current.delete(i);
                  }}
                  onMaterialRef={(i, el) => {
                    if (el) materialRefs.current.set(i, el);
                    else materialRefs.current.delete(i);
                  }}
                />
              ))}

              {/* Plaza: disco bajo el edificio, da sensacion de sitio/terreno. */}
              <mesh position={[0, -0.05, 0]} receiveShadow>
                <cylinderGeometry args={[2.2, 2.2, 0.1, 48]} />
                <meshStandardMaterial color={palette.ground} opacity={0.07} transparent roughness={1} />
              </mesh>
              {/* Base: losa de fundacion bajo el piso 0. */}
              <mesh position={[0, -0.03, 0]} receiveShadow>
                <boxGeometry args={[FLOOR_WIDTH + 0.3, 0.06, FLOOR_DEPTH + 0.3]} />
                <meshStandardMaterial color={palette.ground} opacity={0.18} transparent roughness={0.9} />
              </mesh>
            </group>

            <ContactShadows position={[0, -0.08, 0]} opacity={0.35} blur={2} far={8} scale={6.5} />
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              minDistance={5}
              maxDistance={13}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.1}
              target={[0, totalHeight / 2, 0]}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  );
}
