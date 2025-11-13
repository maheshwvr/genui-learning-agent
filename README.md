# Itergora - Intelligent Learning Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.1.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vercel AI SDK](https://img.shields.io/badge/AI%20SDK-4.3.19-purple)](https://sdk.vercel.ai/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-orange)](https://ai.google.dev/)

> **A sophisticated learning tool designed for tertiary students** - Transform your study materials into interactive, intelligent learning experiences with AI-powered conversations, adaptive assessments, and personalized flashcard systems.

---

## 🎓 Overview

Itergora is a professional, elegant learning solution that revolutionizes how students interact with their study materials. Built with modern web technologies and powered by Gemini, the platform creates an adaptive learning environment where students can upload their course materials and engage in intelligent conversations with an AI tutor that understands their content.

---

## 🚀 Core Learning Features

### 📚 **Intelligent Material Processing**
- **Multi-format Support**: Upload PDFs, documents, presentations, and text files (up to 100MB)
- **AI-Powered Context**: Google Gemini processes materials to understand content and structure
- **Course Organization**: Organize materials by courses with optional topic tagging
- **TUS Resumable Uploads**: Robust file upload with pause/resume capabilities

### 💬 **Adaptive AI Conversations**
- **Context-Aware Responses**: AI understands your uploaded materials and provides relevant answers
- **Natural Learning Flow**: Conversational interface that adapts to your knowledge level
- **Uncertainty Detection**: AI automatically detects when you need additional practice
- **Material References**: Responses grounded in your specific course content

### 🎯 **Generative UI Assessments**
The platform features three types of intelligent assessments that appear dynamically based on learning context:

#### **Multiple Choice Questions (MCQ)**
- **Smart Generation**: AI creates relevant questions to test concept application
- **Contextual Options**: Plausible distractors based on common misconceptions
- **Immediate Feedback**: Detailed explanations for both correct and incorrect answers

#### **True/False Statements**
- **Misconception Targeting**: Addresses common areas of confusion
- **Nuanced Exploration**: Tests subtle distinctions in concepts
- **Educational Explanations**: Every statement designed to enhance understanding

#### **Interactive Flashcards**
- **Active Recall Focus**: AI-generated cards for key concepts and definitions
- **Flip Animation**: Smooth concept-to-definition transitions
- **Performance Tracking**: Three-level assessment (Got it, On track, Still unclear)
- **Personal Library**: Save individual flashcards for organized review

### 📊 **Learning Analytics & Progress**
- **Performance Tracking**: Silent summaries track your understanding patterns
- **Adaptive Difficulty**: AI adjusts question complexity based on your responses
- **Learning Continuity**: Conversation context maintained across sessions
- **Flashcard Library**: Organized collection of saved flashcards by course and topic

### 🔐 **Security & Privacy**
- **Supabase Authentication**: Secure user management with row-level security
- **Private Learning Spaces**: Your materials and progress are completely private
- **Cross-Device Sync**: Access your learning materials anywhere
- **Data Ownership**: Full control over your educational content

---

## 🛠️ Technical Architecture

### **Frontend Excellence**
- **Next.js 15.1.3**: App Router with React 19 and concurrent features
- **TypeScript**: Full type safety across frontend and backend
- **Tailwind CSS**: Utility-first styling with shadcn/ui components
- **Radix UI**: Accessible component primitives with WCAG 2.1 compliance
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile

### **AI Integration**
- **Vercel AI SDK v4.3.19**: Streaming responses with tool calling
- **Google Gemini 2.5 Flash Lite**: Advanced language model for educational content
- **File Processing**: Gemini File API for document understanding
- **Structured Generation**: Zod schemas for consistent AI responses
- **Edge Runtime**: Fast API responses with global distribution

### **Database & Storage**
- **Supabase**: PostgreSQL with real-time capabilities
- **Row-Level Security (RLS)**: User data isolation and privacy
- **TUS Protocol**: Resumable file uploads up to 100MB
- **JSONB Storage**: Flexible message and assessment storage
- **Efficient Indexing**: Optimized queries for course and material operations

