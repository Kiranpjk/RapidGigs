import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { jobsAPI, categoriesAPI } from '../../services/api';
import { VideoCameraIcon, CheckCircleIcon, TrashIcon, PlusIcon } from '../icons/Icons';

const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.455L18 2.25l.259 1.036a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.456 2.455zm-1.035 11.035L17 20.75l-.216-.864a2.25 2.25 0 00-1.638-1.638L14.25 18l.864-.216a2.25 2.25 0 001.638-1.638L17 15.25l.216.864a2.25 2.25 0 001.638 1.638L19.75 18l-.864.216a2.25 2.25 0 00-1.638 1.638z" />
    </svg>
);

interface PostJobPageProps {
    navigate: (page: Page) => void;
}

const PostJobPage: React.FC<PostJobPageProps> = ({ navigate }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        title: '',
        company: '',
        location: '',
        type: 'Remote' as 'Remote' | 'On-site' | 'Hybrid',
        pay: '',
        category: '',
        description: '',
        requirements: '',
        shortVideoUrl: '',
    });
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

    useEffect(() => {
        categoriesAPI.getAll()
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await jobsAPI.create({
                title: form.title,
                company: form.company,
                location: form.location,
                type: form.type,
                pay: form.pay,
                category: form.category,
                description: form.description,
                requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [],
                shortVideoUrl: form.shortVideoUrl,
            });
            setSuccess(true);
            setForm({ title: '', company: '', location: '', type: 'Remote', pay: '', category: '', description: '', requirements: '' });
        } catch (err: any) {
            setError(err.message || 'Failed to post job. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (!form.description) {
            setError('Please provide a job description first so the AI can generate a relevant video.');
            return;
        }

        setError('');
        setIsGeneratingVideo(true);

        // Simulate AI generation time
        await new Promise(resolve => setTimeout(resolve, 3500));

        // Sample marketing videos based on category or random
        const videos = [
            'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-9257-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-coffee-shop-4268-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-design-sketches-being-drawn-on-a-tablet-40439-large.mp4'
        ];
        
        const randomVideo = videos[Math.floor(Math.random() * videos.length)];
        setForm(prev => ({ ...prev, shortVideoUrl: randomVideo }));
        setIsGeneratingVideo(false);
    };

    if (success) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-12 rounded-2xl shadow-xl">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">Job Posted Successfully!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">Your job is now live and visible to students on the platform.</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setSuccess(false)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                        >
                            Post Another Job
                        </button>
                        <button
                            onClick={() => navigate('review_applications')}
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg transition-colors"
                        >
                            View Applications
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const InputClass = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-3 px-4 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
    const LabelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2";

    return (
        <div className="container mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tighter">Post a Job</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Fill in the details below to reach top talent on RapidGig.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-8 shadow-lg space-y-6">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={LabelClass} htmlFor="title">Job Title *</label>
                        <input
                            id="title" name="title" type="text" required
                            placeholder="e.g. Frontend Developer"
                            className={InputClass}
                            value={form.title} onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className={LabelClass} htmlFor="company">Company Name *</label>
                        <input
                            id="company" name="company" type="text" required
                            placeholder="e.g. DesignCo Inc."
                            className={InputClass}
                            value={form.company} onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={LabelClass} htmlFor="location">Location *</label>
                        <input
                            id="location" name="location" type="text" required
                            placeholder="e.g. New York, NY or Remote"
                            className={InputClass}
                            value={form.location} onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className={LabelClass} htmlFor="type">Work Type</label>
                        <select
                            id="type" name="type"
                            className={InputClass}
                            value={form.type} onChange={handleChange}
                        >
                            <option value="Remote">Remote</option>
                            <option value="On-site">On-site</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={LabelClass} htmlFor="pay">Salary / Pay Rate *</label>
                        <input
                            id="pay" name="pay" type="text" required
                            placeholder="e.g. $40–60/hr or $80,000/yr"
                            className={InputClass}
                            value={form.pay} onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className={LabelClass} htmlFor="category">Category</label>
                        <select
                            id="category" name="category"
                            className={InputClass}
                            value={form.category} onChange={handleChange}
                        >
                            <option value="">Select a category</option>
                            {categories.length > 0 ? (
                                categories.map((c: any) => (
                                    <option key={c._id || c.id} value={c.name}>{c.name}</option>
                                ))
                            ) : (
                                <>
                                    <option value="Web Development">Web Development</option>
                                    <option value="Mobile Development">Mobile Development</option>
                                    <option value="UI/UX Design">UI/UX Design</option>
                                    <option value="Data Science">Data Science</option>
                                    <option value="DevOps">DevOps</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Other">Other</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className={LabelClass} htmlFor="description">Job Description *</label>
                        {!form.shortVideoUrl ? (
                            <button
                                type="button"
                                onClick={handleGenerateVideo}
                                disabled={isGeneratingVideo}
                                className="flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-full shadow-md transition-all transform hover:scale-105 disabled:opacity-50"
                            >
                                {isGeneratingVideo ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        AI Generating Video...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        Generate AI Marketing Video
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                                <CheckCircleIcon className="w-4 h-4" />
                                AI Video Generated!
                            </div>
                        )}
                    </div>
                    <textarea
                        id="description" name="description" required rows={5}
                        placeholder="Describe the role, responsibilities, and what makes it exciting..."
                        className={InputClass}
                        value={form.description} onChange={handleChange}
                    />

                    {/* Video Preview Section */}
                    {form.shortVideoUrl && (
                        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <VideoCameraIcon className="w-4 h-4 text-indigo-500" />
                                    Job Video Preview
                                </h4>
                                <button 
                                    type="button" 
                                    onClick={() => setForm(prev => ({ ...prev, shortVideoUrl: '' }))}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black shadow-inner">
                                <video 
                                    src={form.shortVideoUrl} 
                                    className="w-full h-full object-cover"
                                    loop muted autoPlay playsInline
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                    <p className="text-[10px] text-white/80 font-medium">Auto-generated marketing video for {form.title || 'this role'}</p>
                                </div>
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                This video will be featured in the "Shorts" section to attract candidates.
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <label className={LabelClass} htmlFor="requirements">Requirements <span className="font-normal text-slate-400">(one per line)</span></label>
                    <textarea
                        id="requirements" name="requirements" rows={4}
                        placeholder={"3+ years of React experience\nTypeScript proficiency\nStrong communication skills"}
                        className={InputClass}
                        value={form.requirements} onChange={handleChange}
                    />
                </div>

                <div className="flex justify-end gap-4 pt-2">
                    <button
                        type="button"
                        onClick={() => navigate('dashboard')}
                        className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/20"
                    >
                        {isLoading ? 'Posting...' : '🚀 Post Job'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostJobPage;
