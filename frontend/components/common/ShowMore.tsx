import React from 'react';

// "Show more" footer for the paged job lists.
const ShowMore: React.FC<{ hasMore: boolean; loading: boolean; failed: boolean; onMore: () => void }> = ({ hasMore, loading, failed, onMore }) => {
    if (!hasMore) return null;
    return (
        <div className="mt-8 flex flex-col items-center gap-2">
            {failed && <p role="alert" className="text-[13px] text-[var(--danger)]">Couldn't load more roles. Try again.</p>}
            <button
                onClick={onMore}
                disabled={loading}
                className="px-5 py-2 text-[13px] font-medium rounded-[var(--radius)] border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus-ring disabled:opacity-60"
            >
                {loading ? 'Loading…' : 'Show more'}
            </button>
        </div>
    );
};

export default ShowMore;
