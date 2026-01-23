Here’s the same list with transparency and background guidance.

| Size (px) | Destination | Transparency | Background to use |
|-----------|-------------|--------------|-------------------|
| 1024×1024 | iOS App / App Store | No | Solid background required. Use your dark charcoal/near-black (not pure #000 if you want softer). |
| 180×180 | iOS App / Website (apple-touch-icon) | No | Solid background (same as app icon). |
| 167×167 | iOS App (iPad Pro) | No | Solid background. |
| 152×152 | iOS App (iPad) | No | Solid background. |
| 120×120 | iOS App (iPhone @2x) | No | Solid background. |
| 76×76 | iOS App (iPad @1x) | No | Solid background. |
| 60×60 | iOS App (variants) | No | Solid background. |
| 87×87 | iOS App (Settings/Spotlight variant) | No | Solid background. |
| 80×80 | iOS App (Spotlight variant) | No | Solid background. |
| 58×58 | iOS App (Settings variant) | No | Solid background. |
| 40×40 | iOS App (Spotlight base) | No | Solid background. |
| 29×29 | iOS App (Settings base) | No | Solid background. |
| favicon.ico (16/32/48 inside) | Website | Yes (OK) | Usually transparent is fine, but test on light/dark tabs. If your mark is gold, a tiny dark backing shape helps legibility. |
| 32×32 | Website favicon PNG | Yes (OK) | Prefer transparent with a strong silhouette; otherwise use a dark backing shape. |
| 16×16 | Website favicon PNG | Yes (OK) | Transparent is fine; keep the mark super simple (often just the "PH"/icon). |
| 48×48 | Website (often in ico) | Yes (OK) | Same as above. |
| 192×192 | PWA | Yes (recommended) | Transparent icon works well; also consider providing a maskable variant. |
| 512×512 | PWA | Yes (recommended) | Transparent recommended; provide a maskable variant if you care about Android. |
| 512×512 (maskable) | PWA | Yes | Transparent + extra padding so it survives circular/squircle masks. |
| 1200×630 | Website / Social (OG image) | No | Full canvas background (dark gradient is great), with logo + short tagline. |

What background should PitchHighway use?

For iOS app icon, you basically want a background that looks good on both light and dark Home Screens and doesn’t blend into iOS shadows:
	•	Use dark charcoal, not pure black (pure black can look like a cutout).
Something like #0B0B0F or your gradient-end tone.
	•	Put the mark in Brand Gold (#FFB933).
	•	Keep it flat (no noisy gradients) for the icon. Your app can have gradients; the icon should be clean.

For web favicons/PWA, transparency is fine, but if your mark is only gold, it can disappear on light tab bars. The safe trick:
	•	Use a simple dark circular/squircle backing behind the gold mark for favicon sizes.