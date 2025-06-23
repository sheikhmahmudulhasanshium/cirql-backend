<p align="center">
  <a href="https://cirql.vercel.app/" target="_blank">
    <img src="https://raw.githubusercontent.com/sheikhmahmudulhasanshium/cirql-backend/main/public/logo-full.svg" width="200" alt="Cirql Logo" />
  </a>
</p>

<h1 align="center">Cirql Backend API</h1>

<p align="center">
  The backend service for the Cirql application, built with <a href="http://nestjs.com/" target="_blank">NestJS</a>.
  This API handles secure user authentication, advanced user management, a complete support ticketing system, and other core functionalities.
  <br />
  Deployed at: <a href="https://cirql-backend.vercel.app/" target="_blank">cirql-backend.vercel.app</a>
  <br />
  Companion Frontend: <a href="https://cirql.vercel.app/" target="_blank">cirql.vercel.app</a> | <a href="https://github.com/sheikhmahmudulhasanshium/cirql-frontend/" target="_blank">Frontend Repository</a>
</p>

## Description

This repository contains the source code for the Cirql Backend API. It provides a robust, secure, and scalable foundation for the Cirql application, featuring:

*   **Secure Authentication:**
    *   **JWT-based authentication** for stateless sessions.
    *   **Google OAuth 2.0 integration** using the `tokeninfo` endpoint for secure, server-to-server validation that satisfies Google's Cross-Account Protection requirements.
    *   **Two-Factor Authentication (2FA)** using TOTP, including QR code generation, backup codes, and symmetrically encrypted secret storage.
    *   **Password Reset Flow** with secure, expiring tokens.

*   **Support Ticketing System:**
    *   A full-featured two-way conversation system allowing users and admins to communicate.
    *   Users can create tickets based on categories (Feedback, Complaint, etc.), which automatically updates the email subject for easy filtering.
    *   Admins can view all tickets and reply directly.
    *   Users have a complete log of their past conversations.
    *   Support for file/link attachments in messages.

*   **Advanced User Management:**
    *   CRUD operations for user profiles.
    *   **Role-Based Access Control (RBAC)** with `User`, `Admin`, and `Owner` roles, protected by guards.

*   **Comprehensive Auditing:** A dedicated `AuditModule` to log sensitive administrative actions, such as role changes and account deletions, for accountability.

*   **Security & Performance:**
    *   **DDoS Protection & Rate Limiting** applied globally using `@nestjs/throttler`.
    *   Input validation on all DTOs using `class-validator`.
    *   Basic security headers configured with `helmet`.

*   **API Documentation:** Beautiful, themed, and automated API documentation with Swagger (OpenAPI) available at the `/api` endpoint.

## Prerequisites

Before you begin, ensure you have met the following requirements:

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [pnpm](https://pnpm.io/) (or npm/yarn, but pnpm is used in this project's scripts)
*   A MongoDB instance (local or cloud-hosted, e.g., MongoDB Atlas)
*   Google OAuth 2.0 Credentials (Client ID and Client Secret) from the [Google Cloud Console](https://console.cloud.google.com/).
*   A Gmail account with an **App Password** for sending emails via Nodemailer.

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

    # 2FA Encryption Key
    # CRITICAL: Must be a 32-character string. Use a password generator.
    TWO_FACTOR_ENCRYPTION_KEY=your_unique_32_char_encryption_key

    # URLs (for local development)
    FRONTEND_URL=http://localhost:3000
    BACKEND_URL=http://localhost:3001

    # Google OAuth (for local development)
    GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_CALLBACK_TO_BACKEND_URL=http://localhost:3001/auth/google/callback

    # Email Service (Nodemailer with Gmail)
    # IMPORTANT: GMAIL_APP_PASSWORD is NOT your real password.
    # You must generate a 16-character App Password from your Google Account security settings.
    GMAIL_USER=your-email@gmail.com
    GMAIL_APP_PASSWORD=your_16_character_app_password

    # Security/CORS (for local development)
    ALLOWED_FRONTEND_ORIGINS=http://localhost:3000
    ```

    **Important for Google OAuth:**
    *   In your Google Cloud Console OAuth 2.0 client settings, ensure you are using a **"Web application"** type credential.
    *   **Authorized JavaScript origins:**
        *   `http://localhost:3000`
        *   `https://cirql.vercel.app`
    *   **Authorized redirect URIs:**
        *   `http://localhost:3001/auth/google/callback`
        *   `https://cirql-backend.vercel.app/auth/google/callback`

    **Production Environment Variables (Vercel):**
    When deploying to Vercel, you must set these environment variables in your Vercel project settings. Use strong, unique values for production.
    *   `NODE_ENV`: `production`
    *   `MONGODB_URI`
    *   `JWT_SECRET`
    *   `JWT_EXPIRATION_TIME`
    *   `TWO_FACTOR_ENCRYPTION_KEY`
    *   `FRONTEND_URL`
    *   `BACKEND_URL`
    *   `GOOGLE_CLIENT_ID`
    *   `GOOGLE_CLIENT_SECRET`
    *   `GOOGLE_CALLBACK_TO_BACKEND_URL`
    *   `GMAIL_USER`
    *   `GMAIL_APP_PASSWORD`
    *   `ALLOWED_FRONTEND_ORIGINS`

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/sheikhmahmudulhasanshium/cirql-backend.git
cd cirql-backend
pnpm install