'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Hbee Digitals hero signature — a fluid / marbled digital material.
 *
 * One full-quad WebGL fragment shader (no library). Domain-warped simplex fbm
 * produces a slow, dimensional, smoky material in navy → blue with a thin,
 * controlled orange highlight (colours read from the brand tokens).
 *
 * Interaction:
 *   • A fine pointer (mouse / trackpad) displaces and bends the field, with
 *     inertia — the disturbance trails behind the cursor and eases back.
 *   • With no pointer (touch) the influence point rides a slow autonomous
 *     Lissajous path, so tablet / mobile keep a living visual — never a blank
 *     area — without needing a cursor.
 *   • Quality (octaves / resolution) scales down on smaller screens.
 *
 * Falls back to a static (very slowly drifting) CSS gradient only for:
 *   prefers-reduced-motion · no WebGL / shader-compile failure · very low-end
 *   device · a zero-sized instance. The loop also pauses off-screen / when the
 *   tab is hidden.
 */

const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;   // smoothed influence point, 0..1 (y up)
uniform vec2  u_pvel;      // influence-point velocity, roughly -1..1
uniform float u_active;    // 0 = autonomous, 1 = pointer-driven
uniform int   u_oct;       // fbm octaves (3..5)
uniform vec3  u_c0;        // deep navy
uniform vec3  u_c1;        // blue accent
uniform vec3  u_c2;        // orange accent (used sparingly)

vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p){
  float a = 0.5, f = 0.0;
  for (int i = 0; i < 5; i++){
    if (i >= u_oct) break;
    f += a * snoise(p);
    p = p * 2.03 + 6.4;
    a *= 0.5;
  }
  return f;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = u_time * 0.045;

  vec2 ptr = vec2(u_pointer.x * aspect, u_pointer.y);
  vec2 toP = p - ptr;
  float d2 = dot(toP, toP);
  float infl = exp(-d2 * 3.1);                 // wide, soft field of influence

  // fluid domain warp
  vec2 q = vec2(
    fbm(p * 1.5 + vec2(0.0, t)),
    fbm(p * 1.5 + vec2(5.2, t * 1.25 + 1.7))
  );

  // the influence point pushes the material away, bends it with its motion,
  // and pulls the sampled field toward itself (a lens-like distortion)
  vec2 push = normalize(toP + 1e-4) * infl * 0.5;
  vec2 bend = u_pvel * infl * 0.95;
  vec2 lens = toP * infl * -0.55;

  vec2 r = vec2(
    fbm(p * 1.5 + 3.0 * q + push - bend + lens + vec2(1.7, t * 0.85)),
    fbm(p * 1.5 + 3.0 * q + push - bend + lens + vec2(9.2, t * 1.05))
  );

  float n = fbm(p * 1.32 + 2.35 * r + t * 0.28);
  n = n * 0.5 + 0.5;
  n += infl * (0.14 + 0.34 * length(u_pvel)) * (0.4 + 0.6 * u_active);

  // dimensional colour ramp: navy -> blue, thin orange only at the crests,
  // with a whisper of orange trailing the cursor
  vec3 col = mix(u_c0, u_c1, smoothstep(0.12, 0.78, n));
  col = mix(col, u_c2, smoothstep(0.82, 1.05, n) * 0.5);
  col = mix(col, u_c2, infl * 0.14 * u_active);
  col *= 0.62 + 0.5 * smoothstep(0.15, 0.95, n);

  float vig = smoothstep(1.2, 0.28, length((uv - 0.5) * vec2(1.1, 1.35)));
  col *= mix(0.1, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '')
  const v =
    h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h.padEnd(6, '0').slice(0, 6)
  const int = parseInt(v, 16)
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255]
}

function readBrandColors(): {
  c0: [number, number, number]
  c1: [number, number, number]
  c2: [number, number, number]
} {
  const s = getComputedStyle(document.documentElement)
  const pick = (name: string, fallback: string) => {
    const raw = s.getPropertyValue(name).trim()
    return raw.startsWith('#') ? hexToRgb(raw) : hexToRgb(fallback)
  }
  return {
    c0: pick('--navy-900', '#0B1220'),
    c1: pick('--accent', '#2563EB'),
    c2: pick('--cta', '#EA580C'),
  }
}

interface HeroFluidProps {
  className?: string
}

