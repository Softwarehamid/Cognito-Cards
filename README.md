# Cognito Cards - AI-Powered Flashcard Learning Platform

A comprehensive full-stack web application for creating, studying, and managing flashcards with AI-powered content generation. Built with React, TypeScript, Tailwind CSS, Supabase, and multiple AI providers.

## ✨ Features

## Live Demo - https://cognitocards.abdulhamidoguntade.com/

### 🧠 AI-Powered Generation with Multiple Providers

- **Multi-Provider Support**: OpenAI GPT, Google Gemini, Anthropic Claude, Groq, and Hugging Face
- **Automatic Fallback**: If one provider fails or runs out of credits, automatically tries the next
- **Smart Content Processing**: Transform text content, YouTube URLs, and file uploads into flashcards
- **Intelligent Generation**: Automatic questions, answers, hints, and multiple choice distractors
- **Real-time Provider Status**: Visual indicators showing which AI providers are available

### 📚 Comprehensive Study Modes

- **Flip Cards**: Classic flashcard experience with smooth animations
- **Multiple Choice**: Test knowledge with AI-generated distractors
- **Spaced Repetition**: SM-2 algorithm for optimized review scheduling with difficulty ratings
- **Progress Tracking**: Session statistics and performance analytics

### 🎯 Advanced Deck Management

- Create, edit, and organize flashcard decks with full CRUD operations
- Tag-based filtering and search functionality
- Public/private deck sharing capabilities
- Responsive design with mobile-first approach
- Real-time updates and optimistic UI

### 📊 Progress & Analytics

- Detailed study statistics and session tracking
- Spaced repetition scheduling based on performance
- Due cards tracking and review notifications
- Study streaks and achievement tracking

### 🔐 Secure Authentication & Data

- Email/password authentication via Supabase Auth
- Comprehensive Row Level Security (RLS) for data protection
- Password reset and profile management
- Secure user data isolation

### 🎨 Modern User Experience

- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Mode Support**: Complete dark theme implementation
- **Progressive Web App**: PWA capabilities for mobile installation
- **Smooth Animations**: Framer Motion animations and micro-interactions
- **Keyboard Shortcuts**: Enhanced accessibility and power user features
- **Toast Notifications**: Real-time feedback for all user actions

### 🔧 Technical Excellence

- **Type Safety**: Full TypeScript implementation
- **Performance Optimized**: Vite build system with fast HMR
- **Error Handling**: Comprehensive error boundaries and retry logic
- **Real-time Subscriptions**: Live data updates via Supabase
- **Optimistic Updates**: Immediate UI feedback for better UX

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **AI Providers**: OpenAI GPT, Google Gemini, Anthropic Claude, Groq, Hugging Face
- **Deployment**: Netlify (SPA optimized with redirects)
- **Build Tool**: Vite with TypeScript and ESLint
- **Styling**: Tailwind CSS with Dark Mode support
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React icon library
- **Notifications**: React Hot Toast for user feedback

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key

### Environment Setup

