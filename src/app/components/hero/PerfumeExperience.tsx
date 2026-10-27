"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import {
    Box3,
    Color,
    DoubleSide,
    FrontSide,
    Group,
    Material,
    Mesh,
    MeshPhysicalMaterial,
    Quaternion,
    Vector2,
    Vector3,
} from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HayaahSmokeOverlay from "./HayaahSmokeOverlay";

gsap.registerPlugin(ScrollTrigger);

const MODEL_PATH = "/assets/models/newbottle1.glb";

/* ---------- Replacement bottle materials + liquid slosh shader ---------- */

type SloshUniforms = {
    uSlope: { value: Vector2 };
    uTop: { value: number };
    uBottom: { value: number };
    uBand: { value: number };
    uRipple: { value: number };
    uTime: { value: number };
    uGlow: { value: number };
};

// The page's smoke is rendered as DOM behind the transparent WebGL canvas.
// Three.js transmission cannot sample that DOM layer, so use alpha-blended
// glass with sharp environment reflections to let the real page backdrop show
// through the bottle (rather than producing the milky rectangle seen before).
function makeNativeBodyGlass(original: Material): Material {
    const material = original.clone();
    if (!(material instanceof MeshPhysicalMaterial)) return material;

    // Use ordinary alpha blending for the DOM-backed hero background. Avoid a
    // custom fragment-alpha shader: nested front/back glass faces were stacking
    // into the opaque grey panel seen in the browser render.
    material.color.set("#FFFFFF");
    material.metalness = 0;
    material.roughness = 0.045;
    material.transmission = 0;
    material.ior = 1.5;
    material.thickness = 0.25;
    material.attenuationColor = new Color("#FFFFFF");
    material.attenuationDistance = 100;
    material.clearcoat = 1;
    material.clearcoatRoughness = 0.025;
    material.envMapIntensity = 1.65;
    material.opacity = 0.12;
    material.transparent = true;
    material.depthWrite = false;
    material.side = FrontSide; // Avoid double blending inner and outer faces.
    material.needsUpdate = true;
    return material;
}

// Vertex deformation is concentrated near the top of the liquid mesh. The
// liquid keeps the amber colour from the new GLB, while opaque rendering avoids
// the nested-transmission issue that can make a fill disappear behind glass.
function addLiquidSloshShader(material: Material, uniforms: SloshUniforms) {
    const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
    const previousCacheKey = material.customProgramCacheKey.bind(material);

    material.onBeforeCompile = (shader, renderer) => {
        previousOnBeforeCompile(shader, renderer);
        Object.assign(shader.uniforms, uniforms);

        shader.vertexShader = shader.vertexShader
            .replace(
                "#include <common>",
                `#include <common>
                 uniform vec2 uSlope;
                 uniform float uTop;
                 uniform float uBand;
                 uniform float uRipple;
                 uniform float uTime;`
            )
            .replace(
                "#include <begin_vertex>",
                `vec3 transformed = vec3( position );
                 float hh = clamp((position.y - (uTop - uBand)) / max(uBand, 0.001), 0.0, 1.0);
                 float ww = hh * hh * (3.0 - 2.0 * hh);
                 float wave = sin(position.x * 4.0 + uTime * 2.3) * 0.5
                            + sin(position.z * 5.0 - uTime * 1.9) * 0.5;
                 transformed.y += ww * (uSlope.x * position.x + uSlope.y * position.z + wave * uRipple);`
            );
    };

    material.customProgramCacheKey = () => `${previousCacheKey()}|hayaah-amber-slosh-vertex-v3`;
    material.needsUpdate = true;
}

