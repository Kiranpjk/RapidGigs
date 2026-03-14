// ✅ FIXED: Uses centralized adminAPI instead of raw fetch with manual token handling
// ✅ FIXED: Proper loading/error states

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [u, a] = await Promise.all([
          adminAPI.getUsers(),
          adminAPI.getApplications(),
        ]);
        setUsers(Array.isArray(u) ? u : []);
        setApplications(Array.isArray(a) ? a : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mr-3" />
        <span className="text-slate-600 dark:text-slate-400">Loading admin data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">
          Users{' '}
          <span className="text-sm font-normal text-slate-500">({users.length})</span>
        </h2>
        {users.length === 0 ? (
          <p className="text-slate-500">No users found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {users.map(u => (
              <div
                key={u._id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50"
              >
                <p className="font-semibold text-slate-800 dark:text-white">
                  {u.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full capitalize">
                    {u.role}
                  </span>
                  {u.isStudent && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                      Student
                    </span>
                  )}
                  {u.isRecruiter && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      Recruiter
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">
          Applications{' '}
          <span className="text-sm font-normal text-slate-500">({applications.length})</span>
        </h2>
        {applications.length === 0 ? (
          <p className="text-slate-500">No applications found.</p>
        ) : (
          <div className="space-y-4">
            {applications.map(a => (
              <div
                key={a.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50"
              >
                <p className="font-semibold text-slate-800 dark:text-white">
                  {a.job?.title ?? '—'} @ {a.job?.company ?? '—'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Applicant: {a.applicant?.name ?? '—'} ({a.applicant?.email ?? '—'})
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Status:{' '}
                  <span className="font-medium capitalize">{a.status}</span>
                </p>
                <div className="mt-2 flex gap-3 text-sm">
                  {a.resumeUrl ? (
                    <a
                      href={a.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Resume ↗
                    </a>
                  ) : (
                    <span className="text-slate-400">No resume</span>
                  )}
                  {a.videoUrl ? (
                    <a
                      href={a.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Video ↗
                    </a>
                  ) : (
                    <span className="text-slate-400">No video</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminPage;
