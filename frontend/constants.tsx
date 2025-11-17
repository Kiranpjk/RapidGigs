import React from 'react';
import { Job, ShortVideo, User, MessageThread, Notification, Category, Application } from './types';

// Icon Components (Using Heroicons)
// You would typically install `@heroicons/react` but here we'll define them as components for this environment.

export const LogoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" opacity="0.4"/>
    <path d="M12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6Z"/>
  </svg>
);
export const GoogleIcon = () => (<svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.521-3.108-11.127-7.481l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,34.556,44,28.717,44,20C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>);
export const EnvelopeIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 18V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>);
export const UserCircleIcon = ({ className, onClick }: { className?: string; onClick?: () => void; }) => (<svg className={className} onClick={onClick} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
export const BellIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>);
export const SearchIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
export const MapPinIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>);
export const BriefcaseIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07a2.25 2.25 0 01-2.25 2.25h-13.5a2.25 2.25 0 01-2.25-2.25v-4.07m18 0a2.25 2.25 0 00-2.25-2.25h-13.5a2.25 2.25 0 00-2.25 2.25m18 0v-4.879a2.25 2.25 0 00-.659-1.588l-4.5-4.5a2.25 2.25 0 00-1.588-.659H6.75a2.25 2.25 0 00-2.25 2.25v4.879m18 0l-4.5-4.5m0 0h-9m9 0a2.25 2.25 0 012.25 2.25v4.5" /></svg>);
export const PaperAirplaneIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" /></svg>);
export const LockClosedIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>);
export const UserIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>);
export const ArrowRightIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>);
export const ArrowUpOnSquareIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" /></svg>);
export const HomeIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>);
export const VideoCameraIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>);
export const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.372c-1.034.103-1.933-.51-2.422-1.397l-.28-.56a2.25 2.25 0 01-1.003-1.119c-.336-.65-.336-1.43.003-2.08l.281-.56c.489-.887 1.388-1.5 2.422-1.397l3.722.372zM3.75 12h.008v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm.375 4.5h.008v.008H4.5v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>);
// FIX: Replaced invalid syntax with a correct aliased export. This resolves the redeclaration and syntax errors.
export { BriefcaseIcon as BriefcaseOutlineIcon }; // Example of alias
export const Cog6ToothIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a6.759 6.759 0 010 1.255c-.008.378.138.75.43.99l1.004.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.6 6.6 0 01-.22.128c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.759 6.759 0 010-1.255c.008-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.298-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
export const DocumentChartBarIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>);
export const InboxIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.12-1.588H6.88a2.25 2.25 0 00-2.12 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" /></svg>);
export const PlayCircleIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>);
export const PlusIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
export const BookmarkIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>);
export const BuildingOffice2Icon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>);
export const CurrencyDollarIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
export const EyeIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
export const HeartIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>);
export const Bars3Icon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>);
export const XMarkIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
export const EllipsisVerticalIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>);
export const CheckCircleIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
export const InformationCircleIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>);
export const ExclamationTriangleIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>);
export const ChatBubbleLeftEllipsisIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.53-.388m-5.122-3.336a11.33 11.33 0 01-.114-1.616C3 12.016 3 10.662 3 9.338c0-1.323 0-2.677.114-3.996C3.226 4.225 3.999 3.338 4.908 3.125c1.096-.226 2.45-.349 3.842-.349h.018c4.97 0 9 3.694 9 8.25z" /></svg>);
export const SunIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.95-4.243l-1.59-1.591M3.75 12H3m4.243-4.95l1.59-1.591M12 6.75a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5z" /></svg>);
export const MoonIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>);
export const ShareIcon = ({ className }: { className?: string }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m0-2.186V7.633" /></svg>);


// Mock Data
export const USERS: { [key: string]: User } = {
  alex: { id: 1, name: 'Alex Chen', avatarUrl: 'https://picsum.photos/seed/alex/100/100', title: 'Alex Developer' },
  maria: { id: 2, name: 'Maria Rodriguez', avatarUrl: 'https://picsum.photos/seed/maria/100/100', title: 'Sarah Designer' },
  sam: { id: 3, name: 'Sam Patel', avatarUrl: 'https://picsum.photos/seed/sam/100/100' },
  chloe: { id: 4, name: 'Chloe Lim', avatarUrl: 'https://picsum.photos/seed/chloe/100/100' },
  david: { id: 5, name: 'David Lee', avatarUrl: 'https://picsum.photos/seed/david/100/100' },
  lena: { id: 6, name: 'Lena Coder', avatarUrl: 'https://picsum.photos/seed/lena/100/100' },
  david_art: { id: 7, name: 'David Art', avatarUrl: 'https://picsum.photos/seed/davidart/100/100' },
  emily: { id: 8, name: 'Emily Marketer', avatarUrl: 'https://picsum.photos/seed/emily/100/100' },
  chris: { id: 9, name: 'Chris Code', avatarUrl: 'https://picsum.photos/seed/chris/100/100' },
  olivia: { id: 10, name: 'Olivia UI/UX', avatarUrl: 'https://picsum.photos/seed/olivia/100/100' },
  ben: { id: 11, name: 'Ben Data', avatarUrl: 'https://picsum.photos/seed/ben/100/100' },
  mike: { id: 12, name: 'Mike Manager', avatarUrl: 'https://picsum.photos/seed/mike/100/100' },
  jane: { id: 13, name: 'Jane Doe', avatarUrl: 'https://picsum.photos/seed/jane/100/100' },
  sarah: { id: 14, name: 'Sarah Johnson', avatarUrl: 'https://picsum.photos/seed/sarah/100/100' },
  support: { id: 15, name: 'RapidGig Support', avatarUrl: 'https://picsum.photos/seed/support/100/100' },
  alpha: { id: 16, name: 'Project Alpha Team', avatarUrl: 'https://picsum.photos/seed/alpha/100/100' },
  alex_w: { id: 17, name: 'Alex Wang', avatarUrl: 'https://picsum.photos/seed/alexw/100/100' },
  community: { id: 18, name: 'Gig Seekers Community', avatarUrl: 'https://picsum.photos/seed/community/100/100' },
};


export const NEARBY_GIGS: Job[] = [
  { id: 1, title: 'React Frontend Dev', company: 'Acme Corp', logo: <></>, location: 'Remote', type: 'Remote', pay: '₹2,500/hr', description: 'Develop responsive and interactive user interfaces using React and TypeScript for our new HR platform.', postedAgo: '', companyVideoUrl: 'https://example.com/company.mp4', freelancerVideoUrl: 'https://example.com/freelancer.mp4' },
  { id: 2, title: 'UI/UX Designer', company: 'Global Solutions', logo: <></>, location: 'Hybrid (NYC)', type: 'Hybrid', pay: '₹2,900/hr', description: 'Design intuitive and visually appealing user experiences for our enterprise-grade applications.', postedAgo: '', companyVideoUrl: 'https://example.com/company.mp4' },
  { id: 3, title: 'Python Backend Dev', company: 'TechInnovate', logo: <></>, location: 'On-site (SF)', type: 'On-site', pay: '₹3,300/hr', description: 'Build robust and scalable backend services using Python, Django, and PostgreSQL.', postedAgo: '' },
  { id: 4, title: 'Data Analyst Intern', company: 'Data Insights Ltd.', logo: <></>, location: 'Remote', type: 'Remote', pay: '₹2,100/hr', description: 'Assist in collecting, cleaning, and analyzing large datasets to provide actionable business insights.', postedAgo: '' },
  { id: 5, title: 'Digital Marketing Spec.', company: 'Mars Digital', logo: <></>, location: 'Hybrid (LA)', type: 'Hybrid', pay: '₹2,300/hr', description: 'Manage social media campaigns, SEO efforts, and content creation for various client projects.', postedAgo: '' },
  { id: 6, title: 'Mobile App Developer', company: 'Cube Corp', logo: <></>, location: 'On-site (Austin)', type: 'On-site', pay: '₹3,200/hr', description: 'Develop and maintain native mobile applications for iOS and Android platforms.', postedAgo: '' },
];

export const ALL_JOBS: Job[] = [
    { id: 7, title: 'Junior React Developer', company: 'InnovateTech Solutions', logo: <></>, location: 'Remote', type: 'Remote', pay: '₹2,100 - ₹2,900/hr', postedAgo: '2 hours ago', description: 'Seeking a motivated Junior React Developer to help build our next-generation platform. Experience with TypeScript and Tailwind CSS is a plus.', companyVideoUrl: 'https://example.com/company.mp4', freelancerVideoUrl: 'https://example.com/freelancer.mp4', likes: 12500, comments: 342, shares: 129, },
    { id: 8, title: 'UI/UX Design Intern', company: 'Creative Flow Studio', logo: <></>, location: 'On-site, London', type: 'On-site', pay: '₹1,700 - ₹2,100/hr', postedAgo: '1 day ago', description: 'Join our design team to work on exciting projects, from wireframing to high-fidelity prototypes. A great opportunity to grow your portfolio.', companyVideoUrl: 'https://example.com/company.mp4', likes: 8900, comments: 210, shares: 98, },
    { id: 9, title: 'Data Science Assistant', company: 'Data Insight Corp', logo: <></>, location: 'Hybrid, New York', type: 'Hybrid', pay: '₹2,500 - ₹3,300/hr', postedAgo: '3 days ago', description: 'We are looking for a Data Science Assistant to support our analytics team. Proficiency in Python (Pandas, NumPy) and SQL is required.', likes: 15200, comments: 480, shares: 250, },
    { id: 10, title: 'Entry-Level Game Tester', company: 'GameDev Studios', logo: <></>, location: 'On-site, Austin', type: 'On-site', pay: '₹1,250 - ₹1,700/hr', postedAgo: '5 days ago', description: 'Passionate about gaming? Help us find and report bugs in our upcoming titles. Keen attention to detail is a must.' },
    { id: 11, title: 'Social Media Coordinator', company: 'Marketing Minds Inc.', logo: <></>, location: 'Remote', type: 'Remote', pay: '₹1,850 - ₹2,350/hr', postedAgo: '1 week ago', description: 'Manage and grow our clients\' social media presence across various platforms. Experience with content creation and analytics tools is preferred.', likes: 7300, comments: 150, shares: 60, },
    { id: 12, title: 'Content Writer for E-Learning', company: 'EduTech Innovations', logo: <></>, location: 'Remote', type: 'Remote', pay: '₹2,350 - ₹3,200/hr', postedAgo: '1 week ago', description: 'Create engaging and educational content for our online courses. A background in instructional design is highly desirable.' },
    { id: 13, title: 'Healthcare IT Support', company: 'HealthLink Services', logo: <></>, location: 'On-site, Chicago', type: 'On-site', pay: '₹2,100 - ₹2,500/hr', postedAgo: '2 weeks ago', description: 'Provide technical support for our healthcare information systems. Strong problem-solving skills and a customer-centric attitude are essential.' },
    { id: 14, title: 'Junior Financial Analyst', company: 'FinServe Analytics', logo: <></>, location: 'Hybrid, Toronto', type: 'Hybrid', pay: '₹2,500 - ₹3,750/hr', postedAgo: '3 weeks ago', description: 'Assist our finance team with data analysis, financial modeling, and reporting. A degree in Finance, Economics, or a related field is required.' },
    { id: 15, title: 'Cloud Infrastructure Intern', company: 'CloudOps Solutions', logo: <></>, location: 'Remote', type: 'Remote', pay: '₹2,250 - ₹3,100/hr', postedAgo: '1 month ago', description: 'Gain hands-on experience with AWS, Docker, and Kubernetes. This internship offers a path to a full-time role for the right candidate.' },
    { id: 16, title: 'Automotive CAD Designer', company: 'AutoDesign Innovations', logo: <></>, location: 'On-site, Detroit', type: 'On-site', pay: '₹2,900 - ₹4,200/hr', postedAgo: '1 month ago', description: 'Create and modify 3D models and 2D drawings for automotive components. Proficiency in CATIA or SolidWorks is a must.' },
    { id: 17, title: 'Renewable Energy Researcher', company: 'GreenEnergy Labs', logo: <></>, location: 'On-site, San Francisco', type: 'On-site', pay: '₹3,300 - ₹4,600/hr', postedAgo: '2 months ago', description: 'Conduct research on solar and wind energy technologies. A Master\'s or PhD in a relevant engineering or science discipline is preferred.' },
    { id: 18, title: 'E-commerce Operations Assistant', company: 'FutureRetail Tech', logo: <></>, location: 'Hybrid, Berlin', type: 'Hybrid', pay: '₹1,700 - ₹2,500/hr', postedAgo: '2 months ago', description: 'Support our e-commerce team with order management, inventory control, and customer service. Excellent organizational skills are key.' },
];


export const SHORT_VIDEOS_INTRO: ShortVideo[] = [
  { id: 1, title: 'Building a Dynamic React App', author: USERS.alex, thumbnailUrl: 'https://picsum.photos/seed/intro1/400/225', views: 0, likes: 0, duration: "0:58" },
  { id: 2, title: 'My UX Design Process Showcase', author: USERS.maria, thumbnailUrl: 'https://picsum.photos/seed/intro2/400/225', views: 0, likes: 0, duration: "1:15" },
  { id: 3, title: 'Data Analysis & Visualization', author: USERS.sam, thumbnailUrl: 'https://picsum.photos/seed/intro3/400/225', views: 0, likes: 0, duration: "0:45" },
  { id: 4, title: 'Quick Digital Marketing Tips', author: USERS.chloe, thumbnailUrl: 'https://picsum.photos/seed/intro4/400/225', views: 0, likes: 0, duration: "1:02" },
  { id: 5, title: 'Developing Secure APIs', author: USERS.david, thumbnailUrl: 'https://picsum.photos/seed/intro5/400/225', views: 0, likes: 0, duration: "1:30" },
];

export const ALL_SHORTS: ShortVideo[] = [
    { id: 6, title: 'Building a Responsive Portfolio Website with React & Tailwind CSS', author: USERS.alex, thumbnailUrl: 'https://picsum.photos/seed/short1/400/225', views: 12345, likes: 987, duration: '' },
    { id: 7, title: 'UI/UX Design Principles: Crafting Intuitive User Experiences', author: USERS.maria, thumbnailUrl: 'https://picsum.photos/seed/short2/400/225', views: 9876, likes: 765, duration: '' },
    { id: 8, title: 'Project Management 101: Agile Methodologies for Startups', author: USERS.mike, thumbnailUrl: 'https://picsum.photos/seed/short3/400/225', views: 7654, likes: 543, duration: '' },
    { id: 9, title: 'Advanced JavaScript Concepts: Closures, Promises, and Async/Await', author: USERS.lena, thumbnailUrl: 'https://picsum.photos/seed/short4/400/225', views: 15000, likes: 1100, duration: '' },
    { id: 10, title: 'Creating Vector Illustrations for Web Interfaces', author: USERS.david_art, thumbnailUrl: 'https://picsum.photos/seed/short5/400/225', views: 8500, likes: 680, duration: '' },
    { id: 11, title: 'Digital Marketing Strategies: SEO, SEM, and Social Media', author: USERS.emily, thumbnailUrl: 'https://picsum.photos/seed/short6/400/225', views: 6200, likes: 490, duration: '' },
    { id: 12, title: 'My Journey as a Freelance Web Developer: Tips & Tricks', author: USERS.chris, thumbnailUrl: 'https://picsum.photos/seed/short7/400/225', views: 11200, likes: 850, duration: '' },
    { id: 13, title: 'Mastering Figma: Collaborative Design for Teams', author: USERS.olivia, thumbnailUrl: 'https://picsum.photos/seed/short8/400/225', views: 9100, likes: 710, duration: '' },
    { id: 14, title: 'Introduction to Data Science with Python', author: USERS.ben, thumbnailUrl: 'https://picsum.photos/seed/short9/400/225', views: 7800, likes: 600, duration: '' },
];


export const CATEGORIES: Category[] = [
  { id: 1, name: 'Web Development' },
  { id: 2, name: 'Mobile Development' },
  { id: 3, name: 'UI/UX Design' },
  { id: 4, name: 'Data Science' },
  { id: 5, name: 'Digital Marketing' },
  { id: 6, name: 'Content Creation' },
  { id: 7, name: 'Video Editing' },
  { id: 8, name: 'Project Management' },
  { id: 9, name: 'Customer Support' },
  { id: 10, name: 'Virtual Assistant' },
  { id: 11, name: 'Graphic Design' },
  { id: 12, name: 'Machine Learning' },
];

export const MESSAGE_THREADS: MessageThread[] = [
    {
        id: 1, user: USERS.jane, lastMessage: "Hey, are you free for", timestamp: "10:30 AM", unreadCount: 2,
        messages: [
            { sender: 'them', text: 'Hey, are you free for a quick call to discuss the project?', time: '10:30 AM' },
            { sender: 'me', text: 'Hi Jane! Yes, I am. How about in 15 minutes?', time: '10:31 AM' },
            { sender: 'them', text: "Great, looking forward to it!", time: '10:32 AM' },
            { sender: 'me', text: "Perfect, I'll send a calendar invite.", time: '10:32 AM' },
        ]
    },
    { id: 2, user: USERS.sarah, lastMessage: "I've uploaded the ne", timestamp: "Yesterday", unreadCount: 0, messages: [] },
    { id: 3, user: USERS.support, lastMessage: "Your account verificati", timestamp: "Monday", unreadCount: 1, messages: [] },
    { id: 4, user: USERS.alpha, lastMessage: "Meeting at 2 PM in Cha", timestamp: "Oct 24", unreadCount: 5, messages: [] },
    { id: 5, user: USERS.alex_w, lastMessage: "Can you send me the la", timestamp: "Oct 23", unreadCount: 0, messages: [] },
    { id: 6, user: USERS.community, lastMessage: "New gig posted in the 'I", timestamp: "Oct 22", unreadCount: 12, messages: [] },
];

export const NOTIFICATIONS: Notification[] = [
    {id: 1, icon: <></>, text: <>Congrats! You earned a 'Top Talent' badge.</>, time: "Just now"},
    {id: 2, icon: <></>, text: <>RapidGig Platform maintenance scheduled for 2 AM UTC.</>, time: "1 hour ago"},
    {id: 3, icon: <></>, text: <>Your profile is 80% complete. Add a video intro!</>, time: "4 hours ago"},
    {id: 4, icon: <></>, text: <>New message from Jane Doe.</>, time: "Yesterday"},
    {id: 5, icon: <></>, text: <>New gig matching your skills: 'Mobile App Debugger'.</>, time: "2 days ago"},
];

export const MY_APPLICATIONS: Application[] = [
  {
    id: 1,
    job: ALL_JOBS[1], // UI/UX Design Intern
    dateApplied: '2023-10-15',
    status: 'Interviewing',
  },
  {
    id: 2,
    job: ALL_JOBS[0], // Junior React Developer
    dateApplied: '2023-10-12',
    status: 'Applied',
  },
  {
    id: 3,
    job: ALL_JOBS[4], // Social Media Coordinator
    dateApplied: '2023-10-10',
    status: 'Rejected',
  },
  {
    id: 4,
    job: ALL_JOBS[2], // Data Science Assistant
    dateApplied: '2023-10-05',
    status: 'Offer Received',
  },
];