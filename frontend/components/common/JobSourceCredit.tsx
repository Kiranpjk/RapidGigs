import React from 'react';
import { Job } from '../../types';

// Credit link for imported listings. Deliberately no rel="nofollow": the sources' terms ask for a followed link back.
const CREDITS: Record<NonNullable<Job['source']>, { label: string; href: string }> = {
    simplify: { label: 'via Simplify', href: 'https://github.com/SimplifyJobs/Summer2027-Internships' },
    zapply: { label: 'via Zapply', href: 'https://github.com/zapplyjobs/Internships-2027' },
    arbeitnow: { label: 'via Arbeitnow', href: 'https://www.arbeitnow.com' },
    remotive: { label: 'via Remotive', href: 'https://remotive.com' },
    remoteok: { label: 'via Remote OK', href: 'https://remoteok.com' },
    jobicy: { label: 'via Jobicy', href: 'https://jobicy.com' },
    himalayas: { label: 'via Himalayas', href: 'https://himalayas.app' },
};

const JobSourceCredit: React.FC<{ source: Job['source'] }> = ({ source }) => {
    if (!source) return null;
    const credit = CREDITS[source];
    if (!credit) return null;
    const { label, href } = credit;
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
