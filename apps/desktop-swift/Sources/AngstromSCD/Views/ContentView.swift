import SwiftUI
import ComposableArchitecture

struct ContentView: View {
    let store: StoreOf<AppReducer>
    
    var body: some View {
        WithViewStore(self.store, observe: { $0 }) { viewStore in
            NavigationSplitView(
                columnVisibility: .constant(.all),
                sidebar: {
                    SidebarView(store: store)
                        .navigationSplitViewColumnWidth(min: 250, ideal: 300, max: 400)
                },
                content: {
                    if viewStore.selectedConversation != nil {
                        ConversationView(store: store)
                    } else {
                        EmptyStateView()
                    }
                },
                detail: {
                    if viewStore.selectedConversation != nil {
                        DetailPaneView(store: store)
                    } else {
                        EmptyDetailView()
                    }
                }
            )
            .navigationSplitViewStyle(.balanced)
            .toolbar {
                ToolbarItemGroup(placement: .navigation) {
                    Button(action: { viewStore.send(.toggleSidebar) }) {
                        Image(systemName: "sidebar.left")
                            .help("Toggle Sidebar")
                    }
                    
                    Spacer()
                }
                
                ToolbarItemGroup(placement: .principal) {
                    HStack(spacing: 12) {
                        Image(systemName: "heart.text.square.fill")
                            .foregroundColor(.red)
                            .font(.title2)
                        
                        Text("AngstromSCD")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Divider()
                            .frame(height: 20)
                        
                        WorkspacePicker(
                            selection: viewStore.binding(
                                get: \.currentWorkspace,
                                send: AppReducer.Action.switchWorkspace
                            )
                        )
                    }
                }
                
                ToolbarItemGroup(placement: .automatic) {
                    ModelSelectorButton(
                        selectedModel: viewStore.binding(
                            get: \.selectedModel,
                            send: AppReducer.Action.selectModel
                        )
                    )
                    
                    Button(action: { viewStore.send(.newConversation) }) {
                        Label("New Chat", systemImage: "plus.message")
                    }
                    .help("Start a new conversation")
                }
            }
            .searchable(
                text: viewStore.binding(
                    get: \.searchQuery,
                    send: AppReducer.Action.updateSearchQuery
                ),
                placement: .sidebar,
                prompt: "Search conversations..."
            )
            .alert(
                item: viewStore.binding(
                    get: \.error,
                    send: { _ in .clearError }
                )
            ) { error in
                Alert(
                    title: Text("Error"),
                    message: Text(error.localizedDescription),
                    dismissButton: .default(Text("OK"))
                )
            }
            .sheet(isPresented: viewStore.binding(
                get: \.isModelConfigurationPresented,
                send: { _ in .dismissModelConfiguration }
            )) {
                ModelConfigurationView(store: store)
            }
        }
    }
}

// MARK: - Supporting Views

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "message.fill")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No Conversation Selected")
                .font(.title2)
                .fontWeight(.medium)
            
            Text("Select a conversation from the sidebar or start a new one")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MaterialBackgroundView())
    }
}

struct EmptyDetailView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text("Research Details")
                .font(.title3)
                .fontWeight(.medium)
            
            Text("Citations, references, and additional context will appear here")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(NSColor.controlBackgroundColor))
    }
}

struct WorkspacePicker: View {
    @Binding var selection: Workspace
    
    var body: some View {
        Picker("Workspace", selection: $selection) {
            ForEach(Workspace.allCases) { workspace in
                Label {
                    Text(workspace.rawValue)
                } icon: {
                    Image(systemName: workspace.icon)
                        .foregroundColor(workspace.color)
                }
                .tag(workspace)
            }
        }
        .pickerStyle(.menu)
        .frame(width: 180)
    }
}

struct ModelSelectorButton: View {
    @Binding var selectedModel: AIModel
    @State private var isPopoverShown = false
    
    var body: some View {
        Button(action: { isPopoverShown.toggle() }) {
            HStack(spacing: 4) {
                Image(systemName: "cpu")
                Text(selectedModel.displayName)
                    .lineLimit(1)
            }
        }
        .popover(isPresented: $isPopoverShown, arrowEdge: .bottom) {
            ModelSelectorPopover(selectedModel: $selectedModel)
                .frame(width: 300)
        }
    }
}

struct ModelSelectorPopover: View {
    @Binding var selectedModel: AIModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Select Model")
                .font(.headline)
                .padding()
            
            Divider()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(ModelProvider.allCases, id: \.self) { provider in
                        Section {
                            ForEach(AIModel.allCases.filter { $0.provider == provider }) { model in
                                ModelRow(
                                    model: model,
                                    isSelected: selectedModel == model,
                                    action: {
                                        selectedModel = model
                                        dismiss()
                                    }
                                )
                            }
                        } header: {
                            Text(provider.rawValue)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .padding(.horizontal)
                                .padding(.top, 8)
                        }
                    }
                }
                .padding(.vertical, 8)
            }
        }
        .frame(height: 400)
    }
}

struct ModelRow: View {
    let model: AIModel
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(model.displayName)
                        .font(.body)
                    
                    HStack(spacing: 4) {
                        if model.isLocal {
                            Label("Local", systemImage: "personalhotspot")
                                .font(.caption2)
                                .foregroundColor(.green)
                        }
                        
                        Text("\(model.contextWindow / 1000)K context")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundColor(.accentColor)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .background(isSelected ? Color.accentColor.opacity(0.1) : Color.clear)
    }
}