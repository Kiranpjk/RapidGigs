
import React, { useState, useEffect, useRef } from 'react';
import { ApplicationStatus, Application, Page } from '../../types';
import {
    HomeIcon,
    VideoCameraIcon,
    BookmarkIcon,
    DocumentChartBarIcon,
    Cog6ToothIcon,
    BriefcaseIcon,
    PaperAirplaneIcon,
    CheckCircleIcon,
    UserIcon,
    XMarkIcon
} from '../icons/Icons';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { applicationsAPI, usersAPI, videosAPI, jobsAPI, imagesAPI } from '../../services/api';
import Modal from '../common/Modal';
import Confetti from '../common/Confetti';
import useModal from '../../hooks/useModal';

interface ProfilePageProps {
    navigate: (page: Page) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ navigate }) => {
    const { user, refreshUser } = useAuth();
    const { applications: contextApplications, savedJobs, unsaveJob } = useJobs();
    const { modalState, showConfetti, showAlert, showConfirm, showSuccess, closeModal, closeConfetti } = useModal();
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

    // Generate random banner gradient based on user ID
    const generateBannerGradient = () => {
        if (!user) return 'from-indigo-500 to-purple-600';
        const gradients = [
            'from-indigo-500 to-purple-600',
            'from-blue-500 to-cyan-600',
            'from-purple-500 to-pink-600',
            'from-green-500 to-teal-600',
            'from-orange-500 to-red-600',
            'from-yellow-500 to-orange-600',
            'from-pink-500 to-rose-600',
            'from-teal-500 to-green-600',
        ];
        // Use user.id or generate from name if id is not available
        const seed = user.id ? parseInt(String(user.id).substring(String(user.id).length - 6), 16) || user.name.charCodeAt(0) : user.name.charCodeAt(0) || 1;
        const index = seed % gradients.length;
        console.log('Banner - User ID:', user.id, 'Seed:', seed, 'Index:', index, 'Gradient:', gradients[index]);
        return gradients[index];
    };

    // Generate random avatar color based on user ID
    const generateAvatarColor = () => {
        if (!user) return '6366f1';
        const colors = ['6366f1', '3b82f6', '8b5cf6', '10b981', 'f59e0b', 'ef4444', 'ec4899', '14b8a6'];
        // Use user.id or generate from name if id is not available
        const seed = user.id ? parseInt(String(user.id).substring(String(user.id).length - 6), 16) || user.name.charCodeAt(0) : user.name.charCodeAt(0) || 1;
        const index = seed % colors.length;
        const color = colors[index];
        console.log('Avatar - User ID:', user.id, 'Seed:', seed, 'Index:', index, 'Color:', color);
        return color;
    };

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
        return <div>Loading...</div>;
    }
    const StatCard: React.FC<{ value: string, label: string, icon: React.ReactNode }> = ({ value, label, icon }) => (
        <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg text-center border border-slate-200 dark:border-slate-600/50">
            <div className="w-8 h-8 mx-auto text-indigo-500 dark:text-indigo-400 mb-2">{icon}</div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    );

    const SkillTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-1.5 rounded-full">{children}</span>
    );

    const ProfileSection: React.FC<{ title: string, children: React.ReactNode, noPadding?: boolean }> = ({ title, children, noPadding }) => (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold p-8 pb-0">{title}</h2>
            <div className={noPadding ? "" : "p-8"}>
                {children}
            </div>
        </div>
    );

    const StatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
        const baseClasses = "text-xs font-semibold mr-2 px-2.5 py-1 rounded-full inline-block";
        const s = (status || 'pending').toLowerCase();
        const statusClasses: Record<string, string> = {
            'pending':       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
            'reviewing':     "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
            'shortlisted':   "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
            'interviewing':  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
            'accepted':      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
            'rejected':      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
        const cls = statusClasses[s] || statusClasses['applied'];
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return <span className={`${baseClasses} ${cls}`}>{label}</span>;
    };

    const handleResumeReupload = async (applicationId: string, file: File) => {
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!validTypes.includes(file.type)) {
            showAlert('Invalid File Type', 'Please upload PDF, DOC, or DOCX only.', 'warning');
            return;
        }

        try {
            setResumeUploadingId(applicationId);
            await applicationsAPI.reuploadResume(applicationId, file);
            const refreshed = await applicationsAPI.getMyApplications();
            setApplications(Array.isArray(refreshed) ? refreshed : []);
            showSuccess('Resume Updated', 'Your resume was re-uploaded to Cloudinary.');
        } catch (err: any) {
            showAlert('Upload Failed', err?.message || 'Could not re-upload resume.', 'danger');
        } finally {
            setResumeUploadingId(null);
            if (resumeInputRefs.current[applicationId]) {
                resumeInputRefs.current[applicationId]!.value = '';
            }
        }
    };

    return (
        <>
            <div className="flex flex-col md:flex-row gap-8 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-4 rounded-lg sticky top-24">
                        <h2 className="text-lg font-bold p-2">Profile Sections</h2>
                        <nav className="space-y-1">
                            <a href="#" className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-md px-3 py-2"><HomeIcon className="w-5 h-5" />Overview</a>
                            {user.isRecruiter ? (
                                <>
                                    <a href="#my-jobs" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><BriefcaseIcon className="w-5 h-5" />My Job Posts</a>
                                    <a href="#received-apps" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><DocumentChartBarIcon className="w-5 h-5" />Applications Received</a>
                                    <a href="#company-videos" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><VideoCameraIcon className="w-5 h-5" />Company Videos</a>
                                </>
                            ) : (
                                <>
                                    <a href="#my-videos" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><VideoCameraIcon className="w-5 h-5" />My Videos</a>
                                    <a href="#saved-jobs" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><BookmarkIcon className="w-5 h-5" />Saved Jobs</a>
                                    <a href="#my-applications" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-md px-3 py-2"><DocumentChartBarIcon className="w-5 h-5" />My Applications</a>
                                </>
                            )}
                        </nav>
                        <button className="w-full mt-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                            <Cog6ToothIcon className="w-5 h-5" /> Settings
                        </button>
                    </div>
                </aside>
                <main className="w-full space-y-8">
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-lg overflow-hidden">
                        {/* Banner Section with Upload */}
                        <div className="relative group">
                            {bannerPreview || user.bannerUrl ? (
                                <div
                                    className="h-48 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${bannerPreview || user.bannerUrl})` }}
                                ></div>
                            ) : (
                                <div className={`h-48 bg-gradient-to-r ${generateBannerGradient()}`}></div>
                            )}
                            <label
                                htmlFor="banner-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <div className="text-white text-center">
                                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="font-semibold">Change Banner</p>
                                </div>
                            </label>
                            <input
                                id="banner-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setBannerFile(file);
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setBannerPreview(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            {/* AI Generate Banner Button */}
                            <button
                                onClick={async () => {
                                    setIsGeneratingBanner(true);
                                    try {
                                        const response = await imagesAPI.generateBanner(user.id);
                                        console.log('Banner response:', response);

                                        // Generate a random gradient banner using picsum with a unique seed
                                        const seed = `${user.id}-${Date.now()}`;
                                        const bannerUrl = `https://picsum.photos/seed/${seed}/1200/300`;

                                        console.log('Setting banner preview to:', bannerUrl);
                                        setBannerPreview(bannerUrl);
                                        showSuccess('Banner Generated!', 'AI has created a new banner for you.');
                                    } catch (error) {
                                        console.error('Banner generation error:', error);
                                        showAlert('Error', 'Failed to generate banner. Please try again.', 'danger');
                                    } finally {
                                        setIsGeneratingBanner(false);
                                    }
                                }}
                                disabled={isGeneratingBanner}
                                className="absolute top-4 right-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                title="Generate AI Banner"
                            >
                                {isGeneratingBanner ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span className="text-sm font-semibold">Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span className="text-sm font-semibold">Generate AI Banner</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-24 sm:-mt-20">
                                {/* Avatar Section with Upload */}
                                <div className="relative group">
                                    <img
                                        src={avatarPreview || user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=128&background=${generateAvatarColor()}&color=fff`}
                                        alt={user.name}
                                        className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 object-cover"
                                    />
                                    <label
                                        htmlFor="avatar-upload"
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                                    >
                                        <div className="text-white text-center">
                                            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                    </label>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setAvatarFile(file);
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setAvatarPreview(reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    {/* AI Generate Avatar Button */}
                                    <button
                                        onClick={async () => {
                                            setIsGeneratingAvatar(true);
                                            try {
                                                const response = await imagesAPI.generateAvatar(user.id, user.name);
                                                console.log('Avatar response:', response);

                                                // Generate a random avatar using picsum with a unique seed
                                                const seed = `avatar-${user.id}-${Date.now()}`;
                                                const avatarUrl = `https://picsum.photos/seed/${seed}/256/256`;

                                                console.log('Setting avatar preview to:', avatarUrl);
                                                setAvatarPreview(avatarUrl);
                                                showSuccess('Avatar Generated!', 'AI has created a new avatar for you.');
                                            } catch (error) {
                                                console.error('Avatar generation error:', error);
                                                showAlert('Error', 'Failed to generate avatar. Please try again.', 'danger');
                                            } finally {
                                                setIsGeneratingAvatar(false);
                                            }
                                        }}
                                        disabled={isGeneratingAvatar}
                                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50"
                                        title="Generate AI Avatar"
                                    >
                                        {isGeneratingAvatar ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <div className="ml-0 sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
                                    <h1 className="text-3xl font-bold">{user.name}</h1>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        {user.title || (user.isStudent ? 'Student' : user.isRecruiter ? 'Recruiter' : 'User')} | {user.email}
                                    </p>
                                    <div className="mt-2 flex gap-2 justify-center sm:justify-start">
                                        {user.isStudent && (
                                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                Student
                                            </span>
                                        )}
                                        {user.isRecruiter && (
                                            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                Recruiter
                                            </span>
                                        )}
                                        {/* Only show generic role badge if it's not student or recruiter (e.g. admin) */}
                                        {!user.isStudent && !user.isRecruiter && (
                                            <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold px-2.5 py-0.5 rounded capitalize">
                                                {user.role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="mt-6 text-slate-600 dark:text-slate-300">
                                {user.title ? `${user.title} - ` : ''}Welcome to your RapidGig profile! Update your information to showcase your skills and experience.
                            </p>
                            <div className="mt-6 flex gap-4 flex-wrap">
                                {(avatarPreview || bannerPreview) && (
                                    <button
                                        onClick={async () => {
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
                                                showSuccess('Images Updated!', 'Your profile and banner images have been saved successfully.');
                                            } catch (error) {
                                                console.error('Save images error:', error);
                                                showAlert('Error', 'Failed to save images. Please try again.', 'danger');
                                            }
                                        }}
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Save Images
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg"
                                >
                                    {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
                                </button>
                                {/* Only students need the Upload Intro Video button here */}
                                {!user.isRecruiter && (
                                    <button
                                        onClick={() => navigate('upload_video')}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg"
                                    >
                                        Upload Intro Video
                                    </button>
                                )}
                            </div>

                            {/* Edit Profile Form */}
                            {isEditingProfile && (
                                <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-4">Edit Profile Information</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editedName}
                                                onChange={(e) => setEditedName(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Professional Title
                                            </label>
                                            <input
                                                type="text"
                                                value={editedTitle}
                                                onChange={(e) => setEditedTitle(e.target.value)}
                                                placeholder="e.g., Full Stack Developer, UI/UX Designer"
                                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const formData = new FormData();
                                                        formData.append('name', editedName);
                                                        formData.append('title', editedTitle);
                                                        await usersAPI.updateProfile(user.id, formData);
                                                        await refreshUser();
                                                        showSuccess('Profile Updated!', 'Your profile information has been saved successfully.');
                                                        setIsEditingProfile(false);
                                                    } catch (error) {
                                                        console.error('Save profile error:', error);
                                                        showAlert('Error', 'Failed to save profile. Please try again.', 'danger');
                                                    }
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg"
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditedName(user?.name || '');
                                                    setEditedTitle(user?.title || '');
                                                    setIsEditingProfile(false);
                                                }}
                                                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-6 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <ProfileSection title="My Activity Stats">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {/* Show different stats based on user role */}
                            {user.isRecruiter ? (
                                <>
                                    <StatCard value={stats.jobsPosted.toString()} label="Jobs Posted" icon={<BriefcaseIcon />} />
                                    <StatCard value={stats.applicationsReceived?.toString() || '0'} label="Applications Received" icon={<DocumentChartBarIcon />} />
                                    <StatCard value={stats.videosUploaded.toString()} label="Videos Uploaded" icon={<VideoCameraIcon />} />
                                </>
                            ) : (
                                <>
                                    <StatCard value={applications.length.toString()} label="Applications Sent" icon={<PaperAirplaneIcon />} />
                                    <StatCard value={savedJobs.length.toString()} label="Saved Jobs" icon={<BookmarkIcon />} />
                                    <StatCard value={stats.videosUploaded.toString()} label="Videos Uploaded" icon={<VideoCameraIcon />} />
                                </>
                            )}
                        </div>
                    </ProfileSection>

                    <ProfileSection title="Account Information">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Email:</span>
                                <span className="font-semibold">{user.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Account Type:</span>
                                <span className="font-semibold capitalize">{user.role}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Status:</span>
                                <span className={`font-semibold ${user.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                                    {user.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Permissions:</span>
                                <span className="font-semibold">{user.permissions.length} permissions</span>
                            </div>
                        </div>
                    </ProfileSection>

                    {user.isRecruiter ? (
                        <>
                            {/* ── RECRUITER: My Job Posts ── */}
                            <div id="my-jobs" className="scroll-mt-20">
                                <ProfileSection title="My Job Posts" noPadding>
                                    {isLoading ? (
                                        <div className="p-8 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                                        </div>
                                    ) : myJobs.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                            <BriefcaseIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                            <p>No jobs posted yet.</p>
                                            <button onClick={() => navigate('post_job')} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg">
                                                Post Your First Job
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {myJobs.map(job => {
                                                const id = job._id || job.id;
                                                return (
                                                    <div key={id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-bold text-slate-800 dark:text-white">{job.title}</h3>
                                                                <p className="text-sm text-slate-500 dark:text-slate-400">{job.company} · {job.location}</p>
                                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{job.type || 'Remote'}</span>
                                                                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">{job.pay}</span>
                                                                    <span className="text-xs text-slate-400">{new Date(job.createdAt || Date.now()).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => navigate('review_applications')}
                                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold whitespace-nowrap"
                                                            >
                                                                View Applications →
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </ProfileSection>
                            </div>

                            {/* ── RECRUITER: Applications Received ── */}
                            <div id="received-apps" className="scroll-mt-20">
                                <ProfileSection title="Applications Received">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.applicationsReceived ?? 0}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Total Applications</p>
                                        </div>
                                        <div className="flex-1 text-slate-600 dark:text-slate-400 text-sm">
                                            <p>Across <span className="font-semibold text-slate-800 dark:text-white">{myJobs.length}</span> job posting{myJobs.length !== 1 ? 's' : ''}.</p>
                                            <button
                                                onClick={() => navigate('review_applications')}
                                                className="mt-3 inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg text-sm"
                                            >
                                                Review Applications →
                                            </button>
                                        </div>
                                    </div>
                                </ProfileSection>
                            </div>

                            {/* ── RECRUITER: Company Videos ── */}
                            <div id="company-videos" className="scroll-mt-20">
                                <ProfileSection title="Company Videos" noPadding>
                                    <div className="p-8">
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-gray-500 dark:text-slate-400 text-sm">Showcase your company culture and attract top talent.</p>
                                            <button
                                                onClick={() => navigate('upload_video')}
                                                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-xl shadow-gray-200 dark:shadow-none hover:scale-[1.02] transition-all cursor-pointer"
                                            >
                                                <VideoCameraIcon className="w-5 h-5" />
                                                Upload Video
                                            </button>
                                        </div>
                                        {myVideos.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {myVideos.map((video) => (
                                                    <div key={video._id} className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-all">
                                                        <div className="relative aspect-[9/16] bg-gray-100 dark:bg-slate-800">
                                                            <video src={getMediaUrl(video.videoUrl)} controls className="w-full h-full object-cover rounded-t-2xl" poster={video.thumbnailUrl ? getMediaUrl(video.thumbnailUrl) : undefined} />
                                                        </div>
                                                        <div className="p-5">
                                                            <h3 className="font-bold text-gray-900 dark:text-white">{video.title}</h3>
                                                            <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mt-1">{video.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <VideoCameraIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                                <p className="text-slate-600 dark:text-slate-400 mb-4">No company videos yet.</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Videos help attract top talent to your company!</p>
                                            </div>
                                        )}
                                    </div>
                                </ProfileSection>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* ── STUDENT: My Videos ── */}
                            <div id="my-videos" className="scroll-mt-20">
                                <ProfileSection title="My Videos" noPadding>
                                    <div className="p-8">
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-gray-500 dark:text-slate-400 text-sm">Showcase your skills and personality to potential employers.</p>
                                            <button onClick={() => navigate('upload_video')} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-xl shadow-gray-200 dark:shadow-none hover:scale-[1.02] transition-all cursor-pointer">
                                                <VideoCameraIcon className="w-5 h-5" />
                                                Upload New Video
                                            </button>
                                        </div>
                                        {myVideos.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {myVideos.map((video) => (
                                                    <div key={video._id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                                        <div className="relative aspect-[9/16] bg-slate-200 dark:bg-slate-700">
                                                            <video src={getMediaUrl(video.videoUrl)} controls className="w-full h-full object-cover rounded-t-lg" poster={video.thumbnailUrl ? getMediaUrl(video.thumbnailUrl) : undefined} />
                                                        </div>
                                                        <div className="p-4">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h3 className="font-semibold text-slate-800 dark:text-white flex-1">{video.title}</h3>
                                                                <button
                                                                    onClick={() => {
                                                                        showConfirm('Delete Video', `Are you sure you want to delete "${video.title}"?`, async () => {
                                                                            try {
                                                                                await videosAPI.delete(video._id);
                                                                                const updated = await videosAPI.getMyVideos();
                                                                                setMyVideos(updated);
                                                                                showSuccess('Deleted!', 'Your video has been removed.');
                                                                            } catch {
                                                                                showAlert('Error', 'Failed to delete video.', 'danger');
                                                                            }
                                                                        }, 'danger');
                                                                    }}
                                                                    className="text-red-500 hover:text-red-600 ml-2"
                                                                >
                                                                    <XMarkIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{video.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <VideoCameraIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                                <p className="text-slate-600 dark:text-slate-400 mb-4">You haven't uploaded any videos yet.</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Videos help you stand out to recruiters!</p>
                                            </div>
                                        )}
                                    </div>
                                </ProfileSection>
                            </div>

                            {/* ── STUDENT: Saved Jobs ── */}
                            <div id="saved-jobs" className="scroll-mt-20">
                                <ProfileSection title="Saved Jobs" noPadding>
                                    {savedJobs.length === 0 ? (
                                        <div className="p-10 text-center">
                                            <BookmarkIcon className="w-16 h-16 mx-auto text-gray-200 dark:text-slate-700 mb-4" />
                                            <p className="text-gray-500 dark:text-slate-400 mb-6 font-medium">You haven't saved any jobs yet.</p>
                                            <button onClick={() => navigate('jobs')} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 px-8 rounded-2xl shadow-xl shadow-gray-200 dark:shadow-none hover:scale-[1.02] transition-all cursor-pointer">Browse Jobs</button>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-50 dark:divide-slate-700">
                                            {savedJobs.map((job) => (
                                                <div key={job.id} className="p-6 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-all">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
                                                            <p className="text-gray-500 dark:text-slate-400 text-sm">{job.company}</p>
                                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 dark:text-slate-500">
                                                                <span>{job.location}</span><span>·</span>
                                                                <span className="text-green-600 dark:text-green-400 font-bold">{job.pay}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => unsaveJob(job.id)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400" title="Remove">
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ProfileSection>
                            </div>

                            {/* ── STUDENT: My Applications ── */}
                            <div id="my-applications" className="scroll-mt-20">
                                <ProfileSection title="My Applications" noPadding>
                                    {isLoading ? (
                                        <div className="p-8 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                            <p className="mt-2 text-slate-600 dark:text-slate-400">Loading applications...</p>
                                        </div>
                                    ) : applications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                                            <p>No applications yet. Start applying to jobs!</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                                                <thead className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-900/30">
                                                    <tr>
                                                        <th scope="col" className="px-6 py-3">Company</th>
                                                        <th scope="col" className="px-6 py-3">Position</th>
                                                        <th scope="col" className="px-6 py-3">Date Applied</th>
                                                        <th scope="col" className="px-6 py-3">Status</th>
                                                        <th scope="col" className="px-6 py-3">Resume</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {applications.map((app) => {
                                                        const company = app.job?.company || (app as any).jobId?.company || '—';
                                                        const title = app.job?.title || (app as any).jobId?.title || '—';
                                                        const date = app.dateApplied || (app as any).createdAt || new Date().toISOString();
                                                        return (
                                                            <tr key={app.id || (app as any)._id} className="border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/70">
                                                                <th scope="row" className="px-6 py-5 font-bold text-gray-900 dark:text-white whitespace-nowrap">{company}</th>
                                                                <td className="px-6 py-4">{title}</td>
                                                                <td className="px-6 py-4">{new Date(date).toLocaleDateString()}</td>
                                                                <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                                                                <td className="px-6 py-4">
                                                                    <input
                                                                        ref={(el) => { resumeInputRefs.current[(app.id || (app as any)._id)] = el; }}
                                                                        type="file"
                                                                        accept=".pdf,.doc,.docx"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            const appId = app.id || (app as any)._id;
                                                                            if (file && appId) handleResumeReupload(appId, file);
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const appId = app.id || (app as any)._id;
                                                                            resumeInputRefs.current[appId]?.click();
                                                                        }}
                                                                        disabled={resumeUploadingId === (app.id || (app as any)._id)}
                                                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                                                                    >
                                                                        {resumeUploadingId === (app.id || (app as any)._id) ? 'Uploading...' : 'Re-upload Resume'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </ProfileSection>
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Custom Modal */}
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

            {/* Confetti Animation */}
            <Confetti show={showConfetti} onComplete={closeConfetti} />
        </>
    );
};

export default ProfilePage;
