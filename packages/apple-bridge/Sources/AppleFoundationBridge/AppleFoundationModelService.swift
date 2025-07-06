import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Service for managing interactions with Apple Foundation Models
@available(macOS 26.0, *)
actor AppleFoundationModelService {
    private var sessions: [String: LanguageModelSession] = [:]
    private let systemModel = SystemLanguageModel()
    
    enum ServiceError: Error {
        case modelNotAvailable(String)
        case sessionCreationFailed
        case invalidInput
        case responseGenerationFailed(String)
    }
    
    /// Check if Apple Foundation Models are available on this device
    func checkAvailability() async -> (available: Bool, status: String) {
        guard systemModel.isAvailable else {
            return (false, "Apple Foundation Models are not available on this device")
        }
        
        // Check for specific availability issues
        let availabilityStatus = systemModel.availabilityStatus
        switch availabilityStatus {
        case .available:
            return (true, "Apple Foundation Models are available and ready")
        case .notAvailable(let reason):
            return (false, "Models not available: \(reason)")
        case .downloading:
            return (false, "Models are currently downloading")
        case .waitingForDevice:
            return (false, "Waiting for device to be ready")
        @unknown default:
            return (false, "Unknown availability status")
        }
    }
    
    /// Process a chat completion request
    func processChat(request: ChatCompletionRequest, sessionId: String? = nil) async throws -> String {
        // Verify model availability
        let availability = await checkAvailability()
        guard availability.available else {
            throw ServiceError.modelNotAvailable(availability.status)
        }
        
        // Get or create session
        let session = try await getOrCreateSession(
            sessionId: sessionId ?? UUID().uuidString,
            instructions: extractSystemPrompt(from: request.messages)
        )
        
        // Get the latest user message
        guard let userMessage = request.messages.last(where: { $0.role == "user" })?.content else {
            throw ServiceError.invalidInput
        }
        
        // Create prompt with conversation context
        let prompt = createPrompt(
            from: userMessage,
            withContext: request.messages.dropLast()
        )
        
        // Configure generation options
        let options = GenerationOptions(
            temperature: request.temperature ?? 1.0,
            maxTokens: request.maxTokens ?? 2048,
            topP: request.topP ?? 0.95
        )
        
        do {
            // Generate response
            let response = try await session.respond(to: prompt, options: options)
            return response.content
        } catch {
            throw ServiceError.responseGenerationFailed(error.localizedDescription)
        }
    }
    
    /// Process a streaming chat completion request
    func streamChat(
        request: ChatCompletionRequest,
        sessionId: String? = nil,
        onChunk: @escaping @Sendable (String) async -> Void
    ) async throws {
        // Verify model availability
        let availability = await checkAvailability()
        guard availability.available else {
            throw ServiceError.modelNotAvailable(availability.status)
        }
        
        // Get or create session
        let session = try await getOrCreateSession(
            sessionId: sessionId ?? UUID().uuidString,
            instructions: extractSystemPrompt(from: request.messages)
        )
        
        // Get the latest user message
        guard let userMessage = request.messages.last(where: { $0.role == "user" })?.content else {
            throw ServiceError.invalidInput
        }
        
        // Create prompt
        let prompt = createPrompt(
            from: userMessage,
            withContext: request.messages.dropLast()
        )
        
        // Configure generation options
        let options = GenerationOptions(
            temperature: request.temperature ?? 1.0,
            maxTokens: request.maxTokens ?? 2048,
            topP: request.topP ?? 0.95,
            streaming: true
        )
        
        do {
            // Stream response
            for try await chunk in session.stream(prompt: prompt, options: options) {
                await onChunk(chunk.content)
            }
        } catch {
            throw ServiceError.responseGenerationFailed(error.localizedDescription)
        }
    }
    
    /// Clear a specific session or all sessions
    func clearSessions(sessionId: String? = nil) async {
        if let sessionId = sessionId {
            sessions.removeValue(forKey: sessionId)
        } else {
            sessions.removeAll()
        }
    }
    
    // MARK: - Private Methods
    
    private func getOrCreateSession(sessionId: String, instructions: String?) async throws -> LanguageModelSession {
        if let existingSession = sessions[sessionId] {
            return existingSession
        }
        
        // Create new session with medical research context
        let sessionInstructions = Instructions(
            systemPrompt: instructions ?? "You are a helpful medical research assistant specializing in Sickle Cell Disease (SCD) research and clinical decision support. Provide accurate, evidence-based information while being mindful of the sensitive nature of medical topics.",
            examples: [
                // Medical context examples
                Example(
                    input: "What are the latest treatments for VOE?",
                    output: "Recent advances in VOE treatment include targeted therapies like Crizanlizumab and Voxelotor, along with traditional approaches like hydroxyurea therapy."
                ),
                Example(
                    input: "Explain the pathophysiology of sickle cell crisis",
                    output: "Sickle cell crisis occurs when deoxygenated hemoglobin S polymerizes, causing red blood cells to assume a sickle shape, leading to vaso-occlusion, tissue hypoxia, and pain."
                )
            ]
        )
        
        guard let newSession = LanguageModelSession(instructions: sessionInstructions) else {
            throw ServiceError.sessionCreationFailed
        }
        
        sessions[sessionId] = newSession
        return newSession
    }
    
    private func extractSystemPrompt(from messages: [ChatCompletionRequest.Message]) -> String? {
        return messages.first(where: { $0.role == "system" })?.content
    }
    
    private func createPrompt(
        from userMessage: String,
        withContext context: ArraySlice<ChatCompletionRequest.Message>
    ) -> Prompt {
        // Build conversation history
        var conversationHistory = ""
        for message in context {
            if message.role != "system" {
                let role = message.role == "user" ? "User" : "Assistant"
                conversationHistory += "\(role): \(message.content)\n\n"
            }
        }
        
        // Create prompt with context
        let fullPrompt = conversationHistory.isEmpty
            ? userMessage
            : conversationHistory + "User: \(userMessage)"
        
        return Prompt(
            text: fullPrompt,
            metadata: [
                "domain": "medical_research",
                "specialty": "sickle_cell_disease"
            ]
        )
    }
}

