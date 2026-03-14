import React, { useState } from 'react';
import { SparklesIcon, VideoCameraIcon } from '../icons/Icons';
import { shortsAPI } from '../../services/api';

interface HeliosGeneratorProps {
    onSuccess: (videoUrl: string) => void;
}

const HeliosGenerator: React.FC<HeliosGeneratorProps> = ({ onSuccess }) => {
    const [prompt, setPrompt] = useState('');
    const [title, setTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'info' | 'generate'>('generate');
    const [statusText, setStatusText] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please describe the video you want to generate');
            return;
        }

        setIsGenerating(true);
        setError('');
        setProgress(5);
        setStatusText('Connecting to Helios service...');

        // Animate progress while waiting
        const interval = setInterval(() => {
            setProgress(p => {
                if (p < 30) { setStatusText('Downloading model chunks...'); return p + 1; }
                if (p < 60) { setStatusText('Generating video frames...'); return p + 0.5; }
                if (p < 85) { setStatusText('Encoding video stream...'); return p + 0.3; }
                return p;
            });
        }, 800);

        try {
            const response = await shortsAPI.generateAI({
                prompt,
                title: title || 'AI Generated Short',
                description: prompt,
            });

            clearInterval(interval);
            setProgress(100);
            setStatusText('Video ready!');

            setTimeout(() => {
                onSuccess(response.short?.videoUrl || response.videoUrl);
            }, 500);

        } catch (err: any) {
            clearInterval(interval);
            setProgress(0);
            setStatusText('');

            const detail = err.response?.data?.detail || err.response?.data?.message || err.message || '';

            if (detail.includes('loading') || detail.includes('503')) {
                setError('⏳ Helios model is still loading (first boot takes ~2 min). Try again shortly.');
            } else if (detail.includes('8000') || detail.includes('ECONNREFUSED') || detail.includes('service')) {
                setError('🔌 Helios service is not running. Open a terminal and run:\n  ai-services\\helios\\start.bat');
            } else {
                setError(detail || 'Generation failed. Check the Helios service terminal for details.');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-3xl p-8 border border-indigo-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <SparklesIcon className="w-7 h-7 text-white animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Helios AI Generator</h2>
                        <p className="text-indigo-200/70 text-sm">Real-time long video synthesis · HeliosPyramidPipeline</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['generate', 'info'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === m ? 'bg-indigo-600 text-white' : 'bg-white/10 text-indigo-200 hover:bg-white/20'}`}>
                            {m === 'generate' ? '🎬 Generate' : 'ℹ️ Setup Guide'}
                        </button>
                    ))}
                </div>

                {mode === 'info' ? (
                    <div className="space-y-4">
                        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-4">
                            <p className="text-emerald-200 font-bold text-sm mb-2">✅ Your GPU is supported!</p>
                            <p className="text-emerald-200/80 text-xs leading-relaxed">
                                Helios-Distilled runs with ~6 GB VRAM using group offloading.
                                Most NVIDIA GTX 1060+ / RTX cards will work.
                            </p>
                        </div>
                        <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 space-y-3">
                            <p className="text-white font-bold text-sm">🚀 Quick Start (first time only)</p>
                            <div className="space-y-2 text-xs text-indigo-200">
                                <div className="flex items-start gap-2">
                                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold">1</span>
                                    <code className="bg-black/40 px-2 py-1 rounded text-green-300 break-all">ai-services\helios\setup.bat</code>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold">2</span>
                                    <code className="bg-black/40 px-2 py-1 rounded text-green-300 break-all">ai-services\helios\start.bat</code>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold">3</span>
                                    <span>Wait for <strong className="text-white">"Helios Model Ready!"</strong> in terminal</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold">4</span>
                                    <span>Come back here and generate! 🎉</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'VRAM (low mode)', value: '~6 GB', icon: '⚡' },
                                { label: 'Parameters', value: '14B', icon: '🧠' },
                                { label: 'Resolution', value: '384×640', icon: '📺' },
                                { label: 'Speed', value: '19.5 FPS', icon: '🚀' },
                            ].map(s => (
                                <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                                    <span className="text-lg">{s.icon}</span>
                                    <p className="text-[10px] uppercase tracking-widest text-indigo-300/50 font-bold mt-1">{s.label}</p>
                                    <p className="text-white text-sm font-mono">{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Service status hint */}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center justify-between text-xs">
                            <span className="text-indigo-300">Helios service: <code className="text-green-400">localhost:8000</code></span>
                            <a href="http://localhost:8000/health" target="_blank" rel="noreferrer"
                                className="text-indigo-400 hover:text-indigo-200 underline">Check status ↗</a>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-indigo-100 mb-2">Describe your video</label>
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                disabled={isGenerating}
                                placeholder="A vibrant tropical fish swimming gracefully among colorful coral reefs in crystal clear turquoise ocean. Close-up shot, cinematic, 4K quality..."
                                className="w-full bg-black/40 border border-indigo-500/30 rounded-2xl p-4 text-white placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[120px] transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-indigo-100 mb-2">Title (Optional)</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={isGenerating}
                                placeholder="My AI Short"
                                className="w-full bg-black/40 border border-indigo-500/30 rounded-2xl p-4 text-white placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-300 text-sm whitespace-pre-line">
                                {error}
                            </div>
                        )}

                        {isGenerating ? (
                            <div className="space-y-3">
                                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-700 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                        style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between items-center text-xs text-indigo-200">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                                        {statusText}
                                    </span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <p className="text-indigo-300/50 text-xs text-center">
                                    Generation takes 2–10 minutes depending on your GPU 🕐
                                </p>
                            </div>
                        ) : (
                            <button onClick={handleGenerate}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group">
                                <SparklesIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                Ignite Helios Engine
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-indigo-500/20 flex justify-between items-center">
                    <div className="flex gap-4">
                        <div><span className="text-[10px] uppercase tracking-widest text-indigo-300/50 font-bold">Pipeline</span><p className="text-white text-sm font-mono">HeliosPyramid</p></div>
                        <div><span className="text-[10px] uppercase tracking-widest text-indigo-300/50 font-bold">Model</span><p className="text-white text-sm font-mono">14B Distilled</p></div>
                    </div>
                    <VideoCameraIcon className="w-8 h-8 text-indigo-500/30" />
                </div>
            </div>
        </div>
    );
};

export default HeliosGenerator;
