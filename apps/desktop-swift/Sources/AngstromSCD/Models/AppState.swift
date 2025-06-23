import Foundation
import ComposableArchitecture

@Reducer
struct AppReducer {
    @ObservableState
    struct State: Equatable {
        var conversations: IdentifiedArrayOf<Conversation> = []
        var selectedConversationId: UUID?
        var currentWorkspace: Workspace = .global
        var isModelConfigurationPresented = false
        var selectedModel: AIModel = .claude35Sonnet
        var isSidebarVisible = true
        var searchQuery = ""
        var voeAlerts: [VOEAlert] = []
        var isLoading = false
        var error: AppError?
        var streamingContent = ""
        var useStreamingResponse = true
        
        var selectedConversation: Conversation? {
            guard let id = selectedConversationId else { return nil }
            return conversations[id: id]
        }
    }
    
    enum Action: Equatable {
        case newConversation
        case selectConversation(UUID?)
        case deleteConversation(UUID)
        case updateConversation(Conversation)
        case switchWorkspace(Workspace)
        case showModelConfiguration
        case dismissModelConfiguration
        case selectModel(AIModel)
        case toggleSidebar
        case updateSearchQuery(String)
        case sendMessage(String)
        case receiveMessage(Message)
        case receiveStreamChunk(String)
        case receiveVOEAlert(VOEAlert)
        case setLoading(Bool)
        case setError(AppError?)
        case clearError
        case checkVOEAlerts
        case searchLiterature(String)
        case receiveLiteratureResults([Citation])
    }
    
    @Dependency(\.chatService) var chatService
    
    var body: some Reducer<State, Action> {
        Reduce { state, action in
            switch action {
            case .newConversation:
                let conversation = Conversation(
                    id: UUID(),
                    title: "New Conversation",
                    messages: [],
                    workspace: state.currentWorkspace,
                    createdAt: Date()
                )
                state.conversations.append(conversation)
                state.selectedConversationId = conversation.id
                return .none
                
            case let .selectConversation(id):
                state.selectedConversationId = id
                state.streamingContent = ""
                return .none
                
            case let .deleteConversation(id):
                state.conversations.remove(id: id)
                if state.selectedConversationId == id {
                    state.selectedConversationId = state.conversations.first?.id
                }
                return .none
                
            case let .updateConversation(conversation):
                state.conversations[id: conversation.id] = conversation
                return .none
                
            case let .switchWorkspace(workspace):
                state.currentWorkspace = workspace
                return .none
                
            case .showModelConfiguration:
                state.isModelConfigurationPresented = true
                return .none
                
            case .dismissModelConfiguration:
                state.isModelConfigurationPresented = false
                return .none
                
            case let .selectModel(model):
                state.selectedModel = model
                return .none
                
            case .toggleSidebar:
                state.isSidebarVisible.toggle()
                return .none
                
            case let .updateSearchQuery(query):
                state.searchQuery = query
                return .none
                
            case let .sendMessage(content):
                guard var conversation = state.selectedConversation else { return .none }
                
                let userMessage = Message(
                    id: UUID(),
                    role: .user,
                    content: content,
                    timestamp: Date()
                )
                
                conversation.messages.append(userMessage)
                state.conversations[id: conversation.id] = conversation
                state.isLoading = true
                state.streamingContent = ""
                
                // Send message using chat service
                return .run { [
                    model = state.selectedModel,
                    conversationId = conversation.id,
                    context = conversation.messages,
                    useStreaming = state.useStreamingResponse
                ] send in
                    await send(.setLoading(true))
                    
                    do {
                        if useStreaming {
                            let message = try await chatService.streamMessage(
                                content,
                                model: model,
                                conversationId: conversationId,
                                context: context
                            ) { chunk in
                                Task {
                                    await send(.receiveStreamChunk(chunk))
                                }
                            }
                            await send(.receiveMessage(message))
                        } else {
                            let message = try await chatService.sendMessage(
                                content,
                                model: model,
                                conversationId: conversationId,
                                context: context
                            )
                            await send(.receiveMessage(message))
                        }
                    } catch {
                        await send(.setError(.networkError(error.localizedDescription)))
                    }
                    
                    await send(.setLoading(false))
                }
                
            case let .receiveMessage(message):
                guard var conversation = state.selectedConversation else { return .none }
                conversation.messages.append(message)
                
                // Update conversation title if it's still default
                if conversation.title == "New Conversation" && conversation.messages.count >= 2 {
                    conversation.title = generateConversationTitle(from: conversation.messages)
                }
                
                conversation.updatedAt = Date()
                state.conversations[id: conversation.id] = conversation
                state.streamingContent = ""
                return .none
                
            case let .receiveStreamChunk(chunk):
                state.streamingContent += chunk
                return .none
                
            case let .receiveVOEAlert(alert):
                state.voeAlerts.append(alert)
                return .none
                
            case let .setLoading(isLoading):
                state.isLoading = isLoading
                return .none
                
            case let .setError(error):
                state.error = error
                return .none
                
            case .clearError:
                state.error = nil
                return .none
                
            case .checkVOEAlerts:
                return .run { send in
                    do {
                        let alerts = try await chatService.getVOEAlerts()
                        for alert in alerts {
                            await send(.receiveVOEAlert(alert))
                        }
                    } catch {
                        await send(.setError(.networkError(error.localizedDescription)))
                    }
                }
                
            case let .searchLiterature(query):
                return .run { send in
                    do {
                        let results = try await chatService.searchLiterature(query: query)
                        await send(.receiveLiteratureResults(results))
                    } catch {
                        await send(.setError(.networkError(error.localizedDescription)))
                    }
                }
                
            case let .receiveLiteratureResults(citations):
                // Handle literature search results
                // Could update current conversation with citations
                return .none
            }
        }
    }
}

// MARK: - Helper Functions

private func generateConversationTitle(from messages: [Message]) -> String {
    guard let firstUserMessage = messages.first(where: { $0.role == .user }) else {
        return "New Conversation"
    }
    
    let content = firstUserMessage.content
    let words = content.split(separator: " ").prefix(6)
    
    if words.count < 3 {
        return content
    }
    
    return words.joined(separator: " ") + "..."
}

// MARK: - Chat Service Dependency

private enum ChatServiceKey: DependencyKey {
    static let liveValue = ChatService.shared
}

extension DependencyValues {
    var chatService: ChatService {
        get { self[ChatServiceKey.self] }
        set { self[ChatServiceKey.self] = newValue }
    }
}

// MARK: - Supporting Types

struct AppState: Equatable {
    var conversations: IdentifiedArrayOf<Conversation> = []
    var selectedConversationId: UUID?
    var currentWorkspace: Workspace = .global
    var isModelConfigurationPresented = false
    var selectedModel: AIModel = .claude35Sonnet
    var isSidebarVisible = true
    var searchQuery = ""
    var voeAlerts: [VOEAlert] = []
    var isLoading = false
    var error: AppError?
    
    var selectedConversation: Conversation? {
        guard let id = selectedConversationId else { return nil }
        return conversations[id: id]
    }
}

enum AppError: Error, Equatable {
    case networkError(String)
    case apiError(String)
    case modelNotAvailable(String)
    case unknown(String)
    
    var localizedDescription: String {
        switch self {
        case .networkError(let message):
            return "Network Error: \(message)"
        case .apiError(let message):
            return "API Error: \(message)"
        case .modelNotAvailable(let message):
            return "Model Not Available: \(message)"
        case .unknown(let message):
            return "Error: \(message)"
        }
    }
}