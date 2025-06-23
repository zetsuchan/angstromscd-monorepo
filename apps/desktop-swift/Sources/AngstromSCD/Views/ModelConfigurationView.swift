import SwiftUI
import ComposableArchitecture

struct ModelConfigurationView: View {
    let store: StoreOf<AppReducer>
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            SettingsView(store: store)
                .navigationTitle("Model Configuration")
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
        }
    }
}