function makeNativeLiquid(original: Material, uniforms: SloshUniforms): Material {
    const material = original.clone();

    if (material instanceof MeshPhysicalMaterial) {
        // Let the shader provide the amber gradient; lighting and clearcoat
        // still supply shape and highlights without the GLB transmission washing
        // the colour toward cream in the transparent WebGL canvas.
        // Set the amber directly on the material; do not rely on a fragment
        // color override that can be brittle across Three.js shader revisions.
        material.color.set("#FF7908");
        material.metalness = 0;
        material.roughness = 0.12;
        material.transmission = 0;
        material.ior = 1.36;
        material.thickness = 0.45;
        material.attenuationColor = new Color("#A65312");
        material.attenuationDistance = 1.2;
        material.clearcoat = 0.9;
        material.clearcoatRoughness = 0.035;
        material.envMapIntensity = 0.9;
        material.emissive = new Color("#8B2700");
        material.emissiveIntensity = 0.22;
        material.opacity = 1;
        material.transparent = false;
        material.depthWrite = true;
        material.side = DoubleSide;
    }

    addLiquidSloshShader(material, uniforms);
    return material;
}

// The new model already has the desired gold cap, gold collar, and gold logo.
// Preserve those exported materials and only tune the two parts that need it.
function pickMaterial(meshName: string, original: Material, uniforms: SloshUniforms): Material {
    const name = meshName.toLowerCase();
    if (name.includes("liquid")) return makeNativeLiquid(original, uniforms);
    if (name.includes("body")) return makeNativeBodyGlass(original);
    return original.clone();
}

/* ---------- Bottle ---------- */

