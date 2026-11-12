// Shared class strings for the signed-in screens, so every form and button reads the same.
// They only combine the tokens in index.css; nothing here introduces a new colour.

export const page = 'max-w-screen-xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-20 animate-fade-in';
export const pageTitle = 'font-display text-title font-semibold text-[var(--text-primary)]';
export const pageLead = 'mt-1 text-[14px] text-[var(--text-secondary)]';
export const sectionTitle = 'text-[15px] font-semibold text-[var(--text-primary)]';

const btnBase =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius)] text-[14px] font-medium transition-colors duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

/** Ink button: the one main action on a screen. */
export const btnPrimary = `${btnBase} bg-[var(--text-primary)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] disabled:hover:bg-[var(--text-primary)] disabled:hover:text-[var(--bg)]`;
/** Outlined button: secondary actions next to a primary one. */
export const btnSecondary = `${btnBase} border border-[var(--border-strong)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]`;
/** Quiet text button. */
export const btnGhost = `${btnBase} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]`;
/** Destructive action (reject, delete). */
export const btnDanger = `${btnBase} text-[var(--danger)] hover:bg-[var(--danger-subtle)]`;
/** Small variant modifier: append to any button. */
export const btnSm = '!h-8 !px-3 !text-[13px]';

export const input =
  'w-full h-10 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-4 focus:ring-[var(--accent)]/15 transition-[border-color,box-shadow] duration-150 aria-[invalid=true]:border-[var(--danger)]';
export const textarea = input.replace('h-10', 'min-h-[120px] py-2.5 leading-relaxed');
export const label = 'block mb-1.5 text-[13px] font-medium text-[var(--text-primary)]';
export const hint = 'mt-1.5 text-[12.5px] text-[var(--text-secondary)]';
export const fieldError = 'mt-1.5 text-[12.5px] font-medium text-[var(--danger)]';

export const card = 'bg-[var(--bg)] border border-[var(--border)] rounded-[14px]';
export const chip = 'inline-flex items-center gap-1 text-[12.5px] font-medium bg-[var(--surface)] text-[var(--text-secondary)] px-2.5 py-1 rounded-full';

export const errorNote =
  'rounded-[var(--radius)] border-l-2 border-[var(--danger)] bg-[var(--danger-subtle)] px-3.5 py-2.5 text-[13.5px] text-[var(--danger)]';

export const spinner = 'w-5 h-5 border-2 border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin';

/** Fallback avatar: neutral initials, never a random brand colour. */
export const avatarUrl = (name?: string, url?: string, size = 80) =>
  url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=${size}&background=ececea&color=5a5a56&bold=true`;
