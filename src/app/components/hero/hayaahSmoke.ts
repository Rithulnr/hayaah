// Transparent WebGL incense-smoke shader adapted for React / Next.js.
// This module intentionally does not access document or create a canvas at import time.

export type SmokeOptions = {
  sourceX?: number;
  sourceY?: number;
  intensity?: number;
  speed?: number;
  quality?: number;
  ember?: number;
  scrollFade?: boolean;
  fadeDistance?: number | null;
  colorDark?: [number, number, number];
  colorLight?: [number, number, number];
};

type ResolvedSmokeOptions = {
  sourceX: number;
  sourceY: number;
  intensity: number;
  speed: number;
  quality: number;
  ember: number;
  scrollFade: boolean;
  fadeDistance: number | null;
  colorDark: [number, number, number];
  colorLight: [number, number, number];
};

export type SmokeController = {
  setProgress: (progress: number) => void;
  setOptions: (options: SmokeOptions) => void;
  destroy: () => void;
};

export function initSmoke(
  canvas: HTMLCanvasElement,
  opts: SmokeOptions = {}
): SmokeController | null {
  const o: ResolvedSmokeOptions = Object.assign(
    {
      sourceX: 0.88,
      sourceY: 0.17,
      intensity: 0.78,
      speed: 0.82,
      quality: 0.72,
      ember: 0.25,
      scrollFade: false,
      fadeDistance: null,
      colorDark: [0.50, 0.28, 0.19] as [number, number, number],
      colorLight: [0.88, 0.68, 0.49] as [number, number, number],
    },
    opts
  );

  const context = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!context) {
    console.error("HAYAAH smoke: WebGL is unavailable in this browser.");
    return null;
  }
  const gl = context;

  const vs = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const fs = `precision highp float;
    uniform vec2 r,u_src;uniform float t,s,u_int,u_ember;uniform vec3 c1,c2;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);
    p=p*2.03+vec2(1.7,9.2)+vec2(sin(t*.35+float(i)*1.7),cos(t*.3+float(i)*2.3))*.6;a*=.5;}return v;}
    void main(){
      float asp=r.x/r.y;vec2 uv=gl_FragCoord.xy/r.y;
      vec2 src=vec2(asp*u_src.x,u_src.y);
      float L=max(asp,1.6);
      float k=(src.x-uv.x)/L;
      vec2 adv=vec2(t*.12,0.);
      vec2 q=vec2(fbm((uv+adv)*2.6),fbm((uv+adv)*2.6+vec2(5.2,1.3)));
      vec2 w=uv+(q-.5)*.5*smoothstep(.02,.5,k)*(.5+k*.8);
      float kk=(src.x-w.x)/L;
      float cy=src.y+.38*(1.-exp(-max(kk,0.)*5.))+.115*smoothstep(0.,.3,kk)*sin(kk*8.-t*.96/L);
      float sl=(1.9*exp(-max(kk,0.)*5.)+.9*smoothstep(0.,.3,kk))/L;
      float d=abs(w.y-cy)/sqrt(1.+sl*sl);
      float wd=.03+.3*pow(max(kk,0.),1.4);
      float env=exp(-d*d/(wd*wd))*smoothstep(-.09,0.,kk)*smoothstep(src.y,src.y+.05,uv.y)
        *(1.-smoothstep(.25,.7,kk))*(.6+.8*fbm(vec2(kk*5.-t*.35,3.)));
      float nn=fbm((w+adv)*vec2(3.,4.)+q*2.9);
      float nn2=fbm((w+adv)*vec2(7.,9.)+q*4.);
      float fil=pow(1.-abs(2.*nn-1.),3.)*.7+pow(1.-abs(2.*nn2-1.),4.)*.5;
      float dens=env*(.05+1.3*fil);
      float a=clamp(dens*.65*u_int*(1.-s),0.,1.);
      vec3 sm=mix(c1,c2,clamp(fil*1.2,0.,1.));
      float e=length((uv-src)*vec2(1.,1.4));
      float g=u_ember*.2*exp(-e*e*60.)*(.8+.2*sin(t*7.+n(vec2(t))*5.))*(1.-s);
      vec3 gc=vec3(1.,.45,.12);
      gl_FragColor=vec4(sm*a+gc*g,clamp(a+g,0.,1.));
    }`;

  const compileShader = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Could not create smoke shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Unknown shader compile error";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  };

  let vertexShader: WebGLShader;
  let fragmentShader: WebGLShader;
  let program: WebGLProgram;
  let buffer: WebGLBuffer;

  try {
    vertexShader = compileShader(gl.VERTEX_SHADER, vs);
    fragmentShader = compileShader(gl.FRAGMENT_SHADER, fs);
    const createdProgram = gl.createProgram();
    if (!createdProgram) throw new Error("Could not create smoke WebGL program.");
    program = createdProgram;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Unknown WebGL link error");
    }
    gl.useProgram(program);

    const createdBuffer = gl.createBuffer();
    if (!createdBuffer) throw new Error("Could not create smoke vertex buffer.");
    buffer = createdBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const attributeLocation = gl.getAttribLocation(program, "a");
    if (attributeLocation < 0) throw new Error("Smoke vertex attribute is missing.");
    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(attributeLocation, 2, gl.FLOAT, false, 0, 0);
  } catch (error) {
    console.error("HAYAAH smoke shader setup failed:", error);
    return null;
  }

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    resolution: uniform("r"),
    source: uniform("u_src"),
    time: uniform("t"),
    progress: uniform("s"),
    intensity: uniform("u_int"),
    ember: uniform("u_ember"),
    darkColor: uniform("c1"),
    lightColor: uniform("c2"),
  };

  gl.clearColor(0, 0, 0, 0);

  let time = 15;
  let lastTime = 0;
  let isVisible = true;
  let animationFrame = 0;
  let manualProgress: number | null = null;
  let destroyed = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const width = Math.max(2, Math.floor(canvas.clientWidth * o.quality));
    const height = Math.max(2, Math.floor(canvas.clientHeight * o.quality));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    if (destroyed) return;
    resize();
    const scrollProgress = o.scrollFade
      ? Math.min(Math.max(window.scrollY / (o.fadeDistance || window.innerHeight), 0), 1)
      : 0;
    const progress = manualProgress !== null ? manualProgress : scrollProgress;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.source, o.sourceX, o.sourceY);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.intensity, o.intensity);
    gl.uniform1f(uniforms.ember, o.ember);
    gl.uniform3fv(uniforms.darkColor, o.colorDark);
    gl.uniform3fv(uniforms.lightColor, o.colorLight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function loop(milliseconds: number) {
    if (destroyed) return;
    const delta = Math.min((milliseconds - lastTime) / 1000 || 0, 0.1);
    lastTime = milliseconds;
    time += delta * o.speed;
    draw();
    animationFrame = isVisible && !document.hidden
      ? requestAnimationFrame(loop)
      : 0;
  }

  function start() {
    if (!destroyed && !animationFrame && !reducedMotion && isVisible && !document.hidden) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(loop);
    }
  }

  const observer = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
      if (isVisible) start();
      else if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    })
    : null;

  const handleVisibilityChange = () => {
    if (document.hidden && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else {
      start();
    }
  };
  const handleResize = () => draw();

  observer?.observe(canvas);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("resize", handleResize);
  draw();
  start();

  return {
    setProgress(progress: number) {
      manualProgress = Math.min(1, Math.max(0, progress));
      draw();
    },
    setOptions(options: SmokeOptions) {
      Object.assign(o, options);
      draw();
    },
    destroy() {
      destroyed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    },
  };
}
