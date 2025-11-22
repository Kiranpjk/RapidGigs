🚀 RapidGig: The Video-First Gig PlatformYour Work, Your Code, Your Gig in 30 SecondsA modern, full-stack platform disrupting the freelancer-recruiter connection with a video-first approach and AI-powered tooling.✨ Features & Highlights🛡️ Authentication & Security (Core Deliverable)Secure JWT Authentication: Full email/password register, login, and logout flow using JSON Web Tokens.Social Sign-On: Integrated Google OAuth 2.0 for quick, one-click sign-in.RBAC: Role-Based Access Control system for Students, Recruiters, and Admins.💼 Job & Application Management (CRUD Entity)Job Dashboard (CRUD): Recruiters can Create, Read, Update, and Delete job listings.Video Integration: Company job briefs and freelancer intro videos for enhanced context.Application Tracking: Real-time status updates (Applied, Interviewing, Offer Received, etc.) with history.🎬 Discovery & EngagementShorts Feed: TikTok-style swipeable vertical videos for quick gig discovery.Real-Time: Instant messaging and push notifications for application status and new alerts.Advanced Search: Comprehensive filtering by category, location, and pay rate.🤖 AI-Powered ProfilesGemini AI Integration: On-demand generation of unique profile avatars and banners.Customization: Full user profile editing and persistence across sessions.🛠️ Tech Stack & ArchitectureRapidGig is built on a modern, type-safe full-stack architecture using the MERN-TS stack.CategoryTechnologyPurposeFrontendReact 19 / TypeScriptHigh-performance, type-safe UIStylingTailwind CSS / Modern UIUtility-first styling with responsive, Dark/Light Mode designBackendNode.js / Express.jsFast, scalable API serverDatabaseMongoDB / MongooseFlexible NoSQL data storage / ODMSecurityJWT / Google OAuthToken-based authentication and social loginDevOpsVite, ESLint, PrettierFast bundling, code quality, and formatting📁 Project StructureThe project is split into clean, modular frontend and backend services:RapidGig/
├── frontend/        # React 19 / Vite / TypeScript App
│   ├── components/  # Modular UI components (Auth, Layout, Common)
│   ├── context/     # Global state management (AuthContext, JobContext)
│   └── services/    # Frontend API client logic
├── backend/         # Node.js / Express.js / TypeScript API
│   ├── src/
│   │   ├── middleware/ # JWT Auth, RBAC, Error Handling
│   │   ├── models/     # Mongoose Schemas (User, Job, Application)
│   │   └── routes/     # All API Endpoints (Auth, Jobs, Videos)
│   └── uploads/     # Storage for Avatars, Videos, and Documents
└── ...
📦 Getting StartedPrerequisitesEnsure you have Node.js (v18+), MongoDB (v6.0+), and npm/yarn installed.Quick StartClone the Repository:Bashgit clone https://github.com/yourusername/rapidgig.git
cd rapidgig
Backend Setup: (Runs on http://localhost:3001)Bashcd backend
npm install
# Create and configure .env file (see Configuration)
npm run dev 
Frontend Setup: (Runs on http://localhost:5173)Bashcd ../frontend
npm install
npm run dev 
⚙️ ConfigurationCreate a .env file in the backend/ directory:Code snippet# Server
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/rapidgig 

# Authentication
JWT_SECRET=your-super-secret-key 
JWT_EXPIRES_IN=7d
# Ensure secure hashing is enabled for production 

# Gemini AI 
GEMINI_API_KEY=your-api-key 
🔌 API DocumentationDetailed API routes are listed below. A comprehensive Postman Collection is available in the repository root for testing all endpoints.Authentication EndpointsPOST /api/auth/register (Email, Password, Name)POST /api/auth/login (Email, Password)GET /api/auth/me (Protected - Requires Bearer Token)Job EndpointsGET /api/jobs (Get All Jobs)POST /api/jobs (Protected - Create New Job)DELETE /api/jobs/:id (Protected - Delete Job)GET /api/jobs/:id (Get Single Job)(...List all other key endpoints concisely here...)📸 ScreenshotsFeatureImageRecruiter DashboardJob Listings FeedShorts Video DiscoveryUser Profile Page🚀 Deployment & ScalabilityThe modular separation of the frontend and backend allows for standard scaling practices:Frontend (React): Deployable as static assets via Vercel or Netlify (minimal cost).Backend (Node.js): Deployable on Heroku, Railway, or DigitalOcean, easily scaled horizontally using a load balancer and a process manager like PM2 (Clustering).Database: Utilize MongoDB Atlas for managed, highly-available, and auto-scaling database infrastructure.🤝 ContributingWe welcome contributions! Please refer to the [CONTRIBUTING.md] file for guidelines (You should create this file).📝 LicenseThis project is licensed under the MIT License.
