import SwiftUI
import ComposableArchitecture

struct SidebarView: View {
    let store: StoreOf<AppReducer>
    
    var body: some View {
        WithViewStore(self.store, observe: { state in
            // Only observe properties needed for sidebar
            (
                conversations: state.conversations,
                selectedConversationId: state.selectedConversationId,
                searchQuery: state.searchQuery,
                isLoadingConversations: state.isLoadingConversations
            )
        }) { viewStore in
            List(selection: viewStore.binding(
                get: \.selectedConversationId,
                send: AppReducer.Action.selectConversation
            )) {
                Section("Conversations") {
                    ForEach(filteredConversations(viewStore: viewStore)) { conversation in
                        ConversationRow(conversation: conversation)
                            .tag(conversation.id)
                            .contextMenu {
                                Button("Rename...") {
                                    // TODO: Implement rename
                                }
                                
                                Button("Duplicate") {
                                    // TODO: Implement duplicate
                                }
                                
                                Divider()
                                
                                Button("Delete", role: .destructive) {
                                    viewStore.send(.deleteConversation(conversation.id))
                                }
                            }
                    }
                }
                
                if !viewStore.voeAlerts.isEmpty {
                    Section("VOE Alerts") {
                        ForEach(viewStore.voeAlerts) { alert in
                            VOEAlertRow(alert: alert)
                        }
                    }
                }
            }
            .listStyle(.sidebar)
            .frame(minWidth: 250)
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    Button(action: { viewStore.send(.newConversation) }) {
                        Image(systemName: "square.and.pencil")
                    }
                    .help("New Conversation")
                }
            }
        }
    }
    
    private func filteredConversations(viewStore: ViewStore<AppReducer.State, AppReducer.Action>) -> [Conversation] {
        let conversations = viewStore.conversations.elements.filter { conversation in
            conversation.workspace == viewStore.currentWorkspace
        }
        
        if viewStore.searchQuery.isEmpty {
            return conversations
        } else {
            return conversations.filter { conversation in
                conversation.title.localizedCaseInsensitiveContains(viewStore.searchQuery) ||
                conversation.messages.contains { message in
                    message.content.localizedCaseInsensitiveContains(viewStore.searchQuery)
                }
            }
        }
    }
}

struct ConversationRow: View {
    let conversation: Conversation
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(conversation.title)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)
                
                Spacer()
                
                if conversation.isArchived {
                    Image(systemName: "archivebox")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            if let lastMessage = conversation.lastMessage {
                Text(lastMessage.content)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            HStack {
                Text(conversation.updatedAt, style: .relative)
                    .font(.caption2)
                    .foregroundColor(.tertiary)
                
                Spacer()
                
                if !conversation.tags.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(conversation.tags.prefix(2), id: \.self) { tag in
                            TagView(tag: tag)
                        }
                        
                        if conversation.tags.count > 2 {
                            Text("+\(conversation.tags.count - 2)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct VOEAlertRow: View {
    let alert: VOEAlert
    
    var body: some View {
        HStack {
            Circle()
                .fill(alert.riskLevel.color)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Patient \(alert.patientId)")
                    .font(.caption)
                    .fontWeight(.medium)
                
                Text("\(alert.riskLevel.rawValue) Risk")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if !alert.isAcknowledged {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundColor(alert.riskLevel.color)
            }
        }
        .padding(.vertical, 4)
    }
}

struct TagView: View {
    let tag: String
    
    var body: some View {
        Text(tag)
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.accentColor.opacity(0.2))
            .foregroundColor(.accentColor)
            .clipShape(Capsule())
    }
}