import Foundation
import Alamofire
import Combine

/// API Client for communicating with AngstromSCD backend services
final class APIClient: ObservableObject {
    static let shared = APIClient()
    
    private let baseURL: String
    private let session: Session
    private var cancellables = Set<AnyCancellable>()
    
    // Published properties for reactive UI updates
    @Published var isReachable = false
    @Published var availableServices: Set<ServiceType> = []
    
    enum ServiceType: String, CaseIterable {
        case api = "API"
        case baml = "BAML"
        case vector = "Vector"
        case ollama = "Ollama"
        case appleBridge = "Apple Bridge"
    }
    
    enum APIError: LocalizedError {
        case invalidURL
        case noData
        case decodingError(Error)
        case networkError(Error)
        case serverError(Int, String?)
        
        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid URL"
            case .noData:
                return "No data received"
            case .decodingError(let error):
                return "Failed to decode response: \(error.localizedDescription)"
            case .networkError(let error):
                return "Network error: \(error.localizedDescription)"
            case .serverError(let code, let message):
                return "Server error (\(code)): \(message ?? "Unknown error")"
            }
        }
    }
    
    init(baseURL: String = "http://localhost:3001") {
        self.baseURL = baseURL
        
        // Configure Alamofire session
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 300
        
        self.session = Session(configuration: configuration)
        
        // Start monitoring service availability
        startHealthCheck()
    }
    
    // MARK: - Health Check
    
    private func startHealthCheck() {
        Timer.publish(every: 30, on: .main, in: .common)
            .autoconnect()
            .sink { _ in
                Task {
                    await self.checkAllServices()
                }
            }
            .store(in: &cancellables)
        
        // Initial check
        Task {
            await checkAllServices()
        }
    }
    
    @MainActor
    private func checkAllServices() async {
        var available: Set<ServiceType> = []
        
        // Check each service
        await withTaskGroup(of: (ServiceType, Bool).self) { group in
            group.addTask { (.api, await self.checkService(url: "\(self.baseURL)/api/health")) }
            group.addTask { (.baml, await self.checkService(url: "http://localhost:3002/health")) }
            group.addTask { (.vector, await self.checkService(url: "http://localhost:8000/api/v1")) }
            group.addTask { (.ollama, await self.checkService(url: "http://localhost:11434/api/tags")) }
            group.addTask { (.appleBridge, await self.checkService(url: "http://localhost:3004/health")) }
            
            for await (service, isAvailable) in group {
                if isAvailable {
                    available.insert(service)
                }
            }
        }
        
        self.availableServices = available
        self.isReachable = available.contains(.api)
    }
    
    private func checkService(url: String) async -> Bool {
        do {
            let response = await session.request(url)
                .validate(statusCode: 200..<300)
                .serializingData()
                .response
            
            return response.error == nil
        } catch {
            return false
        }
    }
    
    // MARK: - Chat API
    
    func sendChatMessage(
        _ message: String,
        model: AIModel,
        conversationHistory: [Message] = []
    ) async throws -> Message {
        let endpoint = "\(baseURL)/api/chat"
        
        let parameters: [String: Any] = [
            "message": message,
            "model": model.rawValue,
            "provider": model.provider.rawValue.lowercased(),
            "conversationHistory": conversationHistory.map { msg in
                [
                    "role": msg.role.rawValue,
                    "content": msg.content
                ]
            }
        ]
        
        let response = await session.request(
            endpoint,
            method: .post,
            parameters: parameters,
            encoding: JSONEncoding.default
        )
        .validate()
        .serializingDecodable(ChatResponse.self)
        .response
        
        switch response.result {
        case .success(let chatResponse):
            return Message(
                id: UUID(),
                role: .assistant,
                content: chatResponse.content,
                timestamp: Date(),
                model: model,
                citations: chatResponse.citations?.map { Citation.from($0) } ?? []
            )
        case .failure(let error):
            if let httpResponse = response.response,
               httpResponse.statusCode >= 400 {
                throw APIError.serverError(httpResponse.statusCode, error.localizedDescription)
            } else {
                throw APIError.networkError(error)
            }
        }
    }
    
    // MARK: - Literature Search
    
    func searchLiterature(
        query: String,
        limit: Int = 10
    ) async throws -> [Citation] {
        let endpoint = "\(baseURL)/api/literature/search"
        
        let parameters: [String: Any] = [
            "query": query,
            "limit": limit
        ]
        
        let response = await session.request(
            endpoint,
            method: .get,
            parameters: parameters
        )
        .validate()
        .serializingDecodable(LiteratureSearchResponse.self)
        .response
        
        switch response.result {
        case .success(let searchResponse):
            return searchResponse.results.map { Citation.from($0) }
        case .failure(let error):
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - VOE Alerts
    
    func getVOEAlerts() async throws -> [VOEAlert] {
        let endpoint = "\(baseURL)/api/voe/alerts"
        
        let response = await session.request(endpoint)
            .validate()
            .serializingDecodable(VOEAlertsResponse.self)
            .response
        
        switch response.result {
        case .success(let alertsResponse):
            return alertsResponse.alerts.map { VOEAlert.from($0) }
        case .failure(let error):
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Stream Support
    
    func streamChatMessage(
        _ message: String,
        model: AIModel,
        conversationHistory: [Message] = [],
        onChunk: @escaping (String) -> Void,
        onComplete: @escaping (Result<Message, Error>) -> Void
    ) {
        let endpoint = "\(baseURL)/api/chat/stream"
        
        let parameters: [String: Any] = [
            "message": message,
            "model": model.rawValue,
            "provider": model.provider.rawValue.lowercased(),
            "conversationHistory": conversationHistory.map { msg in
                [
                    "role": msg.role.rawValue,
                    "content": msg.content
                ]
            }
        ]
        
        session.streamRequest(
            endpoint,
            method: .post,
            parameters: parameters,
            encoding: JSONEncoding.default
        )
        .responseStreamString { stream in
            switch stream.event {
            case .stream(let result):
                switch result {
                case .success(let chunk):
                    onChunk(chunk)
                case .failure(let error):
                    onComplete(.failure(APIError.networkError(error)))
                }
                
            case .complete(let completion):
                if completion.error == nil {
                    let message = Message(
                        id: UUID(),
                        role: .assistant,
                        content: "", // Content was streamed
                        timestamp: Date(),
                        model: model
                    )
                    onComplete(.success(message))
                } else if let error = completion.error {
                    onComplete(.failure(APIError.networkError(error)))
                }
            }
        }
    }
}

// MARK: - Response Models

private struct ChatResponse: Decodable {
    let content: String
    let citations: [CitationResponse]?
    let metadata: ResponseMetadata?
}

private struct CitationResponse: Decodable {
    let id: String
    let title: String
    let authors: [String]
    let journal: String?
    let year: Int?
    let pmid: String?
    let doi: String?
    let url: String?
    let relevanceScore: Double?
}

private struct LiteratureSearchResponse: Decodable {
    let query: String
    let results: [CitationResponse]
    let totalCount: Int
}

private struct VOEAlertsResponse: Decodable {
    let alerts: [VOEAlertResponse]
}

private struct VOEAlertResponse: Decodable {
    let id: String
    let patientId: String
    let riskLevel: String
    let riskScore: Double
    let factors: [String]
    let timestamp: Date
    let isAcknowledged: Bool
}

private struct ResponseMetadata: Decodable {
    let tokensUsed: Int?
    let latency: Double?
    let model: String?
}

// MARK: - Model Extensions

extension Citation {
    static func from(_ response: CitationResponse) -> Citation {
        Citation(
            id: UUID(uuidString: response.id) ?? UUID(),
            title: response.title,
            authors: response.authors,
            journal: response.journal,
            year: response.year,
            pmid: response.pmid,
            doi: response.doi,
            url: response.url,
            relevanceScore: response.relevanceScore
        )
    }
}

extension VOEAlert {
    static func from(_ response: VOEAlertResponse) -> VOEAlert {
        VOEAlert(
            id: UUID(uuidString: response.id) ?? UUID(),
            patientId: response.patientId,
            riskLevel: RiskLevel(rawValue: response.riskLevel) ?? .moderate,
            riskScore: response.riskScore,
            factors: response.factors,
            timestamp: response.timestamp,
            isAcknowledged: response.isAcknowledged
        )
    }
}