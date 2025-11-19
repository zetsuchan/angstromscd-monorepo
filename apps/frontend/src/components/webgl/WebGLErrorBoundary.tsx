import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback: ReactNode;
}

interface State {
	hasError: boolean;
}

export class WebGLErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(_: Error): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.warn("WebGL Error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}

		return this.props.children;
	}
}

// CSS-based fallback for devices without WebGL support
export function CSSGlassFallback() {
	return (
		<div className="absolute inset-0 z-0">
			<div className="liquid-glass-orb liquid-orb-1"></div>
			<div className="liquid-glass-orb liquid-orb-2"></div>
			<div className="liquid-glass-orb liquid-orb-3"></div>
			<div className="liquid-glass-orb liquid-orb-4"></div>
			<div className="liquid-glass-orb liquid-orb-5"></div>
		</div>
	);
}