### **Performance Features**
- **Streaming UI**: Real-time response rendering
- **Optimistic Updates**: Smooth user interactions
- **Concurrent Features**: React 19 for improved performance
- **Efficient Caching**: Strategic data caching for better UX

---

## 📁 Project Structure

```
itergora-learning-platform/
├── nextjs/                          # Main application
│   ├── src/
│   │   ├── app/
│   │   │   ├── app/                  # Authenticated application
│   │   │   │   ├── learn/            # Learning interface & chat
│   │   │   │   ├── storage/          # Materials management
│   │   │   │   └── flashcards/       # Flashcard library
│   │   │   └── api/                  # Backend API routes
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable UI components
│   │   │   ├── custom/               # Learning-specific components
│   │   │   └── DashboardContent.tsx  # Homepage dashboard
│   │   └── lib/
│   │       ├── ai/                   # AI integration (schemas, actions, prompts)
│   │       ├── supabase/             # Database operations
│   │       └── types.ts              # TypeScript definitions
│   └── package.json
├── supabase/                         # Database migrations & config
├── guides/                           # Implementation documentation
└── README.md
```

---

## 🎯 User Learning Journey

### **Getting Started**
1. **Authentication**: Secure sign-up with Supabase authentication
2. **Onboarding**: Interactive tutorial introducing core features  
3. **Course Creation**: Organize your learning materials by subject/course

### **Learning Workflow**
1. **Upload Materials**: Drag and drop PDFs, documents, and study notes
2. **Topic Organization**: Tag materials by topic for focused learning sessions
3. **Start Learning**: Select course and topics to begin AI-powered conversation
4. **Adaptive Practice**: Receive MCQs, True/False questions, and flashcards
5. **Progress Tracking**: Build your personal flashcard library and review patterns

### **Advanced Features**
- **Cross-Course Learning**: Explore connections between different subjects
- **Spaced Repetition**: AI-optimized flashcard review timing
- **Learning Analytics**: Understand your progress and identify improvement areas
- **Contextual Conversations**: AI references specific content from your materials

---

## 📦 Getting Started - local dev

1. Fork or clone repository
2. Prepare Supabase Project URL (Project URL from `Project Settings` -> `API` -> `Project URL`)
3. Prepare Supabase Anon and Service Key (`Anon Key`, `Service Key` from `Project Settings` -> `API` -> `anon public` and `service_role`)
4. Prepare Supabase Database Password  (You can reset it inside `Project Settings` -> `Database` -> `Database Password`)
5. If you already know your app url -> adjust supabase/config.toml `site_url` and `additional_redirect_urls`, you can do it later
6. Run following commands (inside root of forked / downloaded repository):

```bash
# Login to supabase
npx supabase login
# Link project to supabase (require database password) - you will get selector prompt
npx supabase link

# Send config to the server - may require confirmation (y)
npx supabase config push

# Up migrations
npx supabase migrations up --linked

```

7. Go to next/js folder and run `yarn`
8. Copy .env.template to .env.local
9. Adjust .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://APIURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=ANONKEY
PRIVATE_SUPABASE_SERVICE_KEY=SERVICEROLEKEY

```
10. Run yarn dev
11. Go to http://localhost:3000 🎉

## 🚀 Getting Started - deploy to vercel

1. Fork or clone repository
2. Create project in Vercel - choose your repo
3. Paste content of .env.local into environment variables
4. Click deploy
5. Adjust in supabase/config.toml site_url and additional_redirect_urls (important in additional_redirect_urls is to have https://YOURURL/** - these 2 **)
6. Done!

## 📄 Legal Documents

The template includes customizable legal documents - these are in markdown, so you can adjust them as you see fit:

- Privacy Policy (`/public/terms/privacy-notice.md`)
- Terms of Service (`/public/terms/terms-of-service.md`)
- Refund Policy (`/public/terms/refund-policy.md`)

## 🎨 Theming

The template includes several pre-built themes:
- `theme-sass` (Default)
- `theme-blue`
- `theme-purple`
- `theme-green`

Change the theme by updating the `NEXT_PUBLIC_THEME` environment variable.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