Create a `.env` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Service API Keys (Add at least 2-3 for redundancy)
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GOOGLE_API_KEY=your_google_gemini_api_key
VITE_ANTHROPIC_API_KEY=your_anthropic_claude_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_HUGGINGFACE_API_KEY=your_huggingface_api_key
```

**Note**: You don't need ALL AI providers - the app will automatically use whichever ones you configure. See the [AI Setup Guide](./AI_SETUP_GUIDE.md) for detailed instructions on getting free API keys.

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations in order (found in `/supabase/migrations/`)
3. Create a storage bucket named `card-images` with public access
4. Set up the following RLS policies as defined in the migration files

### Installation & Development

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ai-flashcard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   - Copy `.env.example` to `.env` (if available)
   - Add your Supabase and AI provider credentials
   - See [AI Setup Guide](./AI_SETUP_GUIDE.md) for free API keys

4. **Set up Supabase database**

   - Create a new Supabase project
   - Run the SQL migrations in order (found in `/supabase/migrations/`)
   - Set up Row Level Security policies as defined in migrations

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Create an account and start generating flashcards!

## 🎯 Key Features Showcase

### Multi-Provider AI Integration

- **Automatic Fallback**: Never worry about API limits - when one provider runs out, another takes over
- **Provider Status**: Real-time indicators showing which AI services are available
- **Free Tier Friendly**: Start with free providers like Google Gemini and Groq
- **Quality Options**: Use OpenAI for premium quality when needed

### Study Modes

- **Flip Cards**: Click to reveal answers with smooth animations
- **Multiple Choice**: AI-generated distractors for quiz-style learning
- **Spaced Repetition**: Smart scheduling based on how well you know each card

### Responsive Design

- **Mobile First**: Optimized touch interfaces for phones and tablets
- **Desktop Enhanced**: Full feature set with keyboard shortcuts
- **Dark Mode**: Complete dark theme for comfortable studying

## 🗃️ Database Schema

### Core Tables

- `profiles`: User profile information and preferences
- `decks`: Flashcard deck metadata and settings
- `flashcards`: Individual flashcard content and metadata
- `study_sessions`: Study session tracking and analytics
- `reviews`: Spaced repetition review history and performance
- `imports`: AI generation import history and usage tracking

### Security & Performance Features

- **Row Level Security (RLS)**: Complete data isolation between users
- **Foreign Key Constraints**: Ensure data integrity across relationships
- **Optimized Indexes**: Fast queries for large datasets
- **Cascade Deletes**: Automatic cleanup when decks/cards are removed

## 🤖 AI Integration Details

### Supported Providers

- **OpenAI GPT**: Highest quality, small cost (~$0.002 per 1000 tokens)
- **Google Gemini**: Excellent free tier (15 requests/min, 1,500/day)
- **Anthropic Claude**: $5 free credits, high quality responses
- **Groq**: Very generous free tier, ultra-fast responses
- **Hugging Face**: 1,000 free requests/month

### How Fallback Works

1. App tries providers in order of preference
2. If one fails (rate limit, error, no credits), tries the next
3. Real-time status indicators show available providers
4. Graceful error handling with user-friendly messages

### Building for Production

```bash
npm run build
npm run preview  # Test production build locally
```

## 🚀 Deployment

### Netlify Deployment (Recommended)

1. **Connect Repository**: Link your GitHub/GitLab repo to Netlify
2. **Configure Environment Variables**:
   - Add all your API keys to Netlify's environment variables
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Add your AI provider keys (at least 2-3 recommended)
3. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Deploy**: The `_redirects` file handles SPA routing automatically

### Alternative Deployment Options

- **Vercel**: Similar setup, excellent for React apps
- **GitHub Pages**: Free hosting for public repositories
- **AWS S3 + CloudFront**: Enterprise-grade hosting solution

## 📖 Usage Guide

### Getting Started

1. **Sign Up**: Create an account with email/password
2. **Choose AI Providers**: Follow the [AI Setup Guide](./AI_SETUP_GUIDE.md) to configure at least one AI provider
3. **Generate Cards**: Paste text, YouTube URL, or upload a file
4. **Study**: Choose from flip cards, multiple choice, or spaced repetition
5. **Track Progress**: View your study statistics and due cards

### Pro Tips

- **Multiple AI Providers**: Configure 2-3 providers for maximum reliability
- **Dark Mode**: Toggle in the top-right corner for comfortable studying
- **Keyboard Shortcuts**: Use arrow keys and spacebar while studying
- **Mobile Friendly**: Install as PWA on mobile devices for app-like experience

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style
4. **Add tests**: Ensure your changes work correctly
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Submit pull request**: Describe your changes clearly

### Development Guidelines

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Add proper error handling
- Test on multiple devices/screen sizes
- Update documentation as needed

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- **Issues**: Report bugs on [GitHub Issues](../../issues)
- **Discussions**: Join conversations in [GitHub Discussions](../../discussions)
- **Documentation**: Check the [AI Setup Guide](./AI_SETUP_GUIDE.md) for AI configuration
- **Updates**: Watch the repository for new features and updates

---

🎉 **Built with ❤️ for the future of digital learning**

_Powered by modern web technologies and multiple AI providers for reliable, intelligent flashcard generation._
