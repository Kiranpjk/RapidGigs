import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

type JobType = 'Remote' | 'On-site' | 'Hybrid';

interface GeneratedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: JobType;
  pay: string;
  description: string;
  shortVideoUrl?: string;
  shortVideoScript?: string;
  shortVideoScenes?: Array<{
    order: number;
    durationSec: number;
    caption: string;
    visualPrompt: string;
  }>;
  shortVideoStatus?: 'pending' | 'generated' | 'failed';
}

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdJob, setCreatedJob] = useState<GeneratedJob | null>(null);
  const [videoProvider, setVideoProvider] = useState<string>('');

  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Remote' as JobType,
    pay: '',
    description: '',
  });

  useEffect(() => {
    const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';
    const load = async () => {
      try {
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
        const u = await fetch(`${API_BASE}/admin/users`, { headers }).then((r) => r.json());
        const a = await fetch(`${API_BASE}/admin/applications`, { headers }).then((r) => r.json());
        setUsers(u);
        setApplications(a);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreatedJob(null);
    setVideoProvider('');
    setIsCreating(true);

    try {
      const response = await adminAPI.createJobFromJD(form);
      setCreatedJob(response.job);
      setVideoProvider(response.videoProvider || 'heuristic');
      setForm({
        title: '',
        company: '',
        location: '',
        type: 'Remote',
        pay: '',
        description: '',
      });
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create job from JD.');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="p-8">Loading admin data...</div>;

  return (
    <div className="container mx-auto p-8 space-y-10">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <h2 className="text-xl font-semibold mb-2">Create JD + Auto 30s Video Plan</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Paste the JD and this module extracts the most important points into a 30-second video script + scene plan.
        </p>

        <form onSubmit={handleCreateJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="title" value={form.title} onChange={handleFormChange} required placeholder="Job title" className="border rounded p-2 bg-transparent" />
          <input name="company" value={form.company} onChange={handleFormChange} required placeholder="Company" className="border rounded p-2 bg-transparent" />
          <input name="location" value={form.location} onChange={handleFormChange} required placeholder="Location" className="border rounded p-2 bg-transparent" />
          <select name="type" value={form.type} onChange={handleFormChange} className="border rounded p-2 bg-transparent">
            <option>Remote</option>
            <option>On-site</option>
            <option>Hybrid</option>
          </select>
          <input name="pay" value={form.pay} onChange={handleFormChange} required placeholder="Pay (e.g. ₹30K-₹45K)" className="border rounded p-2 bg-transparent md:col-span-2" />
          <textarea
            name="description"
            value={form.description}
            onChange={handleFormChange}
            required
            minLength={40}
            rows={6}
            placeholder="Paste full job description..."
            className="border rounded p-2 bg-transparent md:col-span-2"
          />
          <button type="submit" disabled={isCreating} className="md:col-span-2 bg-indigo-600 text-white rounded px-4 py-2 font-semibold hover:bg-indigo-500 disabled:opacity-70">
            {isCreating ? 'Generating video plan...' : 'Create Job + Generate 30s Video Plan'}
          </button>
        </form>

        {createError && <p className="text-red-500 text-sm mt-3">{createError}</p>}

        {createdJob && (
          <div className="mt-6 p-4 rounded border border-emerald-400/40 bg-emerald-50/40 dark:bg-emerald-900/10 space-y-3">
            <h3 className="font-bold text-lg">Created: {createdJob.title}</h3>
            <p className="text-sm">Video provider: <span className="font-semibold">{videoProvider}</span></p>
            <p className="text-sm">Status: <span className="font-semibold">{createdJob.shortVideoStatus || 'pending'}</span></p>

            {createdJob.shortVideoUrl ? (
              <video controls className="w-full max-w-xl rounded border">
                <source src={createdJob.shortVideoUrl} />
              </video>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-300">No rendered MP4 yet. Script + scenes were generated and saved.</p>
            )}

            {createdJob.shortVideoScript && (
              <div>
                <p className="font-semibold mb-1">Narration Script</p>
                <p className="text-sm leading-relaxed">{createdJob.shortVideoScript}</p>
              </div>
            )}

            {!!createdJob.shortVideoScenes?.length && (
              <div>
                <p className="font-semibold mb-2">30s Scene Plan</p>
                <div className="space-y-2">
                  {createdJob.shortVideoScenes.map((scene) => (
                    <div key={scene.order} className="text-sm border rounded p-2">
                      <p className="font-semibold">Scene {scene.order} • {scene.durationSec}s</p>
                      <p>{scene.caption}</p>
                      <p className="text-slate-500 dark:text-slate-400">Visual: {scene.visualPrompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u._id} className="p-4 border rounded">
              <p className="font-semibold">
                {u.name} ({u.email})
              </p>
              <p className="text-sm">Role: {u.role}</p>
              <p className="text-sm">Student: {u.isStudent ? 'yes' : 'no'}</p>
              <p className="text-sm">Recruiter: {u.isRecruiter ? 'yes' : 'no'}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Applications</h2>
        <div className="space-y-4">
          {applications.map((a) => (
            <div key={a.id} className="p-4 border rounded">
              <p className="font-semibold">
                {a.job?.title} @ {a.job?.company}
              </p>
              <p className="text-sm">
                Applicant: {a.applicant?.name} ({a.applicant?.email})
              </p>
              <p className="text-sm">Status: {a.status}</p>
              <div className="mt-2">
                {a.resumeUrl ? (
                  <a href={a.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-600">
                    Resume
                  </a>
                ) : (
                  'No resume'
                )}{' '}
                |{' '}
                {a.videoUrl ? (
                  <a href={a.videoUrl} target="_blank" rel="noreferrer" className="text-indigo-600">
                    Video
                  </a>
                ) : (
                  'No video'
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
