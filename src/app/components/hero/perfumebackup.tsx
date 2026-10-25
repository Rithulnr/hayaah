"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import {
    Box3,
    Color,
    EdgesGeometry,
    Group,
    LineBasicMaterial,
    LineSegments,
    Material,
    Mesh,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    Vector3,
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HayaahSmokeOverlay from "./HayaahSmokeOverlay";

gsap.registerPlugin(ScrollTrigger);

const MODEL_PATH = "/assets/models/glass.glb";

/* ---------- Palette ---------- */

const ANTIQUE_GOLD = "#C5A46D";
const CHAMPAGNE_GOLD = "#E1C58F";

/* ---------- Material tuning ---------- */

// Important: keep the GLB's own physical glass material and its light base
// colour. We only add the missing smoky attenuation that Blender's Volume
// Absorption did not export to glTF.
function makeNativeBodyGlass(original: Material): Material {
    const material = original.clone();
    if (!(material instanceof MeshPhysicalMaterial)) return material;

    material.color.set("#B8B8B8");
    material.metalness = 0;
    material.roughness = 0.02;
    material.transmission = 1.0;
    material.ior = 1.52;
    material.thickness = 0.75;
    material.attenuationColor = new Color("#303030");
    material.attenuationDistance = 1.15;
    material.clearcoat = 0.22;
    material.clearcoatRoughness = 0.2;
    material.envMapIntensity = 0.42;
    material.opacity = 1;
    material.transparent = false;
    material.needsUpdate = true;
    return material;
}

// Keep the GLB liquid material; do not replace it with a black generated map.
// Slightly darker attenuation gives the centre a smoky fill. It stays in the
// transparent render list so it can blend naturally with the body/environment.
function makeNativeLiquid(original: Material): Material {
    const material = original.clone();
    if (!(material instanceof MeshPhysicalMaterial)) return material;

    material.color.set("#DEDEDE");
    material.metalness = 0;
    material.roughness = 0.025;
    material.transmission = 0.82;
    material.ior = 1.33;
    material.thickness = 0.45;
    material.attenuationColor = new Color("#262626");
    material.attenuationDistance = 0.72;
    material.clearcoat = 0.12;
    material.clearcoatRoughness = 0.2;
    material.envMapIntensity = 0.08;
    material.opacity = 1;
    material.transparent = true;
    material.depthWrite = false;
    material.needsUpdate = true;
    return material;
}

const makeBlackCap = () =>
    new MeshPhysicalMaterial({
        color: "#050505",
        metalness: 0.04,
        roughness: 0.12,
        transmission: 0,
        opacity: 1,
        transparent: false,
        ior: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.6,
    });

const makeAntiqueGold = () =>
    new MeshStandardMaterial({
        color: ANTIQUE_GOLD,
        metalness: 1,
        roughness: 0.18,
        envMapIntensity: 1.8,
    });

const makeChampagneGold = () =>
    new MeshStandardMaterial({
        color: CHAMPAGNE_GOLD,
        metalness: 1,
        roughness: 0.16,
        envMapIntensity: 1.5,
    });

const makeLogo = () =>
    new MeshStandardMaterial({
        color: ANTIQUE_GOLD,
        metalness: 0.85,
        roughness: 0.24,
        emissive: new Color("#281B0A"),
        emissiveIntensity: 0.12,
        envMapIntensity: 0.55,
    });

function pickMaterial(meshName: string, original: Material): Material | null {
    const name = meshName.toLowerCase();
    const materialName = original.name.toLowerCase();

    // The uploaded GLB uses HAYAAH_Cap as its node name; support older exports too.
    if (name.includes("cap")) return makeBlackCap();
    if (name.includes("logo") || name === "text") return makeLogo();
    if (name.includes("goldedges")) return makeChampagneGold();
    if (name.includes("collar") || materialName.includes("gold")) {
        return makeAntiqueGold();
    }
    if (name === "hayaah_body") return makeNativeBodyGlass(original);
    if (name === "hayaah_liquid") return makeNativeLiquid(original);

    // Keep the rest of the GLB materials as exported.
    return null;
}

/* ---------- Bottle ---------- */

