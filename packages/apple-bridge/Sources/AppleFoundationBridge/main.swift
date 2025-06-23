import Foundation
import Vapor
#if canImport(FoundationModels)
import FoundationModels
#endif

// MARK: - Service Protocol

@available(macOS 26.0, *)
protocol AppleFoundationModelServiceProtocol: Sendable {
    func checkAvailability() async -> (available: Bool, status: String)
    func processChat(request: ChatCompletionRequest, sessionId: String?) async throws -> String
    func streamChat(request: ChatCompletionRequest, sessionId: String?, onChunk: @escaping @Sendable (String) async -> Void) async throws
    func clearSessions(sessionId: String?) async
}

#if canImport(FoundationModels)
@available(macOS 26.0, *)
extension AppleFoundationModelService: AppleFoundationModelServiceProtocol {}
#endif

// MARK: - Route Configuration

@available(macOS 26.0, *)
func routes(_ app: Application) throws {
    let modelService: any AppleFoundationModelServiceProtocol
    
    #if canImport(FoundationModels)
    modelService = AppleFoundationModelService()
    #else
    // Mock service when FoundationModels is not available
    modelService = MockAppleFoundationModelService()
    #endif
    
    // Root endpoint
    app.get { req in
        return ["message": "Apple Foundation Models Bridge Service", "version": "1.0.0"]
    }
    
    // Health check endpoint
    app.get("health") { req async -> HealthResponse in
        let availability = await modelService.checkAvailability()
        return HealthResponse(
            status: availability.available ? "ok" : "unavailable",
            platform: "macOS",
            model: "apple-foundation-3b",
            available: availability.available,
            version: "1.0.0",
            capabilities: availability.available ? [
                "chat_completion",
                "streaming",
                "guided_generation",
                "tool_calling"
            ] : nil
        )
    }
 main
        
        // Handle streaming requests
        if request.stream == true {
            return try await handleStreamingRequest(req: req, request: request, modelService: modelService)
        }
        
        // Non-streaming request
        do {
            let responseText = try await modelService.processChat(
                request: request,
                sessionId: request.sessionId
            )
            
            let response = ChatCompletionResponse.create(
                from: responseText,
                model: request.model
            )
            
            return try await response.encodeResponse(for: req)
        } catch AppleFoundationModelService.ServiceError.modelNotAvailable(let reason) {
            throw Abort(.serviceUnavailable, reason: reason)
        } catch AppleFoundationModelService.ServiceError.invalidInput {
            throw Abort(.badRequest, reason: "Invalid input: messages must contain at least one user message")
        } catch {
            throw Abort(.internalServerError, reason: error.localizedDescription)
        }
    }
    
    // Model information endpoint
    app.get("v1", "models") { req async -> ModelsResponse in
        let availability = await modelService.checkAvailability()
        
        let modelInfo = ModelInfo(
            id: "apple-foundation-3b",
            object: "model",
            created: Int(Date().timeIntervalSince1970),
            ownedBy: "apple",
            permissions: ["chat_completion"],
            capabilities: ModelInfo.ModelCapabilities(
                maxTokens: 4096,
                supportsStreaming: true,
                supportsTools: true,
                supportsGuidedGeneration: true,
                contextWindow: 65536
            )
        )
        
        return ModelsResponse(
            object: "list",
            data: availability.available ? [modelInfo] : []
        )
    }
    
    // Clear session endpoint
    app.delete("v1", "sessions", ":sessionId?") { req async -> Response in
        let sessionId = req.parameters.get("sessionId")
        await modelService.clearSessions(sessionId: sessionId)
        return Response(status: .noContent)
    }
}

 main
    
    func append(_ chunk: String) {
        chunks.append(chunk)
    }
    
    func getChunks() -> [String] {
        return chunks
    }
}

// MARK: - Streaming Handler

