<p align="center">
  <a href="https://cirql-backend.vercel.app/" target="_blank">
    <img src="https://raw.githubusercontent.com/sheikhmahmudulhasanshium/cirql-backend/main/public/logo-full.svg" width="200" alt="Cirql Logo" />
  </a>
</p>

<h1 align="center">Cirql Backend API</h1>

<p align="center">
  The backend service for the Cirql application, built with <a href="http://nestjs.com/" target="_blank">NestJS</a>.
  This API handles user authentication (including Google OAuth), user management, and other core functionalities.
  <br />
  Deployed at: <a href="https://cirql-backend.vercel.app/" target="_blank">cirql-backend.vercel.app</a>
  <br />
  Companion Frontend: <a href="https://cirql.vercel.app/" target="_blank">cirql.vercel.app</a> | <a href="https://github.com/sheikhmahmudulhasanshium/cirql-frontend/" target="_blank">Frontend Repository</a>
</p>

## Description

This repository contains the source code for the Cirql Backend API. It provides a robust and scalable foundation for the Cirql application, featuring:

*   **Authentication:** JWT-based authentication and Google OAuth 2.0 integration.
*   **User Management:** CRUD operations for user profiles.
*   **Configuration Management:** Environment-based configuration using `@nestjs/config` and Joi validation.
*   **Database Integration:** MongoDB with Mongoose ORM.
*   **API Documentation:** Automated API documentation with Swagger (OpenAPI).
*   **Security:** Basic security headers with `helmet`.
*   **Validation:** Input validation using `class-validator` and `class-transformer`.
*   **Deployment:** Configured for Vercel deployment (live at [cirql-backend.vercel.app](https://cirql-backend.vercel.app/)) and local development.

## Prerequisites

Before you begin, ensure you have met the following requirements:

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [pnpm](https://pnpm.io/) (or npm/yarn, but pnpm is used in this project's scripts)
*   A MongoDB instance (local or cloud-hosted, e.g., MongoDB Atlas)
*   Google OAuth 2.0 Credentials (Client ID and Client Secret) from the [Google Cloud Console](https://console.cloud.google.com/).
*   (Optional) Local setup for the Cirql Frontend: [cirql-frontend](https://github.com/sheikhmahmudulhasanshium/cirql-frontend/)

## Environment Setup

1.  Create a `.env` file in the root of the project. You can copy `env.example` if it exists or create it manually.

2.  Update the `.env` file with your specific configurations for **local development**:

    ```env
    # Application
    NODE_ENV=development
    PORT=3001

    # MongoDB
    MONGODB_URI=your_mongodb_connection_string_for_dev

    # JWT
    JWT_SECRET=your_strong_jwt_secret_for_dev
    JWT_EXPIRATION_TIME=3600s # e.g., 1h, 7d

    # URLs (for local development)
    FRONTEND_URL=http://localhost:3000 # Assumes local frontend runs on port 3000
    BACKEND_URL=http://localhost:3001 # This backend's local URL

    # Google OAuth (for local development)
    GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_CALLBACK_TO_BACKEND_URL=http://localhost:3001/auth/google/callback

    # Security/CORS (for local development)
    ALLOWED_FRONTEND_ORIGINS=http://localhost:3000 # Allow local frontend
    ```

    **Important for Google OAuth:**
    *   In your Google Cloud Console OAuth 2.0 client settings:
        *   **Authorized redirect URIs:**
            *   `http://localhost:3001/auth/google/callback` (for local backend dev)
            *   `https://cirql-backend.vercel.app/auth/google/callback` (for production backend)
        *   **Authorized JavaScript origins:**
            *   `http://localhost:3000` (for local frontend dev)
            *   `https://cirql.vercel.app` (for production frontend)

    **Production Environment Variables (Vercel):**
    When deploying to Vercel, you will need to set these environment variables in your Vercel project settings, pointing to your production services and URLs.
    *   `NODE_ENV`: `production`
    *   `MONGODB_URI`: Your production MongoDB connection string.
    *   `JWT_SECRET`: A strong, unique JWT secret for production.
    *   `JWT_EXPIRATION_TIME`: e.g., `3600s`
    *   `FRONTEND_URL`: `https://cirql.vercel.app`
    *   `BACKEND_URL`: `https://cirql-backend.vercel.app`
    *   `GOOGLE_CLIENT_ID`: Your Google Client ID (can be the same as dev).
    *   `GOOGLE_CLIENT_SECRET`: Your Google Client Secret (can be the same as dev).
    *   `GOOGLE_CALLBACK_TO_BACKEND_URL`: `https://cirql-backend.vercel.app/auth/google/callback`
    *   `ALLOWED_FRONTEND_ORIGINS`: `https://cirql.vercel.app` (and any other trusted production frontend origins, comma-separated)

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/sheikhmahmudulhasanshium/cirql-backend.git
cd cirql-backend
pnpm install