# Onboarding Modal Implementation Briefing

## Project Overview

This is a Next.js-based learning platform called "Itergora" that helps tertiary students transform study materials into interactive lessons. The application features a clean, professional design following an 8-point grid system with smooth animations and elegant styling. The platform includes file upload, AI-powered chat interactions, and flashcard review systems.

## Design Philosophy Adherence

- **Professional & Elegant**: Clean, robust interface that feels naturally pleasant
- **8-Point Grid**: All spacing uses multiples of 4px or 8px for optimal readability
- **Smooth Animations**: Natural flow without being bold or striking
- **Salesforce Mantra**: Simple solutions done right the first time
- **Code Maintainability**: Clean, well-structured implementations

## Task Overview

Implement an onboarding feature that introduces users to the three main app functions:
1. Upload materials
2. Chat with Itergora
3. Review Flashcards

The feature will be triggered by an information button (with "i" icon) placed to the left of the existing feedback button in the top toolbar.

## Essential File Architecture

### Current Architecture Context

The application uses:
- **Next.js 14+** with TypeScript
- **Tailwind CSS** with custom color system
- **Radix UI** for accessible components
- **Lucide React** for consistent iconography
- **Custom component patterns** following shadcn/ui conventions

### Key Files and Their Roles

#### 1. `nextjs/src/components/AppLayout.tsx` (MODIFY)
**Current State**: Main layout wrapper with:
- Sidebar navigation with AnimatedNavButtons
- Top toolbar containing feedback button (`HandHeart` icon)
- User dropdown menu
- Responsive sidebar toggle

**Required Changes**:
- Add onboarding button with `Info` icon from lucide-react
- Position it to the left of the existing feedback button (line ~100-107)
- Maintain consistent styling with feedback button pattern
- Add state management for modal visibility

**Implementation Pattern**:
```tsx
// Add state
const [isOnboardingOpen, setOnboardingOpen] = useState(false);

// Add button before feedback button
<button
  onClick={() => setOnboardingOpen(true)}
  className="bg-primary-100 hover:bg-primary-200 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
  title="How to use Itergora"
>
  <Info className="h-5 w-5" strokeWidth={1.5} />
</button>
```

#### 2. `nextjs/src/components/ui/onboarding-modal.tsx` (CREATE)
**Purpose**: New glassmorphism modal component with staged animations

**Key Features**:
- **Glassmorphism Design**: Dark purple background with transparency and blur effects
- **Staged Animations**: Three cards appearing sequentially with 500ms delays
- **Animation Style**: Cards "slam" into view from outside the page (transform from scale/opacity)
- **Full-Screen Coverage**: Takes up almost entire viewport
- **Responsive Design**: Adapts to different screen sizes

**Component Structure**:
```tsx
interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Three onboarding steps
const steps = [
  {
    title: "Upload Materials",
    description: "Add your study materials to get started",
    image: "#file:icon_white.png", // Placeholder
    delay: 0
  },
  {
    title: "Chat with Itergora", 
    description: "Ask questions and explore your materials",
    image: "#file:icon_white.png", // Placeholder
    delay: 500
  },
  {
    title: "Review Flashcards",
    description: "Study with AI-generated flashcards",
    image: "#file:icon_white.png", // Placeholder  
    delay: 1000
  }
];
```

**Technical Implementation**:
- Use Radix Dialog as base (consistent with existing patterns)
- Custom glassmorphism overlay instead of default dark backdrop
- Framer Motion or CSS animations for staged card appearance
- Each card animates in with transform + opacity transition
- Smooth entry from outside viewport bounds

#### 3. `nextjs/src/app/globals.css` (MODIFY)
**Required Additions**:

**Glassmorphism Styles**:
```css
/* Glassmorphism backdrop for onboarding */
.onboarding-backdrop {
  background: rgba(124, 58, 237, 0.4); /* Purple-600 with opacity */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Glassmorphism card background */
.onboarding-card {
  background: rgba(139, 69, 219, 0.2); /* Purple-500 with low opacity */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(167, 139, 250, 0.2); /* Purple-300 border */
}
```