@available(macOS 26.0, *)
func handleStreamingRequest<T>(
    req: Request,
    request: ChatCompletionRequest,
    modelService: T
) async throws -> Response where T: AppleFoundationModelServiceProtocol {
    let headers = HTTPHeaders([
        ("Content-Type", "text/event-stream"),
        ("Cache-Control", "no-cache"),
        ("Connection", "keep-alive")
    ])
    
    let eventStream = req.eventLoop.makePromise(of: Response.Body.self)
    
    Task {
        do {
            let requestId = UUID().uuidString
            let chunkCollector = ChunkCollector()
            
            // Collect all chunks
            try await modelService.streamChat(
                request: request,
                sessionId: request.sessionId
            ) { chunk in
                await chunkCollector.append(chunk)
            }
            
            let chunks = await chunkCollector.getChunks()
            
            // Build the complete response buffer
            let allocator = ByteBufferAllocator()
            var responseBuffer = allocator.buffer(capacity: 4096)
            
            // Send initial chunk
            let initialChunk = ChatCompletionChunk.create(
                content: "",
                model: request.model,
                requestId: requestId,
                isFirst: true
            )
            
            if let initialData = try? JSONEncoder().encode(initialChunk) {
                responseBuffer.writeString("data: ")
                responseBuffer.writeBytes(initialData)
                responseBuffer.writeString("\n\n")
            }
            
            // Send content chunks
            for chunk in chunks {
                let streamChunk = ChatCompletionChunk.create(
                    content: chunk,
                    model: request.model,
                    requestId: requestId
                )
                
                if let chunkData = try? JSONEncoder().encode(streamChunk) {
                    responseBuffer.writeString("data: ")
                    responseBuffer.writeBytes(chunkData)
                    responseBuffer.writeString("\n\n")
                }
            }
            
            // Send final chunk
            let finalChunk = ChatCompletionChunk.create(
                content: "",
                model: request.model,
                requestId: requestId,
                isLast: true
            )
            
            if let finalData = try? JSONEncoder().encode(finalChunk) {
                responseBuffer.writeString("data: ")
                responseBuffer.writeBytes(finalData)
                responseBuffer.writeString("\n\n")
            }
            
            // Send [DONE] marker
            responseBuffer.writeString("data: [DONE]\n\n")
            
            eventStream.succeed(.init(buffer: responseBuffer))
        } catch {
            req.logger.error("Streaming error: \(error)")
            let errorData = "data: {\"error\": \"\(error.localizedDescription)\"}\n\n"
            var errorBuffer = ByteBufferAllocator().buffer(capacity: errorData.count)
            errorBuffer.writeString(errorData)
            eventStream.succeed(.init(buffer: errorBuffer))
        }
    }
    
    return Response(
        status: .ok,
        headers: headers,
        body: Response.Body(stream: { writer in
            eventStream.futureResult.whenSuccess { body in
                writer.write(.buffer(body.buffer ?? ByteBuffer())).whenComplete { _ in
                    writer.write(.end).whenComplete { _ in }
                }
            }
        })
    )
}

// MARK: - Main Entry Point

@main
struct AppleFoundationBridge {
 main
        var env = try Environment.detect()
        try LoggingSystem.bootstrap(from: &env)
        
        let app = Application(env)
        defer { app.shutdown() }
        
        app.http.server.configuration.port = 3004
        
        // Configure CORS
        app.middleware.use(CORSMiddleware(
            configuration: CORSMiddleware.Configuration(
                allowedOrigin: .all,
                allowedMethods: [.GET, .POST, .DELETE, .OPTIONS],
                allowedHeaders: [.accept, .authorization, .contentType, .origin]
            )
        ))
        
        // Add error middleware
        app.middleware.use(ErrorMiddleware.default(environment: env))
        
        // Setup routes based on availability
        if #available(macOS 26.0, *) {
            try routes(app)
            app.logger.info("Apple Foundation Models Bridge running on port 3004")
        } else {
            // Fallback routes for older macOS versions
            app.get { req in
                return ErrorResponse(
                    error: ErrorResponse.ErrorDetail(
                        message: "Apple Foundation Models require macOS 26.0 or later",
                        type: "unsupported_platform",
                        code: "PLATFORM_VERSION"
                    )
                )
            }
            app.logger.warning("Apple Foundation Models require macOS 26.0+. Running in compatibility mode.")
        }
        
        try app.run()
    }
}

// MARK: - Mock Service for Development

#if !canImport(FoundationModels)
@available(macOS 26.0, *)
actor MockAppleFoundationModelService: AppleFoundationModelServiceProtocol {
    func checkAvailability() async -> (available: Bool, status: String) {
        return (false, "FoundationModels framework not available in development environment")
    }
    
    func processChat(request: ChatCompletionRequest, sessionId: String? = nil) async throws -> String {
        return """
        This is a development mock response from Apple Foundation Models bridge.
        
        In production with macOS 26.0+, this would use the actual ~3B parameter on-device model
        with medical research adapters for specialized tasks.
        
        Your query: \(request.messages.last?.content ?? "No message")
        """
    }
    
    func streamChat(
        request: ChatCompletionRequest,
        sessionId: String? = nil,
        onChunk: @escaping @Sendable (String) async -> Void
    ) async throws {
        let response = "This is a streaming mock response. "
        for word in response.split(separator: " ") {
            await onChunk(String(word) + " ")
            try await Task.sleep(nanoseconds: 100_000_000) // 0.1 second delay
        }
    }
    
    func clearSessions(sessionId: String? = nil) async {
        // No-op in mock
    }
}
#endif