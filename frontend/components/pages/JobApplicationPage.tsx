
import React, { useState, useRef, useEffect } from 'react';
import { Page, Job } from '../../types';
import { 
    BriefcaseIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    VideoCameraIcon
} from '../icons/Icons';
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
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Job not found</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">The job you are trying to apply for does not exist.</p>
                <button onClick={goBack} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg">Back</button>
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

    return (
        <>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <button onClick={goBack} className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">
                ← Back to {previousPage === 'shorts' ? 'Shorts' : previousPage === 'dashboard' ? 'Dashboard' : 'All Jobs'}
              </button>
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Application Form */}
                {/* Main Content Area */}
                <div className="w-full lg:w-2/3">
                    {alreadyApplied ? (
                        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-12 rounded-[2rem] space-y-8 flex flex-col items-center justify-center text-center shadow-sm">
                            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-2">
                                <span className="text-5xl">🎉</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tighter text-slate-900 dark:text-white">You've Already Applied!</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-md mx-auto">
                                    Your application for the <strong className="text-indigo-600 dark:text-indigo-400">{job?.title}</strong> role at {job?.company} has been received.
                                </p>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl w-full max-w-md border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Current Status</p>
                                <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest ${
                                    existingApp?.status === 'shortlisted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    existingApp?.status === 'reviewing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                    existingApp?.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                    {existingApp?.status || 'Pending'}
                                </span>
                            </div>
                            
                            <button 
                                onClick={goBack}
                                className="mt-4 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:scale-105 transition-all outline-none"
                            >
                                Continue Exploring Jobs
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-8 rounded-[2rem] space-y-8 shadow-sm">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tighter">Apply to {job.company}</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">{job.title}</p>
                            </div>
                            
                            <div className="border-t border-slate-200 dark:border-slate-700"></div>

                            <div>
                                <label htmlFor="cover-letter" className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Portfolio / Project Links *</label>
                                <textarea 
                                    id="cover-letter" 
                                    rows={4} 
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="https://github.com/your-profile&#10;https://your-portfolio.com&#10;Explain briefly how your links prove you are perfect for this role..." 
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                ></textarea>
                                <p className="text-xs text-slate-500 mt-2">Skip the boring cover letter. Just show us your best work.</p>
                            </div>
                            
                            <div>
                                <label className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Attachments</label>
                                <div className="mb-4">
                                    <label htmlFor="resume-upload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Resume/CV *</label>
                                    <div className="mt-2 flex items-center gap-4">
                                        <label htmlFor="resume-upload" className="cursor-pointer bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                                          <span>Choose File</span>
                                          <input 
                                            id="resume-upload" 
                                            name="resume-upload" 
                                            type="file" 
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleResumeChange}
                                            className="sr-only" 
                                          />
                                        </label>
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            {resumeFile ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="text-green-600 dark:text-green-400">✓</span>
                                                    {resumeFile.name}
                                                </span>
                                            ) : (
                                                'No file chosen'
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accepted formats: PDF, DOC, DOCX</p>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">30-Second Video Pitch *</label>
                                    
                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-full max-w-sm mb-4">
                                        <button
                                            type="button"
                                            onClick={() => { setRecordingMode('upload'); clearRecording(); }}
                                            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${recordingMode === 'upload' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            Upload File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setRecordingMode('record'); setVideoFile(null); }}
                                            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${recordingMode === 'record' ? 'bg-white dark:bg-slate-800 shadow text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-current" /> Record Now
                                        </button>
                                    </div>

                                    {recordingMode === 'upload' ? (
                                        <div 
                                            className={`mt-2 flex justify-center rounded-lg border-2 border-dashed ${
                                                isDragging 
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                                                    : 'border-slate-300 dark:border-slate-600'
                                            } hover:border-indigo-500 transition-colors px-6 py-10`}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                        >
                                            <div className="text-center">
                                                {videoFile ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-center">
                                                            <span className="text-4xl">🎥</span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{videoFile.name}</p>
                                                        <p className="text-xs text-slate-500">Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => setVideoFile(null)}
                                                            className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-bold"
                                                        >
                                                            Remove video
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <VideoCameraIcon className="mx-auto h-12 w-12 text-slate-500 dark:text-slate-400" />
                                                        <div className="mt-4 flex text-sm leading-6 text-slate-500 dark:text-slate-400 justify-center">
                                                            <label htmlFor="video-upload" className="relative cursor-pointer rounded-md font-semibold text-indigo-500 dark:text-indigo-400 focus-within:outline-none hover:text-indigo-600 dark:hover:text-indigo-300">
                                                                <span>Upload a short video</span>
                                                                <input 
                                                                    id="video-upload" 
                                                                    name="video-upload" 
                                                                    type="file" 
                                                                    accept="video/mp4,video/webm,video/quicktime"
                                                                    onChange={handleVideoChange}
                                                                    className="sr-only" 
                                                                />
                                                            </label>
                                                            <p className="pl-1">or drag and drop</p>
                                                        </div>
                                                        <p className="text-xs leading-5 text-slate-500 mt-2">MP4, WebM, or MOV • Max 1 minute, up to 50MB</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-2 flex flex-col items-center bg-black rounded-lg overflow-hidden relative border border-slate-700">
                                            {!recordedVideoUrl ? (
                                                <>
                                                    <video 
                                                        ref={videoPreviewRef} 
                                                        className={`w-full aspect-[4/3] object-cover bg-slate-900 ${isRecording ? '' : 'opacity-50'}`} 
                                                    />
                                                    
                                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center">
                                                        {!isRecording ? (
                                                            <button 
                                                                type="button" 
                                                                onClick={startRecording}
                                                                className="flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur border-2 border-white rounded-full hover:bg-white/30 transition-all group"
                                                            >
                                                                <div className="w-4 h-4 rounded-full bg-red-500 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-4">
                                                                <div className="bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white font-mono font-bold flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                                    00:{countdown.toString().padStart(2, '0')}
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={stopRecording}
                                                                    className="flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur border-2 border-white rounded-full hover:bg-white/30 transition-all"
                                                                >
                                                                    <div className="w-4 h-4 bg-red-500 rounded-sm" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {!isRecording && (
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white font-bold text-lg drop-shadow-md">
                                                            Camera Ready
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <video 
                                                        src={recordedVideoUrl} 
                                                        className="w-full aspect-[4/3] object-contain bg-slate-900" 
                                                        controls 
                                                    />
                                                    <div className="absolute top-4 right-4">
                                                        <button 
                                                            type="button" 
                                                            onClick={clearRecording}
                                                            className="bg-black/60 backdrop-blur hover:bg-red-500 text-white px-3 py-1.5 font-bold text-xs rounded-lg transition-colors border border-white/20"
                                                        >
                                                            Retake Video
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-200 dark:border-slate-700"></div>
                            
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={goBack} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg flex-1 sm:flex-none">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors flex-1 sm:flex-none">
                                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Sticky Job Details Sidebar */}
                <aside className="w-full lg:w-1/3">
                    <div className="sticky top-24">
                        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6 rounded-lg">
                            <div className="mb-5">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2">Job Details</p>
                                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{job.title}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                    <BriefcaseIcon className="w-3.5 h-3.5" />
                                    {job.type}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold">
                                    <MapPinIcon className="w-3.5 h-3.5" />
                                    {job.location}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                    <CurrencyDollarIcon className="w-3.5 h-3.5" />
                                    {job.pay}
                                </span>
                            </div>

                            {(job.shortVideoUrl || job.companyVideoUrl || job.freelancerVideoUrl) && (
                                <div className="mb-6">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2">Marketing Video</p>
                                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 mb-4 group/video cursor-pointer">
                                        <video
                                            src={getMediaUrl(job.shortVideoUrl || job.companyVideoUrl || job.freelancerVideoUrl)}
                                            className="w-full h-full object-cover opacity-90 group-hover/video:opacity-100 transition-opacity duration-300"
                                            muted
                                            loop
                                            playsInline
                                            onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-100 group-hover/video:opacity-0 transition-opacity duration-300">
                                             <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70">▶</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2">About The Role</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{job.description}</p>
                                </div>

                                {job.companyBrief?.culture && (
                                    <div>
                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2">Team Culture</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{job.companyBrief.culture}</p>
                                    </div>
                                )}

                                {job.companyBrief?.benefits?.length ? (
                                    <div>
                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2">Benefits</p>
                                        <div className="flex flex-wrap gap-2">
                                            {job.companyBrief.benefits.map((benefit, index) => (
                                                <span key={index} className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200">
                                                    {benefit}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {job.companyBrief && (
                                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.18em]">About {job.company}</p>
                                    {job.companyBrief.about && (
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{job.companyBrief.about}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {job.companyBrief.size && <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200">Size: {job.companyBrief.size}</span>}
                                        {job.companyBrief.industry && <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200">Industry: {job.companyBrief.industry}</span>}
                                    </div>
                                    {job.companyBrief.website && (
                                        <a href={job.companyBrief.website} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline inline-block">
                                            Visit Company Website →
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
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

export default JobApplicationPage;
