import ExpoModulesCore
import UIKit

final class GlassSurfaceNativeView: ExpoView {
  private let effectView: UIVisualEffectView

  required init(appContext: AppContext? = nil) {
    if #available(iOS 26.0, *) {
      let glass = UIGlassEffect()
      self.effectView = UIVisualEffectView(effect: glass)
    } else {
      let blur = UIBlurEffect(style: .systemMaterialDark)
      self.effectView = UIVisualEffectView(effect: blur)
    }

    super.init(appContext: appContext)

    clipsToBounds = true
    effectView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(effectView)
    NSLayoutConstraint.activate([
      effectView.topAnchor.constraint(equalTo: topAnchor),
      effectView.leadingAnchor.constraint(equalTo: leadingAnchor),
      effectView.trailingAnchor.constraint(equalTo: trailingAnchor),
      effectView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  func setCornerRadius(_ radius: CGFloat) {
    layer.cornerRadius = radius
    layer.cornerCurve = .continuous
    effectView.layer.cornerRadius = radius
    effectView.layer.cornerCurve = .continuous
    effectView.clipsToBounds = true
  }

  func setTintColor(_ tintHex: String?) {
    guard let hex = tintHex, let color = UIColor(hex: hex) else {
      effectView.contentView.backgroundColor = .clear
      return
    }
    effectView.contentView.backgroundColor = color
  }
}

private extension UIColor {
  convenience init?(hex: String) {
    var sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if sanitized.hasPrefix("#") { sanitized.removeFirst() }

    guard sanitized.count == 6 || sanitized.count == 8 else { return nil }

    var value: UInt64 = 0
    guard Scanner(string: sanitized).scanHexInt64(&value) else { return nil }

    let r, g, b, a: CGFloat
    if sanitized.count == 6 {
      r = CGFloat((value >> 16) & 0xFF) / 255.0
      g = CGFloat((value >> 8) & 0xFF) / 255.0
      b = CGFloat(value & 0xFF) / 255.0
      a = 1.0
    } else {
      r = CGFloat((value >> 24) & 0xFF) / 255.0
      g = CGFloat((value >> 16) & 0xFF) / 255.0
      b = CGFloat((value >> 8) & 0xFF) / 255.0
      a = CGFloat(value & 0xFF) / 255.0
    }

    self.init(red: r, green: g, blue: b, alpha: a)
  }
}
