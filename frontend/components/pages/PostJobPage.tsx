// ✅ FIXED: "Generate AI Marketing Video" now calls the real /api/shorts/generate endpoint
//           Falls back to sample video only when the AI service is unavailable (503)
//           so the button label is no longer misleading

import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { jobsAPI, categoriesAPI, shortsAPI } from '../../services/api';
import { VideoCameraIcon, CheckCircleIcon, TrashIcon } from '../icons/Icons';
import { SparklesIcon } from '../icons/Icons';

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
    maxSlots: '1',
    category: '',
    description: '',
    requirements: '',
    shortVideoUrl: '',
  });

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  // ✅ Track whether video came from real AI or sample fallback
  const [videoSource, setVideoSource] = useState<'ai' | 'sample' | null>(null);

  useEffect(() => {
    categoriesAPI.getAll()
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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
        maxSlots: parseInt(form.maxSlots) || 1,
        category: form.category,
        description: form.description,
        requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [],
        shortVideoUrl: form.shortVideoUrl,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to post job. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIXED: Try real AI endpoint first, fall back to sample only on service unavailability
  const handleGenerateVideo = async () => {
    if (!form.description) {
      setError('Please provide a job description first so the AI can generate a relevant video.');
      return;
    }
    setError('');
    setIsGeneratingVideo(true);
    setVideoSource(null);

    try {
      const prompt = `A professional job marketing short video for: ${form.title} at ${form.company}. ${form.description.slice(0, 200)}`;
      const response = await shortsAPI.generateAI({
        prompt,
        title: `${form.title} @ ${form.company}`,
        description: form.description,
      });
      
      if (response.jobId) {
        // Polling loop
        let isDone = false;
        while (!isDone) {
          await new Promise(r => setTimeout(r, 5000)); // poll every 5 seconds
          const statusRes = await shortsAPI.getJobStatus(response.jobId);
          if (statusRes.status === 'completed') {
            setForm(prev => ({ ...prev, shortVideoUrl: statusRes.videoUrl }));
            setVideoSource('ai');
            isDone = true;
          } else if (statusRes.status === 'failed') {
            throw new Error(statusRes.error || 'Video generation failed');
          }
          // if 'pending' or 'processing', do nothing, continue loop
        }
      } else if (response.short?.videoUrl || response.videoUrl) {
        // fallback in case synchronous behavior is still triggered
        setForm(prev => ({ ...prev, shortVideoUrl: response.short?.videoUrl || response.videoUrl }));
        setVideoSource('ai');
      } else {
        throw new Error('No video URL or job ID returned');
      }
    } catch (err: any) {
      // ✅ Only fall back to sample if AI service is unavailable (503 / connection error)
      const isServiceDown =
        err.message?.includes('503') ||
        err.message?.includes('unavailable') ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('not running');

      if (isServiceDown) {
        const sampleVideos = [
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        ];
        setForm(prev => ({
          ...prev,
          shortVideoUrl: sampleVideos[Math.floor(Math.random() * sampleVideos.length)],
        }));
        setVideoSource('sample');
      } else {
        setError(`Video generation failed: ${err.message}`);
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-12 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">Job Posted Successfully!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Your job is now live and visible to students on the platform.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setSuccess(false)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">
              Post Another Job
            </button>
            <button onClick={() => navigate('review_applications')} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg transition-colors">
              View Applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  const InputClass =
    'w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-3 px-4 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';
  const LabelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2';

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
            <input id="title" name="title" type="text" required placeholder="e.g. Frontend Developer" className={InputClass} value={form.title} onChange={handleChange} />
          </div>
          <div>
            <label className={LabelClass} htmlFor="company">Company Name *</label>
            <input id="company" name="company" type="text" required placeholder="e.g. DesignCo Inc." className={InputClass} value={form.company} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={LabelClass} htmlFor="location">Location *</label>
            <input id="location" name="location" type="text" required placeholder="e.g. Remote" className={InputClass} value={form.location} onChange={handleChange} />
          </div>
          <div>
            <label className={LabelClass} htmlFor="type">Work Type</label>
            <select id="type" name="type" className={InputClass} value={form.type} onChange={handleChange}>
              <option value="Remote">Remote</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={LabelClass} htmlFor="pay">Salary / Pay Rate *</label>
            <input id="pay" name="pay" type="text" required placeholder="e.g. $40–60/hr" className={InputClass} value={form.pay} onChange={handleChange} />
          </div>
          <div>
            <label className={LabelClass} htmlFor="maxSlots">Number of Positions</label>
            <input id="maxSlots" name="maxSlots" type="number" min="1" max="100" placeholder="e.g. 5" className={InputClass} value={form.maxSlots} onChange={handleChange} />
            <p className="text-xs text-slate-400 mt-1">How many freelancers do you need for this job?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={LabelClass} htmlFor="category">Category</label>
            <select id="category" name="category" className={InputClass} value={form.category} onChange={handleChange}>
              <option value="">Select a category</option>
              {categories.length > 0
                ? categories.map((c: any) => <option key={c._id || c.id} value={c.name}>{c.name}</option>)
                : <>
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Data Science">Data Science</option>
                  </>
              }
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
                    Generating Video...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Generate Job Video
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                <CheckCircleIcon className="w-4 h-4" />
                {/* ✅ Shows honest label depending on source */}
                {videoSource === 'ai' ? 'AI Video Generated!' : 'Sample Video Added'}
              </div>
            )}
          </div>
          <textarea
            id="description" name="description" required rows={5}
            placeholder="Describe the role, responsibilities, and what makes it exciting..."
            className={InputClass}
            value={form.description} onChange={handleChange}
          />

          {form.shortVideoUrl && (
            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <VideoCameraIcon className="w-4 h-4 text-indigo-500" />
                  {videoSource === 'ai' ? 'AI-Generated Job Video' : 'Sample Job Video Preview'}
                </h4>
                <button
                  type="button"
                  onClick={() => { setForm(prev => ({ ...prev, shortVideoUrl: '' })); setVideoSource(null); }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black shadow-inner">
                <video src={form.shortVideoUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
              </div>
              {videoSource === 'sample' && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Using a sample video — AI service is unavailable. Start the Helios service for real AI generation.
                </p>
              )}
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
          <button type="button" onClick={() => navigate('dashboard')} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/20">
            {isLoading ? 'Posting...' : '🚀 Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostJobPage;
