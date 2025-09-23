import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Sparkles, BookOpen, BarChart3, ArrowRight } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Cognito Cards</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/auth/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth/signup"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Unlock your learning potential with{' '}
              <span className="text-indigo-600">AI-powered</span> flashcards
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Generate, study, and master any subject effortlessly. Transform your content into 
              smart flashcards and accelerate your learning with spaced repetition.
            </p>
            <Link
              to="/auth/signup"
              className="inline-flex items-center bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-lg group"
            >
              Start Learning Today
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to learn smarter
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our comprehensive platform combines AI technology with proven learning techniques
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-100 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Generation</h3>
              <p className="text-gray-600">
                Transform any text, PDF, or YouTube video into comprehensive flashcards instantly
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Multiple Study Modes</h3>
              <p className="text-gray-600">
                Practice with flip cards, multiple choice, and spaced repetition algorithms
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed analytics and performance insights
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Learning</h3>
              <p className="text-gray-600">
                Adaptive algorithms optimize review timing for maximum retention
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to supercharge your learning?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are already mastering new subjects faster than ever
          </p>
          <Link
            to="/auth/signup"
            className="inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-lg"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-6 h-6 text-indigo-400" />
              <span className="ml-2 text-lg font-semibold text-white">Cognito Cards</span>
            </div>
            <p className="text-gray-400">
              © 2025 Cognito Cards. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}