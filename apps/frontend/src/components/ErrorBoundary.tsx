import React, { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: (error: Error, reset: () => void) => ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error boundary component for catching React errors
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		console.error("ErrorBoundary caught:", error, errorInfo);
		this.props.onError?.(error, errorInfo);
	}

	reset = (): void => {
		this.setState({ hasError: false, error: null });
	};

	render(): ReactNode {
		if (this.state.hasError && this.state.error) {
			if (this.props.fallback) {
				return this.props.fallback(this.state.error, this.reset);
			}

			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-50">
					<div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
						<div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
							<svg
								className="w-6 h-6 text-red-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h1 className="mt-4 text-xl font-semibold text-center text-gray-900">
							Something went wrong
						</h1>
						<p className="mt-2 text-sm text-center text-gray-600">
							We're sorry for the inconvenience. Please try refreshing the page.
						</p>
						<div className="mt-4 flex items-center justify-center gap-4">
							<button
								type="button"
								onClick={this.reset}
								className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								Try Again
							</button>
							<button
								type="button"
								onClick={() => window.location.reload()}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
							>
								Refresh Page
							</button>
						</div>
						{process.env.NODE_ENV === "development" && (
							<details className="mt-6">
								<summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
									Error Details
								</summary>
								<pre className="mt-2 p-2 text-xs text-gray-800 bg-gray-100 rounded overflow-auto">
									{this.state.error.stack}
								</pre>
							</details>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Hook for using error boundary imperatively
 */
export function useErrorHandler(): (error: unknown) => void {
	const [, setError] = React.useState();

	return React.useCallback((error: unknown) => {
		setError(() => {
			throw error;
		});
	}, []);
}
