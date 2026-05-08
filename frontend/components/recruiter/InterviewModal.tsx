import React, { useState } from 'react';
import { XMarkIcon } from '../icons/Icons';

interface InterviewModalProps {
  app: any;
  jobTitle: string;
  onClose: () => void;
  onSchedule: (data: { timeSlots: string[], meetingType: string, meetingLink: string }) => Promise<void>;
  onSkip: () => Promise<void>;
  isScheduling: boolean;
}

const TIME_SLOTS = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", 
    "05:00 PM", "06:00 PM", "07:00 PM"
];

const InterviewModal: React.FC<InterviewModalProps> = ({ app, jobTitle, onClose, onSchedule, onSkip, isScheduling }) => {
    const today = new Date().toISOString().split('T')[0];
    
    const [scheduleForm, setScheduleForm] = useState({
        date: today,
        times: [''],
        meetingType: 'Google Meet',
        meetingLink: '',
    });

    const handleInvite = () => {
        // Convert date + time to ISO strings or descriptive strings
        const formattedSlots = scheduleForm.times
            .filter(t => t !== '')
            .map(t => `${scheduleForm.date} at ${t}`);
            
        onSchedule({
            timeSlots: formattedSlots,
            meetingType: scheduleForm.meetingType,
            meetingLink: scheduleForm.meetingLink
        });
    };

    const inputClass = "w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-100";

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg)] w-full max-w-md rounded-xl border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--text-primary)]">
                            {app.applicant?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                            <h2 className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">{app.applicant?.name || 'Candidate'}</h2>
                            <p className="text-[12px] text-[var(--text-tertiary)]">{jobTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Date Selection */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Interview Date</label>
                        <input 
                            type="date" 
                            min={today}
                            value={scheduleForm.date}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Time Slots */}
                    <div className="space-y-3">
                        <label className="text-[12px] font-semibold text-[var(--text-secondary)] block uppercase tracking-wider">Suggested Times</label>
                        {scheduleForm.times.map((selectedTime, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <select 
                                    value={selectedTime} 
                                    onChange={(e) => {
                                        const newTimes = [...scheduleForm.times];
                                        newTimes[index] = e.target.value;
                                        setScheduleForm({ ...scheduleForm, times: newTimes });
                                    }}
                                    className={`${inputClass} appearance-none`}
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                                >
                                    <option value="">Select a time...</option>
                                    {TIME_SLOTS.map(t => (
                                        <option key={t} value={t} disabled={scheduleForm.times.includes(t) && t !== selectedTime}>{t}</option>
                                    ))}
                                </select>
                                {scheduleForm.times.length > 1 && (
                                    <button 
                                        onClick={() => setScheduleForm({ ...scheduleForm, times: scheduleForm.times.filter((_, i) => i !== index) })}
                                        className="text-zinc-500 hover:text-red-400 p-2"
                                    >✕</button>
                                )}
                            </div>
                        ))}
                        {scheduleForm.times.length < 3 && (
                            <button 
                                onClick={() => setScheduleForm({ ...scheduleForm, times: [...scheduleForm.times, ''] })}
                                className="text-[11px] font-bold text-[var(--accent)] hover:underline uppercase tracking-widest"
                            >
                                + Add Alternative Time
                            </button>
                        )}
                    </div>

                    {/* Meeting Info */}
                    <div className="space-y-3">
                        <label className="text-[12px] font-semibold text-[var(--text-secondary)] block uppercase tracking-wider">Interview Mode</label>
                        <select 
                            value={scheduleForm.meetingType}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, meetingType: e.target.value })}
                            className={`${inputClass} appearance-none`}
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                        >
                            <option value="Google Meet">Google Meet</option>
                            <option value="Zoom">Zoom</option>
                            <option value="Phone">Phone Call</option>
                            <option value="External">External Link</option>
                        </select>
                        <input 
                            type="text" 
                            placeholder="Link or instructions..." 
                            value={scheduleForm.meetingLink}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex flex-col gap-2">
                    <button 
                        onClick={handleInvite} 
                        disabled={isScheduling || !scheduleForm.times.some(t => t !== '')}
                        className="w-full py-2.5 bg-violet-600 text-white text-[13px] font-bold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-violet-500/20"
                    >
                        {isScheduling ? 'Sending...' : 'Send Interview Invite'}
                    </button>
                    <button 
                        onClick={onSkip}
                        disabled={isScheduling}
                        className="w-full py-2.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Skip scheduling & mark as Interviewing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterviewModal;
