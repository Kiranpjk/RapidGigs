import React, { useEffect, useState } from 'react';
import { usersAPI } from '../../services/api';
import { applicationsAPI } from '../../services/api';

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001/api';
    const load = async () => {
      try {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` };
        const u = await fetch(`${API_BASE}/admin/users`, { headers }).then(r => r.json());
        const a = await fetch(`${API_BASE}/admin/applications`, { headers }).then(r => r.json());
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

  if (loading) return <div className="p-8">Loading admin data...</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u._id} className="p-4 border rounded">
              <p className="font-semibold">{u.name} ({u.email})</p>
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
          {applications.map(a => (
            <div key={a.id} className="p-4 border rounded">
              <p className="font-semibold">{a.job?.title} @ {a.job?.company}</p>
              <p className="text-sm">Applicant: {a.applicant?.name} ({a.applicant?.email})</p>
              <p className="text-sm">Status: {a.status}</p>
              <div className="mt-2">{
                a.resumeUrl ? <a href={a.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-600">Resume</a> : 'No resume'
              } | {
                a.videoUrl ? <a href={a.videoUrl} target="_blank" rel="noreferrer" className="text-indigo-600">Video</a> : 'No video'
              }</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
