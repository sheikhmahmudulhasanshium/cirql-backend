<p align="center">
  <a href="https://cirql.vercel.app/" target="_blank">
    <img src="https://raw.githubusercontent.com/sheikhmahmudulhasanshium/cirql-backend/main/public/logo-full.svg" width="200" alt="Cirql Logo" />
  </a>
</p>

<h1 align="center">Cirql Backend API</h1>

<p align="center">
  The backend service for the Cirql application, built with <a href="http://nestjs.com/" target="_blank">NestJS</a>.
  This API handles secure user authentication, advanced user management, Two-Factor Authentication (2FA), and other core functionalities.
  <br />
  Deployed at: <a href="https://cirql-backend.vercel.app/" target="_blank">cirql-backend.vercel.app</a>
  <br />
  Companion Frontend: <a href="https://cirql.vercel.app/" target="_blank">cirql.vercel.app</a> | <a href="https://github.com/sheikhmahmudulhasanshium/cirql-frontend/" target="_blank">Frontend Repository</a>
</p>

## Description

This repository contains the source code for the Cirql Backend API. It provides a robust, secure, and scalable foundation for the Cirql application, featuring:

*   **Secure Authentication:**
    *   **JWT-based authentication** for stateless sessions.
    *   **Google OAuth 2.0 integration** with secure ID token verification to meet Google's latest security standards, including Cross-Account Protection.
    *   **Two-Factor Authentication (2FA)** using TOTP, including QR code generation, backup codes, and encrypted secret storage.
    *   **Password Reset Flow** with secure, expiring tokens sent via email.

*   **Advanced User Management:**
    *   CRUD operations for user profiles.
    *   **Role-Based Access Control (RBAC)** with `User`, `Admin`, and `Owner` roles, protected by guards.

*   **Comprehensive Auditing:** A dedicated `AuditModule` to log sensitive administrative actions, such as role changes and account deletions, for accountability.

*   **Personalized User Settings:** A flexible system allowing users to manage their UI, accessibility, and notification preferences.

*   **Secure API Endpoints:** Includes a secure endpoint for the frontend contact form, preventing the need for sensitive API scopes on the client-side.

*   **API Documentation:** Beautiful, themed, and automated API documentation with Swagger (OpenAPI) available at the `/api` endpoint.

*   **Configuration & Deployment:**
    *   Environment-based configuration using `@nestjs/config` and Joi validation.
    *   Database integration with MongoDB via Mongoose.
    *   Configured for easy deployment on Vercel and local development.

## Prerequisites

Before you begin, ensure you have met the following requirements:

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [pnpm](https://pnpm.io/) (or npm/yarn, but pnpm is used in this project's scripts)
*   A MongoDB instance (local or cloud-hosted, e.g., MongoDB Atlas)
*   Google OAuth 2.0 Credentials (Client ID and Client Secret) from the [Google Cloud Console](https://console.cloud.google.com/).

## Environment Setup

1.  Create a `.env` file in the root of the project. You can use `env.example` as a template or create it manually.

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

    # --- NEW & CRITICAL: 2FA Encryption Key ---
    # Must be a 32-character string. Use a password generator or `openssl rand -hex 16`
    TWO_FACTOR_ENCRYPTION_KEY=your_unique_32_char_encryption_key

    # URLs (for local development)
    FRONTEND_URL=http://localhost:3000
    BACKEND_URL=http://localhost:3001

    # Google OAuth (for local development)
    GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_CALLBACK_TO_BACKEND_URL=http://localhost:3001/auth/google/callback

    # Security/CORS (for local development)
    ALLOWED_FRONTEND_ORIGINS=http://localhost:3000
    ```

    **Important for Google OAuth:**
    *   In your Google Cloud Console OAuth 2.0 client settings, ensure you are using a **"Web application"** type credential.
    *   **Authorized JavaScript origins:**
        *   `http://localhost:3000` (for local frontend dev)
        *   `https://cirql.vercel.app` (for production frontend)
    *   **Authorized redirect URIs:**
        *   `http://localhost:3001/auth/google/callback` (for local backend dev)
        *   `https://cirql-backend.vercel.app/auth/google/callback` (for production backend)

    **Production Environment Variables (Vercel):**
    When deploying to Vercel, you must set these environment variables in your Vercel project settings.
    *   `NODE_ENV`: `production`
    *   `MONGODB_URI`: Your production MongoDB connection string.
    *   `JWT_SECRET`: A strong, unique JWT secret for production.
    *   `JWT_EXPIRATION_TIME`: e.g., `3600s`
    *   `TWO_FACTOR_ENCRYPTION_KEY`: A **different**, strong 32-character key for production.
    *   `FRONTEND_URL`: `https://cirql.vercel.app`
    *   `BACKEND_URL`: `https://cirql-backend.vercel.app`
    *   `GOOGLE_CLIENT_ID`: Your Google Client ID.
    *   `GOOGLE_CLIENT_SECRET`: Your Google Client Secret.
    *   `GOOGLE_CALLBACK_TO_BACKEND_URL`: `https://cirql-backend.vercel.app/auth/google/callback`
    *   `ALLOWED_FRONTEND_ORIGINS`: `https://cirql.vercel.app`

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/sheikhmahmudulhasanshium/cirql-backend.git
cd cirql-backend
pnpm install