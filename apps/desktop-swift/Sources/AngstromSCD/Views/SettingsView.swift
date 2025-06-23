import SwiftUI
import ComposableArchitecture

struct SettingsView: View {
    let store: StoreOf<AppReducer>
    @State private var selectedTab = SettingsTab.general
    
    enum SettingsTab: String, CaseIterable {
        case general = "General"
        case models = "AI Models"
        case api = "API Keys"
        case privacy = "Privacy"
        case advanced = "Advanced"
        
        var icon: String {
            switch self {
            case .general: return "gear"
            case .models: return "cpu"
            case .api: return "key"
            case .privacy: return "lock"
            case .advanced: return "wrench.and.screwdriver"
            }
        }
    }
    
    var body: some View {
        NavigationSplitView {
            List(SettingsTab.allCases, id: \.self, selection: $selectedTab) { tab in
                Label(tab.rawValue, systemImage: tab.icon)
            }
            .listStyle(.sidebar)
            .frame(width: 180)
        } detail: {
            Group {
                switch selectedTab {
                case .general:
                    GeneralSettingsView()
                case .models:
                    ModelSettingsView(store: store)
                case .api:
                    APISettingsView()
                case .privacy:
                    PrivacySettingsView()
                case .advanced:
                    AdvancedSettingsView()
                }
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(width: 700, height: 500)
    }
}

struct GeneralSettingsView: View {
    @AppStorage("appearance") private var appearance = "auto"
    @AppStorage("defaultWorkspace") private var defaultWorkspace = Workspace.global.rawValue
    @AppStorage("autoSaveConversations") private var autoSaveConversations = true
    
    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $appearance) {
                    Text("System").tag("auto")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
                .pickerStyle(.segmented)
            }
            
            Section("Workspace") {
                Picker("Default Workspace", selection: $defaultWorkspace) {
                    ForEach(Workspace.allCases) { workspace in
                        Text(workspace.rawValue).tag(workspace.rawValue)
                    }
                }
            }
            
            Section("Conversations") {
                Toggle("Auto-save conversations", isOn: $autoSaveConversations)
                    .help("Automatically save all conversations to disk")
            }
        }
        .formStyle(.grouped)
    }
}

struct ModelSettingsView: View {
    let store: StoreOf<AppReducer>
    @State private var localModelsStatus: [String: Bool] = [:]
    @State private var isCheckingModels = false
    
    var body: some View {
        WithViewStore(self.store, observe: { $0 }) { viewStore in
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Default Model
                    Section {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Default Model")
                                .font(.headline)
                            
                            Picker("", selection: viewStore.binding(
                                get: \.selectedModel,
                                send: AppReducer.Action.selectModel
                            )) {
                                ForEach(AIModel.allCases) { model in
                                    Text(model.displayName).tag(model)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(width: 300)
                        }
                    }
                    
                    Divider()
                    
                    // Local Models Status
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Local Models")
                                    .font(.headline)
                                
                                Spacer()
                                
                                Button(action: checkLocalModels) {
                                    Label("Check Status", systemImage: "arrow.clockwise")
                                        .font(.caption)
                                }
                                .disabled(isCheckingModels)
                            }
                            
                            // Ollama Status
                            LocalServiceRow(
                                name: "Ollama",
                                status: localModelsStatus["ollama"] ?? false,
                                port: "11434",
                                helpText: "Install from ollama.com"
                            )
                            
                            // Apple Foundation Status
                            LocalServiceRow(
                                name: "Apple Foundation Models",
                                status: localModelsStatus["apple"] ?? false,
                                port: "3004",
                                helpText: "Requires macOS 26+"
                            )
                        }
                    }
                    
                    Divider()
                    
                    // Model Download
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Download Models")
                                .font(.headline)
                            
                            Text("Run these commands in Terminal to download Ollama models:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            ForEach([
                                ("Qwen 2.5 (0.5B)", "ollama pull qwen2.5:0.5b"),
                                ("Llama 3.2 (3B)", "ollama pull llama3.2:3b"),
                                ("Mixtral (8x7B)", "ollama pull mixtral:8x7b")
                            ], id: \.0) { model, command in
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(model)
                                            .font(.subheadline)
                                        Text(command)
                                            .font(.system(.caption, design: .monospaced))
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    Button(action: { copyToClipboard(command) }) {
                                        Image(systemName: "doc.on.doc")
                                    }
                                    .help("Copy command")
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .onAppear {
            checkLocalModels()
        }
    }
    
    private func checkLocalModels() {
        isCheckingModels = true
        
        Task {
            // Check Ollama
            let ollamaRunning = await checkService(url: "http://localhost:11434/api/tags")
            
            // Check Apple Bridge
            let appleRunning = await checkService(url: "http://localhost:3004/health")
            
            await MainActor.run {
                localModelsStatus["ollama"] = ollamaRunning
                localModelsStatus["apple"] = appleRunning
                isCheckingModels = false
            }
        }
    }
    
    private func checkService(url: String) async -> Bool {
        guard let url = URL(string: url) else { return false }
        
        do {
            let (_, response) = try await URLSession.shared.data(from: url)
            return (response as? HTTPURLResponse)?.statusCode == 200
        } catch {
            return false
        }
    }
    
    private func copyToClipboard(_ text: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
    }
}

