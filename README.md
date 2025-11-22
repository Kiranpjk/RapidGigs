# RapidGig - Frontend Developer Intern Assignment

## Overview
RapidGig is a scalable web application designed to connect freelancers with recruiters through a video-first approach. This project was built as part of the Frontend Developer Intern assignment, demonstrating a modern frontend architecture integrated with a robust backend.

## Core Features
### ✅ Frontend (React.js + TypeScript)
- **Responsive Design:** Built with TailwindCSS for a mobile-first, adaptive UI.
- **Authentication:** Secure login and signup forms with client-side validation.
- **Protected Routes:** Dashboard and profile pages are protected and require authentication.
- **Dashboard:** A comprehensive dashboard for users to view gigs, filter by category, and manage their profile.
- **Search & Filter:** Real-time filtering of jobs/gigs by category, location, and pay rate.
- **Profile Management:** Users can update their profile details, upload avatars/banners, and manage their video introductions.

### ✅ Backend (Node.js + Express)
- **RESTful API:** A complete set of endpoints for Auth, Jobs, Users, and Videos.
- **Authentication:** JWT-based authentication with secure password hashing (bcrypt).
- **Database:** MongoDB integration using Mongoose for flexible data modeling.
- **CRUD Operations:** Full Create, Read, Update, Delete capabilities for Jobs and Videos.

### ✅ Security & Scalability
- **JWT Middleware:** Protects private routes and ensures secure API communication.
- **Password Hashing:** User passwords are hashed before storage.
- **Error Handling:** Centralized error handling for consistent API responses.
- **Modular Structure:** Codebase organized into controllers, services, and routes for maintainability.

## Tech Stack
- **Frontend:** React 18, TypeScript, TailwindCSS, Vite
- **Backend:** Node.js, Express.js, TypeScript, MongoDB, Mongoose
- **Tools:** Postman (Collection included), Git

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas URI)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd RapidGigs-main
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create a .env file based on the example below
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Configuration (.env)
Create a `.env` file in the `backend` directory:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/rapidgig
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:5173
```

## API Documentation
A Postman collection is included in the root directory: `rapidgig_postman_collection.json`. Import this into Postman to test the API endpoints.

## Scalability Note: Frontend-Backend Integration for Production

To scale this application for a production environment with high traffic, I would implement the following strategies:

1.  **Load Balancing & Horizontal Scaling:**
    *   Deploy the backend across multiple instances (using PM2 or Kubernetes) behind a Load Balancer (e.g., Nginx or AWS ALB). This ensures no single server is a bottleneck.
    *   The frontend can be served via a CDN (like Cloudflare or AWS CloudFront) to cache static assets globally, reducing latency for users.

2.  **Caching Strategy:**
    *   **Redis:** Implement Redis for caching frequently accessed data (like Job listings or User profiles) to reduce database load.
    *   **Browser Caching:** Utilize HTTP cache headers for static resources on the frontend.
    *   **React Query / SWR:** On the frontend, use libraries like TanStack Query to cache API responses, manage stale data, and reduce redundant network requests.

3.  **Database Optimization:**
    *   **Indexing:** Ensure proper indexing on frequently queried fields (e.g., `category`, `location` in the Jobs collection).
    *   **Sharding:** As data grows, shard the MongoDB database to distribute data across multiple machines.
    *   **Read Replicas:** Use read replicas for heavy read operations (like the job feed) to offload the primary database.

4.  **Microservices Architecture:**
    *   Decouple the "Video Processing" feature into a separate microservice. Video uploads and transcoding are resource-intensive and shouldn't block the main API server.
    *   Use a message queue (e.g., RabbitMQ or Kafka) to handle asynchronous tasks like sending emails or processing video uploads.

5.  **Security Enhancements:**
    *   **Rate Limiting:** Implement rate limiting (e.g., `express-rate-limit`) to prevent DDoS attacks and abuse.
    *   **CSRF Protection:** Ensure proper CSRF tokens are used if cookies are utilized for auth.
    *   **Input Sanitization:** rigorously validate and sanitize all inputs to prevent injection attacks.

## License
MIT
