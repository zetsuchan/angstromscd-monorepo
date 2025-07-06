import Foundation
import SwiftUI

// MARK: - Conversation

struct Conversation: Identifiable, Equatable, Codable {
    let id: UUID
    var title: String
    var messages: [Message]
    var workspace: Workspace
    let createdAt: Date
    var updatedAt: Date = Date()
    var tags: [String] = []
    var isArchived = false
    
    var lastMessage: Message? {
        messages.last
    }
    
    var summary: String {
        messages.first?.content ?? "No messages yet"
    }
}

// MARK: - Message

struct Message: Identifiable, Equatable, Codable {
    let id: UUID
    let role: MessageRole
    var content: String
    let timestamp: Date
    var model: AIModel?
    var citations: [Citation] = []
    var metadata: MessageMetadata?
    
    enum MessageRole: String, Codable {
        case user
        case assistant
        case system
    }
}

struct MessageMetadata: Equatable, Codable {
    var tokensUsed: Int?
    var latency: TimeInterval?
    var temperature: Double?
    var maxTokens: Int?
}

// MARK: - Workspace

enum Workspace: String, CaseIterable, Identifiable, Codable {
    case global = "Global Research"
    case projectX = "Project X"
    case myPapers = "My Papers"
    case clinical = "Clinical Practice"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .global: return "globe"
        case .projectX: return "flask"
        case .myPapers: return "doc.text"
        case .clinical: return "heart.text.square"
        }
    }
    
    var color: Color {
        switch self {
        case .global: return .blue
        case .projectX: return .purple
        case .myPapers: return .green
        case .clinical: return .red
        }
    }
}

// MARK: - AI Models

enum AIModel: String, CaseIterable, Identifiable, Codable {
    // Cloud Models
    case gpt4o = "gpt-4o"
    case gpt4oMini = "gpt-4o-mini"
    case claude35Sonnet = "claude-3.5-sonnet"
    case claude3Haiku = "claude-3-haiku"
    
    // Local Models (Ollama)
    case qwen25 = "qwen2.5:0.5b"
    case llama32 = "llama3.2:3b"
    case llama33_32b = "llama3.3:32b"
    case llama33_70b = "llama3.3:70b"
    case mixtral = "mixtral:8x7b"
    case codellama = "codellama:70b"
    
    // Apple Foundation Models
    case appleFoundation = "apple-foundation"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .gpt4o: return "GPT-4o"
        case .gpt4oMini: return "GPT-4o Mini"
        case .claude35Sonnet: return "Claude 3.5 Sonnet"
        case .claude3Haiku: return "Claude 3 Haiku"
        case .qwen25: return "Qwen 2.5 (0.5B)"
        case .llama32: return "Llama 3.2 (3B)"
        case .llama33_32b: return "Llama 3.3 (32B)"
        case .llama33_70b: return "Llama 3.3 (70B)"
        case .mixtral: return "Mixtral 8x7B"
        case .codellama: return "CodeLlama (70B)"
        case .appleFoundation: return "Apple Foundation"
        }
    }
    
    var provider: ModelProvider {
        switch self {
        case .gpt4o, .gpt4oMini:
            return .openai
        case .claude35Sonnet, .claude3Haiku:
            return .anthropic
        case .qwen25, .llama32, .llama33_32b, .llama33_70b, .mixtral, .codellama:
            return .ollama
        case .appleFoundation:
            return .apple
        }
    }
    
    var isLocal: Bool {
        provider == .ollama || provider == .apple
    }
    
    var contextWindow: Int {
        switch self {
        case .gpt4o, .gpt4oMini: return 128000
        case .claude35Sonnet: return 200000
        case .claude3Haiku: return 200000
        case .qwen25: return 32768
        case .llama32: return 8192
        case .llama33_32b, .llama33_70b: return 32768
        case .mixtral: return 32768
        case .codellama: return 16384
        case .appleFoundation: return 8192
        }
    }
}

enum ModelProvider: String, Codable {
    case openai = "OpenAI"
    case anthropic = "Anthropic"
    case ollama = "Ollama"
    case apple = "Apple"
    
    var requiresAPIKey: Bool {
        switch self {
        case .openai, .anthropic: return true
        case .ollama, .apple: return false
        }
    }
}

// MARK: - Medical Domain Models

struct Citation: Identifiable, Equatable, Codable {
    let id: UUID
    var title: String
    var authors: [String]
    var journal: String?
    var year: Int?
    var pmid: String?
    var doi: String?
    var url: String?
    var relevanceScore: Double?
    
    var formattedCitation: String {
        var parts: [String] = []
        
        if !authors.isEmpty {
            parts.append(authors.joined(separator: ", "))
        }
        
        if let year = year {
            parts.append("(\(year))")
        }
        parts.append(title)
        
        if let journal = journal {
            parts.append(journal)
        }
        
        return parts.joined(separator: ". ")
    }
}

struct VOEAlert: Identifiable, Equatable, Codable {
    let id: UUID
    let patientId: String
    var riskLevel: RiskLevel
    var riskScore: Double
    var factors: [String]
    let timestamp: Date
    var isAcknowledged = false
    
    enum RiskLevel: String, Codable, CaseIterable {
        case low = "Low"
        case moderate = "Moderate"
        case high = "High"
        case critical = "Critical"
        
        var color: Color {
            switch self {
            case .low: return .green
            case .moderate: return .yellow
            case .high: return .orange
            case .critical: return .red
            }
        }
    }
}

struct Patient: Identifiable, Equatable, Codable {
    let id: UUID
    var mrn: String
    var name: String
    var dateOfBirth: Date
    var scdGenotype: SCDGenotype
    var currentMedications: [Medication]
    var voeHistory: [VOEEpisode]
    var labResults: [LabResult]
    
    enum SCDGenotype: String, Codable, CaseIterable {
        case hbSS = "HbSS"
        case hbSC = "HbSC"
        case hbSBetaPlus = "HbS/β+"
        case hbSBetaZero = "HbS/β0"
        case other = "Other"
    }
}

struct Medication: Identifiable, Equatable, Codable {
    let id: UUID
    var name: String
    var dosage: String
    var frequency: String
    var startDate: Date
    var endDate: Date?
}

struct VOEEpisode: Identifiable, Equatable, Codable {
    let id: UUID
    var startDate: Date
    var endDate: Date?
    var severity: Int // 1-10 scale
    var location: String
    var treatment: String
    var hospitalized: Bool
}

struct LabResult: Identifiable, Equatable, Codable {
    let id: UUID
    var testName: String
    var value: String
    var unit: String
    var referenceRange: String
    var date: Date
    var isAbnormal: Bool
}