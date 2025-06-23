import SwiftUI
import ComposableArchitecture
import Markdown

struct ConversationView: View {
    let store: StoreOf<AppReducer>
    @State private var messageInput = ""
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        WithViewStore(self.store, observe: { $0 }) { viewStore in
            VStack(spacing: 0) {
                // Messages scroll view
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            if let conversation = viewStore.selectedConversation {
                                ForEach(conversation.messages) { message in
                                    MessageView(message: message)
                                        .id(message.id)
                                }
                                
                                if viewStore.isLoading {
                                    LoadingMessageView()
                                }
                            }
                        }
                        .padding()
                    }
                    .background(MaterialBackgroundView())
                    .onChange(of: viewStore.selectedConversation?.messages.count) { _, _ in
                        if let lastMessage = viewStore.selectedConversation?.messages.last {
                            withAnimation {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }
                
                Divider()
                
                // Input area
                ComposerView(
                    text: $messageInput,
                    isLoading: viewStore.isLoading,
                    onSubmit: {
                        guard !messageInput.isEmpty else { return }
                        viewStore.send(.sendMessage(messageInput))
                        messageInput = ""
                    }
                )
                .focused($isInputFocused)
                .padding()
                .background(Color(NSColor.windowBackgroundColor))
            }
            .navigationTitle(viewStore.selectedConversation?.title ?? "Conversation")
            .navigationSubtitle(viewStore.selectedModel.displayName)
        }
    }
}

struct MessageView: View {
    let message: Message
    @State private var isHovered = false
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Avatar
            Circle()
                .fill(avatarColor)
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: avatarIcon)
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                )
            
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack(spacing: 8) {
                    Text(message.role == .user ? "You" : "Assistant")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    if let model = message.model {
                        Text("via \(model.displayName)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Text(message.timestamp, style: .time)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Content
                MarkdownTextView(content: message.content)
                
                // Citations
                if !message.citations.isEmpty {
                    CitationsView(citations: message.citations)
                }
                
                // Actions
                if isHovered {
                    MessageActionsView(message: message)
                        .transition(.opacity.combined(with: .scale))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovered = hovering
            }
        }
    }
    
    private var avatarColor: Color {
        message.role == .user ? .blue : .purple
    }
    
    private var avatarIcon: String {
        message.role == .user ? "person.fill" : "cpu"
    }
}

struct MarkdownTextView: View {
    let content: String
    
    var body: some View {
        // For now, just display as plain text
        // TODO: Implement proper markdown rendering
        Text(content)
            .font(.body)
            .textSelection(.enabled)
    }
}

struct CitationsView: View {
    let citations: [Citation]
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    Image(systemName: "doc.text.fill")
                        .font(.caption)
                    
                    Text("\(citations.count) Citation\(citations.count == 1 ? "" : "s")")
                        .font(.caption)
                    
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .foregroundColor(.accentColor)
            }
            .buttonStyle(.plain)
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(citations) { citation in
                        CitationRow(citation: citation)
                    }
                }
                .padding(.leading, 20)
            }
        }
    }
}

struct CitationRow: View {
    let citation: Citation
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(citation.title)
                .font(.caption)
                .lineLimit(2)
            
            HStack {
                if !citation.authors.isEmpty {
                    Text(citation.authors.first ?? "")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    if citation.authors.count > 1 {
                        Text("et al.")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let year = citation.year {
                    Text("(\(year))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

struct MessageActionsView: View {
    let message: Message
    
    var body: some View {
        HStack(spacing: 8) {
            Button(action: {}) {
                Image(systemName: "doc.on.doc")
            }
            .help("Copy")
            
            Button(action: {}) {
                Image(systemName: "arrow.turn.up.left")
            }
            .help("Reply")
            
            Button(action: {}) {
                Image(systemName: "ellipsis")
            }
            .help("More")
        }
        .buttonStyle(.borderless)
        .font(.caption)
        .padding(.top, 4)
    }
}

struct LoadingMessageView: View {
    @State private var dots = ""
    @State private var timer: Timer?
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(Color.purple)
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: "cpu")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                )
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Assistant")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                HStack(spacing: 4) {
                    Text("Thinking")
                    Text(dots)
                        .frame(width: 20, alignment: .leading)
                }
                .font(.body)
                .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal)
        .onAppear {
            animateDots()
        }
        .onDisappear {
            timer?.invalidate()
            timer = nil
        }
    }
    
    private func animateDots() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.3)) {
                dots = dots.count < 3 ? dots + "." : ""
            }
        }
    }
}

struct ComposerView: View {
    @Binding var text: String
    let isLoading: Bool
    let onSubmit: () -> Void
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            // Attachment button
            Button(action: {}) {
                Image(systemName: "paperclip")
            }
            .buttonStyle(.borderless)
            .help("Add attachment")
            
            // Text editor
            MacTextEditor(text: $text, onSubmit: onSubmit)
                .frame(minHeight: 40, maxHeight: 200)
                .padding(8)
                .background(Color(NSColor.textBackgroundColor))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(NSColor.separatorColor), lineWidth: 1)
                )
            
            // Send button
            Button(action: onSubmit) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
            }
            .buttonStyle(.borderless)
            .disabled(text.isEmpty || isLoading)
            .help("Send message")
        }
    }
}

// NSTextView wrapper for better text editing experience
struct MacTextEditor: NSViewRepresentable {
    @Binding var text: String
    let onSubmit: () -> Void
    
    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        let textView = scrollView.documentView as! NSTextView
        
        textView.delegate = context.coordinator
        textView.isRichText = false
        textView.font = .systemFont(ofSize: 14)
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.allowsUndo = true
        
        return scrollView
    }
    
    func updateNSView(_ nsView: NSScrollView, context: Context) {
        let textView = nsView.documentView as! NSTextView
        if textView.string != text {
            textView.string = text
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, NSTextViewDelegate {
        var parent: MacTextEditor
        
        init(_ parent: MacTextEditor) {
            self.parent = parent
        }
        
        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            parent.text = textView.string
        }
        
        func textView(_ textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
            if commandSelector == #selector(NSResponder.insertNewline(_:)) {
                if NSEvent.modifierFlags.contains(.shift) {
                    return false // Allow new line with Shift+Enter
                } else {
                    parent.onSubmit()
                    return true
                }
            }
            return false
        }
    }
}