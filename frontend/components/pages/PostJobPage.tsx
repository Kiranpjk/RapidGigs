// ✅ FIXED: Form state now persists in localStorage across navigation.
//           Navigate away to Shorts/Dashboard and come back — all your fields are intact.
//           Video only appears in Shorts AFTER you post the job (via from-job endpoint).
//           Draft is auto-cleared on successful post or "Post Another Job".

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Page } from '../../types';
import { jobsAPI, categoriesAPI, shortsAPI } from '../../services/api';
import { CheckCircleIcon, TrashIcon, VideoCameraIcon } from '../icons/Icons';
import { SparklesIcon } from '../icons/Icons';
import { useVideoGen, VIDEO_GEN_FACTS } from '../../context/VideoGenContext';
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
  const [isParsing, setIsParsing] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [showMagicFill, setShowMagicFill] = useState(false);
  const [inlineFactIndex, setInlineFactIndex] = useState(0);

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
        // Background job: progress on Post Job page + chip next to notifications elsewhere
        startJob(response.jobId, `${title} @ ${company}`, { fromPostJob: true });
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
        startJob(response.jobId, fallbackTitle, { fromPostJob: true });
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
  
  // ── AI Magic Fill: Extract structured fields from messy text ─────────────
  const handleMagicFill = async () => {
    if (!magicText.trim()) return;
    
    setIsParsing(true);
    setError('');
    try {
      const parsed = await jobsAPI.parseDescription(magicText);
      console.log('AI Parsed Job:', parsed);
      
      setForm({
        title: parsed.title || '',
        company: parsed.company || '',
        location: parsed.location || '',
        type: parsed.type || 'Remote',
        pay: parsed.pay || '',
        maxSlots: '1', // Default
        category: parsed.category || '',
        description: parsed.description || '',
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements.join('\n') : '',
        shortVideoUrl: '',
      });
      
      setShowMagicFill(false);
      setMagicText('');
      
      Swal.fire({
        title: 'Magic Fill Complete!',
        text: 'AI has extracted the details. Please review them below.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Magic Fill error:', err);
      setError('AI failed to parse that text. Try a clearer job description or fill manually.');
      Swal.fire({ title: 'Magic Fill Failed', text: 'Please fill the fields manually.', icon: 'warning' });
    } finally {
      setIsParsing(false);
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

  const postJobProcessingJobs = useMemo(
    () => videoJobs.filter(j => j.fromPostJob && j.status === 'processing'),
    [videoJobs]
  );
  const inlineVideoJob = useMemo(() => {
    const sorted = [...postJobProcessingJobs].sort((a, b) => b.startedAt - a.startedAt);
    return sorted[0];
  }, [postJobProcessingJobs]);

  useEffect(() => {
    if (!inlineVideoJob) return;
    setInlineFactIndex(0);
    const t = setInterval(() => {
      setInlineFactIndex(i => (i + 1) % VIDEO_GEN_FACTS.length);
    }, 4000);
    return () => clearInterval(t);
  }, [inlineVideoJob?.jobId]);

  // ══════════════════════════════════════════════════════════════════════════
  // SUCCESS SCREEN — also persisted, so coming back from Shorts still shows it
  // ══════════════════════════════════════════════════════════════════════════
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-slide-up">
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-16 rounded-[2.5rem] shadow-sm">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">Job Posted Successfully!</h2>
          <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto">Your job is now live and visible to students on the platform.</p>
          
          {/* Show video generation status */}
          {isVideoProcessing && (
            <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/30 rounded-3xl text-left max-w-md mx-auto">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                  <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                  <span className="font-bold text-sm">AI video generating</span>
                </div>
                {inlineVideoJob && (
                  <span className="text-sm font-black tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
                    {inlineVideoJob.progress}%
                  </span>
                )}
              </div>
              {inlineVideoJob && (
                <div className="h-2 rounded-full bg-white/70 dark:bg-slate-900/60 overflow-hidden border border-indigo-100/50 dark:border-indigo-900/30 mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-1000 ease-out"
                    style={{ width: `${inlineVideoJob.progress}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-indigo-600/90 dark:text-indigo-400/80">
                You can leave this screen — a compact video chip next to the notification bell shows progress everywhere else.
              </p>
            </div>
          )}

          {/* Show if video completed */}
          {!isVideoProcessing && videoJobs.some(j => j.status === 'completed') && form.shortVideoUrl && (
            <div className="mt-8 overflow-hidden bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-800/30 rounded-3xl">
              <div className="p-6 border-b border-green-100 dark:border-green-800/30 flex flex-col items-center gap-2 text-green-600 dark:text-green-400">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="font-bold text-sm">AI Video Ready & Attached!</span>
                </div>
                <p className="text-xs text-green-500/70 max-w-sm">
                  Your job stands out in the Shorts feed. Preview below.
                </p>
              </div>
              <div className="relative aspect-[9/16] bg-black max-w-[180px] mx-auto my-6 rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                <video
                  src={form.shortVideoUrl.startsWith('http') ? form.shortVideoUrl : `${import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3001'}${form.shortVideoUrl}`}
                  className="w-full h-full object-cover"
                  loop muted autoPlay playsInline controls
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center flex-wrap mt-10">
            <button
              onClick={() => resetForm(false)}
              className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200 dark:shadow-none cursor-pointer"
            >
              Post Another Job
            </button>
            <button onClick={() => navigate('review_applications')} className="px-8 py-4 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-bold rounded-2xl transition-all cursor-pointer">
              View Applications
            </button>
            <button onClick={() => navigate('dashboard')} className="px-8 py-4 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-bold rounded-2xl transition-all cursor-pointer">
              Dashboard
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
    'w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl py-3.5 px-5 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium';
  const LabelClass = 'block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1';
  const showVideoRunEditWarning = Boolean(inlineVideoJob);

  // Check if the form has any user-entered data (for showing "clear draft" button)
  const hasFormData = form.title || form.company || form.description || form.location || form.pay;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-slide-up">
      <div className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">New Job Posting</h1>
          <p className="text-lg text-gray-500 dark:text-slate-400 mt-2">Reach top student talent on RapidGig.</p>
        </div>
        {hasFormData && (
          <button
            type="button"
            onClick={() => resetForm(true)}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Clear Draft
          </button>
        )}
      </div>

      {/* Saved draft indicator */}
      {hasFormData && (
        <div className="mb-6 flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Draft auto-saved
        </div>
      )}

      {inlineVideoJob && (
        <div className="sticky top-16 z-30 mb-8 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/90 dark:bg-indigo-950/40 backdrop-blur-md px-5 py-4 shadow-lg shadow-indigo-500/5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <VideoCameraIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  Generating your job video
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-300/90 truncate">
                  {inlineVideoJob.title}
                  {postJobProcessingJobs.length > 1
                    ? ` · +${postJobProcessingJobs.length - 1} more`
                    : ''}
                </p>
              </div>
            </div>
            <span className="text-sm font-black tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
              {inlineVideoJob.progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/70 dark:bg-slate-900/60 overflow-hidden border border-indigo-100/50 dark:border-indigo-900/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-1000 ease-out"
              style={{ width: `${inlineVideoJob.progress}%` }}
            />
          </div>
          <p
            className="mt-3 text-xs text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed transition-all duration-500"
            key={inlineFactIndex}
          >
            {VIDEO_GEN_FACTS[inlineFactIndex]}
          </p>
          <p className="mt-2 text-[11px] font-medium text-gray-500 dark:text-slate-500">
            You can keep editing this form or open another tab — progress stays in sync. When you leave this page, use the chip next to the bell to check status.
          </p>
        </div>
      )}

      {/* ── AI Magic Fill Section ────────────────────────────────────────── */}
      <div className="mb-8">
        {!showMagicFill ? (
          <button
            onClick={() => setShowMagicFill(true)}
            className="flex items-center gap-2 px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-3xl text-indigo-600 dark:text-indigo-400 font-bold text-sm w-full transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/30 cursor-pointer shadow-sm"
          >
            <SparklesIcon className="w-5 h-5" />
            <span>Have a messy job description? Paste it here and let AI fill the form for you!</span>
          </button>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800/30 rounded-[2.5rem] p-8 shadow-xl animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                AI Magic Fill
              </h3>
              <button onClick={() => setShowMagicFill(false)} className="text-gray-400 hover:text-gray-600">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            <textarea
              className={`${InputClass} rounded-[2rem] min-h-[150px] mb-4`}
              placeholder="Paste your messy job description, email, or requirements here..."
              value={magicText}
              onChange={(e) => setMagicText(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleMagicFill}
                disabled={isParsing || !magicText.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI is thinking...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    Auto-Fill Fields
                  </>
                )}
              </button>
              <button
                onClick={() => setShowMagicFill(false)}
                className="px-6 py-3.5 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400 font-bold rounded-2xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>


      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-[2.5rem] p-10 shadow-sm space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {showVideoRunEditWarning && (
          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-700/40 bg-amber-50/80 dark:bg-amber-950/20 px-5 py-4">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Current video run is locked to the details that were already submitted.
            </p>
            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
              You can keep editing this form, but title, company, and description changes will only affect the next video generation.
            </p>
          </div>
        )}

        {/* ── Section: Basic Info ───────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={LabelClass} htmlFor="title">Job Title *</label>
              <input id="title" name="title" type="text" required placeholder="e.g. Frontend Developer" className={InputClass} value={form.title} onChange={handleChange} />
            </div>
            <div>
              <label className={LabelClass} htmlFor="company">Company *</label>
              <input id="company" name="company" type="text" required placeholder="e.g. DesignCo Inc." className={InputClass} value={form.company} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* ── Section: Work Details ─────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Work Details</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className={LabelClass} htmlFor="pay">Salary / Pay Rate *</label>
              <input id="pay" name="pay" type="text" required placeholder="e.g. $40–60/hr" className={InputClass} value={form.pay} onChange={handleChange} />
            </div>
            <div>
              <label className={LabelClass} htmlFor="maxSlots">Positions Available</label>
              <input id="maxSlots" name="maxSlots" type="number" min="1" max="100" placeholder="e.g. 5" className={InputClass} value={form.maxSlots} onChange={handleChange} />
              <p className="text-[10px] text-gray-300 dark:text-slate-600 mt-2 px-1 font-bold uppercase tracking-widest">How many freelancers needed?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
        </div>

        {/* ── Section: Description & Video ──────────────────────────────── */}
        <div>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Description & Media</h3>
            {!form.shortVideoUrl ? (
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo}
                className="flex items-center gap-2 text-xs font-black bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-2xl shadow-lg transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingVideo ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Generate Video
                  </>
                )}
              </button>
            ) : isVideoProcessing ? (
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 dark:text-indigo-400 animate-pulse">
                <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                <CheckCircleIcon className="w-4 h-4" />
                {videoSource === 'ai' ? 'AI Video Ready' : 'Sample Added'}
              </div>
            )}
          </div>
          {showVideoRunEditWarning && (
            <div className="mb-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 bg-indigo-50/70 dark:bg-indigo-950/20 px-4 py-3">
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Editing the description now will not update the video currently being generated.
              </p>
            </div>
          )}
          <div>
            <label className={LabelClass} htmlFor="description">Job Description *</label>
            <textarea
              id="description" name="description" required rows={5}
              placeholder="Describe the role, responsibilities, and what makes it exciting..."
              className={`${InputClass} rounded-[2rem] px-6 py-5 leading-relaxed`}
              value={form.description} onChange={handleChange}
            />
          </div>

          {form.shortVideoUrl && (
            <div className="mt-6 p-6 bg-gray-50 dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-gray-900 dark:text-white">
                  <VideoCameraIcon className="w-4 h-4 text-indigo-500" />
                  {videoSource === 'ai' ? 'AI-Generated Video' : 'Sample Video'}
                </h4>
                <button
                  type="button"
                  onClick={() => { setForm(prev => ({ ...prev, shortVideoUrl: '' })); setVideoSource(null); }}
                  className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-inner border-4 border-white dark:border-slate-800">
                <video src={form.shortVideoUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
              </div>
              {videoSource === 'sample' && (
                <p className="mt-3 text-xs text-amber-500 font-bold">
                  ⚠️ Sample video — AI service unavailable. Start Helios for real generation.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Section: Requirements ─────────────────────────────────────── */}
        <div>
          <label className={LabelClass} htmlFor="requirements">Requirements <span className="font-normal normal-case tracking-normal text-gray-300">(one per line)</span></label>
          <textarea
            id="requirements" name="requirements" rows={4}
            placeholder={"3+ years of React experience\nTypeScript proficiency\nStrong communication skills"}
            className={`${InputClass} rounded-[2rem] px-6 py-5 leading-relaxed`}
            value={form.requirements} onChange={handleChange}
          />
        </div>

        {/* ── AI Video Toggle ────────────────────────────────────────────── */}
        {!form.shortVideoUrl && (
          <div className="flex items-center gap-4 p-6 bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-700 rounded-3xl">
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={generateVideoOnPost}
                onChange={(e) => setGenerateVideoOnPost(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/10 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
            </label>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                <SparklesIcon className="w-4 h-4 inline-block mr-1 text-indigo-500" />
                Auto-generate AI marketing video
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                Creates a cinematic video from your job details in the background.
              </p>
            </div>
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={() => navigate('dashboard')} className="px-8 py-4 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-bold rounded-2xl transition-all cursor-pointer">
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className={`px-10 py-4 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50 cursor-pointer ${
              generateVideoOnPost && !form.shortVideoUrl
                ? 'bg-gray-900 dark:bg-white dark:text-gray-900 shadow-gray-200 dark:shadow-none'
                : 'bg-gray-900 dark:bg-white dark:text-gray-900 shadow-gray-200 dark:shadow-none'
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
                Post & Generate Video
              </span>
            ) : (
              'Post Job'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostJobPage;
