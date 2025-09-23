# 🤖 AI Setup Guide - Free & Paid Options

Your AI FlashCard app supports **multiple AI providers** with **automatic fallback**! When one provider runs out of credits or fails, it seamlessly tries the next one. This means you'll never lose access to AI-powered flashcard generation.

## 🌟 Quick Start Recommendations

**For Maximum Reliability**: Set up 2-3 providers
**Best Free Combo**: Google Gemini + Groq + Anthropic Claude  
**Premium Option**: Add OpenAI for highest quality results
**Budget Friendly**: Start with all free options, upgrade later

---

## 🆓 Free AI Providers (Zero Cost)

### 1. **Google Gemini** ⭐ HIGHLY RECOMMENDED

**Why it's great**: Excellent quality, generous free tier, very reliable

- **Free Limits**: 15 requests/minute, 1,500 requests/day
- **Quality**: Excellent for flashcard generation
- **Speed**: Fast response times

**Setup Steps**:

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account (free)
3. Click **"Get API key"** → **"Create API key"**
4. Copy your API key
5. Add to your `.env` file:
   ```bash
   VITE_GOOGLE_API_KEY=your_google_api_key_here
   ```

### 2. **Groq** ⭐ ULTRA-FAST & GENEROUS

**Why it's great**: Lightning-fast responses, very generous free tier

- **Free Limits**: Extremely generous (varies by model)
- **Quality**: Very good for flashcard generation
- **Speed**: Fastest responses of all providers

**Setup Steps**:

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up with email (free)
3. Navigate to **API Keys** → **Create API Key**
4. Copy your API key
5. Add to your `.env` file:
   ```bash
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

### 3. **Anthropic Claude** ⭐ HIGH QUALITY

**Why it's great**: $5 in free credits, excellent understanding

- **Free Credits**: $5 (lasts for hundreds of flashcard generations)
- **Quality**: Excellent for educational content
- **Specialty**: Great at understanding context and nuance

**Setup Steps**:

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up and verify your phone number
3. Go to **API Keys** → **Create Key**
4. Copy your API key
5. Add to your `.env` file:
   ```bash
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

### 4. **Hugging Face**

**Why it's useful**: Good backup option, completely free

- **Free Limits**: 1,000 requests/month
- **Quality**: Decent for basic flashcard generation
- **Models**: Access to various open-source models

**Setup Steps**:

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up for a free account
3. Go to **Settings** → **Access Tokens** → **New Token**
4. Copy your token
5. Add to your `.env` file:
   ```bash
   VITE_HUGGINGFACE_API_KEY=your_huggingface_token_here
   ```

---

## 💰 Premium Option (Highest Quality)

### **OpenAI GPT** ⭐ GOLD STANDARD

**Why it's worth it**: Industry-leading quality, most reliable

- **Cost**: Only ~$0.002 per 1000 tokens (extremely affordable!)
- **Quality**: Best-in-class for educational content generation
- **Reliability**: Most stable and consistent results
- **Models**: Access to latest GPT models

**Setup Steps**:

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up and add $5-10 to your account (lasts a very long time)
3. Create an API Key
4. Copy your API key
5. Add to your `.env` file:
   ```bash
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

**Cost Example**: Generating 100 flashcards = ~$0.20-0.50 USD

---

## 🔧 How the Multi-Provider System Works

### Automatic Provider Selection

The app tries providers in this smart order:

1. **OpenAI** (if configured) - Premium quality
2. **Google Gemini** (if configured) - Best free option
3. **Anthropic Claude** (if configured) - High quality backup
4. **Groq** (if configured) - Ultra-fast processing
5. **Hugging Face** (if configured) - Final fallback

### Smart Fallback Logic

- ✅ **If Provider 1 works**: Uses it and stops
- ❌ **If Provider 1 fails**: Automatically tries Provider 2
- 🔄 **Continues until success**: Keeps trying until a provider works
- 📊 **Real-time Status**: See which providers are available

### Visual Provider Status

On the AI Generate page, you'll see:

- 🟢 **Green Checkmark**: Provider configured and working
- 🔴 **Red X**: Provider not configured or having issues
- 📊 **Live Updates**: Status updates in real-time

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Choose Your Providers

**Recommended combo for beginners**:

- Google Gemini (free, reliable)
- Groq (free, fast)
- Anthropic Claude (free credits)

### Step 2: Get API Keys

Follow the setup steps above for your chosen providers

### Step 3: Configure Environment

Create/update your `.env` file:

```bash
# Supabase (required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# AI Providers (add 2-3 for best results)
VITE_GOOGLE_API_KEY=your_google_key
VITE_GROQ_API_KEY=your_groq_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key

