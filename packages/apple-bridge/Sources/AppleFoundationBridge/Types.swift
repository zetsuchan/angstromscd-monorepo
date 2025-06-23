import Foundation
import Vapor

// MARK: - Request Types

struct ChatCompletionRequest: Content {
    let model: String
    let messages: [Message]
    let temperature: Double?
    let maxTokens: Int?
    let topP: Double?
    let stream: Bool?
    let sessionId: String?
    
    struct Message: Content {
        let role: String
        let content: String
    }
    
    enum CodingKeys: String, CodingKey {
        case model
        case messages
        case temperature
        case maxTokens = "max_tokens"
        case topP = "top_p"
        case stream
        case sessionId = "session_id"
    }
}

// MARK: - Response Types

struct ChatCompletionResponse: Content {
    let id: String
    let object: String
    let created: Int
    let model: String
    let choices: [Choice]
    let usage: Usage?
    
    struct Choice: Content {
        let index: Int
        let message: Message
        let finishReason: String?
        let delta: Delta?
        
        struct Message: Content {
            let role: String
            let content: String
        }
        
        struct Delta: Content {
            let role: String?
            let content: String?
        }
        
        enum CodingKeys: String, CodingKey {
            case index
            case message
            case finishReason = "finish_reason"
            case delta
        }
    }
    
    struct Usage: Content {
        let promptTokens: Int
        let completionTokens: Int
        let totalTokens: Int
        
        enum CodingKeys: String, CodingKey {
            case promptTokens = "prompt_tokens"
            case completionTokens = "completion_tokens"
            case totalTokens = "total_tokens"
        }
    }
}

// MARK: - Streaming Response Types

struct ChatCompletionChunk: Content {
    let id: String
    let object: String
    let created: Int
    let model: String
    let choices: [StreamChoice]
    
    struct StreamChoice: Content {
        let index: Int
        let delta: Delta
        let finishReason: String?
        
        struct Delta: Content {
            let role: String?
            let content: String?
        }
        
        enum CodingKeys: String, CodingKey {
            case index
            case delta
            case finishReason = "finish_reason"
        }
    }
}

// MARK: - Error Response

struct ErrorResponse: Content {
    let error: ErrorDetail
    
    struct ErrorDetail: Content {
        let message: String
        let type: String
        let code: String?
    }
}

// MARK: - Model Information

struct ModelInfo: Content {
    let id: String
    let object: String
    let created: Int
    let ownedBy: String
    let permissions: [String]
    let capabilities: ModelCapabilities
    
    struct ModelCapabilities: Content {
        let maxTokens: Int
        let supportsStreaming: Bool
        let supportsTools: Bool
        let supportsGuidedGeneration: Bool
        let contextWindow: Int
        
        enum CodingKeys: String, CodingKey {
            case maxTokens = "max_tokens"
            case supportsStreaming = "supports_streaming"
            case supportsTools = "supports_tools"
            case supportsGuidedGeneration = "supports_guided_generation"
            case contextWindow = "context_window"
        }
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case object
        case created
        case ownedBy = "owned_by"
        case permissions
        case capabilities
    }
}

struct ModelsResponse: Content {
    let object: String
    let data: [ModelInfo]
}

// MARK: - Health Check

struct HealthResponse: Content {
    let status: String
    let platform: String
    let model: String
    let available: Bool
    let version: String?
    let capabilities: [String]?
}

// MARK: - Helper Extensions

extension ChatCompletionResponse {
    static func create(
        from text: String,
        model: String,
        requestId: String = UUID().uuidString
    ) -> ChatCompletionResponse {
        ChatCompletionResponse(
            id: requestId,
            object: "chat.completion",
            created: Int(Date().timeIntervalSince1970),
            model: model,
            choices: [
                Choice(
                    index: 0,
                    message: Choice.Message(
                        role: "assistant",
                        content: text
                    ),
                    finishReason: "stop",
                    delta: nil
                )
            ],
            usage: nil
        )
    }
}

extension ChatCompletionChunk {
    static func create(
        content: String,
        model: String,
        requestId: String,
        isFirst: Bool = false,
        isLast: Bool = false
    ) -> ChatCompletionChunk {
        ChatCompletionChunk(
            id: requestId,
            object: "chat.completion.chunk",
            created: Int(Date().timeIntervalSince1970),
            model: model,
            choices: [
                StreamChoice(
                    index: 0,
                    delta: StreamChoice.Delta(
                        role: isFirst ? "assistant" : nil,
                        content: isLast ? nil : content
                    ),
                    finishReason: isLast ? "stop" : nil
                )
            ]
        )
    }
}