// MARK: - Generation Options Extension

extension GenerationOptions {
    init(temperature: Double, maxTokens: Int, topP: Double? = nil, streaming: Bool = false) {
        self.init()
        self.temperature = temperature
        self.maxTokens = maxTokens
        if let topP = topP {
            self.topP = topP
        }
        self.streaming = streaming
    }
}

// MARK: - Mock Types for Compilation
// These should be replaced when FoundationModels types are fully documented

#if !canImport(FoundationModels)
// Mock types for development when FoundationModels is not available
struct SystemLanguageModel {
    let isAvailable = false
    let availabilityStatus = AvailabilityStatus.notAvailable("Mock implementation")
    
    enum AvailabilityStatus {
        case available
        case notAvailable(String)
        case downloading
        case waitingForDevice
    }
}

final class LanguageModelSession: @unchecked Sendable {
    init?(instructions: Instructions) { nil }
    
    func respond(to prompt: Prompt, options: GenerationOptions) async throws -> Response {
        throw AppleFoundationModelService.ServiceError.modelNotAvailable("Mock implementation")
    }
    
    func stream(prompt: Prompt, options: GenerationOptions) -> AsyncThrowingStream<StreamChunk, Error> {
        AsyncThrowingStream { _ in }
    }
    
    struct Response: Sendable {
        let content: String
    }
    
    struct StreamChunk: Sendable {
        let content: String
    }
}

struct Instructions {
    let systemPrompt: String
    let examples: [Example]
}

struct Example {
    let input: String
    let output: String
}

struct Prompt {
    let text: String
    let metadata: [String: String]
}

struct GenerationOptions {
    var temperature: Double = 1.0
    var maxTokens: Int = 2048
    var topP: Double = 0.95
    var streaming: Bool = false
}
#endif