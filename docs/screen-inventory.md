# Screen & Design Inventory

A comprehensive inventory of all screens and design elements in the VoiceTutor mobile app.

---

## Table of Contents
1. [Screen Inventory](#screen-inventory)
2. [Color Palette](#color-palette)
3. [Design Tokens](#design-tokens)
4. [Typography](#typography)
5. [Category Gradients](#category-gradients)
6. [Reusable Components](#reusable-components)

---

## Screen Inventory

### Authentication Flow

| Screen | File | Description |
|--------|------|-------------|
| AuthGateView | `AuthGateView.swift` | Entry point router - directs users based on auth state |
| LandingView | `LandingView.swift` | Login options (Apple, Google, Email, Guest) |
| EmailAuthView | `EmailAuthView.swift` | Email sign-in and registration form |
| ClaimAccountView | `ClaimAccountView.swift` | Guest account upgrade to full account |

### Main Tabs (ContentView)

| Screen | File | Description |
|--------|------|-------------|
| HomeView | `HomeView.swift` | Dashboard with personal stats cards |
| JourneyView | `JourneyView.swift` | Skill tree progression map |
| PracticeView | `PracticeView.swift` | Exercise categories grid |
| SongsView | `SongsView.swift` | Song library browser |

### Game/Exercise Screens

| Screen | File | Description |
|--------|------|-------------|
| LessonDetailView | `LessonDetailView.swift` | Lesson content and exercise list |
| ExerciseGameView | `ExerciseGameView.swift` | Main exercise gameplay interface |
| HighwayGameView | `HighwayGameView.swift` | Song gameplay (landscape orientation) |
| WarmupGameView | `WarmupGameView.swift` | Voice warmup exercises |
| VoiceExplorationView | `VoiceExplorationView.swift` | Voice calibration gameplay |
| CompletionScreen | `CompletionScreen.swift` | Results and score display |

### Overlays/Sheets

| Screen | File | Description |
|--------|------|-------------|
| ProfileSheet | `ProfileSheet.swift` | User profile and settings |
| VoiceCalibrationSheet | `VoiceCalibrationSheet.swift` | Voice range calibration UI |
| AccountRequiredSheet | `AccountRequiredSheet.swift` | Prompts guest to create account |
| SubscriptionPaywall | `SubscriptionPaywall.swift` | Premium subscription options |

### Supporting Views

| Screen | File | Description |
|--------|------|-------------|
| SkillTreeView | `SkillTreeView.swift` | Visual skill progression tree |
| ExerciseCard | `ExerciseCard.swift` | Individual exercise display card |
| SongCard | `SongCard.swift` | Song item in library |
| PersonalCard | `PersonalCard.swift` | Home dashboard stat card |

---

## Color Palette

### Background Colors

| Name | Hex | Usage |
|------|-----|-------|
| Pure Black | `#000000` | Primary background |
| Deep Blue | `#0D0D26` | Gradient backgrounds |
| Dark Gray | `#1A1A1A` | Card backgrounds |
| Overlay Black | `#000000` @ 50% | Modal overlays |

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary White | `#FFFFFF` | Main text |
| Secondary Gray | `#808080` | Muted text, labels |
| Tertiary Gray | `#666666` | Disabled text |

### Accent Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Success Green | `#33CC4D` | rgb(51, 204, 77) | Correct actions, achievements |
| Warning Orange | `#E69933` | rgb(230, 153, 51) | Warnings, attention |
| Gold Orange | `#FFB933` | rgb(255, 185, 51) | Premium features, badges |
| System Purple | - | System | Decorative accents |
| System Blue | - | System | Primary UI actions |
| Error Red | `#CC4D4D` | rgb(204, 77, 77) | Errors, missed notes |

### Game-Specific Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Hit Note Green | `#4DE666` | rgb(77, 230, 102) | Successfully hit notes |
| Missed Note Red | `#CC4D4D` | rgb(204, 77, 77) | Missed notes |
| Active Note | `#D9D9D9` | rgb(217, 217, 217) | Current playable notes |
| Inactive Note | `#666666` | rgb(102, 102, 102) | Upcoming/past notes |
| Target Line | `#FFFFFF` @ 30% | - | Pitch target indicator |

### UI Element Colors

| Name | Hex | Opacity | Usage |
|------|-----|---------|-------|
| Card Background | `#FFFFFF` | 8% | Subtle card fills |
| Card Border | `#FFFFFF` | 10% | Card outlines |
| Pressed State | `#FFFFFF` | 15% | Button press feedback |
| Divider | `#FFFFFF` | 10% | Section separators |

---

## Design Tokens

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4pt | Tight spacing |
| `sm` | 8pt | Small gaps |
| `md` | 12pt | Standard spacing |
| `lg` | 16pt | Section spacing |
| `xl` | 20pt | Card padding |
| `xxl` | 24pt | Major sections |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Small | 8pt | Small elements, badges |
| Medium | 12pt | Buttons, small cards |
| Large | 16pt | Cards, sheets |
| XLarge | 20pt | Large cards, modals |
| Pill | 50% | Circular buttons |

### Button Dimensions

| Token | Value | Usage |
|-------|-------|-------|
| Height - Primary | 50pt | Main action buttons |
| Height - Secondary | 44pt | Secondary actions |
| Min Width | 120pt | Minimum button width |
| Icon Size | 24pt | Button icons |

### Opacity Levels

| Token | Value | Usage |
|-------|-------|-------|
| Subtle | 0.08 | Background fills |
| Light | 0.10 | Borders, dividers |
| Medium | 0.15 | Hover/press states |
| Heavy | 0.30 | Overlays |
| Solid | 0.50 | Modal backgrounds |

---

## Typography

### Font Weights

| Weight | SwiftUI | Usage |
|--------|---------|-------|
| Bold | `.bold` | Headlines, buttons |
| Semibold | `.semibold` | Subheadings, labels |
| Regular | `.regular` | Body text |

### Text Styles

| Style | SwiftUI | Usage |
|-------|---------|-------|
| Large Title | `.largeTitle` | Screen titles |
| Title | `.title` | Section headers |
| Title 2 | `.title2` | Card titles |
| Title 3 | `.title3` | Subsection headers |
| Headline | `.headline` | Emphasized body |
| Body | `.body` | Main content |
| Callout | `.callout` | Supporting info |
| Caption | `.caption` | Small labels, metadata |
| Caption 2 | `.caption2` | Extra small text |

### Text Hierarchy Example

```
Large Title (Bold)    - Screen name
Title (Bold)          - Section header
Headline (Semibold)   - Card title
Body (Regular)        - Description text
Caption (Regular)     - Metadata, timestamps
```

---

## Category Gradients

Exercise categories use distinctive gradient color schemes:

### Pitch Matching
```
Start: Purple (#8B5CF6)
End: Blue (#3B82F6)
Direction: Leading to Trailing
```

### Scale Runs
```
Start: Green (#10B981)
End: Teal (#14B8A6)
Direction: Leading to Trailing
```

### Interval Training
```
Start: Orange (#F97316)
End: Red (#EF4444)
Direction: Leading to Trailing
```

### Highway Mode (Songs)
```
Start: Cyan (#06B6D4)
End: Blue (#3B82F6)
Direction: Leading to Trailing
```

### Warmup Exercises
```
Start: Pink (#EC4899)
End: Purple (#8B5CF6)
Direction: Leading to Trailing
```

---

## Reusable Components

### Button Styles

| Component | File | Description |
|-----------|------|-------------|
| PrimaryButtonStyle | `ButtonStyles.swift` | Main CTA buttons - filled, bold |
| SecondaryButtonStyle | `ButtonStyles.swift` | Secondary actions - outlined |
| GuestButtonStyle | `ButtonStyles.swift` | Guest/skip actions - subtle |
| IconButtonStyle | `ButtonStyles.swift` | Icon-only circular buttons |

### Cards

| Component | File | Description |
|-----------|------|-------------|
| PersonalCard | `PersonalCard.swift` | Home dashboard stat display |
| StreakCard | `StreakCard.swift` | Daily streak tracker |
| VoiceRangeCard | `VoiceRangeCard.swift` | Vocal range visualization |
| ExerciseCard | `ExerciseCard.swift` | Exercise item with progress |
| SongCard | `SongCard.swift` | Song library item |
| LessonCard | `LessonCard.swift` | Lesson item display |

### Badges & Indicators

| Component | File | Description |
|-----------|------|-------------|
| AccessBadge | `AccessBadge.swift` | Lock/premium indicator (orange/gold) |
| ProgressRing | `ProgressRing.swift` | Circular progress indicator |
| ScoreDisplay | `ScoreDisplay.swift` | Numeric score with styling |
| DifficultyBadge | `DifficultyBadge.swift` | Easy/Medium/Hard labels |

### Navigation & Layout

| Component | File | Description |
|-----------|------|-------------|
| TabBar | `ContentView.swift` | Bottom navigation tabs |
| NavHeader | `NavHeader.swift` | Screen header with back button |
| SheetHeader | `SheetHeader.swift` | Modal sheet header |
| SectionHeader | `SectionHeader.swift` | Content section divider |

### Game UI Elements

| Component | File | Description |
|-----------|------|-------------|
| PitchMeter | `PitchMeter.swift` | Real-time pitch visualization |
| NoteBar | `NoteBar.swift` | Individual note in highway |
| TargetLine | `TargetLine.swift` | Pitch target indicator |
| ScorePopup | `ScorePopup.swift` | Score feedback animation |
| CountdownOverlay | `CountdownOverlay.swift` | Game start countdown |

---

## Visual Reference

### Dark Theme Foundation
The app uses a consistent dark theme with:
- Pure black (`#000000`) as the base
- Deep blue gradients for depth
- White text for contrast
- Colored accents for interactivity

### Card Pattern
Standard card appearance:
```
Background: White @ 8% opacity
Border: White @ 10% opacity, 1pt
Corner Radius: 16pt
Padding: 20pt
Shadow: None (relies on border/fill contrast)
```

### Button Pattern
Primary button appearance:
```
Background: System Blue (solid)
Text: White, Bold
Height: 50pt
Corner Radius: 12pt
Press State: 15% white overlay
```

---

*Last updated: January 2026*
