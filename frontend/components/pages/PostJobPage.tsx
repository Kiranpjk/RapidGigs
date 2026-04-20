import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Page } from '../../types';
import { jobsAPI, categoriesAPI, shortsAPI } from '../../services/api';
import { CheckCircleIcon, TrashIcon, VideoCameraIcon, SparklesIcon, PlusIcon, ClockIcon } from '../icons/Icons';
import { useVideoGen, VIDEO_GEN_FACTS } from '../../context/VideoGenContext';
import Swal from 'sweetalert2';

const DRAFT_KEY = 'rapidgig_postjob_draft';

interface FormState {
  title: string; company: string; location: string; type: 'Remote' | 'On-site' | 'Hybrid';
  pay: string; maxSlots: string; category: string; description: string; requirements: string; shortVideoUrl: string;
}

interface DraftState { form: FormState; videoSource: 'ai' | 'sample' | null; generateVideoOnPost: boolean; success: boolean; postedJobId: string | null; }

const EMPTY_FORM: FormState = { title: '', company: '', location: '', type: 'Remote', pay: '', maxSlots: '1', category: '', description: '', requirements: '', shortVideoUrl: '' };

function loadDraft(): DraftState {
  try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) { const p = JSON.parse(raw) as DraftState; if (p.form && typeof p.form.title === 'string') return p; } } catch {}
  return { form: { ...EMPTY_FORM }, videoSource: null, generateVideoOnPost: true, success: false, postedJobId: null };
}

const PostJobPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { startJob, jobs: videoJobs } = useVideoGen();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const initial = useRef(loadDraft());
  const [form, setForm] = useState<FormState>(initial.current.form);
  const [videoSource, setVideoSource] = useState<'ai' | 'sample' | null>(initial.current.videoSource);
  const [generateVideoOnPost, setGenerateVideoOnPost] = useState(initial.current.generateVideoOnPost);
  const [success, setSuccess] = useState(initial.current.success);
  const [postedJobId, setPostedJobId] = useState<string | null>(initial.current.postedJobId);
  const [isParsing, setIsParsing] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [inlineFactIndex, setInlineFactIndex] = useState(0);

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, videoSource, generateVideoOnPost, success, postedJobId })); } catch {} }, [form, videoSource, generateVideoOnPost, success, postedJobId]);
  useEffect(() => { categoriesAPI.getAll().then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {}); }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setVideoSource(null); setGenerateVideoOnPost(true); setSuccess(false); setPostedJobId(null); setError(''); localStorage.removeItem(DRAFT_KEY); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const result = await jobsAPI.create({ ...form, maxSlots: parseInt(form.maxSlots) || 1, requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [] });
      const savedJobId = result.id || result._id;
      setPostedJobId(savedJobId);
      if (generateVideoOnPost && !form.shortVideoUrl && savedJobId) {
        try { const r = await shortsAPI.generateFromJob(savedJobId); if (r.jobId) startJob(r.jobId, `${form.title} @ ${form.company}`, { fromPostJob: true, mongoJobId: savedJobId }); } catch {}
      }
      setSuccess(true);
    } catch (err: any) { setError(err.message || 'Failed to post job.'); } finally { setIsLoading(false); }
  };

  const handleMagicFill = async () => {
    if (!magicText.trim()) return;
    setIsParsing(true);
    try {
      const p = await jobsAPI.parseDescription(magicText);
      
      // Sanitize Type
      const validTypes: ('Remote' | 'On-site' | 'Hybrid')[] = ['Remote', 'On-site', 'Hybrid'];
      const sanitizedType = validTypes.find(t => t.toLowerCase() === p.type?.toLowerCase()) || 'Remote';
      
      // Sanitize Category (Match name to ID)
      let categoryId = '';
      if (p.category) {
        const match = categories.find(c => c.name.toLowerCase().includes(p.category.toLowerCase()));
        if (match) categoryId = match._id || match.id;
      }

      setForm({ 
        title: p.title || '', 
        company: p.company || '', 
        location: p.location || '', 
        type: sanitizedType, 
        pay: p.pay || '', 
        maxSlots: '1', 
        category: categoryId, 
        description: p.description || '', 
        requirements: Array.isArray(p.requirements) ? p.requirements.join('\n') : '', 
        shortVideoUrl: '' 
      });
      setMagicText('');
    } catch { setError('AI could not parse that text.'); } finally { setIsParsing(false); }
  };

  useEffect(() => { const cj = videoJobs.find(j => j.status === 'completed' && j.videoUrl); if (cj && !form.shortVideoUrl) { setForm(prev => ({ ...prev, shortVideoUrl: cj.videoUrl! })); setVideoSource('ai'); } }, [videoJobs, form.shortVideoUrl]);

  const isVideoProcessing = videoJobs.some(j => j.status === 'processing');
  const processingJob = useMemo(() => videoJobs.filter(j => j.fromPostJob && j.status === 'processing').sort((a, b) => b.startedAt - a.startedAt)[0], [videoJobs]);

  useEffect(() => { if (!processingJob) return; const t = setInterval(() => setInlineFactIndex(i => (i + 1) % VIDEO_GEN_FACTS.length), 4000); return () => clearInterval(t); }, [processingJob?.jobId]);

  const progressPercent = useMemo(() => {
    let score = 0;
    if (form.title.trim()) score += 20;
    if (form.company.trim()) score += 20;
    if (form.location.trim()) score += 15;
    if (form.pay.trim()) score += 15;
    if (form.description.trim()) score += 20;
    if (form.requirements.trim()) score += 10;
    return score;
  }, [form]);

  const input = "w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-100";
  const label = "block text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5";

  if (success) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center animate-fade-in">
        <div className="border border-[var(--border)] rounded-lg p-10">
          <CheckCircleIcon className="w-10 h-10 text-[var(--success)] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Job Published</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-8">Your role is now visible to candidates.</p>
          {isVideoProcessing && processingJob && (
            <div className="border border-[var(--border)] rounded-md p-4 mb-6 text-left">
              <div className="flex items-center justify-between text-[12px] mb-2">
                <span className="text-[var(--accent)] font-medium">Video generating…</span>
                <span className="text-[var(--text-tertiary)] tabular-nums">{processingJob.progress}%</span>
              </div>
              <div className="h-1 bg-[var(--surface)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full transition-[width] duration-1000" style={{ width: `${processingJob.progress}%` }} />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button onClick={resetForm} className="w-full py-2.5 bg-[var(--text-primary)] text-[var(--bg)] text-[13px] font-medium rounded-md">Post Another</button>
            <button onClick={() => navigate('dashboard')} className="w-full py-2.5 text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)]">Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Create Job</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-24 h-1 bg-[var(--surface)] rounded-full overflow-hidden"><div className="h-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${progressPercent}%` }} /></div>
            <span className="text-[11px] text-[var(--text-tertiary)]">{progressPercent}%</span>
          </div>
        </div>
        <button onClick={resetForm} className="p-2 rounded-md text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"><TrashIcon className="w-4 h-4" /></button>
      </div>

      {/* AI Copilot */}
      <div className="border border-[var(--border)] rounded-lg p-4 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <SparklesIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">AI Copilot</span>
        </div>
        <div className="flex gap-2">
          <textarea placeholder="Paste a rough job description and let AI structure it for you…" className={`${input} flex-1 h-10 resize-none py-2`} value={magicText} onChange={e => setMagicText(e.target.value)} />
          <button onClick={handleMagicFill} disabled={isParsing || !magicText.trim()} className="px-4 bg-[var(--accent)] text-white text-[12px] font-medium rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0">
            {isParsing ? '…' : 'Fill'}
          </button>
        </div>
      </div>

      {/* Video generating */}
      {processingJob && (
        <div className="border border-[var(--accent)]/20 bg-[var(--accent-subtle)] rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between text-[12px] mb-2">
            <div className="flex items-center gap-2 text-[var(--accent)]"><div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /><span className="font-medium">Generating video…</span></div>
            <span className="text-[var(--accent)] tabular-nums font-medium">{processingJob.progress}%</span>
          </div>
          <div className="h-1 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[var(--accent)] transition-[width] duration-1000 rounded-full" style={{ width: `${processingJob.progress}%` }} /></div>
          <p className="text-[11px] text-[var(--accent)]/70 mt-2 italic">{VIDEO_GEN_FACTS[inlineFactIndex]}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <div className="border-l-2 border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-3 text-[13px] text-[var(--danger)]">{error}</div>}

        {/* Section 1 */}
        <section className="space-y-4">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] flex items-center justify-center font-semibold">1</span>
            Role Details
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Job Title *</label><input name="title" required placeholder="Senior Frontend Engineer" className={input} value={form.title} onChange={handleChange} /></div>
            <div><label className={label}>Company *</label><input name="company" required placeholder="Acme Inc" className={input} value={form.company} onChange={handleChange} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Location *</label><input name="location" required placeholder="Brooklyn, NY" className={input} value={form.location} onChange={handleChange} /></div>
            <div><label className={label}>Type</label><select name="type" className={input} value={form.type} onChange={handleChange}><option value="Remote">Remote</option><option value="On-site">On-site</option><option value="Hybrid">Hybrid</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Pay *</label>
              <input name="pay" required maxLength={50} placeholder="$120k – $160k" className={input} value={form.pay} onChange={handleChange} />
              <p className="text-[9px] text-[var(--text-tertiary)] mt-1">Keep it short, e.g. $120k–$160k or 12lpa</p>
            </div>
            <div><label className={label}>Open Seats</label><input type="number" name="maxSlots" min="1" max="100" className={input} value={form.maxSlots} onChange={handleChange} /></div>
          </div>
          <div><label className={label}>Category</label><select name="category" className={input} value={form.category} onChange={handleChange}><option value="">Select…</option>{categories.map((c: any) => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}</select></div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] flex items-center justify-center font-semibold">2</span>
            Description
          </p>
          <div>
            <label className={label}>About the Role *</label>
            <textarea name="description" required rows={8} placeholder="Describe the team, the tech stack, and the problem they will solve." className={`${input} leading-relaxed`} value={form.description} onChange={handleChange} />
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] flex items-center justify-center font-semibold">3</span>
            Requirements
          </p>
          <textarea name="requirements" rows={5} placeholder={"• 5+ years with distributed systems\n• TypeScript mastery\n• Experience leading product squads"} className={`${input} leading-relaxed font-mono text-[13px]`} value={form.requirements} onChange={handleChange} />
        </section>

        {/* AI Video Toggle */}
        {!form.shortVideoUrl && (
          <div className="flex items-center justify-between border border-[var(--border)] rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Generate AI Video</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">We'll create a 30-sec studio short from your description</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={generateVideoOnPost} onChange={e => setGenerateVideoOnPost(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-[var(--border)] rounded-full peer peer-checked:bg-[var(--accent)] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        )}

        {/* Sticky CTA */}
        <div className="sticky bottom-6 z-40">
          <div className="flex gap-3 bg-[var(--bg)]/80 backdrop-blur-sm border border-[var(--border)] rounded-lg p-3">
            <button type="button" onClick={() => navigate('dashboard')} className="flex-1 py-3 text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex-[2] py-3 bg-[var(--text-primary)] text-[var(--bg)] text-[13px] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
              {isLoading ? 'Publishing…' : 'Publish Job'}
            </button>
          </div>
        </div>
      </form>

      <footer className="mt-12 pb-20 text-center">
        <p className="text-[11px] text-[var(--text-tertiary)] flex items-center justify-center gap-1.5">
          <ClockIcon className="w-3 h-3" /> Drafts auto-saved locally
        </p>
      </footer>
    </div>
  );
};

export default PostJobPage;