function HayaahBottle() {
    const { scene } = useGLTF(MODEL_PATH);
    const bottleRef = useRef<Group>(null);
    const tiltRef = useRef<Group>(null);
    const liquidRef = useRef<Mesh | null>(null);

    const sloshU = useMemo<SloshUniforms>(
        () => ({
            uSlope: { value: new Vector2() },
            uTop: { value: 1 },
            uBottom: { value: 0 },
            uBand: { value: 0.25 },
            uRipple: { value: 0.012 },
            uTime: { value: 0 },
            uGlow: { value: 0.45 },
        }),
        []
    );

    const sim = useRef({
        slope: new Vector2(),
        velocity: new Vector2(),
        previousPosition: new Vector3(),
        previousLocalVelocity: new Vector2(),
        previousRotationY: 0,
        ready: false,
    });

    const temp = useMemo(
        () => ({
            inverseWorldRotation: new Quaternion(),
            worldUpInLiquidSpace: new Vector3(),
            liquidWorldPosition: new Vector3(),
            liquidVelocity: new Vector3(),
        }),
        []
    );

    const model = useMemo(() => {
        const clonedScene = scene.clone(true);
        const found: { liquid: Mesh | null } = { liquid: null };

        clonedScene.traverse((object) => {

            if (!(object instanceof Mesh)) return;

            const meshName = object.name.toLowerCase();

            if (meshName.includes("liquid")) {
                object.geometry.computeBoundingBox();
                const bounds = object.geometry.boundingBox;
                if (bounds) {
                    const liquidHeight = Math.max(bounds.max.y - bounds.min.y, 0.001);
                    sloshU.uTop.value = bounds.max.y;
                    sloshU.uBottom.value = bounds.min.y;
                    // Limit deformation to the upper part of the liquid mesh.
                    sloshU.uBand.value = Math.max(liquidHeight * 0.32, 0.001);
                }
                found.liquid = object;
            }

            const originals = Array.isArray(object.material)
                ? object.material
                : [object.material];

            const replaced = originals.map((orig: Material) =>
                pickMaterial(meshName, orig, sloshU)
            );

            object.material = Array.isArray(object.material)
                ? replaced
                : replaced[0];
        });

        clonedScene.updateMatrixWorld(true);

        const bounds = new Box3().setFromObject(clonedScene);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());

        const scale = 3.05 / (size.y || 1);

        return {
            scene: clonedScene,
            scale,
            center: center.multiplyScalar(-scale),
            liquid: found.liquid,
        };
    }, [scene, sloshU]);

    useEffect(() => {
        liquidRef.current = model.liquid;
    }, [model]);

    // Drive the liquid surface from the same live transforms GSAP applies to the
    // bottle. Acceleration kicks the liquid; a damped spring then settles it.
    useFrame((frame, delta) => {
        const dt = Math.min(delta, 1 / 30);
        const bottle = bottleRef.current;
        const tilt = tiltRef.current;
        const liquid = liquidRef.current;
        if (!bottle || !tilt || !liquid || dt <= 0) return;

        // Keep the second file's subtle pointer-driven bottle tilt, nested inside
        // the existing GSAP scroll transform so neither animation overwrites the other.
        const pointerEase = 1 - Math.exp(-dt * 4);
        tilt.rotation.x += (-frame.pointer.y * 0.11 - tilt.rotation.x) * pointerEase;
        tilt.rotation.z += (-frame.pointer.x * 0.09 - tilt.rotation.z) * pointerEase;

        const state = sim.current;

        liquid.updateWorldMatrix(true, false);
        liquid.getWorldQuaternion(temp.inverseWorldRotation);
        temp.inverseWorldRotation.invert();
        temp.worldUpInLiquidSpace
            .set(0, 1, 0)
            .applyQuaternion(temp.inverseWorldRotation);

        const upY = Math.max(temp.worldUpInLiquidSpace.y, 0.3);
        const targetX = Math.max(-0.5, Math.min(0.5, -temp.worldUpInLiquidSpace.x / upY));
        const targetZ = Math.max(-0.5, Math.min(0.5, -temp.worldUpInLiquidSpace.z / upY));

        liquid.getWorldPosition(temp.liquidWorldPosition);
        if (!state.ready) {
            state.previousPosition.copy(temp.liquidWorldPosition);
            state.previousRotationY = bottle.rotation.y;
            state.previousLocalVelocity.set(0, 0);
            state.ready = true;
        }

        // Convert the liquid mesh's world movement into its local axes. Changes
        // in that velocity act like inertia when scroll animation speeds up/slows down.
        temp.liquidVelocity
            .copy(temp.liquidWorldPosition)
            .sub(state.previousPosition)
            .divideScalar(dt)
            .applyQuaternion(temp.inverseWorldRotation);
        state.previousPosition.copy(temp.liquidWorldPosition);

        const accelerationX = temp.liquidVelocity.x - state.previousLocalVelocity.x;
        const accelerationZ = temp.liquidVelocity.z - state.previousLocalVelocity.y;
        state.previousLocalVelocity.set(temp.liquidVelocity.x, temp.liquidVelocity.z);

        const kick = 1.15;
        state.velocity.x += Math.max(-3, Math.min(3, -accelerationX * kick));
        state.velocity.y += Math.max(-3, Math.min(3, -accelerationZ * kick));

        const spin = Math.abs((bottle.rotation.y - state.previousRotationY) / dt);
        state.previousRotationY = bottle.rotation.y;

        // Damped spring: follows the gravity-level surface, but overshoots slightly.
        const stiffness = 36;
        const damping = 3.0;
        state.velocity.x += (-stiffness * (state.slope.x - targetX) - damping * state.velocity.x) * dt;
        state.velocity.y += (-stiffness * (state.slope.y - targetZ) - damping * state.velocity.y) * dt;
        state.slope.x = Math.max(-0.5, Math.min(0.5, state.slope.x + state.velocity.x * dt));
        state.slope.y = Math.max(-0.5, Math.min(0.5, state.slope.y + state.velocity.y * dt));

        // Keep motion subtle at rest and stronger while the bottle is moving.
        const speed = Math.hypot(state.velocity.x, state.velocity.y);
        const rippleTarget = 0.012 + Math.min(0.085, speed * 0.04 + spin * 0.035);
        sloshU.uRipple.value += (rippleTarget - sloshU.uRipple.value) * (1 - Math.exp(-dt * 5));
        sloshU.uSlope.value.copy(state.slope);
        sloshU.uTime.value += dt;
    });

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
            <group ref={tiltRef}>
                <group scale={model.scale} position={model.center.toArray()}>
                    <primitive object={model.scene} />
                </group>
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