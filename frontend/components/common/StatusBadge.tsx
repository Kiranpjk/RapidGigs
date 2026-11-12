import React from 'react';

// One place for application status wording and colour, shared by the student and recruiter screens.
// Backend statuses: pending | reviewing | shortlisted | interviewing | hired | rejected ('accepted' is an old alias of hired).

type Audience = 'student' | 'recruiter';

const TONE = {
  neutral: 'bg-[var(--surface)] text-[var(--text-secondary)]',
  positive: 'bg-[var(--success-subtle)] text-[var(--success)]',
  negative: 'bg-[var(--danger-subtle)] text-[var(--danger)]',
};

const STATUS: Record<string, { student: string; recruiter: string; tone: keyof typeof TONE; next: string }> = {
  pending:      { student: 'Submitted',    recruiter: 'New',          tone: 'neutral',  next: 'The recruiter has not opened it yet.' },
  reviewing:    { student: 'In review',    recruiter: 'In review',    tone: 'neutral',  next: 'The recruiter is looking at your application.' },
  shortlisted:  { student: 'Shortlisted',  recruiter: 'Shortlisted',  tone: 'positive', next: 'You made the shortlist. The recruiter may reach out to set up an interview.' },
  interviewing: { student: 'Interview',    recruiter: 'Interviewing', tone: 'positive', next: 'The recruiter wants to interview you. Watch your notifications and messages.' },
  hired:        { student: 'Offer',        recruiter: 'Hired',        tone: 'positive', next: 'You got the role. The recruiter will contact you about next steps.' },
  rejected:     { student: 'Not selected', recruiter: 'Rejected',     tone: 'negative', next: 'The recruiter went with other candidates for this role.' },
};

const lookup = (status?: string) => {
  const s = (status || 'pending').toLowerCase();
  return STATUS[s === 'accepted' ? 'hired' : s] || STATUS.pending;
};

export const statusLabel = (status: string | undefined, audience: Audience = 'student') => lookup(status)[audience];
export const statusNext = (status?: string) => lookup(status).next;

const StatusBadge: React.FC<{ status?: string; audience?: Audience; className?: string }> = ({ status, audience = 'student', className = '' }) => {
  const s = lookup(status);
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-medium whitespace-nowrap ${TONE[s.tone]} ${className}`}>
      {s[audience]}
    </span>
  );
};

export default StatusBadge;
