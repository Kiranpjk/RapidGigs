import React from 'react';

const KINDS = [
    { label: 'All', value: '' },
    { label: 'Internships', value: 'Internship' },
    { label: 'Working student', value: 'Working student' },
    { label: 'Jobs', value: 'Job' },
];

// Filter chips for the role kind; value is sent to the API as `kind`.
const KindFilter: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind of role">
        {KINDS.map(k => (
            <button
                key={k.value}
                onClick={() => onChange(k.value)}
                aria-pressed={value === k.value}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-150 focus-ring ${
                    value === k.value
                        ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                        : 'text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
            >
                {k.label}
            </button>
        ))}
    </div>
);

export default KindFilter;
