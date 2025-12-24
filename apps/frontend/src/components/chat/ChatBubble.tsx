import DOMPurify from "dompurify";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { Message } from "../../types";

interface ChatBubbleProps {
	message: Message;
}

/**
 * Sanitize HTML/SVG content for safe rendering
 */
function sanitizeContent(base64Data: string, format: string): string {
	const decoded = atob(base64Data);

	if (format === "svg") {
		// Allow SVG-specific tags and attributes
		return DOMPurify.sanitize(decoded, {
			USE_PROFILES: { svg: true, svgFilters: true },
			ADD_TAGS: ["use", "symbol", "defs", "clipPath", "mask", "pattern"],
			ADD_ATTR: ["xlink:href", "preserveAspectRatio", "viewBox"],
		});
	}

	// For HTML content (e.g., iframe srcDoc), use strict sanitization
	return DOMPurify.sanitize(decoded, {
		ALLOWED_TAGS: [
			"div", "span", "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
			"ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
			"img", "svg", "canvas", "style"
		],
		ALLOWED_ATTR: ["class", "style", "src", "alt", "width", "height", "id"],
	});
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
	const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

	const toggleCitation = (id: string) => {
		if (expandedCitation === id) {
			setExpandedCitation(null);
		} else {
			setExpandedCitation(id);
		}
	};

	// Memoize sanitized visualizations to avoid re-sanitizing on each render
	const sanitizedVisualizations = useMemo(() => {
		if (!message.visualizations) return [];
		return message.visualizations.map((viz) => ({
			...viz,
			sanitizedData: viz.format !== "png" ? sanitizeContent(viz.data, viz.format) : null,
		}));
	}, [message.visualizations]);

	return (
		<div
			className={`mb-4 flex ${
				message.sender === "user" ? "justify-end" : "justify-start"
			}`}
		>
			<div
				className={`relative max-w-3xl rounded-lg px-4 py-3 ${
					message.sender === "user"
						? "medical-primary text-blue-300"
						: "glass-subtle border border-white/20 text-white/90"
				}`}
			>
				<div className="mb-1">
					<span className="text-sm font-medium">
						{message.sender === "user" ? "You" : "MedLab AI"}
					</span>
					<span className="text-xs ml-2 opacity-70">
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>

				<div>
					<p className="whitespace-pre-wrap">{message.content}</p>

					{sanitizedVisualizations.length > 0 && (
						<div className="mt-4 space-y-3">
							{sanitizedVisualizations.map((viz) => (
								<div
									key={`${viz.format}-${viz.data.slice(0, 32)}`}
									className="rounded-lg overflow-hidden glass-subtle border border-white/20"
								>
									{viz.format === "png" ? (
										<img
											src={`data:image/png;base64,${viz.data}`}
											alt={`${viz.format} visualization`}
											className="w-full h-auto"
										/>
									) : viz.format === "svg" ? (
										<div
											// biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
											dangerouslySetInnerHTML={{ __html: viz.sanitizedData || "" }}
											className="w-full"
										/>
									) : (
										<iframe
											srcDoc={viz.sanitizedData || ""}
											className="w-full h-96 border-0"
											title={`${viz.format} visualization`}
											sandbox="allow-scripts"
										/>
									)}
								</div>
							))}
						</div>
					)}

					{message.citations && message.citations.length > 0 && (
						<div className="mt-3 space-y-2">
							{message.citations.map((citation) => (
								<div key={citation.id} className="text-sm">
									<button
										type="button"
										className={`flex items-center ${
											message.sender === "user"
												? "text-blue-400"
												: "text-blue-300"
										}`}
										onClick={() => toggleCitation(citation.id)}
									>
										<span className="mr-1">📑</span>
										<span className="mr-1">[{citation.reference}]</span>
										{expandedCitation === citation.id ? (
											<ChevronUp size={14} />
										) : (
											<ChevronDown size={14} />
										)}
									</button>

									{expandedCitation === citation.id && (
										<div
											className={`mt-2 p-3 rounded ${
												message.sender === "user"
													? "glass-strong text-blue-300"
													: "glass-subtle text-white/90"
											}`}
										>
											<p className="mb-2">"{citation.snippet}"</p>
											<div className="flex justify-between items-center text-xs">
												<span>{citation.source}</span>
												<button
													type="button"
													onClick={(e) => {
														e.preventDefault();
														// TODO: Implement source view
														console.log("View source:", citation.source);
													}}
													className={`flex items-center ${
														message.sender === "user"
															? "text-blue-400"
															: "text-blue-300"
													}`}
												>
													<span className="mr-1">View Source</span>
													<ExternalLink size={12} />
												</button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ChatBubble;
