import React, { useState, useEffect, useRef } from 'react';
import { Application, Page } from '../../types';
import { VideoCameraIcon, BookmarkIcon, DocumentChartBarIcon, Cog6ToothIcon, BriefcaseIcon, PaperAirplaneIcon, XMarkIcon, CameraIcon, PhotoIcon, ArrowPathIcon, HomeIcon } from '../icons/Icons';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { applicationsAPI, usersAPI, videosAPI, imagesAPI } from '../../services/api';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { Toast, useToast } from '../common/Toast';
import useModal from '../../hooks/useModal';
import { page, pageTitle, sectionTitle, card, chip, label, hint, input, btnPrimary, btnSecondary, btnGhost, btnDanger, btnSm, spinner, avatarUrl } from '../ui/classes';

interface ProfilePageProps {
    navigate: (page: Page) => void;
}

const Section: React.FC<{ id: string; title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ id, title, action, children }) => (
    <section id={id} className={`${card} scroll-mt-24`}>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)]">
            <h2 className={sectionTitle}>{title}</h2>
            {action}
        </div>
        {children}
    </section>
);

const Empty: React.FC<{ title: string; text?: string; action?: React.ReactNode }> = ({ title, text, action }) => (
    <div className="px-6 py-10 text-center">
        <p className="text-[14px] font-medium text-[var(--text-primary)]">{title}</p>
        {text && <p className={hint}>{text}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

const Loading: React.FC = () => <div className="py-10 flex justify-center" role="status" aria-label="Loading"><div className={spinner} /></div>;

const navLink = 'flex items-center gap-2.5 h-9 px-3 rounded-[var(--radius)] text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus-ring';
const rowText = 'text-[13.5px] text-[var(--text-secondary)]';

const ProfilePage: React.FC<ProfilePageProps> = ({ navigate }) => {
    const { user, refreshUser } = useAuth();
    const { applications: contextApplications, savedJobs, unsaveJob } = useJobs();
    const { modalState, showConfirm, closeModal } = useModal();
    const { toast, show, dismiss } = useToast();
    const BASE_URL = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3001';
    const getMediaUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http')) {
            const localBase = 'http://localhost:3001';
            if (url.startsWith(localBase)) {
                return url.replace(localBase, '');
            }
            return url;
        }
        return url.startsWith('/') ? url : `/${url}`;
    };
    const [applications, setApplications] = useState<Application[]>([]);
    const [myVideos, setMyVideos] = useState<any[]>([]);
    const [stats, setStats] = useState({
        applicationsSent: 0,
        jobsPosted: 0,
        videosUploaded: 0,
        applicationsReceived: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedName, setEditedName] = useState(user?.name || '');
    const [editedTitle, setEditedTitle] = useState(user?.title || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [myJobs, setMyJobs] = useState<any[]>([]);
    const [myPostedApps, setMyPostedApps] = useState<number>(0);
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
    const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
    const [resumeUploadingId, setResumeUploadingId] = useState<string | null>(null);
    const resumeInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;

            try {
                // Always load from backend API to get latest recruiter-updated statuses
                try {
                    const apps = await applicationsAPI.getMyApplications();
                    setApplications(Array.isArray(apps) ? apps : contextApplications);
                } catch {
                    setApplications(contextApplications);
                }

                // Load user videos
                try {
                    const videos = await videosAPI.getMyVideos();
                    setMyVideos(videos);
                } catch (videoError) {
                    console.error('Error loading videos:', videoError);
                    setMyVideos([]);
                }

                // For recruiters: load their posted jobs
                if (user.isRecruiter) {
                    try {
                        const { jobsAPI } = await import('../../services/api');
                        const jobs = await jobsAPI.getMyJobs();
                        const jobArr = Array.isArray(jobs) ? jobs : [];
                        setMyJobs(jobArr);
                    } catch { setMyJobs([]); }
                }

                // Load user stats
                const profile = await usersAPI.getProfile(user.id);
                setStats(profile.stats || {
                    applicationsSent: contextApplications.length || 0,
                    jobsPosted: 0,
                    videosUploaded: 0,
                    applicationsReceived: 0,
                });
            } catch (error) {
                console.error('Error loading profile data:', error);
                // Fallback to context applications
                setApplications(contextApplications);
                setStats({
                    applicationsSent: contextApplications.length,
                    jobsPosted: 0,
                    videosUploaded: 0,
                    applicationsReceived: 0,
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [user, contextApplications]);

    if (!user) {
        return <div className={page} role="status" aria-label="Loading"><div className={spinner} /></div>;
    }

    const handleResumeReupload = async (applicationId: string, file: File) => {
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!validTypes.includes(file.type)) {
            show('Please upload a PDF, DOC or DOCX file.', 'error');
            return;
        }

        try {
            setResumeUploadingId(applicationId);
            await applicationsAPI.reuploadResume(applicationId, file);
            const refreshed = await applicationsAPI.getMyApplications();
            setApplications(Array.isArray(refreshed) ? refreshed : []);
            show('Resume updated.');
        } catch (err: any) {
            show(err?.message || 'Could not re-upload the resume.', 'error');
        } finally {
            setResumeUploadingId(null);
            if (resumeInputRefs.current[applicationId]) {
                resumeInputRefs.current[applicationId]!.value = '';
            }
        }
    };

    const pickImage = (setFile: (f: File) => void, setPreview: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const generateBanner = async () => {
        setIsGeneratingBanner(true);
        try {
            await imagesAPI.generateBanner(user.id);
            setBannerPreview(`https://picsum.photos/seed/${user.id}-${Date.now()}/1200/300`);
            show('New banner ready. Save images to keep it.');
        } catch {
            show('Could not generate a banner. Please try again.', 'error');
        } finally {
            setIsGeneratingBanner(false);
        }
    };

    const generateAvatar = async () => {
        setIsGeneratingAvatar(true);
        try {
            await imagesAPI.generateAvatar(user.id, user.name);
            setAvatarPreview(`https://picsum.photos/seed/avatar-${user.id}-${Date.now()}/256/256`);
            show('New avatar ready. Save images to keep it.');
        } catch {
            show('Could not generate an avatar. Please try again.', 'error');
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    const saveImages = async () => {
        try {
            const updateData: any = {};
            if (avatarPreview) updateData.avatarUrl = avatarPreview;
            if (bannerPreview) updateData.bannerUrl = bannerPreview;
            await usersAPI.updateImages(user.id, updateData);
            await refreshUser();
            setAvatarPreview(null);
            setBannerPreview(null);
            setAvatarFile(null);
            setBannerFile(null);
            show('Images saved.');
        } catch {
            show('Could not save images. Please try again.', 'error');
        }
    };

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', editedName);
            formData.append('title', editedTitle);
            await usersAPI.updateProfile(user.id, formData);
            await refreshUser();
            show('Profile saved.');
            setIsEditingProfile(false);
        } catch {
            show('Could not save your profile. Please try again.', 'error');
        }
    };

    const cancelEdit = () => {
        setEditedName(user.name || '');
        setEditedTitle(user.title || '');
        setIsEditingProfile(false);
    };

    const deleteVideo = (video: any) =>
        showConfirm('Delete video', `Delete "${video.title}"? This cannot be undone.`, async () => {
            try {
                await videosAPI.delete(video._id);
                setMyVideos(await videosAPI.getMyVideos());
                show('Video deleted.');
            } catch {
                show('Could not delete the video.', 'error');
            }
        }, 'danger');

    const appId = (app: Application) => app.id || (app as any)._id;
    const roleLabel = user.title || (user.isStudent ? 'Student' : user.isRecruiter ? 'Recruiter' : user.role || 'User');
    const hasImageChanges = !!(avatarPreview || bannerPreview);
    const bannerSrc = bannerPreview || user.bannerUrl;
    const stat = (value: string | number, text: string) => (
        <div className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-3">
            <p className="font-display text-[26px] font-semibold leading-none tabular-nums text-[var(--text-primary)]">{value}</p>
            <p className={`${rowText} mt-1.5`}>{text}</p>
        </div>
    );

    const videoGrid = (deletable: boolean, emptyTitle: string, emptyText: string) =>
        myVideos.length > 0 ? (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myVideos.map((video) => (
                    <div key={video._id} className="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden bg-[var(--bg)]">
                        <div className="aspect-[9/16] bg-[var(--surface)]">
                            <video src={getMediaUrl(video.videoUrl)} controls className="w-full h-full object-cover" poster={video.thumbnailUrl ? getMediaUrl(video.thumbnailUrl) : undefined} />
                        </div>
                        <div className="p-4 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-[14px] font-medium text-[var(--text-primary)] truncate">{video.title}</h3>
                                <p className={`${rowText} line-clamp-2 mt-0.5`}>{video.description}</p>
                            </div>
                            {deletable && (
                                <button onClick={() => deleteVideo(video)} aria-label={`Delete ${video.title}`} className={`${btnDanger} !h-8 !px-2 shrink-0`}>
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <Empty title={emptyTitle} text={emptyText} />
        );

    const uploadBtn = (text: string) => (
        <button onClick={() => navigate('upload_video')} className={`${btnPrimary} ${btnSm}`}>
            <VideoCameraIcon className="w-4 h-4" /> {text}
        </button>
    );

    return (
        <>
            <div id="profile-top" className={`${page} flex flex-col md:flex-row gap-8`}>
                <aside className="w-full md:w-56 flex-shrink-0">
                    <nav aria-label="Profile sections" className={`${card} p-2 md:sticky md:top-24 flex md:block gap-1 overflow-x-auto`}>
                        <a href="#profile-top" className={navLink}><HomeIcon className="w-4 h-4" />Overview</a>
                        {user.isRecruiter ? (
                            <>
                                <a href="#my-jobs" className={navLink}><BriefcaseIcon className="w-4 h-4" />Job posts</a>
                                <a href="#received-apps" className={navLink}><DocumentChartBarIcon className="w-4 h-4" />Applications</a>
                                <a href="#company-videos" className={navLink}><VideoCameraIcon className="w-4 h-4" />Videos</a>
                            </>
                        ) : (
                            <>
                                <a href="#my-videos" className={navLink}><VideoCameraIcon className="w-4 h-4" />My videos</a>
                                <a href="#saved-jobs" className={navLink}><BookmarkIcon className="w-4 h-4" />Saved jobs</a>
                                <a href="#my-applications" className={navLink}><DocumentChartBarIcon className="w-4 h-4" />Applications</a>
                            </>
                        )}
                        <button onClick={() => navigate('settings')} className={`${navLink} w-full md:mt-2 md:border-t md:border-[var(--border)] md:rounded-t-none`}>
                            <Cog6ToothIcon className="w-4 h-4" />Settings
                        </button>
                    </nav>
                </aside>

                <main className="w-full min-w-0 space-y-6">
                    <div className={`${card} overflow-hidden`}>
                        <div className="relative h-40 sm:h-48 bg-[var(--secondary)]">
                            {bannerSrc && <img src={bannerSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <label htmlFor="banner-upload" className={`${btnSecondary} ${btnSm} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)]`}>
                                    <PhotoIcon className="w-4 h-4" /> Change banner
                                    <input id="banner-upload" type="file" accept="image/*" className="sr-only" onChange={pickImage(setBannerFile, setBannerPreview)} />
                                </label>
                                <button onClick={generateBanner} disabled={isGeneratingBanner} className={`${btnSecondary} ${btnSm}`}>
                                    <ArrowPathIcon className={`w-4 h-4 ${isGeneratingBanner ? 'animate-spin' : ''}`} />
                                    {isGeneratingBanner ? 'Generating…' : 'Generate'}
                                </button>
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                                <div className="relative w-24 h-24 shrink-0">
                                    <img
                                        src={avatarPreview || avatarUrl(user.name, user.avatarUrl, 128)}
                                        alt={user.name}
                                        className="w-24 h-24 rounded-full border-4 border-[var(--bg)] object-cover bg-[var(--surface)]"
                                    />
                                    <label htmlFor="avatar-upload" title="Change photo" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border-strong)] text-[var(--text-primary)] flex items-center justify-center cursor-pointer hover:bg-[var(--surface-hover)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)]">
                                        <CameraIcon className="w-4 h-4" />
                                        <span className="sr-only">Change photo</span>
                                        <input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={pickImage(setAvatarFile, setAvatarPreview)} />
                                    </label>
                                </div>
                                <div className="min-w-0 sm:pb-1 flex-1">
                                    <h1 className={`${pageTitle} truncate`}>{user.name}</h1>
                                    <p className={`${rowText} truncate`}>{roleLabel} · {user.email}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:pb-1">
                                    <button onClick={generateAvatar} disabled={isGeneratingAvatar} className={`${btnGhost} ${btnSm}`}>
                                        <ArrowPathIcon className={`w-4 h-4 ${isGeneratingAvatar ? 'animate-spin' : ''}`} />
                                        {isGeneratingAvatar ? 'Generating…' : 'New avatar'}
                                    </button>
                                    <button onClick={() => (isEditingProfile ? cancelEdit() : setIsEditingProfile(true))} aria-expanded={isEditingProfile} className={`${btnSecondary} ${btnSm}`}>
                                        {isEditingProfile ? 'Cancel' : 'Edit profile'}
                                    </button>
                                    {!user.isRecruiter && <button onClick={() => navigate('upload_video')} className={`${btnPrimary} ${btnSm}`}>Upload intro video</button>}
                                </div>
                            </div>

                            {hasImageChanges && (
                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] bg-[var(--accent-subtle)] px-4 py-3">
                                    <p className="text-[13.5px] text-[var(--text-primary)]">You have unsaved image changes.</p>
                                    <button onClick={saveImages} className={`${btnPrimary} ${btnSm}`}>Save images</button>
                                </div>
                            )}

                            {isEditingProfile && (
                                <form onSubmit={saveProfile} className="mt-5 pt-5 border-t border-[var(--border)] grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="edit-name" className={label}>Full name</label>
                                        <input id="edit-name" type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className={input} required />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-title" className={label}>Professional title</label>
                                        <input id="edit-title" type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} placeholder="e.g. Full-stack developer" className={input} />
                                    </div>
                                    <div className="sm:col-span-2 flex gap-2">
                                        <button type="submit" className={btnPrimary}>Save changes</button>
                                        <button type="button" onClick={cancelEdit} className={btnSecondary}>Cancel</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <Section id="activity" title="Activity">
                        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {user.isRecruiter ? (
                                <>
                                    {stat(stats.jobsPosted, 'Jobs posted')}
                                    {stat(stats.applicationsReceived ?? 0, 'Applications received')}
                                    {stat(stats.videosUploaded, 'Videos uploaded')}
                                </>
                            ) : (
                                <>
                                    {stat(applications.length, 'Applications sent')}
                                    {stat(savedJobs.length, 'Saved jobs')}
                                    {stat(stats.videosUploaded, 'Videos uploaded')}
                                </>
                            )}
                        </div>
                    </Section>

                    <Section id="account" title="Account">
                        <dl className="px-6 py-2 divide-y divide-[var(--border)] text-[14px]">
                            {[
                                ['Email', user.email],
                                ['Account type', <span className="capitalize">{user.role}</span>],
                                ['Status', <span className={user.isActive !== false ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{user.isActive !== false ? 'Active' : 'Inactive'}</span>],
                            ].map(([k, v], i) => (
                                <div key={i} className="flex justify-between gap-4 py-3">
                                    <dt className={rowText}>{k}</dt>
                                    <dd className="font-medium text-[var(--text-primary)] text-right break-all">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </Section>

                    {user.isRecruiter ? (
                        <>
                            <Section id="my-jobs" title="Job posts">
                                {isLoading ? <Loading /> : myJobs.length === 0 ? (
                                    <Empty title="No jobs posted yet" action={<button onClick={() => navigate('post_job')} className={btnPrimary}>Post your first job</button>} />
                                ) : (
                                    <ul className="divide-y divide-[var(--border)]">
                                        {myJobs.map(job => (
                                            <li key={job._id || job.id} className="px-6 py-4 flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <h3 className="text-[14.5px] font-medium text-[var(--text-primary)]">{job.title}</h3>
                                                    <p className={rowText}>{job.company} · {job.location}</p>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <span className={chip}>{job.type || 'Remote'}</span>
                                                        {job.pay && <span className={chip}>{job.pay}</span>}
                                                        <span className="text-[12.5px] text-[var(--text-tertiary)]">{new Date(job.createdAt || Date.now()).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => navigate('review_applications')} className={`${btnSecondary} ${btnSm} shrink-0`}>View applications</button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>

                            <Section id="received-apps" title="Applications received">
                                <div className="p-6 flex items-center gap-6 flex-wrap">
                                    <div>
                                        <p className="font-display text-[40px] font-semibold leading-none tabular-nums text-[var(--text-primary)]">{stats.applicationsReceived ?? 0}</p>
                                        <p className={`${rowText} mt-1`}>across {myJobs.length} job posting{myJobs.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <button onClick={() => navigate('review_applications')} className={btnPrimary}>Review applications</button>
                                </div>
                            </Section>

                            <Section id="company-videos" title="Company videos" action={uploadBtn('Upload video')}>
                                {videoGrid(false, 'No company videos yet', 'Videos help attract the people you want to hire.')}
                            </Section>
                        </>
                    ) : (
                        <>
                            <Section id="my-videos" title="My videos" action={uploadBtn('Upload video')}>
                                {videoGrid(true, "You haven't uploaded any videos yet", 'A short video helps you stand out to recruiters.')}
                            </Section>

                            <Section id="saved-jobs" title="Saved jobs">
                                {savedJobs.length === 0 ? (
                                    <Empty title="You haven't saved any jobs yet" action={<button onClick={() => navigate('jobs')} className={btnPrimary}>Browse jobs</button>} />
                                ) : (
                                    <ul className="divide-y divide-[var(--border)]">
                                        {savedJobs.map((job) => (
                                            <li key={job.id} className="px-6 py-4 flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <h3 className="text-[14.5px] font-medium text-[var(--text-primary)]">{job.title}</h3>
                                                    <p className={rowText}>{job.company} · {job.location}{job.pay ? ` · ${job.pay}` : ''}</p>
                                                </div>
                                                <button onClick={() => unsaveJob(job.id)} aria-label={`Remove ${job.title} from saved jobs`} className={`${btnGhost} !h-8 !px-2 shrink-0`}>
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>

                            <Section id="my-applications" title="Applications">
                                {isLoading ? <Loading /> : applications.length === 0 ? (
                                    <Empty title="No applications yet" text="Apply to a job and it will show up here." action={<button onClick={() => navigate('jobs')} className={btnPrimary}>Browse jobs</button>} />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-[14px] text-left">
                                            <thead>
                                                <tr className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] border-b border-[var(--border)]">
                                                    <th scope="col" className="px-6 py-3 font-medium">Company</th>
                                                    <th scope="col" className="px-6 py-3 font-medium">Position</th>
                                                    <th scope="col" className="px-6 py-3 font-medium">Applied</th>
                                                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                                                    <th scope="col" className="px-6 py-3 font-medium"><span className="sr-only">Resume</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {applications.map((app) => {
                                                    const id = appId(app);
                                                    const company = app.job?.company || (app as any).jobId?.company || '—';
                                                    const title = app.job?.title || (app as any).jobId?.title || '—';
                                                    const date = app.dateApplied || (app as any).createdAt || new Date().toISOString();
                                                    return (
                                                        <tr key={id} className="hover:bg-[var(--surface)]/60">
                                                            <th scope="row" className="px-6 py-3.5 font-medium text-[var(--text-primary)] whitespace-nowrap">{company}</th>
                                                            <td className={`px-6 py-3.5 ${rowText}`}>{title}</td>
                                                            <td className={`px-6 py-3.5 ${rowText} whitespace-nowrap`}>{new Date(date).toLocaleDateString()}</td>
                                                            <td className="px-6 py-3.5"><StatusBadge status={app.status} /></td>
                                                            <td className="px-6 py-3.5 text-right">
                                                                <input
                                                                    ref={(el) => { resumeInputRefs.current[id] = el; }}
                                                                    type="file"
                                                                    accept=".pdf,.doc,.docx"
                                                                    className="sr-only"
                                                                    tabIndex={-1}
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file && id) handleResumeReupload(id, file);
                                                                    }}
                                                                />
                                                                <button type="button" onClick={() => resumeInputRefs.current[id]?.click()} disabled={resumeUploadingId === id} className={`${btnGhost} ${btnSm}`}>
                                                                    {resumeUploadingId === id ? 'Uploading…' : 'Replace resume'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Section>
                        </>
                    )}
                </main>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                showCancel={modalState.showCancel}
            />
            <Toast toast={toast} onDismiss={dismiss} />
        </>
    );
};

export default ProfilePage;