# Optional premium option
VITE_OPENAI_API_KEY=your_openai_key
```

### Step 4: Test & Launch

1. Restart your development server: `npm run dev`
2. Go to the AI Generate page
3. Look for green checkmarks next to provider names
4. Test flashcard generation!

---

## 🎯 Provider Recommendations by Use Case

### 🆓 **For Students/Personal Use**

**Best Combo**: Google Gemini + Groq + Anthropic Claude

- Total cost: $0 (all free!)
- Reliability: Excellent with 3 providers
- Quality: Very good for learning purposes

### 🎓 **For Educators/Heavy Users**

**Recommended**: Add OpenAI to the free combo above

- Cost: ~$5-10/month for heavy usage
- Quality: Premium results for professional content
- Reliability: Maximum uptime with 4 providers

### ⚡ **For Speed Enthusiasts**

**Focus on**: Groq + Google Gemini

- Groq provides ultra-fast responses
- Gemini as reliable backup
- Perfect for rapid flashcard generation

### 🏢 **For Business/Production**

**All Providers**: Full setup with monitoring

- Maximum reliability and uptime
- Best quality results available
- Professional-grade fallback system

---

## 🔍 Testing Your Setup

After configuring your API keys:

### Visual Confirmation

1. **Go to AI Generate page**: Check the provider status section
2. **Look for green checkmarks**: ✅ means provider is working
3. **Red X indicators**: ❌ means provider needs configuration

### Functionality Test

1. **Paste some text**: Try generating flashcards from sample content
2. **Watch toast notifications**: See which provider responds
3. **Test fallback**: Temporarily remove one API key to test automatic switching

### Sample Test Content

```text
Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. This process occurs in the chloroplasts of plant cells and is essential for life on Earth as it produces the oxygen we breathe.
```

---

## 💡 Pro Tips & Best Practices

### Maximizing Free Usage

- **Rotate providers**: Use different ones throughout the day
- **Monitor limits**: Keep track of daily/monthly quotas
- **Batch generation**: Create multiple cards at once to be efficient
- **Content optimization**: Shorter, focused content uses fewer tokens

### Troubleshooting Common Issues

**"No providers available"**: Check your API keys in `.env` file
**"Rate limit exceeded"**: Wait a moment, or the app will try another provider
**"Invalid API key"**: Double-check you copied the key correctly
**"Provider timeout"**: Network issue, try again or use different provider

### Security Best Practices

- **Never commit API keys**: Add `.env` to your `.gitignore`
- **Use environment variables**: Never hardcode keys in your code
- **Rotate keys periodically**: Generate new keys every few months
- **Monitor usage**: Check provider dashboards for unusual activity

---

## 🎉 Success! You're Ready to Generate

Once you see green checkmarks for 2+ providers:

1. **🎯 Start Creating**: Generate your first flashcard deck
2. **📚 Study Smart**: Use spaced repetition for optimal learning
3. **📱 Go Mobile**: Install as PWA for on-the-go studying
4. **🌙 Try Dark Mode**: Perfect for late-night study sessions
5. **📊 Track Progress**: Monitor your learning with built-in analytics

---

**🚀 Happy Learning!** Your AI-powered flashcard generator is now ready to help you master any subject with intelligent, automatically-generated study materials.
