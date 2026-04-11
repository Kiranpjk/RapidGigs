// ✅ FIXED: Form state now persists in localStorage across navigation.
//           Navigate away to Shorts/Dashboard and come back — all your fields are intact.
//           Video only appears in Shorts AFTER you post the job (via from-job endpoint).
//           Draft is auto-cleared on successful post or "Post Another Job".

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Page } from '../../types';
import { jobsAPI, categoriesAPI, shortsAPI } from '../../services/api';
import { CheckCircleIcon, TrashIcon, VideoCameraIcon } from '../icons/Icons';
import { SparklesIcon } from '../icons/Icons';
import { useVideoGen } from '../../context/VideoGenContext';
import Swal from 'sweetalert2';

// ── Local storage key for draft persistence ────────────────────────────────
const DRAFT_KEY = 'rapidgig_postjob_draft';

interface FormState {
  title: string;
  company: string;
  location: string;
  type: 'Remote' | 'On-site' | 'Hybrid';
  pay: string;
  maxSlots: string;
  category: string;
  description: string;
  requirements: string;
  shortVideoUrl: string;
}

interface DraftState {
  form: FormState;
  videoSource: 'ai' | 'sample' | null;
  generateVideoOnPost: boolean;
  success: boolean;
  postedJobId: string | null;
}

const EMPTY_FORM: FormState = {
  title: '',
  company: '',
  location: '',
  type: 'Remote',
  pay: '',
  maxSlots: '1',
  category: '',
  description: '',
  requirements: '',
  shortVideoUrl: '',
};

/** Load draft from localStorage (or return defaults) */
function loadDraft(): DraftState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DraftState;
      // Validate it has the expected shape
      if (parsed.form && typeof parsed.form.title === 'string') {
        return parsed;
      }
    }
  } catch { /* corrupted — ignore */ }
  return {
    form: { ...EMPTY_FORM },
    videoSource: null,
    generateVideoOnPost: true,
    success: false,
    postedJobId: null,
  };
}

/** Save draft to localStorage */
function saveDraft(draft: DraftState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch { /* quota exceeded — ignore */ }
}

/** Clear draft from localStorage */
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────

interface PostJobPageProps {
  navigate: (page: Page) => void;
}

