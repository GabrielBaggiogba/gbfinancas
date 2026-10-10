'use client'

import { useEffect, useRef } from 'react'

// Fundo em gradiente granulado da tela de login. É o shader do Grainient (React Bits),
// com os ajustes padrão fixos, em WebGL2 puro: o original usa a biblioteca `ogl` só para
// desenhar um triângulo em tela cheia, o que cabe aqui sem dependência nova.

const VERTICE = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENTO = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

const float uTimeSpeed = 0.25;
const float uWarpFrequency = 5.0;
const float uWarpSpeed = 2.0;
const float uWarpAmplitude = 50.0;
const float uBlendSoftness = 0.05;
const float uRotationAmount = 500.0;
const float uNoiseScale = 2.0;
const float uGrainAmount = 0.1;
const float uGrainScale = 2.0;
const float uContrast = 1.5;
const float uZoom = 0.9;

#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}

void main(){
  float t=iTime*uTimeSpeed;
  vec2 uv=gl_FragCoord.xy/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=(uv-0.5)/uZoom;

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*uWarpFrequency+warpTime)/uWarpAmplitude;
  tuv.y+=sin(tuv.x*(uWarpFrequency*1.5)+warpTime)/(uWarpAmplitude*0.5);

  float s=uBlendSoftness;
  vec3 layer1=mix(uColor3,uColor2,S(-0.3-s,0.2+s,tuv.x));
  vec3 layer2=mix(uColor2,uColor1,S(-0.3-s,0.2+s,tuv.x));
  vec3 col=mix(layer1,layer2,S(0.5+s,-0.3-s,tuv.y));

  float grain=fract(sin(dot(uv*uGrainScale,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;
  col=clamp((col-0.5)*uContrast+0.5,0.0,1.0);

  fragColor=vec4(col,1.0);
}
`

type Props = {
  /** Cores em hexadecimal (#RRGGBB): clara, de destaque e de base. */
  cor1?: string
  cor2?: string
  cor3?: string
  className?: string
}

function hexParaRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.substring(1, 3), 16) / 255,
    parseInt(hex.substring(3, 5), 16) / 255,
    parseInt(hex.substring(5, 7), 16) / 255,
  ]
}

export default function Grainient({
  cor1 = '#2AA8EA',
  cor2 = '#000000',
  cor3 = '#2AA8EA',
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'low-power' })
    if (!gl) return // sem WebGL2: fica o fundo preto da página

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

    const vs = compilar(gl.VERTEX_SHADER, VERTICE)
    const fs = compilar(gl.FRAGMENT_SHADER, FRAGMENTO)
    const program = gl.createProgram()
    if (!vs || !fs || !program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    // Um triângulo que cobre a tela inteira.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const posicao = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(posicao)
    gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 0, 0)

    const uResolucao = gl.getUniformLocation(program, 'iResolution')
    const uTempo = gl.getUniformLocation(program, 'iTime')
    gl.uniform3f(gl.getUniformLocation(program, 'uColor1'), ...hexParaRgb(cor1))
    gl.uniform3f(gl.getUniformLocation(program, 'uColor2'), ...hexParaRgb(cor2))
    gl.uniform3f(gl.getUniformLocation(program, 'uColor3'), ...hexParaRgb(cor3))

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const inicio = performance.now()
    let quadro = 0

    const desenhar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const largura = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const altura = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== largura || canvas.height !== altura) {
        canvas.width = largura
        canvas.height = altura
      }
      gl.viewport(0, 0, largura, altura)
      gl.uniform2f(uResolucao, largura, altura)
      gl.uniform1f(uTempo, reduzido ? 6 : (performance.now() - inicio) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
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

    document.addEventListener('visibilitychange', iniciar)
    window.addEventListener('resize', desenhar)
    iniciar()

    return () => {
      cancelAnimationFrame(quadro)
      document.removeEventListener('visibilitychange', iniciar)
      window.removeEventListener('resize', desenhar)
    }
  }, [cor1, cor2, cor3])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}
