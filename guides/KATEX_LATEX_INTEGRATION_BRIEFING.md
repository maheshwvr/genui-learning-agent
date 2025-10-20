# KaTeX LaTeX Integration Briefing

## Project Overview

This briefing outlines the implementation of KaTeX LaTeX math rendering support across the Learn page chat lesson components in the genui-learning-agent project. The goal is to enable mathematical equation rendering using LaTeX syntax throughout all lesson content, including MCQ questions/options, True/False statements, and Flashcard content.

## Current Architecture Analysis

### Markdown Rendering Pattern
The application currently uses `react-markdown` in four key components, each with their own custom markdown component configurations:

1. **`chat.tsx`** - Main chat interface with assistant messages
2. **`mcq-component.tsx`** - Multiple choice question rendering
3. **`tf-component.tsx`** - True/False statement rendering  
4. **`flashcard-component.tsx`** - Flashcard concept/definition rendering

### Current Implementation Issues
- **Code Duplication**: Each component defines its own `markdownComponents` object with identical styling
- **Inconsistent Styling**: While similar, there are slight variations across components
- **No LaTeX Support**: None of the current implementations support mathematical equation rendering
- **Maintenance Overhead**: Any styling changes require updates across 4 separate files

## Technical Implementation Strategy

### 1. Centralized Markdown Renderer
Create a shared utility that:
- Consolidates all markdown component styling into a single, reusable module
- Integrates KaTeX through remark-math and rehype-katex plugins
- Provides consistent styling across all lesson components
- Supports both inline (`$...$`) and block (`$$...$$`) LaTeX syntax

### 2. Dependency Management
Required packages to add:
- `katex` - Core KaTeX library for LaTeX rendering
- `remark-math` - Remark plugin to parse LaTeX syntax in markdown
- `rehype-katex` - Rehype plugin to render parsed LaTeX using KaTeX
- `@types/katex` - TypeScript definitions for KaTeX

### 3. CSS Integration
KaTeX requires CSS imports for proper equation styling. This will be added to the global CSS file to ensure math renders correctly across all components.

## File Architecture & Connections

### Core Files to Modify

#### 1. `nextjs/package.json`
**Purpose**: Add KaTeX dependencies  
**Changes**: Add katex, remark-math, rehype-katex packages  
**Impact**: Enables LaTeX rendering capabilities project-wide

#### 2. `nextjs/src/lib/markdown-renderer.tsx` (NEW FILE)
**Purpose**: Centralized markdown rendering utility  
**Functionality**:
- Exports a reusable `MarkdownRenderer` component
- Configures remark-math and rehype-katex plugins
- Defines consolidated markdown component styling
- Provides TypeScript interfaces for props

#### 3. `nextjs/src/app/globals.css`
**Purpose**: Global CSS imports  
**Changes**: Add KaTeX CSS import  
**Impact**: Ensures LaTeX equations render with proper styling

#### 4. `nextjs/src/components/ui/chat.tsx`
**Purpose**: Main chat interface  
**Current State**: Uses ReactMarkdown with custom components inline  
**Changes**: Replace ReactMarkdown usage with shared MarkdownRenderer  
**Impact**: Chat messages will support LaTeX math rendering

#### 5. `nextjs/src/components/ui/mcq-component.tsx`
**Purpose**: Multiple choice question rendering  
**Current State**: Defines local markdownComponents object, uses ReactMarkdown  
**Changes**: Remove local markdownComponents, import and use MarkdownRenderer  
**Impact**: MCQ questions and options will support LaTeX equations

#### 6. `nextjs/src/components/ui/tf-component.tsx`
**Purpose**: True/False statement rendering  
**Current State**: Defines local markdownComponents object, uses ReactMarkdown  
**Changes**: Remove local markdownComponents, import and use MarkdownRenderer  
**Impact**: T/F statements and explanations will support LaTeX equations

#### 7. `nextjs/src/components/ui/flashcard-component.tsx`
**Purpose**: Flashcard concept/definition rendering  
**Current State**: Defines local markdownComponents object, uses ReactMarkdown  
**Changes**: Remove local markdownComponents, import and use MarkdownRenderer  
**Impact**: Flashcard concepts and definitions will support LaTeX equations

## Implementation Approach

### Phase 1: Foundation Setup
1. Update package.json with required dependencies
2. Create the shared markdown renderer utility
3. Add KaTeX CSS imports to globals.css

### Phase 2: Component Integration
1. Update chat.tsx to use the shared renderer
2. Refactor mcq-component.tsx to remove duplication and use shared renderer
3. Refactor tf-component.tsx to remove duplication and use shared renderer
4. Refactor flashcard-component.tsx to remove duplication and use shared renderer

### Phase 3: Testing & Validation
1. Verify LaTeX rendering works in all components
2. Ensure no visual regressions in existing markdown content
3. Test both inline and block math equation rendering

## Expected Benefits

### Technical Benefits
- **DRY Principle**: Eliminates code duplication across 4 components
- **Maintainability**: Single location for markdown styling updates
- **Consistency**: Guaranteed identical rendering across all lesson components
- **Feature Parity**: LaTeX support available everywhere markdown is used

### User Experience Benefits
- **Rich Mathematical Content**: Equations render properly instead of as raw LaTeX
- **Professional Appearance**: Clean, typeset mathematical expressions
- **Learning Enhancement**: Mathematical concepts displayed clearly

## LaTeX Usage Patterns

The implementation will support standard LaTeX syntax:

### Inline Math
```
The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
```

### Block Math  
```
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### Common Mathematical Expressions
- Fractions: `\frac{numerator}{denominator}`
- Square roots: `\sqrt{expression}`
- Superscripts: `x^2`
- Subscripts: `x_1`
- Greek letters: `\alpha`, `\beta`, `\gamma`
- Integrals: `\int`, `\sum`, `\prod`

## Risk Mitigation

### Potential Issues
1. **Bundle Size**: KaTeX adds ~350KB to the bundle
2. **Performance**: Math rendering may impact component render times
3. **Accessibility**: Screen readers may not handle math notation properly

### Mitigation Strategies
1. **Code Splitting**: KaTeX can be loaded asynchronously if needed
2. **Caching**: Math expressions are cached after first render
3. **Fallback**: Raw LaTeX text displays if KaTeX fails to load

## Success Criteria

### Functional Requirements
- [ ] LaTeX equations render correctly in all lesson components
- [ ] Both inline and block math syntax supported
- [ ] No visual regressions in existing markdown content
- [ ] Consistent styling across all components

### Technical Requirements
- [ ] Single source of truth for markdown component styling
- [ ] TypeScript support maintained throughout
- [ ] Bundle size impact minimized
- [ ] Performance impact negligible

## Conclusion

This implementation provides a robust, maintainable solution for LaTeX math rendering across the entire Learn page experience. By centralizing markdown rendering and adding KaTeX support, we achieve both better code organization and enhanced mathematical content capabilities, following the "simple and right the first time" principle while maintaining long-term maintainability.