
import React, { useState, useRef, useEffect } from 'react';
import { Page, Job } from '../../types';
import { BriefcaseIcon, MapPinIcon, CurrencyDollarIcon, VideoCameraIcon, ArrowLeftIcon, DocumentTextIcon, CheckIcon, CheckCircleIcon, StopIcon, ArrowTopRightIcon } from '../icons/Icons';
import StatusBadge, { statusNext } from '../common/StatusBadge';
import { page, pageTitle, pageLead, card, chip, label, hint, textarea, btnPrimary, btnSecondary, btnGhost, btnDanger, btnSm } from '../ui/classes';
import { useJobs } from '../../context/JobContext';
import Modal from '../common/Modal';
import Confetti from '../common/Confetti';
import useModal from '../../hooks/useModal';

interface JobApplicationPageProps {
    job: Job | null;
    navigate: (page: Page) => void;
    previousPage?: Page;
}

const JobApplicationPage: React.FC<JobApplicationPageProps> = ({ job, navigate, previousPage }) => {
    const { submitApplication, hasApplied, applications } = useJobs();
    const { modalState, showConfetti, showAlert, showSuccess, closeModal, closeConfetti } = useModal();
    
    // Helper: get full media URL
    const BASE_URL = (import.meta.env.VITE_API_BASE as string)?.replace('/api', '') || 'http://localhost:3001';
    const getMediaUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('blob:')) return url;
        return url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
    };

    // Check if user already applied
    const alreadyApplied = job ? hasApplied(String(job.id)) : false;
    const existingApp = alreadyApplied 
        ? applications.find(a => String(a.job?.id) === String(job?.id) || String((a.jobId as any)?.id || a.jobId) === String(job?.id)) 
        : null;
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [coverLetter, setCoverLetter] = useState<string>(''); // Used for portfolio links now
    const [isDragging, setIsDragging] = useState<boolean>(false);
    
    // Webcam recording states
    const [recordingMode, setRecordingMode] = useState<'upload' | 'record'>('upload');
    const [isRecording, setIsRecording] = useState(false);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(30);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup resources
    useEffect(() => {
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            if (timerRef.current) clearInterval(timerRef.current);
            if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
        };
    }, [recordedVideoUrl]);

    // Webcam Recorder Logic
    const startRecording = async () => {
        try {
            setVideoFile(null);
            setRecordedVideoUrl(null);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
                videoPreviewRef.current.muted = true;
                videoPreviewRef.current.play();
            }
            
            // Check for optimal MIME types
            let mimeType = 'video/webm';
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
                mimeType = 'video/webm;codecs=vp9,opus';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            
            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setRecordedVideoUrl(url);
                
                // Convert to File for the submit function
                const file = new File([blob], `pitch-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`, { type: mimeType });
                setVideoFile(file);
                
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            setIsRecording(true);
            setCountdown(30);
            
            timerRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        stopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            
        } catch (err: any) {
            showAlert('Camera Error', 'Could not access camera/microphone. Please allow permissions.', 'danger');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    const clearRecording = () => {
        if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl(null);
        setVideoFile(null);
        setCountdown(30);
    };
    
    const goBack = () => {
        navigate(previousPage || 'jobs');
    };

    if (!job) {
        return (
            <div className={`${page} text-center`}>
                <h1 className={pageTitle}>Job not found</h1>
                <p className={`${pageLead} mb-6`}>The job you are trying to apply for does not exist.</p>
                <button onClick={goBack} className={btnPrimary}>Back</button>
            </div>
        );
    }

    const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type (PDF, DOC, DOCX)
            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (validTypes.includes(file.type)) {
                setResumeFile(file);
            } else {
                showAlert('Invalid File Type', 'Please upload a PDF or Word document', 'warning');
            }
        }
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type and size
            const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
            const maxSize = 50 * 1024 * 1024; // 50MB
            
            if (!validTypes.includes(file.type)) {
                showAlert('Invalid Video Format', 'Please upload a video file (MP4, WebM, or MOV)', 'warning');
                return;
            }
            
            if (file.size > maxSize) {
                showAlert('File Too Large', 'Video file must be less than 50MB', 'warning');
                return;
            }
            
            setVideoFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
            const maxSize = 50 * 1024 * 1024;
            
            if (!validTypes.includes(file.type)) {
                showAlert('Invalid Video Format', 'Please upload a video file (MP4, WebM, or MOV)', 'warning');
                return;
            }
            
            if (file.size > maxSize) {
                showAlert('File Too Large', 'Video file must be less than 50MB', 'warning');
                return;
            }
            
            setVideoFile(file);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate required fields
      if (!resumeFile) {
          showAlert('Resume Required', 'Please upload your resume to continue', 'warning');
          return;
      }
      
      if (!videoFile) {
          showAlert('Elevator Pitch Required', 'Please upload or record a 30-second video pitch to stand out!', 'warning');
          return;
      }
      
      if (!coverLetter.trim()) {
          showAlert('Portfolio Links Required', 'Please provide a link to your previous work or Github.', 'warning');
          return;
      }

      setIsSubmitting(true);

      try {
        // Submit application - now goes to backend for real jobs
        await submitApplication(job, resumeFile, videoFile, coverLetter);
                const destination = previousPage || 'jobs';
        
        showSuccess('Application Submitted!', `Your application for ${job.title} at ${job.company} has been sent successfully!`, () => {
                        navigate(destination);
        });
                setTimeout(() => navigate(destination), 2000);
      } catch (err: any) {
        const message = err?.message || 'Failed to submit application. Please try again.';
        showAlert('Submission Failed', message, 'danger');
      } finally {
        setIsSubmitting(false);
      }
    };

    const backLabel = previousPage === 'shorts' ? 'Shorts' : previousPage === 'dashboard' ? 'Dashboard' : 'All jobs';
    const sideLabel = 'text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)] mb-2';
    const tag = 'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] text-[12.5px] font-medium';
    const tabBtn = (on: boolean) => `flex-1 h-8 text-[13px] font-medium rounded-[8px] transition-colors focus-ring ${on ? 'bg-[var(--bg)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`;
    const roundBtn = 'flex items-center justify-center w-14 h-14 bg-white/15 backdrop-blur border-2 border-white rounded-full hover:bg-white/25 transition-colors focus-ring';

    return (
        <>
        <div className={page}>
            <button onClick={goBack} className={`${btnGhost} ${btnSm} -ml-3 mb-4`}>
                <ArrowLeftIcon className="w-4 h-4" /> Back to {backLabel}
            </button>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-2/3">
                    {alreadyApplied ? (
                        <div className={`${card} p-8 sm:p-12 flex flex-col items-center text-center`}>
                            <div className="w-14 h-14 rounded-full bg-[var(--success-subtle)] text-[var(--success)] flex items-center justify-center mb-5">
                                <CheckCircleIcon className="w-7 h-7" />
                            </div>
                            <h1 className={pageTitle}>You've already applied</h1>
                            <p className={`${pageLead} max-w-md`}>
                                Your application for <span className="font-medium text-[var(--text-primary)]">{job.title}</span> at {job.company} has been received.
                            </p>
                            <div className="mt-6 w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
                                <p className={sideLabel}>Current status</p>
                                <StatusBadge status={existingApp?.status} />
                                <p className="mt-2 text-[13.5px] text-[var(--text-secondary)]">{statusNext(existingApp?.status)}</p>
                            </div>
                            <button onClick={goBack} className={`${btnPrimary} mt-6`}>Continue exploring jobs</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={`${card} p-6 sm:p-8 space-y-8`}>
                            <div>
                                <h1 className={pageTitle}>Apply to {job.company}</h1>
                                <p className={pageLead}>{job.title}</p>
                            </div>

                            <div>
                                <label htmlFor="cover-letter" className={label}>Your work: links and notes *</label>
                                <textarea
                                    id="cover-letter"
                                    rows={6}
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder={'GitHub repositories or projects\nLive demos or hosted sites\nDesign portfolios (Behance, Dribbble)\n\nAdd a line on which project you are proudest of and why it fits this role.'}
                                    className={textarea}
                                    required
                                />
                                <p className={hint}>Skip the cover letter. Show your best work and say briefly why it fits.</p>
                            </div>

                            <div>
                                <span className={label}>Resume / CV *</span>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label htmlFor="resume-upload" className={`${btnSecondary} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)]`}>
                                        <DocumentTextIcon className="w-4 h-4" />
                                        {resumeFile ? 'Replace file' : 'Choose file'}
                                        <input id="resume-upload" name="resume-upload" type="file" accept=".pdf,.doc,.docx" onChange={handleResumeChange} className="sr-only" />
                                    </label>
                                    {resumeFile ? (
                                        <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--text-primary)] min-w-0">
                                            <CheckIcon className="w-4 h-4 shrink-0 text-[var(--success)]" />
                                            <span className="truncate">{resumeFile.name}</span>
                                        </span>
                                    ) : (
                                        <span className="text-[13.5px] text-[var(--text-tertiary)]">No file chosen</span>
                                    )}
                                </div>
                                <p className={hint}>PDF, DOC or DOCX.</p>
                            </div>

                            <div>
                                <span className={label}>30-second video pitch *</span>
                                <div className="flex bg-[var(--surface)] p-1 rounded-[var(--radius)] w-full max-w-xs mb-4" role="group" aria-label="Video source">
                                    <button type="button" aria-pressed={recordingMode === 'upload'} onClick={() => { setRecordingMode('upload'); clearRecording(); }} className={tabBtn(recordingMode === 'upload')}>
                                        Upload file
                                    </button>
                                    <button type="button" aria-pressed={recordingMode === 'record'} onClick={() => { setRecordingMode('record'); setVideoFile(null); }} className={tabBtn(recordingMode === 'record')}>
                                        Record now
                                    </button>
                                </div>

                                {recordingMode === 'upload' ? (
                                    <div
                                        className={`flex justify-center rounded-[var(--radius)] border border-dashed px-6 py-10 transition-colors ${isDragging ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : 'border-[var(--border-strong)] hover:border-[var(--text-tertiary)]'}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <div className="text-center">
                                            {videoFile ? (
                                                <div className="space-y-2">
                                                    <VideoCameraIcon className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
                                                    <p className="text-[14px] font-medium text-[var(--text-primary)] break-all">{videoFile.name}</p>
                                                    <p className="text-[12.5px] text-[var(--text-secondary)]">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                    <button type="button" onClick={() => setVideoFile(null)} className={`${btnDanger} ${btnSm}`}>Remove video</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <VideoCameraIcon className="mx-auto h-8 w-8 text-[var(--text-tertiary)]" />
                                                    <div className="mt-3 flex flex-wrap justify-center gap-1 text-[14px] text-[var(--text-secondary)]">
                                                        <label htmlFor="video-upload" className="cursor-pointer font-medium text-[var(--accent)] hover:underline has-[:focus-visible]:underline">
                                                            <span>Upload a short video</span>
                                                            <input id="video-upload" name="video-upload" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} className="sr-only" />
                                                        </label>
                                                        <span>or drag and drop</span>
                                                    </div>
                                                    <p className={hint}>MP4, WebM or MOV, up to 50 MB.</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center bg-black rounded-[var(--radius)] overflow-hidden relative">
                                        {!recordedVideoUrl ? (
                                            <>
                                                <video ref={videoPreviewRef} className={`w-full aspect-[4/3] object-cover bg-[#111] ${isRecording ? '' : 'opacity-50'}`} />
                                                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center">
                                                    {!isRecording ? (
                                                        <button type="button" onClick={startRecording} aria-label="Start recording" className={roundBtn}>
                                                            <span className="w-4 h-4 rounded-full bg-[var(--danger)]" />
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white font-mono text-[13px] tabular-nums flex items-center gap-2" role="timer">
                                                                <span className="w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse" />
                                                                00:{countdown.toString().padStart(2, '0')}
                                                            </div>
                                                            <button type="button" onClick={stopRecording} aria-label="Stop recording" className={roundBtn}>
                                                                <StopIcon className="w-4 h-4 text-[var(--danger)]" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                {!isRecording && (
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white text-[15px] font-medium">
                                                        Camera ready
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <video src={recordedVideoUrl} className="w-full aspect-[4/3] object-contain bg-[#111]" controls />
                                                <div className="absolute top-3 right-3">
                                                    <button type="button" onClick={clearRecording} className="bg-black/60 backdrop-blur hover:bg-black/80 text-white px-3 h-8 text-[13px] font-medium rounded-[8px] transition-colors border border-white/20 focus-ring">
                                                        Retake
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border)]">
                                <button type="button" onClick={goBack} className={`${btnSecondary} flex-1 sm:flex-none`}>Cancel</button>
                                <button type="submit" disabled={isSubmitting} className={`${btnPrimary} flex-1 sm:flex-none`}>
                                    {isSubmitting ? 'Submitting…' : 'Submit application'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <aside className="w-full lg:w-1/3">
                    <div className="sticky top-24">
                        <div className={`${card} p-6`}>
                            <p className={sideLabel}>Job details</p>
                            <h2 className="font-display text-[20px] font-semibold tracking-tight text-[var(--text-primary)]">{job.title}</h2>
                            <p className="text-[14px] text-[var(--text-secondary)]">{job.company}</p>

                            <div className="flex flex-wrap gap-2 my-5">
                                <span className={tag}><BriefcaseIcon className="w-3.5 h-3.5" />{job.type}</span>
                                <span className={tag}><MapPinIcon className="w-3.5 h-3.5" />{job.location}</span>
                                <span className={`${tag} max-w-full`} title={job.pay.length > 30 ? job.pay : ''}>
                                    <CurrencyDollarIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{job.pay.length > 30 ? `${job.pay.substring(0, 27)}…` : job.pay}</span>
                                </span>
                            </div>

                            {(job.shortVideoUrl || job.companyVideoUrl || job.freelancerVideoUrl) && (
                                <div className="mb-6">
                                    <p className={sideLabel}>Intro video</p>
                                    <video
                                        src={getMediaUrl(job.shortVideoUrl || job.companyVideoUrl || job.freelancerVideoUrl)}
                                        className="w-full aspect-video rounded-[var(--radius)] bg-black object-cover"
                                        muted
                                        loop
                                        playsInline
                                        controls
                                    />
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <p className={sideLabel}>About the role</p>
                                    <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{job.description}</p>
                                </div>
                                {job.companyBrief?.culture && (
                                    <div>
                                        <p className={sideLabel}>Team culture</p>
                                        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{job.companyBrief.culture}</p>
                                    </div>
                                )}
                                {job.companyBrief?.benefits?.length ? (
                                    <div>
                                        <p className={sideLabel}>Benefits</p>
                                        <div className="flex flex-wrap gap-2">
                                            {job.companyBrief.benefits.map((benefit, index) => <span key={index} className={chip}>{benefit}</span>)}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {job.companyBrief && (
                                <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
                                    <p className={sideLabel}>About {job.company}</p>
                                    {job.companyBrief.about && <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{job.companyBrief.about}</p>}
                                    <div className="flex flex-wrap gap-2">
                                        {job.companyBrief.size && <span className={chip}>Size: {job.companyBrief.size}</span>}
                                        {job.companyBrief.industry && <span className={chip}>Industry: {job.companyBrief.industry}</span>}
                                    </div>
                                    {job.companyBrief.website && (
                                        <a href={job.companyBrief.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--accent)] hover:underline">
                                            Company website <ArrowTopRightIcon className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
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

        <Confetti show={showConfetti} onComplete={closeConfetti} />
    </>
);
};

export default JobApplicationPage;
