import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// Glass refraction shader with caustics and chromatic aberration
const glassVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glassFragmentShader = `
  uniform float time;
  uniform vec3 color;
  uniform float opacity;
  uniform float refractiveIndex;
  uniform float chromaticAberration;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  // Simplex noise for caustics
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Fresnel effect for edge glow
    vec3 viewDirection = normalize(vPosition);
    float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 3.0);

    // Animated caustics using layered noise
    float caustics1 = snoise(vec3(vUv * 3.0, time * 0.3));
    float caustics2 = snoise(vec3(vUv * 5.0, time * 0.5 + 10.0));
    float caustics = (caustics1 + caustics2 * 0.5) * 0.5 + 0.5;
    caustics = pow(caustics, 2.0) * 0.6;

    // Chromatic aberration for rainbow edges
    vec2 offset = vNormal.xy * chromaticAberration * fresnel;
    float r = fresnel * 1.1;
    float g = fresnel * 1.0;
    float b = fresnel * 0.9;

    // Combine effects
    vec3 finalColor = color;
    finalColor += vec3(r, g, b) * 0.3;
    finalColor += caustics * vec3(0.8, 0.9, 1.0);

    // Depth-based opacity variation
    float depthFade = smoothstep(0.0, 1.0, length(vPosition) / 10.0);
    float finalOpacity = opacity * (0.6 + fresnel * 0.4) * (1.0 - depthFade * 0.3);

    // Add subtle iridescence
    float iridescence = sin(vUv.x * 10.0 + time) * sin(vUv.y * 10.0 + time * 0.7);
    finalColor += iridescence * 0.1 * vec3(1.0, 0.8, 1.2);

    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`;

interface GlassOrbProps {
	position: [number, number, number];
	scale: [number, number, number];
	color: THREE.Color;
	animationSpeed: number;
	animationOffset: number;
}

function GlassOrb({
	position,
	scale,
	color,
	animationSpeed,
	animationOffset,
}: GlassOrbProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const materialRef = useRef<THREE.ShaderMaterial>(null);

	useFrame((state) => {
		if (!meshRef.current || !materialRef.current) return;

		const time = state.clock.elapsedTime * animationSpeed + animationOffset;

		// Organic morphing animation
		const morphX = Math.sin(time * 0.3) * 0.15;
		const morphY = Math.cos(time * 0.4) * 0.12;
		const morphZ = Math.sin(time * 0.5) * 0.1;

		meshRef.current.position.x = position[0] + morphX;
		meshRef.current.position.y = position[1] + morphY;
		meshRef.current.position.z = position[2] + morphZ;

		// Gentle rotation
		meshRef.current.rotation.x = time * 0.1;
		meshRef.current.rotation.y = time * 0.15;
		meshRef.current.rotation.z = time * 0.08;

		// Update shader time uniform
		materialRef.current.uniforms.time.value = state.clock.elapsedTime;
	});

	const uniforms = {
		time: { value: 0 },
		color: { value: color },
		opacity: { value: 0.25 },
		refractiveIndex: { value: 1.5 },
		chromaticAberration: { value: 0.02 },
	};

	return (
		<mesh ref={meshRef} position={position} scale={scale}>
			<icosahedronGeometry args={[1, 4]} />
			<shaderMaterial
				ref={materialRef}
				vertexShader={glassVertexShader}
				fragmentShader={glassFragmentShader}
				uniforms={uniforms}
				transparent
				side={THREE.DoubleSide}
				blending={THREE.AdditiveBlending}
				depthWrite={false}
			/>
		</mesh>
	);
}

export function GlassOrbs() {
	// Define orb configurations matching the original CSS layout
	const orbs: GlassOrbProps[] = [
		{
			position: [-2.5, 1.5, 0],
			scale: [1.4, 1.9, 1.4],
			color: new THREE.Color("#4FC3F7"),
			animationSpeed: 0.4,
			animationOffset: 0,
		},
		{
			position: [2.8, 0, -0.5],
			scale: [1.1, 1.6, 1.1],
			color: new THREE.Color("#81C784"),
			animationSpeed: 0.33,
			animationOffset: 5,
		},
		{
			position: [-2.0, -1.5, 0.3],
			scale: [0.9, 1.3, 0.9],
			color: new THREE.Color("#64B5F6"),
			animationSpeed: 0.45,
			animationOffset: 10,
		},
		{
			position: [0.5, 1.0, 0.2],
			scale: [0.8, 1.1, 0.8],
			color: new THREE.Color("#F48FB1"),
			animationSpeed: 0.36,
			animationOffset: 15,
		},
		{
			position: [2.2, -1.2, -0.2],
			scale: [0.7, 0.9, 0.7],
			color: new THREE.Color("#4DD0E1"),
			animationSpeed: 0.29,
			animationOffset: 20,
		},
	];

	return (
		<>
			<ambientLight intensity={0.3} />
			<pointLight position={[10, 10, 10]} intensity={0.5} />
			<pointLight position={[-10, -10, -10]} intensity={0.3} color="#81C784" />

			{orbs.map((orbProps, index) => (
				<GlassOrb key={index} {...orbProps} />
			))}
		</>
	);
}
