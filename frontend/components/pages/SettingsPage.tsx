import React, { useState } from 'react';
import { Page } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SunIcon, MoonIcon, BellIcon, UserIcon, TrashIcon, CheckCircleIcon } from '../icons/Icons';

interface SettingsPageProps {
    navigate: (page: Page) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ navigate, theme, toggleTheme, onLogout }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState({
        newApplications: true,
        messages: true,
        jobMatches: true,
        marketingEmails: false,
    });
    const [saved, setSaved] = useState(false);

    const handleSaveNotifications = () => {
        // Would call API in production
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const SettingSection: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-8 shadow-sm">
            <div className="mb-6">
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h3>
                {description && <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">{description}</p>}
            </div>
            {children}
        </div>
    );

    const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string; sublabel?: string }> = ({ checked, onChange, label, sublabel }) => (
        <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-slate-700/50 last:border-0">
            <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
                {sublabel && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sublabel}</p>}
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-100 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500" />
            </label>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-slide-up">
            <div className="mb-10">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-lg text-gray-500 dark:text-slate-400 mt-2">Manage your preferences and account.</p>
            </div>

            <div className="space-y-6">
                {/* Appearance */}
                <SettingSection title="Appearance" description="Customize how RapidGig looks for you.">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-amber-50'}`}>
                                {theme === 'dark'
                                    ? <MoonIcon className="w-6 h-6 text-indigo-400" />
                                    : <SunIcon className="w-6 h-6 text-amber-500" />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                                    {theme === 'dark' ? 'Easier on the eyes in low light.' : 'Clean and trustworthy look.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl text-sm hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-gray-200 dark:shadow-none"
                        >
                            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                        </button>
                    </div>
                </SettingSection>

                {/* Notifications */}
                <SettingSection title="Notifications" description="Choose what you want to be notified about.">
                    <Toggle
                        checked={notifications.newApplications}
                        onChange={() => setNotifications(n => ({ ...n, newApplications: !n.newApplications }))}
                        label="New Applications"
                        sublabel="Get notified when someone applies to your job."
                    />
                    <Toggle
                        checked={notifications.messages}
                        onChange={() => setNotifications(n => ({ ...n, messages: !n.messages }))}
                        label="Messages"
                        sublabel="Alerts for new direct messages."
                    />
                    <Toggle
                        checked={notifications.jobMatches}
                        onChange={() => setNotifications(n => ({ ...n, jobMatches: !n.jobMatches }))}
                        label="Job Matches"
                        sublabel="When new jobs match your profile."
                    />
                    <Toggle
                        checked={notifications.marketingEmails}
                        onChange={() => setNotifications(n => ({ ...n, marketingEmails: !n.marketingEmails }))}
                        label="Marketing Emails"
                        sublabel="Tips, updates, and product news."
                    />
                    <div className="pt-6">
                        <button
                            onClick={handleSaveNotifications}
                            className={`flex items-center gap-2 px-6 py-3 font-bold rounded-2xl text-sm transition-all cursor-pointer ${saved ? 'bg-green-500 text-white scale-95' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] shadow-lg shadow-gray-200 dark:shadow-none'}`}
                        >
                            {saved ? <><CheckCircleIcon className="w-4 h-4" /> Saved!</> : 'Save Preferences'}
                        </button>
                    </div>
                </SettingSection>

                {/* Account */}
                <SettingSection title="Account" description="Manage your account details.">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-700/50">
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Email</p>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{user?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-700/50">
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Account Type</p>
                                <p className="font-bold text-gray-900 dark:text-white text-sm capitalize">{user?.role}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-700/50">
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Account Status</p>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${user?.isActive ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-500'}`}>
                                    {user?.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4 flex-wrap">
                            <button
                                onClick={() => navigate('profile')}
                                className="px-6 py-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-bold rounded-2xl text-sm transition-all cursor-pointer"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={() => { onLogout(); }}
                                className="px-6 py-3 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 font-bold rounded-2xl text-sm transition-all cursor-pointer border border-red-100 dark:border-red-800/20"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </SettingSection>

                {/* Privacy */}
                <SettingSection title="Privacy & Security" description="Control your privacy settings.">
                    <div className="space-y-4 text-sm">
                        <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/20">
                            <CheckCircleIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Your data is secured</p>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">All messages and data are encrypted and stored securely.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-900/30 rounded-2xl">
                            <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                                <strong className="text-gray-600 dark:text-slate-400">User ID:</strong>{' '}
                                <span className="font-mono select-all text-indigo-500">{user?.id}</span><br />
                                Share this ID so recruuters in the platform can message you directly.
                            </p>
                        </div>
                    </div>
                </SettingSection>
            </div>
        </div>
    );
};

export default SettingsPage;
