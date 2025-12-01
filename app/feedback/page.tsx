'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Feedback error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Back button */}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-blue-400 mb-8 transition-colors duration-300 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Back to Home</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-8 animate-fadeInUp">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Feedback
            </h1>
            <p className="text-slate-300 text-lg">
              Feel free to share your thoughts, suggestions, or report issues.
            </p>
          </div>

          {/* Feedback form */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6 md:p-8 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none rounded-3xl"></div>
            
            <div className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide uppercase">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-4 border-2 rounded-2xl focus:ring-4 focus:border-transparent outline-none transition-all duration-300 text-white bg-slate-900/50 placeholder-slate-400 text-lg font-medium backdrop-blur-sm border-slate-600/50 focus:ring-blue-500/20 focus:border-blue-400 hover:border-slate-500/70"
                    placeholder="Your name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-6 py-4 border-2 rounded-2xl focus:ring-4 focus:border-transparent outline-none transition-all duration-300 text-white bg-slate-900/50 placeholder-slate-400 text-lg font-medium backdrop-blur-sm border-slate-600/50 focus:ring-blue-500/20 focus:border-blue-400 hover:border-slate-500/70"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide uppercase">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="w-full px-6 py-4 border-2 rounded-2xl focus:ring-4 focus:border-transparent outline-none transition-all duration-300 text-white bg-slate-900/50 placeholder-slate-400 text-lg font-medium backdrop-blur-sm border-slate-600/50 focus:ring-blue-500/20 focus:border-blue-400 hover:border-slate-500/70 resize-none"
                    placeholder="Your message..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="group relative flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 disabled:shadow-none transform hover:scale-105 disabled:transform-none w-full"
                >
                  <Send size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                  <span>
                    {status === 'sending' ? 'Sending...' : 'Send Feedback'}
                  </span>
                </button>

                {status === 'success' && (
                  <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-6 py-4 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Thank you! Your feedback has been sent successfully.
                    </div>
                  </div>
                )}

                {status === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      Sorry, something went wrong. Please try again later.
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