export default function HeroFluid({ className }: HeroFluidProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'pending' | 'shader' | 'static'>('pending')

  useEffect(() => {
    const mq = (q: string) => {
      try {
        return window.matchMedia(q).matches
      } catch {
        return false
      }
    }

    const reduce = mq('(prefers-reduced-motion: reduce)')
    const finePointer = mq('(pointer: fine)')
    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8
    const veryLowEnd = deviceMemory <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2

    if (reduce || veryLowEnd) {
      setMode('static')
      return
    }

    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    // Skip if this instance is display:none / zero-sized (the desktop layer on
    // a mobile layout, or vice-versa — both are rendered, one is hidden).
    const initialRect = wrap.getBoundingClientRect()
    if (initialRect.width < 2 || initialRect.height < 2) {
      setMode('static')
      return
    }

    const gl =
      (canvas.getContext('webgl', { antialias: false, alpha: false, depth: false }) as
        | WebGLRenderingContext
        | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

    if (!gl) {
      setMode('static')
      return
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      setMode('static')
      return
    }
    const prog = gl.createProgram()
    if (!prog) {
      setMode('static')
      return
    }
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setMode('static')
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const U = {
      res: gl.getUniformLocation(prog, 'u_res'),
      time: gl.getUniformLocation(prog, 'u_time'),
      pointer: gl.getUniformLocation(prog, 'u_pointer'),
      pvel: gl.getUniformLocation(prog, 'u_pvel'),
      active: gl.getUniformLocation(prog, 'u_active'),
      oct: gl.getUniformLocation(prog, 'u_oct'),
      c0: gl.getUniformLocation(prog, 'u_c0'),
      c1: gl.getUniformLocation(prog, 'u_c1'),
      c2: gl.getUniformLocation(prog, 'u_c2'),
    }

    const applyColors = () => {
      const c = readBrandColors()
      gl.uniform3fv(U.c0, c.c0)
      gl.uniform3fv(U.c1, c.c1)
      gl.uniform3fv(U.c2, c.c2)
    }
    applyColors()

    // ---- quality tier from screen size ----
    const screenW = window.innerWidth
    const tier = screenW < 768 ? 'mobile' : screenW < 1200 ? 'tablet' : 'desktop'
    const DPR_CAP = tier === 'mobile' ? 1 : tier === 'tablet' ? 1.3 : 1.6
    const MAX_W = tier === 'mobile' ? 720 : tier === 'tablet' ? 920 : 1100
    const OCTAVES = tier === 'mobile' ? 3 : tier === 'tablet' ? 4 : 5
    gl.uniform1i(U.oct, OCTAVES)

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      const w = Math.max(1, Math.min(Math.round(rect.width * dpr), Math.round(MAX_W * DPR_CAP)))
      const h = Math.max(1, Math.round(rect.height * dpr))
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      gl.uniform2f(U.res, w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // ---- influence point ----
    const target = { x: 0.6, y: 0.5 }
    const pos = { x: 0.6, y: 0.5 }
    const vel = { x: 0, y: 0 }
    let lastMove = -99999

    const onPointerMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect()
      target.x = Math.min(1.15, Math.max(-0.15, (e.clientX - rect.left) / rect.width))
      target.y = Math.min(1.15, Math.max(-0.15, 1 - (e.clientY - rect.top) / rect.height))
      lastMove = performance.now()
    }
    // track movement across the whole hero, not just over the canvas
    const listenEl: EventTarget = wrap.closest('section') ?? window
    listenEl.addEventListener('pointermove', onPointerMove as EventListener, { passive: true })

    // ---- loop ----
    let raf = 0
    let running = false
    let t0 = performance.now()
    let clock = 0

    const frame = (now: number) => {
      if (!running) return
      let dt = (now - t0) / 1000
      t0 = now
      dt = Math.min(dt, 1 / 30)
      clock += dt

      // autonomous path (always computed; used when the pointer is idle)
      const ax = 0.55 + 0.28 * Math.sin(now * 0.00021) + 0.06 * Math.sin(now * 0.00047)
      const ay = 0.5 + 0.24 * Math.cos(now * 0.00016) + 0.05 * Math.cos(now * 0.00039)
      const idle = Math.min(1, Math.max(0, (now - lastMove - (finePointer ? 650 : 200)) / 1300))
      const gx = target.x + (ax - target.x) * idle
      const gy = target.y + (ay - target.y) * idle

      // spring integrate — inertia + slight overshoot
      const k = 84
      const damp = 12
      vel.x += (gx - pos.x) * k * dt - vel.x * damp * dt
      vel.y += (gy - pos.y) * k * dt - vel.y * damp * dt
      pos.x += vel.x * dt
      pos.y += vel.y * dt

      gl.uniform1f(U.time, clock)
      gl.uniform2f(U.pointer, pos.x, pos.y)
      gl.uniform2f(
        U.pvel,
        Math.max(-1, Math.min(1, vel.x * 0.2)),
        Math.max(-1, Math.min(1, vel.y * 0.2)),
      )
      gl.uniform1f(U.active, 1 - idle)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running || raf) return
      running = true
      t0 = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.01 },
    )
    io.observe(wrap)

    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)

    const themeObserver = new MutationObserver(applyColors)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    setMode('shader')
    start()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      listenEl.removeEventListener('pointermove', onPointerMove as EventListener)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* Static / fallback layer — always painted; hidden once the shader runs.
          Its drift keyframe is disabled by the global reduced-motion rule. */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-700',
          mode === 'shader' ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          background:
            'radial-gradient(55% 70% at 66% 34%, var(--accent-subtle) 0%, transparent 60%),' +
            'radial-gradient(42% 52% at 38% 72%, rgba(234, 88, 12, 0.10) 0%, transparent 58%),' +
            'radial-gradient(120% 120% at 62% 44%, var(--navy-700) 0%, var(--navy-900) 72%)',
          animation: 'hero-fluid-drift 28s ease-in-out infinite alternate',
        }}
      />
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-700',
          mode === 'shader' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  )
}