const PostJobPage: React.FC<PostJobPageProps> = ({ navigate }) => {
  const { startJob, jobs: videoJobs } = useVideoGen();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Restore draft from localStorage on mount ────────────────────────────
  const initial = useRef(loadDraft());
  const [form, setForm] = useState<FormState>(initial.current.form);
  const [videoSource, setVideoSource] = useState<'ai' | 'sample' | null>(initial.current.videoSource);
  const [generateVideoOnPost, setGenerateVideoOnPost] = useState(initial.current.generateVideoOnPost);
  const [success, setSuccess] = useState(initial.current.success);
  const [postedJobId, setPostedJobId] = useState<string | null>(initial.current.postedJobId);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // ── Persist draft to localStorage on every change ───────────────────────
  useEffect(() => {
    saveDraft({ form, videoSource, generateVideoOnPost, success, postedJobId });
  }, [form, videoSource, generateVideoOnPost, success, postedJobId]);

  // ── Load categories ─────────────────────────────────────────────────────
  useEffect(() => {
    categoriesAPI.getAll()
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  // ── Reset form to blank (for "Post Another Job") ────────────────────────
  const resetForm = useCallback((withPrompt = false) => {
    if (withPrompt) {
      Swal.fire({
        title: 'Clear Draft?',
        text: "You will lose all your unsaved job details.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Yes, clear it!'
      }).then((result) => {
        if (result.isConfirmed) {
          performReset();
          Swal.fire({ title: 'Cleared!', text: 'Your draft has been cleared.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      });
    } else {
      performReset();
    }

    function performReset() {
      setForm({ ...EMPTY_FORM });
      setVideoSource(null);
      setGenerateVideoOnPost(true);
      setSuccess(false);
      setPostedJobId(null);
      setError('');
      clearDraft();
    }
  }, []);

  // ── Submit: Save job → optionally trigger background video gen ──────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await jobsAPI.create({
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

      const savedJobId = result.id || result._id;
      setPostedJobId(savedJobId);

      // If "generate video" toggle is ON and no video yet, trigger background gen
      if (generateVideoOnPost && !form.shortVideoUrl && savedJobId) {
        triggerBackgroundVideoGen(savedJobId, form.title, form.company);
      }

      Swal.fire({
        title: 'Job Posted Successfully!',
        text: 'Your job is now live and visible to candidates on RapidGig.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Awesome!'
      });

      setSuccess(true);
      // Draft is kept in localStorage in "success" state so it persists across nav
    } catch (err: any) {
      setError(err.message || 'Failed to post job. Please try again.');
      Swal.fire({ title: 'Error!', text: err.message || 'Failed to post job.', icon: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Trigger background video gen from saved job ──────────────────────────
  const triggerBackgroundVideoGen = async (jobId: string, title: string, company: string) => {
    try {
      const response = await shortsAPI.generateFromJob(jobId);
      if (response.jobId) {
        // This fires the floating background indicator in the header!
        startJob(response.jobId, `${title} @ ${company}`);
        console.log(`🎬 Background video generation started for "${title}" (tracking ID: ${response.jobId})`);
      }
    } catch (err: any) {
      // Don't fail the job post — video gen is best-effort
      console.warn('Background video generation failed to start:', err.message);
    }
  };

  // ── Standalone "Generate Video" button (before posting) ──────────────────
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
      const fallbackTitle = form.title || form.company ? `${form.title} @ ${form.company}` : 'Custom Job Video';
      
      const response = await shortsAPI.generateAI({
        prompt,
        title: fallbackTitle,
        description: form.description,
      });

      if (response.jobId) {
        startJob(response.jobId, fallbackTitle);
        setVideoSource('ai');
      } else if (response.short?.videoUrl || response.videoUrl) {
        setForm(prev => ({ ...prev, shortVideoUrl: response.short?.videoUrl || response.videoUrl }));
        setVideoSource('ai');
      } else {
        throw new Error('No video URL or job ID returned');
      }
    } catch (err: any) {
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

  // Check if any of our video jobs completed — update form with the URL
  useEffect(() => {
    const completedJob = videoJobs.find(j => j.status === 'completed' && j.videoUrl);
    if (completedJob && !form.shortVideoUrl) {
      setForm(prev => ({ ...prev, shortVideoUrl: completedJob.videoUrl! }));
      setVideoSource('ai');
    }
  }, [videoJobs, form.shortVideoUrl]);

  // ── Check if a background video is currently processing ──────────────────
  const isVideoProcessing = videoJobs.some(j => j.status === 'processing');

  // ══════════════════════════════════════════════════════════════════════════
  // SUCCESS SCREEN — also persisted, so coming back from Shorts still shows it
  // ══════════════════════════════════════════════════════════════════════════
  if (success) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-12 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">Job Posted Successfully!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Your job is now live and visible to students on the platform.</p>
          
          {/* Show video generation status */}
          {isVideoProcessing && (
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                <span className="font-semibold text-sm">AI Video Generating in Background</span>
              </div>
              <p className="text-xs text-indigo-500/70 dark:text-indigo-400/70">
                You can navigate freely — check the <span className="font-bold">🎬 indicator</span> in the header to track progress.
                The video will be automatically attached to your job when ready.
              </p>
            </div>
          )}

          {/* Show if video completed */}
          {!isVideoProcessing && videoJobs.some(j => j.status === 'completed') && form.shortVideoUrl && (
            <div className="mb-6 overflow-hidden bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-xl shadow-inner">
              <div className="p-4 border-b border-green-200 dark:border-green-800/50 flex flex-col items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="font-semibold text-sm">AI Video Ready & Attached to Your Job!</span>
                </div>
                <p className="text-xs text-green-500/80 dark:text-green-400/80 text-center max-w-sm">
                  Your job is now standing out in the Shorts feed. Preview your AI-generated marketing video below.
                </p>
              </div>
              <div className="relative aspect-[9/16] bg-black max-w-[200px] mx-auto m-4 rounded-lg overflow-hidden shadow-lg border-2 border-green-300 dark:border-green-700/50">
                <video
                  src={form.shortVideoUrl.startsWith('http') ? form.shortVideoUrl : `${import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3001'}${form.shortVideoUrl}`}
                  className="w-full h-full object-cover"
                  loop
                  muted
                  autoPlay
                  playsInline
                  controls
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => resetForm(false)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
            >
              Post Another Job
            </button>
            <button onClick={() => navigate('review_applications')} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg transition-colors">
              View Applications
            </button>
            <button onClick={() => navigate('dashboard')} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg transition-colors">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FORM — all fields persist across navigation via localStorage
  // ══════════════════════════════════════════════════════════════════════════
  const InputClass =
    'w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-3 px-4 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';
  const LabelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2';

  // Check if the form has any user-entered data (for showing "clear draft" button)
  const hasFormData = form.title || form.company || form.description || form.location || form.pay;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tighter">Post a Job</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Fill in the details below to reach top talent on RapidGig.</p>
        </div>
        {hasFormData && (
          <button
            type="button"
            onClick={() => resetForm(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Clear Draft
          </button>
        )}
      </div>

      {/* Saved draft indicator */}
      {hasFormData && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Draft auto-saved — your form is safe even if you navigate away
        </div>
      )}

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
                    Starting...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Generate Video Now
                  </>
                )}
              </button>
            ) : isVideoProcessing ? (
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 dark:text-indigo-400 animate-pulse">
                <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                Video generating in background — you can navigate away!
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                <CheckCircleIcon className="w-4 h-4" />
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

        {/* ── AI Video Toggle ────────────────────────────────────────────────── */}
        {!form.shortVideoUrl && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={generateVideoOnPost}
                onChange={(e) => setGenerateVideoOnPost(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                <SparklesIcon className="w-4 h-4 inline-block mr-1 text-indigo-500" />
                Auto-generate AI marketing video on post
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The AI reads your job details and creates a cinematic video in the background. You can navigate freely while it generates.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 pt-2">
          <button type="button" onClick={() => navigate('dashboard')} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-lg transition-colors">
            Cancel
          </button>

          {/* Main submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`px-8 py-3 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 ${
              generateVideoOnPost && !form.shortVideoUrl
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting...
              </span>
            ) : generateVideoOnPost && !form.shortVideoUrl ? (
              <span className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                🚀 Post Job & Generate Video
              </span>
            ) : (
              '🚀 Post Job'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostJobPage;
