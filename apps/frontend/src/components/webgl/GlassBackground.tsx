import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { GlassOrbs } from "./GlassOrbs";
import { CSSGlassFallback, WebGLErrorBoundary } from "./WebGLErrorBoundary";

// Check for WebGL support
function checkWebGLSupport(): boolean {
	try {
		const canvas = document.createElement("canvas");
		const gl =
			canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		return !!gl;
	} catch (e) {
		return false;
	}
}

export default function GlassBackground() {
	const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

	useEffect(() => {
		setHasWebGL(checkWebGLSupport());
	}, []);

	// Show CSS fallback if WebGL is not supported
	if (hasWebGL === false) {
		return <CSSGlassFallback />;
	}

	// Show nothing during check (very brief)
	if (hasWebGL === null) {
		return null;
	}

	return (
		<WebGLErrorBoundary fallback={<CSSGlassFallback />}>
			<div className="absolute inset-0 z-0">
				<Canvas
					camera={{ position: [0, 0, 5], fov: 75 }}
					dpr={[1, 2]}
					gl={{
						alpha: true,
						antialias: true,
						powerPreference: "high-performance",
						stencil: false,
						depth: true,
					}}
					style={{ background: "transparent" }}
					frameloop="always"
				>
					<Suspense fallback={null}>
						<GlassOrbs />
					</Suspense>
				</Canvas>
			</div>
		</WebGLErrorBoundary>
	);
}
