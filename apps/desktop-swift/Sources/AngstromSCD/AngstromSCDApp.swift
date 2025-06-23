import SwiftUI
import ComposableArchitecture

@main
struct AngstromSCDApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var store = Store(initialState: AppReducer.State()) {
        AppReducer()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView(store: store)
                .frame(minWidth: 1200, idealWidth: 1400, minHeight: 800, idealHeight: 900)
                .background(LiquidGlassView())
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("About AngstromSCD") {
                    NSApp.orderFrontStandardAboutPanel(
                        options: [
                            .applicationName: "AngstromSCD",
                            .applicationVersion: "1.0.0",
                            .copyright: "© 2025 AngstromSCD Medical Research",
                            .credits: NSAttributedString(
                                string: "AI-powered medical research assistant for Sickle Cell Disease",
                                attributes: [.font: NSFont.systemFont(ofSize: 12)]
                            )
                        ]
                    )
                }
            }
            
            CommandGroup(replacing: .newItem) {
                Button("New Conversation") {
                    store.send(.newConversation)
                }
                .keyboardShortcut("n", modifiers: .command)
            }
            
            CommandMenu("AI Models") {
                Button("Configure Models...") {
                    store.send(.showModelConfiguration)
                }
                .keyboardShortcut(",", modifiers: [.command, .option])
            }
        }
        
        Settings {
            SettingsView(store: store)
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Configure window appearance
        if let window = NSApp.windows.first {
            window.titlebarAppearsTransparent = true
            window.backgroundColor = .clear
            window.isMovableByWindowBackground = true
            window.styleMask.insert(.fullSizeContentView)
        }
    }
    
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}