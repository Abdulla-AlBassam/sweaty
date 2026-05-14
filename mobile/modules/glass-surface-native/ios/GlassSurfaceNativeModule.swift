import ExpoModulesCore

public class GlassSurfaceNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GlassSurfaceNative")

    View(GlassSurfaceNativeView.self) {
      Prop("cornerRadius") { (view: GlassSurfaceNativeView, radius: Double) in
        view.setCornerRadius(CGFloat(radius))
      }

      Prop("tintColor") { (view: GlassSurfaceNativeView, tint: String?) in
        view.setTintColor(tint)
      }
    }
  }
}