function HayaahBottle() {
    const { scene } = useGLTF(MODEL_PATH);
    const bottleRef = useRef<Group>(null);

    const model = useMemo(() => {
        const clonedScene = scene.clone(true);
        const capMeshes: Mesh[] = [];

        clonedScene.traverse((object) => {
            // Some Blender exports wrap all bottle parts in a parent named
            // HAYAAH_Bottle and bake a ~28-degree Y rotation into that parent.
            // That baked rotation survives even when the animated outer group is zero.
            // The logo is modeled on local +Z, so face the bottle straight toward the +Z camera.
            if (object.name.toLowerCase() === "hayaah_bottle") {
                object.rotation.set(0, 0, 0);
                object.quaternion.identity();
                object.updateMatrix();
            }

            if (!(object instanceof Mesh)) return;

            const meshName = object.name.toLowerCase();

            if (meshName.includes("cap")) capMeshes.push(object);

            const originals = Array.isArray(object.material)
                ? object.material
                : [object.material];

            const replaced = originals.map((orig: Material) => {
                const picked = pickMaterial(meshName, orig);
                return picked ?? orig.clone();
            });

            object.material = Array.isArray(object.material)
                ? replaced
                : replaced[0];
        });

        // Thin gold lines follow the cap's hard bevels, as in the Blender render.
        // Keep the cap face itself black; don't recolour the entire cap gold.
        capMeshes.forEach((cap) => {
            const edgeGeometry = new EdgesGeometry(cap.geometry, 28);
            const edgeMaterial = new LineBasicMaterial({
                color: ANTIQUE_GOLD,
                transparent: true,
                opacity: 0.88,
                depthTest: true,
                depthWrite: false,
                toneMapped: false,
            });
            const edgeLines = new LineSegments(edgeGeometry, edgeMaterial);
            edgeLines.name = "HAYAAH_Cap_Gold_Edges";
            edgeLines.scale.setScalar(1.0015);
            edgeLines.renderOrder = 5;
            cap.add(edgeLines);
        });

        clonedScene.updateMatrixWorld(true);

        const bounds = new Box3().setFromObject(clonedScene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());

        const scale = 3 / (size.y || 1);

        return {
            scene: clonedScene,
            scale,
            center: center.multiplyScalar(-scale),
        };
    }, [scene]);

    useEffect(() => {
        const group = bottleRef.current;
        const track = document.querySelector("#hayaah-track");

        if (!group || !track) return;

        const mobile = window.matchMedia("(max-width: 768px)").matches;

        const context = gsap.context(() => {
            gsap.set(group.position, { x: mobile ? 0 : 0.85, y: -0.12, z: 0 });
            const positionTimeline = gsap.timeline({
                scrollTrigger: {
                    trigger: track,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.6,
                    invalidateOnRefresh: true,
                },
            });
            // Move gently down and inward during the reveal, then settle back to
            // the established end position so the section transition feels intentional.
            positionTimeline
                .to(group.position, {
                    x: mobile ? -0.08 : 0.48,
                    y: -0.28,
                    z: 0,
                    duration: 0.48,
                    ease: "none",
                })
                .to(group.position, {
                    x: mobile ? 0 : 0.85,
                    y: -0.12,
                    z: 0,
                    duration: 0.52,
                    ease: "none",
                });

            // Ensure the bottle is perfectly front-facing at load. During the
            // scroll it turns only slightly, then returns to zero rotation at the end.
            gsap.set(group.rotation, { x: 0, y: 0, z: 0 });
            const rotationTimeline = gsap.timeline({
                scrollTrigger: {
                    trigger: track,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.6,
                    invalidateOnRefresh: true,
                },
            });
            // A more noticeable but controlled product reveal:
            // start front-facing, turn slightly during the middle of the scroll,
            // then return exactly to the same front-facing orientation at the end.
            rotationTimeline
                .to(group.rotation, {
                    x: 0.035,
                    y: 0.2,
                    z: -0.018,
                    duration: 0.34,
                    ease: "none",
                })
                .to(group.rotation, {
                    x: -0.018,
                    y: -0.11,
                    z: 0.012,
                    duration: 0.28,
                    ease: "none",
                })
                .to(group.rotation, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 0.38,
                    ease: "none",
                });

            gsap.fromTo(
                group.scale,
                { x: 0.84, y: 0.84, z: 0.84 },
                {
                    x: mobile ? 0.58 : 0.68,
                    y: mobile ? 0.58 : 0.68,
                    z: mobile ? 0.58 : 0.68,
                    ease: "none",
                    scrollTrigger: {
                        trigger: track,
                        start: "top top",
                        end: "55% bottom",
                        scrub: 0.6,
                    },
                }
            );
        }, track);

        return () => context.revert();
    }, []);

    useEffect(() => {
        return () => {
            model.scene.traverse((object) => {
                if (object instanceof LineSegments) {
                    object.geometry.dispose();
                    const lineMaterials = Array.isArray(object.material)
                        ? object.material
                        : [object.material];
                    lineMaterials.forEach((material) => material.dispose());
                    return;
                }

                if (!(object instanceof Mesh)) return;

                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];

                materials.forEach((material) => material.dispose());
            });
        };
    }, [model]);

    return (
        <group ref={bottleRef} position={[0.85, -0.12, 0]} rotation={[0, 0, 0]}>
            <group scale={model.scale} position={model.center.toArray()}>
                <primitive object={model.scene} />
            </group>
        </group>
    );
}

