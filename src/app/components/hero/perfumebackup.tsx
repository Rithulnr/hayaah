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
        color: "#E1C58F",
        metalness: 0.92,
        roughness: 0.15,
        emissive: new Color("#5A3E1B"),
        emissiveIntensity: 0.38,
        envMapIntensity: 1.4,
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
        const introSection = document.querySelector("#why-hayaah");

        if (!group || !track) return;

        const mobile = window.matchMedia("(max-width: 768px)").matches;

        const context = gsap.context(() => {
            gsap.set(group.position, { x: mobile ? 0 : 0.32, y: -0.18, z: 0 });
            gsap.set(group.rotation, { x: 0, y: 0, z: 0 });
            gsap.set(group.scale, { x: 0.84, y: 0.84, z: 0.84 });

            if (introSection) {
                const positionTimeline = gsap.timeline({
                    scrollTrigger: {
                        trigger: introSection,
                        start: "top bottom",
                        end: "top 25%",
                        scrub: 0.8,
                        invalidateOnRefresh: true,
                    },
                });
                positionTimeline.to(group.position, {
                    x: mobile ? 0 : 0.72,
                    y: -0.12,
                    z: 0,
                    ease: "power1.inOut",
                });

                const rotationTimeline = gsap.timeline({
                    scrollTrigger: {
                        trigger: introSection,
                        start: "top bottom",
                        end: "top 25%",
                        scrub: 0.8,
                        invalidateOnRefresh: true,
                    },
                });
                rotationTimeline
                    .to(group.rotation, {
                        x: 0.02,
                        y: 0.15,
                        z: -0.01,
                        duration: 0.5,
                        ease: "none",
                    })
                    .to(group.rotation, {
                        x: 0,
                        y: 0,
                        z: 0,
                        duration: 0.5,
                        ease: "none",
                    });

                gsap.to(group.scale, {
                    x: mobile ? 0.6 : 0.72,
                    y: mobile ? 0.6 : 0.72,
                    z: mobile ? 0.6 : 0.72,
                    ease: "power1.inOut",
                    scrollTrigger: {
                        trigger: introSection,
                        start: "top bottom",
                        end: "top 25%",
                        scrub: 0.8,
                    },
                });
            }
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
        <group ref={bottleRef} position={[0.32, -0.18, 0]} rotation={[0, 0, 0]}>
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
                <div className="hero-backdrop" aria-hidden="true" />
                {/* Absolute overlay scrolls away with the first hero; never sticky/fixed. */}
                <HayaahSmokeOverlay />
                <div className="hero-content-sticky">
                    <div className="hero-copy">
                        <p className="hero-eyebrow">THE ART OF FRAGRANCE</p>
                        <h1 className="hero-headline">
                            A SCENT<br />
                            THAT<br />
                            <span className="hero-gold-italic">STAYS.</span>
                        </h1>
                        <p className="hero-description">
                            Discover a fragrance crafted from rare ingredients to leave a lasting impression.
                        </p>
                        <div className="hero-actions">
                            <a href="#collections" className="hero-explore-cta">
                                <span className="cta-text">EXPLORE COLLECTION</span>
                                <span className="cta-circle">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="cta-arrow" aria-hidden="true">
                                        <path d="M5 12h14M13 6l6 6-6 6" />
                                    </svg>
                                </span>
                            </a>
                        </div>
                    </div>

                    <div className="hero-scroll-indicator">
                        <div className="scroll-vertical-line" />
                        <div className="scroll-marker">
                            <span className="scroll-circle" />
                            <span className="scroll-label">SCROLL</span>
                        </div>
                    </div>
                </div>
            </section>

            <section id="why-hayaah" className="fragrance-intro">
                <div className="intro-content">
                    <div className="intro-badge-row">
                        <span className="intro-arabic">حَيَاء</span>
                        <p className="intro-kicker">WHY CHOOSE HAYAAH &bull; OUR PROMISE</p>
                    </div>

                    <h2>
                        An essence of
                        <br />
                        <em>timeless sophistication.</em>
                    </h2>

                    <p className="intro-lead">
                        Born in Trivandrum, crafted for those who command distinction. We blend the world&apos;s rarest perfumery oils with uncompromising craftsmanship to redefine luxury fragrance in India.
                    </p>

                    {/* 8 Core Pillars */}
                    <div className="pillars-grid">
                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>Premium Quality</h4>
                                <p>Meticulously sourced raw essences and ultra-refined natural aroma compounds.</p>
                            </div>
                        </div>

                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>Long Lasting Performance</h4>
                                <p>Engineered for high tenacity, keeping your signature scent vibrant from dawn to midnight.</p>
                            </div>
                        </div>

                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>High Projection &amp; Sillage</h4>
                                <p>A magnetic aura that leaves a memorable, captivating trail wherever you enter.</p>
                            </div>
                        </div>

                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>Smooth &amp; Luxurious Finish</h4>
                                <p>Seamless olfactory evolution without harshness — smooth, velvety drydowns.</p>
                            </div>
                        </div>

                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>Elegant Packaging</h4>
                                <p>Heavy crystal flacons crowned with artisanal bevels, designed as a vanity centerpiece.</p>
                            </div>
                        </div>

                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>Affordable Luxury</h4>
                                <p>Haute perfumerie grade compositions accessible directly from our atelier to you.</p>
                            </div>
                        </div>

                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>Made in India</h4>
                                <p>Formulated with pride in Trivandrum, Kerala — honoring Indian botanicals &amp; heritage.</p>
                            </div>
                        </div>

                        <div className="pillar-item">
                            <div className="pillar-icon-box">
                                <span className="pillar-sparkle">&#10022;</span>
                            </div>
                            <div className="pillar-text">
                                <h4>Trusted by Customers</h4>
                                <p>Loved, gifted, and endorsed by thousands of discerning fragrance connoisseurs.</p>
                            </div>
                        </div>
                    </div>

                    {/* Brand Values Ribbon */}
                    <div className="brand-values-ribbon">
                        <span className="values-label">BRAND VALUES:</span>
                        <div className="values-tags">
                            <span>Luxury</span>
                            <span>Quality</span>
                            <span>Innovation</span>
                            <span>Trust</span>
                            <span>Elegance</span>
                            <span>Customer Satisfaction</span>
                            <span>Sustainability</span>
                            <span>Authenticity</span>
                        </div>
                    </div>

                    <div className="intro-action-row">
                        <a href="#collections" className="intro-link">
                            <span>EXPLORE SIGNATURE COLLECTIONS</span>
                            <span className="link-arrow">&rarr;</span>
                        </a>
                        <a href="#contact" className="b2b-link">
                            <span>Wholesale &bull; Become a Dealer &bull; Franchise Enquiry &rarr;</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}

useGLTF.preload(MODEL_PATH);