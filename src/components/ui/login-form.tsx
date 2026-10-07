'use client'

import { useEffect, useRef } from 'react'

// Fundo "fumaça" em WebGL da tela de login. Adaptado do componente login-form
// (SmokeyBackground): o programa é compilado uma vez só, o mouse fica em ref
// (sem recompilar a cada movimento) e o laço de animação é cancelado ao sair.

const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`

const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.5;

    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`

type BlurSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

const blurClassMap: Record<BlurSize, string> = {
  none: 'backdrop-blur-none',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl',
}

type SmokeyBackgroundProps = {
  backdropBlurAmount?: BlurSize
  /** Cor da fumaça em hexadecimal (#RRGGBB). */
  color?: string
  className?: string
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.substring(1, 3), 16) / 255,
    parseInt(hex.substring(3, 5), 16) / 255,
    parseInt(hex.substring(5, 7), 16) / 255,
  ]
}

export function SmokeyBackground({
  backdropBlurAmount = 'sm',
  color = '#2AA8EA',
  className = '',
}: SmokeyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' })
    if (!gl) return // sem WebGL: fica o fundo preto da página

    const compilar = (tipo: number, fonte: string) => {
      const shader = gl.createShader(tipo)
      if (!shader) return null
      gl.shaderSource(shader, fonte)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compilar(gl.VERTEX_SHADER, vertexSmokeySource)
    const fs = compilar(gl.FRAGMENT_SHADER, fragmentSmokeySource)
    const program = gl.createProgram()
    if (!vs || !fs || !program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const posicao = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(posicao)
    gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 0, 0)

    const uResolucao = gl.getUniformLocation(program, 'iResolution')
    const uTempo = gl.getUniformLocation(program, 'iTime')
    const uMouse = gl.getUniformLocation(program, 'iMouse')
    const [r, g, b] = hexToRgb(color)
    gl.uniform3f(gl.getUniformLocation(program, 'u_color'), r, g, b)

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const inicio = performance.now()
    let mouse: { x: number; y: number } | null = null
    let quadro = 0

    const desenhar = () => {
      const largura = canvas.clientWidth
      const altura = canvas.clientHeight
      if (canvas.width !== largura || canvas.height !== altura) {
        canvas.width = largura
        canvas.height = altura
      }
      gl.viewport(0, 0, largura, altura)
      gl.uniform2f(uResolucao, largura, altura)
      gl.uniform1f(uTempo, reduzido ? 6 : (performance.now() - inicio) / 1000)
      gl.uniform2f(uMouse, mouse ? mouse.x : largura / 2, mouse ? altura - mouse.y : altura / 2)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const laco = () => {
      desenhar()
      quadro = requestAnimationFrame(laco)
    }
    const iniciar = () => {
      cancelAnimationFrame(quadro)
      if (reduzido || document.hidden) desenhar()
      else laco()
    }

    const aoMover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const rect = canvas.getBoundingClientRect()
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const aoSair = () => {
      mouse = null
    }

    window.addEventListener('pointermove', aoMover, { passive: true })
    document.documentElement.addEventListener('pointerleave', aoSair)
    document.addEventListener('visibilitychange', iniciar)
    window.addEventListener('resize', desenhar)
    iniciar()

    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('pointermove', aoMover)
      document.documentElement.removeEventListener('pointerleave', aoSair)
      document.removeEventListener('visibilitychange', iniciar)
      window.removeEventListener('resize', desenhar)
    }
  }, [color])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className={`absolute inset-0 ${blurClassMap[backdropBlurAmount]}`} />
    </div>
  )
}
