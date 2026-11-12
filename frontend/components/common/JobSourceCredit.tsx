import React from 'react';
import { Job } from '../../types';

// Credit link for imported listings. Deliberately no rel="nofollow": Zapply's reuse terms ask for a followed link back.
const CREDITS = {
    simplify: { label: 'via Simplify', href: 'https://github.com/SimplifyJobs/Summer2027-Internships' },
    zapply: { label: 'via Zapply', href: 'https://github.com/zapplyjobs/Internships-2027' },
} as const;

const JobSourceCredit: React.FC<{ source: Job['source'] }> = ({ source }) => {
    if (!source) return null;
    const { label, href } = CREDITS[source];
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener"
            onClick={e => e.stopPropagation()}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline transition-colors duration-150 focus-ring"
        >
            {label}
        </a>
    );
};

export default JobSourceCredit;
