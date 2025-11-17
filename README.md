# 🚀 RapidGig - Modern Gig Platform

<div align="center">

![RapidGig](https://img.shields.io/badge/RapidGig-Job%20Platform-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?style=for-the-badge&logo=mongodb)

**Your Work, Your Code, Your Gig in 30 Seconds**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [API](#-api-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

RapidGig is a modern, full-stack gig platform that revolutionizes how freelancers and recruiters connect. With video-first job listings, TikTok-style short videos, AI-powered profile generation, and real-time features, RapidGig makes finding and posting gigs faster and more engaging than ever.

### Why RapidGig?

- 🎥 **Video-First Approach**: Job listings with video briefs and freelancer intro videos
- 📱 **TikTok-Style Shorts**: Swipeable short videos for quick gig discovery
- 🤖 **AI-Powered**: Gemini AI integration for avatar and banner generation
- 🔐 **Secure Authentication**: JWT + Google OAuth with role-based access control
- ⚡ **Real-Time**: Instant notifications and messaging
- 🎨 **Modern UI**: Beautiful dark/light mode with smooth animations
- 📊 **Complete Dashboard**: Track applications, saved jobs, and analytics

---

## ✨ Features

### 🔐 Authentication & Authorization

- **Multi-Auth Support**
  - Email/Password registration and login
  - Google OAuth 2.0 integration (One-Click Sign-In)
  - JWT-based authentication with secure token management
  - Persistent sessions with localStorage

- **Role-Based Access Control (RBAC)**
  - Student, Recruiter, Admin, and Moderator roles
  - Granular permissions system
  - Protected routes and API endpoints
  - Dynamic UI based on user permissions

### 👤 User Profiles

- **Customizable Profiles**
  - Upload or AI-generate profile avatars
  - Upload or AI-generate profile banners
  - Edit name, title, and professional information
  - Profile persistence across sessions

- **AI-Powered Generation**
  - Generate unique avatars using Gemini AI
  - Generate custom banners with AI
  - One-click regeneration with unique seeds
  - Instant preview before saving

- **Activity Dashboard**
  - Applications sent/received tracking
  - Jobs posted statistics
  - Videos uploaded count
  - Saved jobs management

### 💼 Job Management

- **Job Listings**
  - Browse all available gigs
  - Filter by category, location, and pay rate
  - Search functionality
  - Detailed job descriptions with company info

- **Video Integration**
  - Company video briefs for jobs
  - Freelancer guide videos
  - Short video job teasers
  - Video thumbnails and previews

- **Job Applications**
  - One-click apply with cover letter
  - File upload support (resume, portfolio)
  - Application status tracking (Applied, Interviewing, Offer Received, Rejected)
  - Application history and management

- **Saved Jobs**
  - Bookmark interesting gigs
  - Quick access to saved opportunities
  - Remove from saved list

### 🎬 Short Videos (TikTok-Style)

- **Swipeable Interface**
  - Vertical scroll through short videos
  - Auto-play on scroll
  - Smooth animations and transitions
  - Touch/swipe gesture support

- **Video Features**
  - Like, comment, and share buttons
  - View counts and engagement metrics
  - Direct apply from video
  - Category-based filtering

- **Video Upload**
  - Upload intro videos (max 60 seconds)
  - Add title, description, and category
  - Thumbnail generation
  - Video preview before upload

### 💬 Messaging & Notifications

- **Real-Time Messaging**
  - Direct messages between users
  - Message threads and history
  - Read/unread status
  - Typing indicators

- **Notifications**
  - Application status updates
  - New job alerts
  - Message notifications
  - Bell icon with unread count

### 🎨 UI/UX Features

- **Modern Design**
  - Clean, professional interface
  - Smooth animations and transitions
  - Responsive design (mobile, tablet, desktop)
  - Accessibility compliant

- **Dark/Light Mode**
  - Toggle between themes
  - Persistent theme preference
  - Smooth theme transitions
  - Optimized for both modes

- **Custom Modals**
  - Success, error, warning, and info alerts
  - Confirmation dialogs
  - Confetti animations for celebrations
  - Smooth fade-in/scale-in animations

### 🔍 Search & Discovery

- **Advanced Search**
  - Search jobs by keywords
  - Filter by multiple criteria
  - Category explorer
  - Location-based search

- **Nearby Gigs**
  - Location-based job recommendations
  - Distance calculations
  - Map integration ready

### 📊 Analytics & Tracking

- **User Statistics**
  - Applications sent/received
  - Jobs posted
  - Videos uploaded
  - Profile views (coming soon)

- **Application Tracking**
  - Status updates
  - Timeline view
  - Application history
  - Success rate metrics

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework with latest features |
| **TypeScript** | Type-safe development |
| **Vite** | Lightning-fast build tool |
| **Tailwind CSS** | Utility-first styling |
| **React Context** | State management |
| **Fetch API** | HTTP requests |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **TypeScript** | Type-safe backend |
| **MongoDB** | NoSQL database |
| **Mongoose** | ODM for MongoDB |
| **JWT** | Authentication tokens |
| **Multer** | File upload handling |
| **Google OAuth** | Social authentication |
| **Gemini AI** | AI-powered features |

### DevOps & Tools

- **Git** - Version control
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Nodemon** - Development server
- **CORS** - Cross-origin resource sharing

---

## 📦 Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6.0 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **npm** or **yarn** - Package manager
- **Git** - Version control

### Quick Start

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/rapidgig.git
cd rapidgig
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (see Configuration section)
cp .env.example .env

# Start development server
npm run dev
```

Backend will run on `http://localhost:3001`

#### 3. Frontend Setup

```bash
# Navigate to frontend directory (from root)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

#### 4. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

---

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/rapidgig
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rapidgig

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173

# Gemini AI (Optional)
GEMINI_API_KEY=your-gemini-api-key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### Frontend Configuration

The frontend uses environment variables from `frontend/constants.tsx`:

```typescript
export const API_BASE_URL = 'http://localhost:3001/api';
```

For production, update this to your production API URL.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized origins: `http://localhost:5173`
6. Add authorized redirect URIs: `http://localhost:5173`
7. Copy Client ID and Client Secret to `.env`

### Gemini AI Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env` as `GEMINI_API_KEY`

---

## 📁 Project Structure

```
RapidGig/
├── frontend/                    # React frontend application
│   ├── components/
│   │   ├── auth/               # Authentication components
│   │   │   └── AuthPage.tsx    # Login/Signup/Forgot Password
│   │   ├── common/             # Reusable components
│   │   │   ├── Modal.tsx       # Custom modal system
│   │   │   └── Confetti.tsx    # Celebration animations
│   │   ├── icons/              # Icon components
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx      # Navigation header
│   │   │   └── MainLayout.tsx  # Main app layout
│   │   └── pages/              # Page components
│   │       ├── DashboardPage.tsx
│   │       ├── JobsPage.tsx
│   │       ├── ShortsPage.tsx
│   │       ├── ProfilePage.tsx
│   │       ├── MessagesPage.tsx
│   │       ├── UploadVideoPage.tsx
│   │       └── JobApplicationPage.tsx
│   ├── context/                # React Context providers
│   │   ├── AuthContext.tsx     # Authentication state
│   │   └── JobContext.tsx      # Job & application state
│   ├── hooks/                  # Custom React hooks
│   │   ├── useModal.ts         # Modal management
│   │   └── useSwipeGesture.ts  # Swipe detection
│   ├── services/               # API services
│   │   └── api.ts              # API client
│   ├── types/                  # TypeScript types
│   ├── constants.tsx           # App constants
│   ├── App.tsx                 # Root component
│   ├── index.tsx               # Entry point
│   └── index.html              # HTML template
│
├── backend/                     # Node.js backend application
│   ├── src/
│   │   ├── config/             # Configuration
│   │   │   ├── database.ts     # MongoDB connection
│   │   │   └── permissions.ts  # RBAC permissions
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.ts         # JWT authentication
│   │   │   ├── rbac.ts         # Role-based access control
│   │   │   ├── upload.ts       # File upload handling
│   │   │   └── errorHandler.ts # Error handling
│   │   ├── models/             # Mongoose models
│   │   │   ├── User.ts         # User model
│   │   │   ├── Job.ts          # Job model
│   │   │   ├── Application.ts  # Application model
│   │   │   ├── ShortVideo.ts   # Video model
│   │   │   └── Message.ts      # Message model
│   │   ├── routes/             # API routes
│   │   │   ├── auth.ts         # Authentication routes
│   │   │   ├── users.ts        # User routes
│   │   │   ├── jobs.ts         # Job routes
│   │   │   ├── applications.ts # Application routes
│   │   │   ├── videos.ts       # Video routes
│   │   │   ├── images.ts       # Image generation routes
│   │   │   ├── roles.ts        # Role management routes
│   │   │   └── messages.ts     # Messaging routes
│   │   ├── services/           # Business logic
│   │   │   └── gemini.ts       # Gemini AI service
│   │   ├── utils/              # Utility functions
│   │   │   ├── jwt.ts          # JWT utilities
│   │   │   └── password.ts     # Password hashing
│   │   └── server.ts           # Express app setup
│   ├── uploads/                # File uploads directory
│   │   ├── avatars/
│   │   ├── banners/
│   │   ├── videos/
│   │   └── documents/
│   └── package.json
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🔌 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "isStudent": true,
  "isRecruiter": false
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Google OAuth Login
```http
POST /api/auth/google
Content-Type: application/json

{
  "credential": "google-jwt-token"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt-token>
```

### User Endpoints

#### Get User Profile
```http
GET /api/users/:id
```

#### Update User Images
```http
PATCH /api/users/:id/images
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "avatarUrl": "https://...",
  "bannerUrl": "https://..."
}
```

### Job Endpoints

#### Get All Jobs
```http
GET /api/jobs
```

#### Create Job
```http
POST /api/jobs
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Full Stack Developer",
  "company": "Tech Corp",
  "location": "Remote",
  "pay": "$50-75/hr",
  "description": "...",
  "category": "Web Development"
}
```

#### Get Job by ID
```http
GET /api/jobs/:id
```

### Application Endpoints

#### Get My Applications
```http
GET /api/applications/my-applications
Authorization: Bearer <jwt-token>
```

#### Create Application
```http
POST /api/applications
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

{
  "jobId": "job-id",
  "coverLetter": "...",
  "resume": <file>
}
```

### Video Endpoints

#### Get My Videos
```http
GET /api/videos/my-videos
Authorization: Bearer <jwt-token>
```

#### Upload Video
```http
POST /api/videos
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

{
  "title": "My Intro Video",
  "description": "...",
  "category": "Web Development",
  "video": <file>
}
```

#### Delete Video
```http
DELETE /api/videos/:id
Authorization: Bearer <jwt-token>
```

### Image Generation Endpoints

#### Generate Avatar
```http
GET /api/images/avatar/:userId?name=UserName
```

#### Generate Banner
```http
GET /api/images/banner/:userId
```

### Role Management Endpoints

#### Get All Roles
```http
GET /api/roles
Authorization: Bearer <jwt-token>
```

#### Assign Role
```http
POST /api/roles/assign
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "user-id",
  "role": "recruiter"
}
```

---

## 📸 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x400/6366f1/ffffff?text=Dashboard+View)

### Job Listings
![Jobs](https://via.placeholder.com/800x400/6366f1/ffffff?text=Job+Listings)

### Short Videos
![Shorts](https://via.placeholder.com/800x400/6366f1/ffffff?text=TikTok-Style+Shorts)

### Profile Page
![Profile](https://via.placeholder.com/800x400/6366f1/ffffff?text=User+Profile)

---

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Deploy the `dist` folder to your hosting service

3. Update environment variables with production API URL

### Backend Deployment (Heroku/Railway/DigitalOcean)

1. Set environment variables on your hosting platform
2. Ensure MongoDB is accessible (use MongoDB Atlas for production)
3. Deploy the backend code
4. Update CORS_ORIGIN to your frontend URL

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB for the database
- Google for OAuth and Gemini AI
- Tailwind CSS for the styling system
- All contributors and supporters

---

## 📞 Support

For support, email support@rapidgig.com or join our Slack channel.

---

<div align="center">

**Made with ❤️ by the RapidGig Team**

[⬆ Back to Top](#-rapidgig---modern-gig-platform)

</div>
#   R a p i d G i g s  
 #   R a p i d G i g s  
 #   R a p i d G i g s  
 #   R a p i d G i g s  
 #   R a p i d G i g s  
 