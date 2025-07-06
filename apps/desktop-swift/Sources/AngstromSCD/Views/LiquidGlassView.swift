import SwiftUI

struct LiquidGlassView: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .hudWindow
        view.blendingMode = .behindWindow
        view.state = .active
        view.isEmphasized = true
        return view
    }
    
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        // No updates needed
    }
}

// Modern material background view
struct MaterialBackgroundView: View {
    var body: some View {
        ZStack {
            // Base gradient
            LinearGradient(
                colors: [
                    Color(NSColor.controlBackgroundColor).opacity(0.8),
                    Color(NSColor.windowBackgroundColor).opacity(0.6)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Noise overlay for texture
            GeometryReader { geometry in
                Canvas { context, size in
                    for _ in 0..<500 {
                        let x = Double.random(in: 0...Double(size.width))
                        let y = Double.random(in: 0...Double(size.height))
                        let opacity = Double.random(in: 0.02...0.05)
                        
                        context.fill(
                            Path(ellipseIn: CGRect(x: CGFloat(x), y: CGFloat(y), width: 1, height: 1)),
                            with: .color(.white.opacity(opacity))
                        )
                    }
                }
            }
            .blur(radius: 0.5)
        }
        .ignoresSafeArea()
    }
}

// Animated gradient for accent elements
struct AnimatedGradientView: View {
    @State private var animationProgress: CGFloat = 0
    let colors: [Color]
    
    init(colors: [Color] = [.blue, .purple, .pink]) {
        self.colors = colors
    }
    
    var body: some View {
        LinearGradient(
            colors: colors,
            startPoint: UnitPoint(x: animationProgress, y: 0),
            endPoint: UnitPoint(x: 1 - animationProgress, y: 1)
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 10).repeatForever(autoreverses: true)) {
                animationProgress = 1
            }
        }
    }
}