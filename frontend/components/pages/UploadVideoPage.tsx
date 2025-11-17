
import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { ArrowUpOnSquareIcon } from '../icons/Icons';
import { videosAPI, categoriesAPI } from '../../services/api';
import Modal from '../common/Modal';
import Confetti from '../common/Confetti';
import useModal from '../../hooks/useModal';

interface UploadVideoPageProps {
    navigate: (page: Page) => void;
}

const UploadVideoPage: React.FC<UploadVideoPageProps> = ({ navigate }) => {
    const { modalState, showConfetti, showSuccess, closeModal, closeConfetti } = useModal();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await categoriesAPI.getAll();
                setCategories(cats);
                if (cats.length > 0) {
                    setCategoryId(cats[0].id);
                }
            } catch (err) {
                console.error('Error loading categories:', err);
            }
        };
        loadCategories();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (50MB max)
            if (file.size > 50 * 1024 * 1024) {
                setError('File size must be less than 50MB');
                return;
            }

            // Check file type
            const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload a valid video file (MP4, MOV, AVI, WEBM)');
                return;
            }

            setVideoFile(file);
            setFileName(file.name);
            setError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Please enter a video title');
            return;
        }

        if (!videoFile) {
            setError('Please select a video file');
            return;
        }

        setIsLoading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('title', title);
            if (description) {
                formData.append('description', description);
            }
            if (categoryId) {
                formData.append('categoryId', categoryId);
            }

            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            await videosAPI.upload(formData);

            clearInterval(progressInterval);
            setUploadProgress(100);

            // Show success message
            setTimeout(() => {
                showSuccess('Video Uploaded!', 'Your video has been uploaded successfully and is now live!', () => {
                    navigate('shorts');
                });
                setTimeout(() => navigate('shorts'), 2000);
            }, 500);
        } catch (err: any) {
            setError(err.message || 'Failed to upload video. Please try again.');
            setUploadProgress(0);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-8 rounded-lg">
                <h1 className="text-3xl font-bold mb-2 tracking-tighter">Upload Your Introduction Video</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Showcase your skills and personality with a short video.</p>
                
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="video-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Video Title <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="video-title" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Senior React Developer with a Passion for UX" 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                        <textarea 
                            id="description" 
                            rows={4} 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Share more about your skills and what you're looking for..." 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                        <select 
                            id="category" 
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Video File <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 transition-colors px-6 py-10">
                            <div className="text-center">
                                <ArrowUpOnSquareIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="mt-4 flex text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-indigo-500 dark:text-indigo-400 focus-within:outline-none hover:text-indigo-600 dark:hover:text-indigo-300">
                                        <span>{fileName || 'Click to upload'}</span>
                                        <input 
                                            id="file-upload" 
                                            name="file-upload" 
                                            type="file" 
                                            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                                            onChange={handleFileChange}
                                            className="sr-only" 
                                        />
                                    </label>
                                    {!fileName && <p className="pl-1">or drag and drop</p>}
                                </div>
                                <p className="text-xs leading-5 text-slate-500">MP4, MOV, AVI, WEBM (Max 50MB)</p>
                            </div>
                        </div>
                    </div>

                    {isLoading && uploadProgress > 0 && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div 
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-2">
                                Uploading... {uploadProgress}%
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button 
                            type="button" 
                            onClick={() => navigate('profile')} 
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading || !videoFile || !title}
                        >
                            {isLoading ? 'Uploading...' : 'Upload Video'}
                        </button>
                    </div>
                </form>
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

export default UploadVideoPage;
