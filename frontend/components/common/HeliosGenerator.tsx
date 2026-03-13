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

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please describe the video you want to generate');
            return;
        }

        setIsGenerating(true);
        setError('');
        setProgress(10); // Initial progress

        // Simulate progress for Helios generation (which takes some time)
        const interval = setInterval(() => {
            setProgress(prev => (prev < 90 ? prev + 2 : prev));
        }, 500);

        try {
            const response = await shortsAPI.generateAI({
                prompt,
                title: title || 'AI Generated Short',
                description: prompt
            });

            clearInterval(interval);
            setProgress(100);
            
            setTimeout(() => {
                onSuccess(response.short.videoUrl);
            }, 500);

        } catch (err: any) {
            clearInterval(interval);
            setError(err.response?.data?.details || 'Helios generation failed. Make sure the AI service is running.');
            setProgress(0);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-3xl p-8 border border-indigo-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl font-bold"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <SparklesIcon className="w-7 h-7 text-white animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Helios AI Generator</h2>
                        <p className="text-indigo-200/70 text-sm">Real-time long video synthesis at 19.5 FPS</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-indigo-100 mb-2">Describe your vision</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A cinematic tracking shot of a high-tech robotic lab where engineers are collaborating on a humanoid robot..."
                            className="w-full bg-black/40 border border-indigo-500/30 rounded-2xl p-4 text-white placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[120px] transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-indigo-100 mb-2">Internal Title (Optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Marketing Intro"
                            className="w-full bg-black/40 border border-indigo-500/30 rounded-2xl p-4 text-white placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {isGenerating ? (
                        <div className="space-y-4">
                            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-indigo-200 font-medium">
                                <span className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                                    Helios is synthesizing frames...
                                </span>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            <span>Ignite Helios Engine</span>
                            <SparklesIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </button>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-indigo-500/20 flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-indigo-300/50 font-bold">Latency</span>
                            <span className="text-white text-sm font-mono">~19.5 FPS</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-indigo-300/50 font-bold">Architecture</span>
                            <span className="text-white text-sm font-mono">14B Param</span>
                        </div>
                    </div>
                    <VideoCameraIcon className="w-8 h-8 text-indigo-500/30" />
                </div>
            </div>
        </div>
    );
};

export default HeliosGenerator;
