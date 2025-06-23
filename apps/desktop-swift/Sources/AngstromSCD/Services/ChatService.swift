import Foundation
import Combine

/// Unified chat service that routes messages to appropriate providers
@MainActor
final class ChatService: ObservableObject {
    static let shared = ChatService()
    
    private let apiClient = APIClient.shared
    private let appleFoundationService = AppleFoundationService.shared
    
    @Published var isProcessing = false
    @Published var streamingText = ""
    @Published var error: Error?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Monitor API availability
        apiClient.$isReachable
            .sink { [weak self] isReachable in
                if !isReachable {
                    print("API is not reachable, will use local models when possible")
                }
            }
            .store(in: &cancellables)
    }
    
    /// Send a message using the specified model
    func sendMessage(
        _ content: String,
        model: AIModel,
        conversationId: UUID,
        context: [Message] = []
    ) async throws -> Message {
        isProcessing = true
        streamingText = ""
        error = nil
        
        defer { isProcessing = false }
        
        do {
            switch model {
            case .appleFoundation:
                // Use Apple Foundation Models directly
                let response = try await appleFoundationService.processMessage(
                    content,
                    conversationId: conversationId,
                    context: context
                )
                
                return Message(
                    id: UUID(),
                    role: .assistant,
                    content: response,
                    timestamp: Date(),
                    model: model
                )
                
            default:
                // Use API client for other models
                guard apiClient.isReachable else {
                    throw ChatError.apiNotReachable
                }
                
                return try await apiClient.sendChatMessage(
                    content,
                    model: model,
                    conversationHistory: context
                )
            }
        } catch {
            self.error = error
            throw error
        }
    }
    
    /// Stream a message response
    func streamMessage(
        _ content: String,
        model: AIModel,
        conversationId: UUID,
        context: [Message] = [],
        onChunk: @escaping (String) -> Void
    ) async throws -> Message {
        isProcessing = true
        streamingText = ""
        error = nil
        
        defer { isProcessing = false }
        
        do {
            switch model {
            case .appleFoundation:
                // Stream using Apple Foundation Models
                var fullResponse = ""
                
                try await appleFoundationService.streamMessage(
                    content,
                    conversationId: conversationId,
                    context: context
                ) { chunk in
                    fullResponse += chunk
                    Task { @MainActor in
                        self.streamingText = fullResponse
                        onChunk(chunk)
                    }
                }
                
                return Message(
                    id: UUID(),
                    role: .assistant,
                    content: fullResponse,
                    timestamp: Date(),
                    model: model
                )
                
            default:
                // Stream using API client
                guard apiClient.isReachable else {
                    throw ChatError.apiNotReachable
                }
                
                return try await withCheckedThrowingContinuation { continuation in
                    var fullResponse = ""
                    
                    apiClient.streamChatMessage(
                        content,
                        model: model,
                        conversationHistory: context,
                        onChunk: { chunk in
                            fullResponse += chunk
                            Task { @MainActor in
                                self.streamingText = fullResponse
                                onChunk(chunk)
                            }
                        },
                        onComplete: { result in
                            switch result {
                            case .success(var message):
                                message.content = fullResponse
                                continuation.resume(returning: message)
                            case .failure(let error):
                                continuation.resume(throwing: error)
                            }
                        }
                    )
                }
            }
        } catch {
            self.error = error
            throw error
        }
    }
    
    /// Search medical literature
    func searchLiterature(query: String, limit: Int = 10) async throws -> [Citation] {
        guard apiClient.isReachable else {
            throw ChatError.apiNotReachable
        }
        
        return try await apiClient.searchLiterature(query: query, limit: limit)
    }
    
    /// Get VOE alerts
    func getVOEAlerts() async throws -> [VOEAlert] {
        guard apiClient.isReachable else {
            throw ChatError.apiNotReachable
        }
        
        return try await apiClient.getVOEAlerts()
    }
    
    /// Check if a model is available
    func isModelAvailable(_ model: AIModel) async -> Bool {
        switch model {
        case .appleFoundation:
            let availability = await appleFoundationService.checkAvailability()
            return availability.available
            
        case .qwen25, .llama32, .llama33_32b, .llama33_70b, .mixtral, .codellama:
            return apiClient.availableServices.contains(.ollama)
            
        case .gpt4o, .gpt4oMini, .claude35Sonnet, .claude3Haiku:
            return apiClient.isReachable
        }
    }
    
    /// Get available models based on current service status
    func getAvailableModels() async -> [AIModel] {
        var available: [AIModel] = []
        
        // Check Apple Foundation Models
        let appleAvailable = await appleFoundationService.checkAvailability()
        if appleAvailable.available {
            available.append(.appleFoundation)
        }
        
        // Check API-based models
        if apiClient.isReachable {
            // Cloud models
            available.append(contentsOf: [.gpt4o, .gpt4oMini, .claude35Sonnet, .claude3Haiku])
            
            // Ollama models
            if apiClient.availableServices.contains(.ollama) {
                available.append(contentsOf: [
                    .qwen25, .llama32, .llama33_32b, .llama33_70b, .mixtral, .codellama
                ])
            }
        }
        
        return available
    }
    
    /// Select best available model with privacy preference
    func selectBestAvailableModel(preferLocal: Bool = true) async -> AIModel {
        let available = await getAvailableModels()
        
        if preferLocal {
            // Prefer local models for privacy
            if available.contains(.appleFoundation) {
                return .appleFoundation
            }
            
            // Try Ollama models
            for model in [AIModel.llama32, .qwen25, .mixtral] {
                if available.contains(model) {
                    return model
                }
            }
        }
        
        // Fall back to cloud models
        if available.contains(.claude35Sonnet) {
            return .claude35Sonnet
        } else if available.contains(.gpt4o) {
            return .gpt4o
        }
        
        // Default to first available or claude as fallback
        return available.first ?? .claude35Sonnet
    }
}

// MARK: - Errors

enum ChatError: LocalizedError {
    case apiNotReachable
    case noAvailableModels
    case modelNotAvailable(AIModel)
    
    var errorDescription: String? {
        switch self {
        case .apiNotReachable:
            return "Cannot reach the API server. Please check your connection."
        case .noAvailableModels:
            return "No AI models are currently available."
        case .modelNotAvailable(let model):
            return "\(model.displayName) is not currently available."
        }
    }
}

// MARK: - Convenience Extensions

extension ChatService {
    /// Quick chat without streaming
    func quickChat(
        _ message: String,
        conversationId: UUID,
        preferLocal: Bool = true
    ) async throws -> Message {
        let model = await selectBestAvailableModel(preferLocal: preferLocal)
        return try await sendMessage(
            message,
            model: model,
            conversationId: conversationId
        )
    }
}