**Staged Animation Keyframes**:
```css
@keyframes onboardingSlam {
  0% {
    opacity: 0;
    transform: translateZ(-100px) scale(0.8);
  }
  60% {
    opacity: 0.8;
    transform: translateZ(20px) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translateZ(0) scale(1);
  }
}

.onboarding-card-enter {
  animation: onboardingSlam 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

### Reference Files for Implementation

#### 4. `nextjs/src/components/ui/dialog.tsx` (REFERENCE)
**Usage**: Foundation for modal structure
- `Dialog`, `DialogContent`, `DialogOverlay` components
- Accessibility patterns and keyboard handling
- Portal rendering and z-index management
- Current styling: `bg-black/80` overlay, `z-50` content positioning

#### 5. `nextjs/src/components/ui/button.tsx` (REFERENCE)  
**Usage**: Consistent button styling patterns
- Button variants and sizing system
- Color scheme application
- Hover and focus states
- Icon integration patterns

#### 6. `nextjs/tailwind.config.ts` (REFERENCE)
**Usage**: Color system and design tokens
- Purple color palette: `primary-300` through `primary-900`
- Spacing system (8-point grid values)
- Border radius values: `lg`, `md`, `sm`
- Animation timing functions

**Available Purple Colors**:
- `--color-primary-300: #d8b4fe` (light purple)
- `--color-primary-500: #a855f7` (medium purple) 
- `--color-primary-600: #9333ea` (dark purple base)
- `--color-primary-700: #7e22ce` (darker purple)

#### 7. `nextjs/src/components/ui/animated-button.tsx` (REFERENCE)
**Usage**: Animation timing and easing patterns
- Mouse interaction animations
- Smooth transition patterns: `duration-200`, `ease-in-out`
- Color-adaptive styling based on className detection
- Purple color animations: `bg-purple-400`, `bg-purple-300`

## Implementation Strategy

### Phase 1: Button Integration (AppLayout.tsx)
1. Import `Info` icon from lucide-react
2. Add state management for modal visibility
3. Insert button before feedback button with consistent styling
4. Ensure responsive behavior matches existing patterns

### Phase 2: Modal Component Creation (onboarding-modal.tsx)
1. Create base component using Radix Dialog pattern
2. Implement glassmorphism styling with CSS classes
3. Add three-step content structure with placeholder images
4. Implement staged animation system with proper delays

### Phase 3: Styling Implementation (globals.css)
1. Add glassmorphism backdrop and card styles
2. Implement slam animation keyframes
3. Ensure cross-browser compatibility with vendor prefixes
4. Test animation performance and smoothness

### Phase 4: Integration & Polish
1. Connect modal to button trigger in AppLayout
2. Test modal behavior across screen sizes
3. Verify accessibility compliance
4. Ensure animations respect user preferences (prefers-reduced-motion)

## Technical Specifications

### Animation Timing
- **Card Delay**: 500ms between each step appearance
- **Animation Duration**: 600ms per card entry
- **Easing Function**: `cubic-bezier(0.34, 1.56, 0.64, 1)` for bounce effect
- **Transform Sequence**: Scale 0.8 → 1.05 → 1.0 with Z-axis translation

### Glassmorphism Values
- **Backdrop Blur**: 12px for main overlay
- **Card Blur**: 8px for individual step cards
- **Opacity Range**: 0.2-0.4 for background colors
- **Border Opacity**: 0.2 for subtle definition

### Responsive Behavior
- **Desktop**: Full-width modal with centered content grid
- **Tablet**: Maintain glassmorphism with adjusted spacing
- **Mobile**: Stack cards vertically with reduced blur for performance

### Accessibility Considerations
- Modal focus trapping (handled by Radix Dialog)
- Keyboard navigation support
- Screen reader announcements for staged content
- Respect for reduced motion preferences
- High contrast mode compatibility

## Success Criteria

1. **Visual Consistency**: Matches existing design system and 8-point grid
2. **Smooth Performance**: Animations run at 60fps without jank
3. **Accessibility Compliance**: Meets WCAG 2.1 AA standards
4. **Responsive Design**: Works seamlessly across all device sizes
5. **Code Quality**: Maintainable, well-typed TypeScript with clear patterns
6. **User Experience**: Natural, elegant interaction that feels "gently pleasant"

## File Dependencies

```
AppLayout.tsx
├── Info (lucide-react)
├── useState (react)
└── OnboardingModal component

OnboardingModal.tsx  
├── Dialog components (ui/dialog)
├── Button component (ui/button)
├── Info icon (lucide-react)
├── Custom CSS classes (globals.css)
└── Animation utilities

globals.css
├── Glassmorphism variables
├── Animation keyframes
├── Responsive breakpoint styles
└── Browser compatibility prefixes
```

This implementation will provide a professional, elegant onboarding experience that seamlessly integrates with the existing application architecture while introducing users to the core platform functionality in a visually appealing and accessible manner.