/* ---------- Studio lighting ---------- */

function Scene() {
    return (
        <>
            <ambientLight intensity={0.28} />
            <directionalLight
                position={[1.5, 3.5, 5]}
                intensity={0.65}
                color="#F4EEE4"
            />

            <Suspense fallback={null}>
                <HayaahBottle />

                <Environment resolution={512} background={false}>
                    {/* Broad frontal softbox: gives the clear grey glass something to reflect. */}
                    <Lightformer
                        form="rect"
                        intensity={0.28}
                        color="#D5D3CE"
                        position={[0, 0.5, 5]}
                        scale={[1.5, 2.4, 1]}
                        onUpdate={(light) => light.lookAt(0, 0, 0)}
                    />

                    {/* Narrow side strips create crisp glass-edge reflections. */}
                    <Lightformer
                        form="rect"
                        intensity={3.0}
                        color="#FFFFFF"
                        position={[-3.2, 0.7, 2.5]}
                        scale={[0.3, 7, 1]}
                        onUpdate={(light) => light.lookAt(0, 0, 0)}
                    />
                    <Lightformer
                        form="rect"
                        intensity={3.0}
                        color="#FFFFFF"
                        position={[3.2, 0.7, 2.5]}
                        scale={[0.3, 7, 1]}
                        onUpdate={(light) => light.lookAt(0, 0, 0)}
                    />

                    {/* Horizontal top reflection across the shoulder and cap. */}
                    <Lightformer
                        form="rect"
                        intensity={1.1}
                        color="#DCD7CD"
                        position={[0, 2.5, 3.5]}
                        scale={[4.5, 0.45, 1]}
                        onUpdate={(light) => light.lookAt(0, 0, 0)}
                    />

                    {/* Lower reflection card removed to prevent the grey band at the bottle base. */}

                    {/* Warm rear rim: subtle gold reflections without flooding the front. */}
                    <Lightformer
                        form="rect"
                        intensity={0.25}
                        color="#777777"
                        position={[0, 2, -4.5]}
                        scale={[5, 1.2, 1]}
                        onUpdate={(light) => light.lookAt(0, 0, 0)}
                    />

                    {/* Overhead softbox catches the cap's top bevels. */}
                    <Lightformer
                        form="rect"
                        intensity={1.8}
                        color="#EAE6DE"
                        position={[0, 5.5, 0.5]}
                        scale={[4.5, 2, 1]}
                        onUpdate={(light) => light.lookAt(0, 0, 0)}
                    />
                </Environment>
            </Suspense>
        </>
    );
}

/* ---------- Page ---------- */

export default function PerfumeExperience() {
    return (
        <div id="hayaah-track" className="hayaah-track">
            {/* Live transparent WebGL smoke sits behind the GLB bottle. */}
            <HayaahSmokeOverlay />

            <div className="scene-sticky">
                <Canvas
                    camera={{ position: [0, 1.55, 6.5], fov: 35 }}
                    dpr={[1, 1.5]}
                    gl={{ antialias: true, alpha: true }}
                >
                    <Scene />
                </Canvas>
            </div>

            <section className="hayaah-hero">
                <div className="hero-content-sticky">
                    <div className="hero-nav">
                        <span>HAYAAH</span>
                        <span>EAU DE PARFUM</span>
                    </div>

                    <div className="hero-copy">
                        <p className="hero-eyebrow">THE ART OF FRAGRANCE</p>
                        <h1>
                            A SCENT
                            <br />
                            THAT <span>STAYS.</span>
                        </h1>
                        <p className="hero-description">
                            Discover a fragrance crafted to leave a lasting impression.
                        </p>
                    </div>

                    <div className="hero-product-label">
                        <span>HAYAAH</span>
                        <span>EXTRAIT DE PARFUM</span>
                    </div>

                    <div className="scroll-indicator">SCROLL TO DISCOVER ↓</div>
                </div>
            </section>

            <section className="fragrance-intro">
                <div className="intro-content">
                    <p>BEYOND THE ORDINARY</p>
                    <h2>
                        An essence
                        <br />
                        of <em>elegance.</em>
                    </h2>
                    <p>
                        Deep, distinctive and unforgettable. Experience fragrance
                        through a different lens.
                    </p>
                </div>
            </section>
        </div>
    );
}

useGLTF.preload(MODEL_PATH);