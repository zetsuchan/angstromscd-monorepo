import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Service for managing Apple Foundation Models directly within the app
@available(macOS 15.0, *)
actor AppleFoundationService {
    static let shared = AppleFoundationService()
    
    private var sessions: [UUID: LanguageModelSession] = [:]
    private let systemModel = SystemLanguageModel()
    
    enum ServiceError: LocalizedError {
        case modelNotAvailable(String)
        case sessionCreationFailed
        case invalidInput
        case responseGenerationFailed(String)
        
        var errorDescription: String? {
            switch self {
            case .modelNotAvailable(let reason):
                return "Apple Foundation Models not available: \(reason)"
            case .sessionCreationFailed:
                return "Failed to create model session"
            case .invalidInput:
                return "Invalid input provided"
            case .responseGenerationFailed(let reason):
                return "Failed to generate response: \(reason)"
            }
        }
    }
    
    /// Check if Apple Foundation Models are available
    func checkAvailability() async -> (available: Bool, status: String) {
        guard systemModel.isAvailable else {
            return (false, "Apple Foundation Models are not available on this device")
        }
        
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
    
    /// Process a message and return a response
    func processMessage(
        _ content: String,
        conversationId: UUID,
        context: [Message] = [],
        temperature: Double = 0.7,
        maxTokens: Int = 2048
    ) async throws -> String {
        // Verify availability
        let availability = await checkAvailability()
        guard availability.available else {
            throw ServiceError.modelNotAvailable(availability.status)
        }
        
        // Get or create session
        let session = try await getOrCreateSession(
            conversationId: conversationId,
            systemPrompt: generateSystemPrompt()
        )
        
        // Create prompt with context
        let prompt = createPrompt(from: content, withContext: context)
        
        // Configure generation options
        let options = GenerationOptions(
            temperature: temperature,
            maxTokens: maxTokens,
            topP: 0.95
        )
        
        do {
            let response = try await session.respond(to: prompt, options: options)
            return response.content
        } catch {
            throw ServiceError.responseGenerationFailed(error.localizedDescription)
        }
    }
    
    /// Stream a response for a message
    func streamMessage(
        _ content: String,
        conversationId: UUID,
        context: [Message] = [],
        temperature: Double = 0.7,
        maxTokens: Int = 2048,
        onChunk: @escaping @Sendable (String) -> Void
    ) async throws {
        // Verify availability
        let availability = await checkAvailability()
        guard availability.available else {
            throw ServiceError.modelNotAvailable(availability.status)
        }
        
        // Get or create session
        let session = try await getOrCreateSession(
            conversationId: conversationId,
            systemPrompt: generateSystemPrompt()
        )
        
        // Create prompt
        let prompt = createPrompt(from: content, withContext: context)
        
        // Configure generation options
        let options = GenerationOptions(
            temperature: temperature,
            maxTokens: maxTokens,
            topP: 0.95,
            streaming: true
        )
        
        do {
            for try await chunk in session.stream(prompt: prompt, options: options) {
                await MainActor.run {
                    onChunk(chunk.content)
                }
            }
        } catch {
            throw ServiceError.responseGenerationFailed(error.localizedDescription)
        }
    }
    
    /// Clear session for a conversation
    func clearSession(conversationId: UUID) async {
        sessions.removeValue(forKey: conversationId)
    }
    
    /// Clear all sessions
    func clearAllSessions() async {
        sessions.removeAll()
    }
    
    // MARK: - Private Methods
    
    private func getOrCreateSession(
        conversationId: UUID,
        systemPrompt: String
    ) async throws -> LanguageModelSession {
        if let existingSession = sessions[conversationId] {
            return existingSession
        }
        
        let instructions = Instructions(
            systemPrompt: systemPrompt,
            examples: createMedicalExamples()
        )
        
        guard let newSession = LanguageModelSession(instructions: instructions) else {
            throw ServiceError.sessionCreationFailed
        }
        
        sessions[conversationId] = newSession
        return newSession
    }
    
    private func generateSystemPrompt() -> String {
        """
        You are a specialized medical research assistant focused on Sickle Cell Disease (SCD) research and clinical decision support. Your role is to:
        
        1. Provide accurate, evidence-based medical information
        2. Assist with literature searches and research synthesis
        3. Support clinical decision-making with relevant guidelines
        4. Help analyze patient data and identify patterns
        5. Suggest relevant research papers and clinical trials
        
        Key areas of expertise:
        - Sickle Cell Disease pathophysiology and genetics
        - Vaso-Occlusive Episodes (VOE) risk assessment and management
        - Hydroxyurea and other SCD therapies
        - Clinical trial design and analysis
        - Medical literature interpretation
        
        Always maintain patient privacy and follow HIPAA guidelines. Provide citations when referencing specific studies or guidelines.
        """
    }
    
    private func createMedicalExamples() -> [Example] {
        [
            Example(
                input: "What are the latest treatments for VOE in SCD patients?",
                output: "Recent advances in VOE treatment include:\n\n1. **Crizanlizumab** (Adakveo) - Anti-P-selectin antibody that reduces VOE frequency\n2. **Voxelotor** (Oxbryta) - Hemoglobin S polymerization inhibitor\n3. **L-glutamine** (Endari) - Reduces oxidative stress\n4. **Traditional approaches**: Hydroxyurea remains first-line therapy\n\nEmerging therapies in trials include gene therapy and CRISPR-based approaches."
            ),
            Example(
                input: "Calculate VOE risk score for a patient",
                output: "To calculate VOE risk score, I need:\n- Recent pain crisis history\n- Baseline hemoglobin level\n- HbF percentage\n- Current medications\n- Trigger factors\n\nBased on these factors, I can provide a risk assessment using validated scoring systems."
            )
        ]
    }
    
    private func createPrompt(from userMessage: String, withContext context: [Message]) -> Prompt {
        var conversationHistory = ""
        
        // Build conversation history
        for message in context.suffix(10) { // Keep last 10 messages for context
            let role = message.role == .user ? "User" : "Assistant"
            conversationHistory += "\(role): \(message.content)\n\n"
        }
        
        let fullPrompt = conversationHistory.isEmpty
            ? userMessage
            : conversationHistory + "User: \(userMessage)"
        
        return Prompt(
            text: fullPrompt,
            metadata: [
                "domain": "medical_research",
                "specialty": "sickle_cell_disease",
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]
        )
    }
}

// MARK: - Mock Types for Development
// These will be replaced when FoundationModels framework is available

#if !canImport(FoundationModels)
struct SystemLanguageModel {
    let isAvailable = false
    let availabilityStatus = AvailabilityStatus.notAvailable("Development environment")
    
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
        throw AppleFoundationService.ServiceError.modelNotAvailable("Mock implementation")
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
    
    init(temperature: Double, maxTokens: Int, topP: Double, streaming: Bool = false) {
        self.temperature = temperature
        self.maxTokens = maxTokens
        self.topP = topP
        self.streaming = streaming
    }
}
#endif

// MARK: - Extensions for SwiftUI Integration

extension AppleFoundationService {
    /// Convenience method for SwiftUI views
    func processMessageForView(
        _ content: String,
        conversationId: UUID,
        context: [Message] = []
    ) async -> Result<String, Error> {
        do {
            let response = try await processMessage(
                content,
                conversationId: conversationId,
                context: context
            )
            return .success(response)
        } catch {
            return .failure(error)
        }
    }
}