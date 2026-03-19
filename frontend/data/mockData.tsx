// ✅ FIXED: All IDs changed to string (was number — caused type mismatches with MongoDB)
// ✅ FIXED: Removed logo: <></> from Job objects — logo field removed from Job type
//           Company initials are rendered in UI components, not stored in data

import { Job, ShortVideo, User, MessageThread, Notification, Category, Application } from '../types';

// ─── USERS ────────────────────────────────────────────────────────────────────
export const USERS: { [key: string]: User } = {
  alex:      { id: '1',  name: 'Alex Chen',              avatarUrl: 'https://picsum.photos/seed/alex/100/100',      title: 'Alex Developer' },
  maria:     { id: '2',  name: 'Maria Rodriguez',         avatarUrl: 'https://picsum.photos/seed/maria/100/100',     title: 'Sarah Designer' },
  sam:       { id: '3',  name: 'Sam Patel',               avatarUrl: 'https://picsum.photos/seed/sam/100/100' },
  chloe:     { id: '4',  name: 'Chloe Lim',               avatarUrl: 'https://picsum.photos/seed/chloe/100/100' },
  david:     { id: '5',  name: 'David Lee',               avatarUrl: 'https://picsum.photos/seed/david/100/100' },
  lena:      { id: '6',  name: 'Lena Coder',              avatarUrl: 'https://picsum.photos/seed/lena/100/100' },
  david_art: { id: '7',  name: 'David Art',               avatarUrl: 'https://picsum.photos/seed/davidart/100/100' },
  emily:     { id: '8',  name: 'Emily Marketer',          avatarUrl: 'https://picsum.photos/seed/emily/100/100' },
  chris:     { id: '9',  name: 'Chris Code',              avatarUrl: 'https://picsum.photos/seed/chris/100/100' },
  olivia:    { id: '10', name: 'Olivia UI/UX',            avatarUrl: 'https://picsum.photos/seed/olivia/100/100' },
  ben:       { id: '11', name: 'Ben Data',                avatarUrl: 'https://picsum.photos/seed/ben/100/100' },
  mike:      { id: '12', name: 'Mike Manager',            avatarUrl: 'https://picsum.photos/seed/mike/100/100' },
  jane:      { id: '13', name: 'Jane Doe',                avatarUrl: 'https://picsum.photos/seed/jane/100/100' },
  sarah:     { id: '14', name: 'Sarah Johnson',           avatarUrl: 'https://picsum.photos/seed/sarah/100/100' },
  support:   { id: '15', name: 'RapidGig Support',        avatarUrl: 'https://picsum.photos/seed/support/100/100' },
  alpha:     { id: '16', name: 'Project Alpha Team',      avatarUrl: 'https://picsum.photos/seed/alpha/100/100' },
  alex_w:    { id: '17', name: 'Alex Wang',               avatarUrl: 'https://picsum.photos/seed/alexw/100/100' },
  community: { id: '18', name: 'Gig Seekers Community',   avatarUrl: 'https://picsum.photos/seed/community/100/100' },
};

// ─── NEARBY GIGS ─────────────────────────────────────────────────────────────
export const NEARBY_GIGS: Job[] = [
  {
    id: '1', title: 'React Frontend Dev', company: 'Acme Corp',
    location: 'Remote', type: 'Remote', pay: '₹2,500/hr', postedAgo: '',
    description: 'Develop responsive and interactive user interfaces using React and TypeScript for our new HR platform.',
    companyVideoUrl: 'https://example.com/company.mp4',
    freelancerVideoUrl: 'https://example.com/freelancer.mp4',
  },
  {
    id: '2', title: 'UI/UX Designer', company: 'Global Solutions',
    location: 'Hybrid (NYC)', type: 'Hybrid', pay: '₹2,900/hr', postedAgo: '',
    description: 'Design intuitive and visually appealing user experiences for our enterprise-grade applications.',
    companyVideoUrl: 'https://example.com/company.mp4',
  },
  {
    id: '3', title: 'Python Backend Dev', company: 'TechInnovate',
    location: 'On-site (SF)', type: 'On-site', pay: '₹3,300/hr', postedAgo: '',
    description: 'Build robust and scalable backend services using Python, Django, and PostgreSQL.',
  },
  {
    id: '4', title: 'Data Analyst Intern', company: 'Data Insights Ltd.',
    location: 'Remote', type: 'Remote', pay: '₹2,100/hr', postedAgo: '',
    description: 'Assist in collecting, cleaning, and analyzing large datasets to provide actionable business insights.',
  },
];