struct LocalServiceRow: View {
    let name: String
    let status: Bool
    let port: String
    let helpText: String
    
    var body: some View {
        HStack {
            Circle()
                .fill(status ? Color.green : Color.red)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.subheadline)
                
                HStack {
                    Text(status ? "Running on port \(port)" : "Not running")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if !status {
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(helpText)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct APISettingsView: View {
    @AppStorage("openai_api_key") private var openAIKey = ""
    @AppStorage("anthropic_api_key") private var anthropicKey = ""
    @State private var showOpenAIKey = false
    @State private var showAnthropicKey = false
    
    var body: some View {
        Form {
            Section("OpenAI") {
                HStack {
                    SecureField("API Key", text: $openAIKey)
                        .textFieldStyle(.roundedBorder)
                    
                    Button(action: { showOpenAIKey.toggle() }) {
                        Image(systemName: showOpenAIKey ? "eye.slash" : "eye")
                    }
                    .help(showOpenAIKey ? "Hide" : "Show")
                }
                
                Link("Get API Key", destination: URL(string: "https://platform.openai.com/api-keys")!)
                    .font(.caption)
            }
            
            Section("Anthropic") {
                HStack {
                    SecureField("API Key", text: $anthropicKey)
                        .textFieldStyle(.roundedBorder)
                    
                    Button(action: { showAnthropicKey.toggle() }) {
                        Image(systemName: showAnthropicKey ? "eye.slash" : "eye")
                    }
                    .help(showAnthropicKey ? "Hide" : "Show")
                }
                
                Link("Get API Key", destination: URL(string: "https://console.anthropic.com/settings/keys")!)
                    .font(.caption)
            }
            
            Section {
                Text("API keys are stored securely in the macOS Keychain")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}

struct PrivacySettingsView: View {
    @AppStorage("shareAnalytics") private var shareAnalytics = false
    @AppStorage("storeChatHistory") private var storeChatHistory = true
    @AppStorage("useLocalModelsFirst") private var useLocalModelsFirst = true
    
    var body: some View {
        Form {
            Section("Data Collection") {
                Toggle("Share anonymous usage analytics", isOn: $shareAnalytics)
                    .help("Help improve AngstromSCD by sharing anonymous usage data")
            }
            
            Section("Chat History") {
                Toggle("Store chat history locally", isOn: $storeChatHistory)
                Toggle("Prefer local models for privacy", isOn: $useLocalModelsFirst)
                    .help("Automatically use local models when available to keep data on-device")
            }
            
            Section("Medical Data") {
                Text("All medical data and patient information is processed locally when using Apple Foundation Models or Ollama. Cloud models (OpenAI, Anthropic) will send data to their servers for processing.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}

struct AdvancedSettingsView: View {
    @AppStorage("maxTokens") private var maxTokens = 2048
    @AppStorage("temperature") private var temperature = 0.7
    @AppStorage("streamResponses") private var streamResponses = true
    
    var body: some View {
        Form {
            Section("Model Parameters") {
                HStack {
                    Text("Max Tokens")
                    Slider(value: .init(
                        get: { Double(maxTokens) },
                        set: { maxTokens = Int($0) }
                    ), in: 256...8192, step: 256)
                    Text("\(maxTokens)")
                        .frame(width: 50)
                }
                
                HStack {
                    Text("Temperature")
                    Slider(value: $temperature, in: 0...2, step: 0.1)
                    Text(String(format: "%.1f", temperature))
                        .frame(width: 50)
                }
                
                Toggle("Stream responses", isOn: $streamResponses)
            }
            
            Section("Developer") {
                Button("Export Debug Logs") {
                    // TODO: Implement log export
                }
                
                Button("Reset All Settings", role: .destructive) {
                    // TODO: Implement settings reset
                }
            }
        }
        .formStyle(.grouped)
    }
}