
import React, { useRef, useEffect, useCallback } from 'react';

// Interfaces and Types
interface Pointer {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  down: boolean;
  moved: boolean;
  color: number[];
}

interface GLProgram {
  program: WebGLProgram;
  uniforms: { [key: string]: WebGLUniformLocation | null };
  bind: () => void;
}

interface FBO {
  first: [WebGLTexture, WebGLFramebuffer, number];
  second: [WebGLTexture, WebGLFramebuffer, number];
  swap: () => void;
}

// GL Shaders
const baseVertexShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const clearShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main () {
      gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const displayShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
      gl_FragColor = texture2D(uTexture, vUv);
  }
`;

const splatShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
  }
`;

const advectionShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;
  void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = dissipation * texture2D(uSource, coord);
  }
`;

const divergenceShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vB.y < 0.0) { B = -C.y; }
      if (vT.y > 1.0) { T = -C.y; }
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

const curlShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
  }
`;

const vorticityShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 vel = texture2D(uVelocity, vUv).xy;
      gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
  }
`;

const pressureShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float C = texture2D(uPressure, vUv).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const gradientSubtractShaderSource = `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= 0.5 * vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;


const SmokeCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>(0);
    const glContext = useRef<WebGL2RenderingContext | WebGLRenderingContext | null>(null);
    const pointers = useRef<Pointer[]>([
        { id: -1, x: 0, y: 0, dx: 0, dy: 0, down: false, moved: false, color: [30, 0, 300] }
    ]);
    const lastTime = useRef(Date.now());
    
    // Store GL-related objects in refs to persist across renders without causing re-renders
    const glObjects = useRef<any>({});

    const config = {
        TEXTURE_DOWNSAMPLE: 1,
        DENSITY_DISSIPATION: 0.98,
        VELOCITY_DISSIPATION: 0.99,
        PRESSURE_DISSIPATION: 0.8,
        PRESSURE_ITERATIONS: 25,
        CURL: 35,
        SPLAT_RADIUS: 0.002
    };

    const getWebGLContext = useCallback((canvas: HTMLCanvasElement) => {
        const params = { alpha: false, depth: false, stencil: false, antialias: false };
        // Fix: Explicitly cast getContext results to avoid type widening to RenderingContext, which was causing type errors.
        let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvas.getContext("webgl2", params) as (WebGL2RenderingContext | null);
        const isWebGL2 = !!gl;
        if (!isWebGL2) {
            gl = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as (WebGLRenderingContext | null);
        }
        if (!gl) {
            console.error("WebGL not supported");
            return null;
        }

        const halfFloat = gl.getExtension("OES_texture_half_float");
        let support_linear_float = gl.getExtension("OES_texture_half_float_linear");
        if (isWebGL2) {
            // Fix: Cast to WebGL2RenderingContext to access WebGL2-specific extensions. The `isWebGL2` flag ensures this is safe.
            (gl as WebGL2RenderingContext).getExtension("EXT_color_buffer_float");
            support_linear_float = (gl as WebGL2RenderingContext).getExtension("OES_texture_float_linear");
        }
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        const internalFormat = isWebGL2 ? (gl as WebGL2RenderingContext).RGBA16F : gl.RGBA;
        const internalFormatRG = isWebGL2 ? (gl as WebGL2RenderingContext).RG16F : gl.RGBA;
        const formatRG = isWebGL2 ? (gl as WebGL2RenderingContext).RG : gl.RGBA;
        const texType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : (halfFloat as any).HALF_FLOAT_OES;

        return {
            gl,
            ext: { internalFormat, internalFormatRG, formatRG, texType },
            support_linear_float: !!support_linear_float
        };
    }, []);
    
    const update = useCallback(() => {
        const gl = glContext.current;
        if (!gl) return;

        const {
            textureWidth, textureHeight, density, velocity, divergence, curl, pressure,
            advectionProgram, curlProgram, vorticityProgram, divergenceProgram, clearProgram,
            pressureProgram, gradienSubtractProgram, displayProgram, splatProgram, blit,
        } = glObjects.current;

        const dt = Math.min((Date.now() - lastTime.current) / 1000, 0.016);
        lastTime.current = Date.now();

        gl.viewport(0, 0, textureWidth, textureHeight);

        advectionProgram.bind();
        gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2]);
        gl.uniform1i(advectionProgram.uniforms.uSource, velocity.first[2]);
        gl.uniform1f(advectionProgram.uniforms.dt, dt);
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
        blit(velocity.second[1]);
        velocity.swap();

        gl.uniform1i(advectionProgram.uniforms.uSource, density.first[2]);
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
        blit(density.second[1]);
        density.swap();

        for (const pointer of pointers.current) {
            if (pointer.moved) {
                splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
                pointer.moved = false;
            }
        }

        curlProgram.bind();
        gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.first[2]);
        blit(curl[1]);

        vorticityProgram.bind();
        gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.first[2]);
        gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2]);
        gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
        gl.uniform1f(vorticityProgram.uniforms.dt, dt);
        blit(velocity.second[1]);
        velocity.swap();

        divergenceProgram.bind();
        gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.first[2]);
        blit(divergence[1]);

        clearProgram.bind();
        gl.uniform1i(clearProgram.uniforms.uTexture, pressure.first[2]);
        gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION);
        blit(pressure.second[1]);
        pressure.swap();

        pressureProgram.bind();
        gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.first[2]);
            blit(pressure.second[1]);
            pressure.swap();
        }

        gradienSubtractProgram.bind();
        gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
        gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.first[2]);
        gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.first[2]);
        blit(velocity.second[1]);
        velocity.swap();

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        displayProgram.bind();
        gl.uniform1i(displayProgram.uniforms.uTexture, density.first[2]);
        blit(null);

        animationFrameId.current = requestAnimationFrame(update);
    }, []);
    
    const splat = useCallback((x: number, y: number, dx: number, dy: number, color: number[]) => {
        const gl = glContext.current;
        const canvas = canvasRef.current;
        if (!gl || !canvas) return;

        const { splatProgram, velocity, density, blit } = glObjects.current;

        splatProgram.bind();
        gl.uniform1i(splatProgram.uniforms.uTarget, velocity.first[2]);
        gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
        gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
        gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS);
        blit(velocity.second[1]);
        velocity.swap();

        gl.uniform1i(splatProgram.uniforms.uTarget, density.first[2]);
        gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
        blit(density.second[1]);
        density.swap();
    }, []);


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = getWebGLContext(canvas);
        if (!context) return;
        glContext.current = context.gl;
        const { gl, ext, support_linear_float } = context;

        class GLProgramImpl implements GLProgram {
            program: WebGLProgram;
            uniforms: { [key: string]: WebGLUniformLocation | null } = {};

            constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
                this.program = gl.createProgram()!;
                gl.attachShader(this.program, vertexShader);
                gl.attachShader(this.program, fragmentShader);
                gl.linkProgram(this.program);
                if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                    throw gl.getProgramInfoLog(this.program);
                }
                const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
                for (let i = 0; i < uniformCount; i++) {
                    const uniformName = gl.getActiveUniform(this.program, i)!.name;
                    this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
                }
            }

            bind() {
                gl.useProgram(this.program);
            }
        }

        const compileShader = (type: number, source: string) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw gl.getShaderInfoLog(shader);
            }
            return shader;
        };

        const createFBO = (texId: number, w: number, h: number, internalFormat: number, format: number, type: number, param: number): [WebGLTexture, WebGLFramebuffer, number] => {
            gl.activeTexture(gl.TEXTURE0 + texId);
            const texture = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

            const fbo = gl.createFramebuffer()!;
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT);

            return [texture, fbo, texId];
        };

        const createDoubleFBO = (texId: number, w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO => {
            let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param);
            let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param);
            return {
                get first() { return fbo1; },
                get second() { return fbo2; },
                swap: function () {
                    const temp = fbo1;
                    fbo1 = fbo2;
                    fbo2 = temp;
                }
            };
        };

        const initFramebuffers = () => {
            const textureWidth = gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE;
            const textureHeight = gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE;
            
            glObjects.current.textureWidth = textureWidth;
            glObjects.current.textureHeight = textureHeight;

            const texType = ext.texType;
            const linear = support_linear_float ? gl.LINEAR : gl.NEAREST;
            
            glObjects.current.density = createDoubleFBO(0, textureWidth, textureHeight, ext.internalFormat, gl.RGBA, texType, linear);
            glObjects.current.velocity = createDoubleFBO(2, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, texType, linear);
            glObjects.current.divergence = createFBO(4, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, texType, gl.NEAREST);
            glObjects.current.curl = createFBO(5, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, texType, gl.NEAREST);
            glObjects.current.pressure = createDoubleFBO(6, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, texType, gl.NEAREST);
        };

        const resizeCanvas = () => {
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                initFramebuffers();
            }
        };

        const baseVertexShader = compileShader(gl.VERTEX_SHADER, baseVertexShaderSource);
        glObjects.current.clearProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, clearShaderSource));
        glObjects.current.displayProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, displayShaderSource));
        glObjects.current.splatProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, splatShaderSource));
        glObjects.current.advectionProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, advectionShaderSource));
        glObjects.current.divergenceProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, divergenceShaderSource));
        glObjects.current.curlProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, curlShaderSource));
        glObjects.current.vorticityProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, vorticityShaderSource));
        glObjects.current.pressureProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, pressureShaderSource));
        glObjects.current.gradienSubtractProgram = new GLProgramImpl(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, gradientSubtractShaderSource));

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        glObjects.current.blit = (destination: WebGLFramebuffer | null) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
        
        resizeCanvas();
        initFramebuffers();
        lastTime.current = Date.now();
        animationFrameId.current = requestAnimationFrame(update);

        let colorCount = 0;
        let colorArr = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];

        const handleMouseMove = (e: MouseEvent) => {
            colorCount++;
            if (colorCount > 25) {
                colorArr = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];
                colorCount = 0;
            }
            pointers.current[0].down = true;
            pointers.current[0].color = colorArr;
            pointers.current[0].moved = pointers.current[0].down;
            pointers.current[0].dx = (e.offsetX - pointers.current[0].x) * 10.0;
            pointers.current[0].dy = (e.offsetY - pointers.current[0].y) * 10.0;
            pointers.current[0].x = e.offsetX;
            pointers.current[0].y = e.offsetY;
        };

        canvas.addEventListener('mousemove', handleMouseMove);

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, [getWebGLContext, update, splat]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default SmokeCanvas;