// ─── ALL JOBS ─────────────────────────────────────────────────────────────────
export const ALL_JOBS: Job[] = [
  {
    id: '7', title: 'Junior React Developer', company: 'InnovateTech Solutions',
    location: 'Remote', type: 'Remote', pay: '₹2,100 - ₹2,900/hr', postedAgo: '2 hours ago',
    description: 'Seeking a motivated Junior React Developer to help build our next-generation platform.',
    companyVideoUrl: 'https://example.com/company.mp4',
    freelancerVideoUrl: 'https://example.com/freelancer.mp4',
    likes: 12500, comments: 342, shares: 129,
  },
  {
    id: '8', title: 'UI/UX Design Intern', company: 'Creative Flow Studio',
    location: 'On-site, London', type: 'On-site', pay: '₹1,700 - ₹2,100/hr', postedAgo: '1 day ago',
    description: 'Join our design team to work on exciting projects, from wireframing to high-fidelity prototypes.',
    companyVideoUrl: 'https://example.com/company.mp4',
    likes: 8900, comments: 210, shares: 98,
  },
  {
    id: '101', title: 'Social Media Manager', company: 'TrendSetters Inc',
    location: 'Remote', type: 'Remote', pay: '₹2,500 - ₹3,500/hr', postedAgo: '3 hours ago',
    description: 'Create engaging content and manage social media campaigns for top brands.',
    shortVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    likes: 15000, comments: 450, shares: 200,
    companyBrief: {
      about: 'TrendSetters Inc is a leading digital marketing agency specializing in social media strategy.',
      culture: 'Creative, collaborative, and fast-paced environment where innovation thrives.',
      benefits: ['Health Insurance', 'Remote Work', 'Learning Budget', 'Flexible Hours'],
      size: '50-100 employees', industry: 'Digital Marketing',
      website: 'https://trendsetters.example.com',
    },
  },
  {
    id: '102', title: 'Full Stack Developer', company: 'CodeCraft Studios',
    location: 'Hybrid (Mumbai)', type: 'Hybrid', pay: '₹3,000 - ₹4,500/hr', postedAgo: '5 hours ago',
    description: 'Build scalable web applications using modern tech stack. Experience with React, Node.js required.',
    shortVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    likes: 18500, comments: 520, shares: 310,
    companyBrief: {
      about: 'CodeCraft Studios develops cutting-edge SaaS products for education and healthcare.',
      culture: 'Engineering excellence meets creative problem-solving.',
      benefits: ['Health & Dental Insurance', 'Hybrid Work Model', 'Stock Options', 'Annual Retreats'],
      size: '100-200 employees', industry: 'Software Development',
      website: 'https://codecraft.example.com',
    },
  },
  {
    id: '103', title: 'Content Creator & Video Editor', company: 'ViralVision Media',
    location: 'Remote', type: 'Remote', pay: '₹2,200 - ₹3,200/hr', postedAgo: '1 day ago',
    description: 'Create viral short-form content for Instagram, TikTok, and YouTube.',
    shortVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    likes: 22000, comments: 680, shares: 450,
  },
  {
    id: '104', title: 'Data Scientist', company: 'InsightAI Labs',
    location: 'On-site (Bangalore)', type: 'On-site', pay: '₹3,500 - ₹5,000/hr', postedAgo: '6 hours ago',
    description: 'Apply machine learning and statistical analysis to solve complex business problems.',
    shortVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    likes: 14200, comments: 380, shares: 175,
  },
  {
    id: '105', title: 'Product Designer', company: 'DesignFirst Co',
    location: 'Hybrid (Delhi)', type: 'Hybrid', pay: '₹2,800 - ₹4,000/hr', postedAgo: '4 hours ago',
    description: 'Design beautiful and intuitive user experiences for mobile and web applications.',
    shortVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    likes: 19800, comments: 590, shares: 280,
  },
];

// ─── SHORTS ───────────────────────────────────────────────────────────────────
export const SHORT_VIDEOS_INTRO: ShortVideo[] = [
  { id: '1', title: 'Building a Dynamic React App',    author: USERS.alex,  thumbnailUrl: 'https://picsum.photos/seed/intro1/400/225', views: 0, likes: 0, duration: '0:58' },
  { id: '2', title: 'My UX Design Process Showcase',   author: USERS.maria, thumbnailUrl: 'https://picsum.photos/seed/intro2/400/225', views: 0, likes: 0, duration: '1:15' },
  { id: '3', title: 'Data Analysis & Visualization',   author: USERS.sam,   thumbnailUrl: 'https://picsum.photos/seed/intro3/400/225', views: 0, likes: 0, duration: '0:45' },
];

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
export const CATEGORIES: Category[] = [
  { id: '1', name: 'Web Development' },
  { id: '2', name: 'Mobile Development' },
  { id: '3', name: 'UI/UX Design' },
  { id: '4', name: 'Data Science' },
  { id: '5', name: 'Digital Marketing' },
  { id: '6', name: 'Content Creation' },
  { id: '7', name: 'Video Editing' },
  { id: '8', name: 'Project Management' },
  { id: '9', name: 'Customer Support' },
  { id: '10', name: 'Virtual Assistant' },
  { id: '11', name: 'Graphic Design' },
  { id: '12', name: 'Machine Learning' },
];

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export const MESSAGE_THREADS: MessageThread[] = [
  {
    id: '1', user: USERS.jane,
    lastMessage: 'Hey, are you free for a quick call?',
    timestamp: '10:30 AM', unreadCount: 2,
    messages: [
      { sender: 'them', text: 'Hey, are you free for a quick call?', time: '10:30 AM' },
      { sender: 'me',   text: 'Hi Jane! Yes, I am. How about in 15 minutes?', time: '10:31 AM' },
    ],
  },
];

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const NOTIFICATIONS: Notification[] = [
  { id: '1', text: "Congrats! You earned a 'Top Talent' badge.", time: 'Just now' },
  { id: '2', text: 'Your profile is 80% complete. Add a video intro!', time: '4 hours ago' },
  { id: '3', text: 'New message from Jane Doe.', time: 'Yesterday' },
];

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────
export const MY_APPLICATIONS: Application[] = [
  { id: '1', job: ALL_JOBS[1], dateApplied: '2023-10-15', status: 'interviewing' },
  { id: '2', job: ALL_JOBS[0], dateApplied: '2023-10-12', status: 'pending' },
];
