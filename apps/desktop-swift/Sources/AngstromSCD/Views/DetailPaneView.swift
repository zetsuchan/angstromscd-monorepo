import SwiftUI
import ComposableArchitecture

struct DetailPaneView: View {
    let store: StoreOf<AppReducer>
    @State private var selectedTab = DetailTab.citations
    
    enum DetailTab: String, CaseIterable {
        case citations = "Citations"
        case references = "References"
        case context = "Context"
        case relatedWork = "Related Work"
        
        var icon: String {
            switch self {
            case .citations: return "doc.text"
            case .references: return "books.vertical"
            case .context: return "doc.richtext"
            case .relatedWork: return "doc.on.doc"
            }
        }
    }
    
    var body: some View {
        WithViewStore(self.store, observe: { $0 }) { viewStore in
            VStack(spacing: 0) {
                // Tab selector
                HStack(spacing: 16) {
                    ForEach(DetailTab.allCases, id: \.self) { tab in
                        TabButton(
                            title: tab.rawValue,
                            icon: tab.icon,
                            isSelected: selectedTab == tab,
                            action: { selectedTab = tab }
                        )
                    }
                    Spacer()
                }
                .padding()
                .background(Color(NSColor.windowBackgroundColor))
                
                Divider()
                
                // Content area
                ScrollView {
                    Group {
                        switch selectedTab {
                        case .citations:
                            CitationsDetailView(store: store)
                        case .references:
                            ReferencesView(store: store)
                        case .context:
                            ContextView(store: store)
                        case .relatedWork:
                            RelatedWorkView(store: store)
                        }
                    }
                    .padding()
                }
                .background(Color(NSColor.controlBackgroundColor))
            }
            .frame(minWidth: 350, idealWidth: 400)
        }
    }
}

struct TabButton: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.subheadline)
            }
            .foregroundColor(isSelected ? .accentColor : .secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                isSelected ? Color.accentColor.opacity(0.1) : Color.clear
            )
            .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}

struct CitationsDetailView: View {
    let store: StoreOf<AppReducer>
    
    var body: some View {
        WithViewStore(self.store, observe: { $0 }) { viewStore in
            VStack(alignment: .leading, spacing: 16) {
                if let conversation = viewStore.selectedConversation {
                    let allCitations = conversation.messages.flatMap { $0.citations }
                    
                    if allCitations.isEmpty {
                        EmptyCitationsView()
                    } else {
                        ForEach(allCitations) { citation in
                            CitationDetailCard(citation: citation)
                        }
                    }
                }
            }
        }
    }
}

struct CitationDetailCard: View {
    let citation: Citation
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            Text(citation.title)
                .font(.headline)
                .lineLimit(isExpanded ? nil : 2)
            
            // Authors
            if !citation.authors.isEmpty {
                Text(citation.authors.joined(separator: ", "))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(isExpanded ? nil : 1)
            }
            
            // Journal info
            HStack {
                if let journal = citation.journal {
                    Text(journal)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let year = citation.year {
                    Text("(\(year))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if let score = citation.relevanceScore {
                    RelevanceIndicator(score: score)
                }
            }
            
            // Identifiers
            HStack(spacing: 12) {
                if let pmid = citation.pmid,
                   let url = URL(string: "https://pubmed.ncbi.nlm.nih.gov/\(pmid)") {
                    Link(destination: url) {
                        Label("PMID: \(pmid)", systemImage: "link")
                            .font(.caption)
                    }
                }
                
                if let doi = citation.doi,
                   let url = URL(string: "https://doi.org/\(doi)") {
                    Link(destination: url) {
                        Label("DOI", systemImage: "link")
                            .font(.caption)
                    }
                }
            }
            
            // Actions
            HStack {
                Button(action: { isExpanded.toggle() }) {
                    Label(
                        isExpanded ? "Show Less" : "Show More",
                        systemImage: isExpanded ? "chevron.up" : "chevron.down"
                    )
                    .font(.caption)
                }
                
                Spacer()
                
                Button(action: {}) {
                    Label("Add to Library", systemImage: "plus.square")
                        .font(.caption)
                }
                
                Button(action: {}) {
                    Label("Export", systemImage: "square.and.arrow.up")
                        .font(.caption)
                }
            }
            .buttonStyle(.plain)
        }
        .padding()
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(8)
    }
}

struct RelevanceIndicator: View {
    let score: Double
    
    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<5) { index in
                Circle()
                    .fill(Double(index) < score * 5 ? Color.accentColor : Color.gray.opacity(0.3))
                    .frame(width: 6, height: 6)
            }
            
            Text("\(Int(score * 100))%")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

struct EmptyCitationsView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.largeTitle)
                .foregroundColor(.secondary)
            
            Text("No Citations Yet")
                .font(.headline)
            
            Text("Citations from medical literature will appear here as they're referenced in the conversation")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

struct ReferencesView: View {
    let store: StoreOf<AppReducer>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("References")
                .font(.headline)
            
            Text("User-uploaded documents and references will appear here")
                .font(.body)
                .foregroundColor(.secondary)
            
            // TODO: Implement references view
        }
    }
}

struct ContextView: View {
    let store: StoreOf<AppReducer>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Conversation Context")
                .font(.headline)
            
            Text("Medical context, patient information, and relevant background will be displayed here")
                .font(.body)
                .foregroundColor(.secondary)
            
            // TODO: Implement context view
        }
    }
}

struct RelatedWorkView: View {
    let store: StoreOf<AppReducer>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Related Research")
                .font(.headline)
            
            Text("Similar studies and related research papers will be suggested here")
                .font(.body)
                .foregroundColor(.secondary)
            
            // TODO: Implement related work view
        }
    }
}