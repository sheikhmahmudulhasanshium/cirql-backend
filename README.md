<p align="center">
  <a href="https://cirql.vercel.app/" target="_blank">
    <img src="https://raw.githubusercontent.com/sheikhmahmudulhasanshium/cirql-backend/main/public/logo-full.svg" width="200" alt="Cirql Logo" />
  </a>
</p>

<h1 align="center">Cirql Backend API</h1>

<p align="center">
  The backend service for the Cirql application, built with <a href="http://nestjs.com/" target="_blank">NestJS</a>.
  This API handles secure user authentication, advanced user management, a complete support ticketing system, activity logging, and other core functionalities.
  <br />
  Deployed at: <a href="https://cirql-backend.vercel.app/" target="_blank">cirql-backend.vercel.app</a>
  <br />
  Companion Frontend: <a href="https://cirql.vercel.app/" target="_blank">cirql.vercel.app</a> | <a href="https://github.com/sheikhmahmudulhasanshium/cirql-frontend/" target="_blank">Frontend Repository</a>
</p>

## Description

This repository contains the source code for the Cirql Backend API. It provides a robust, secure, and scalable foundation for the Cirql application, featuring:

*   **Secure Authentication:**
    *   **Enriched JWTs** for stateless sessions, including user details to improve frontend performance.
    *   **Google OAuth 2.0 integration** for seamless, single-click sign-in.
    *   **Email-based Two-Factor Authentication (2FA)** as an added security layer.
    *   **Password Reset Flow** with secure, expiring tokens.
    *   **Planned:** A robust silent token refresh strategy using `HttpOnly` cookies.

*   **Activity Logging & Smart Navigation:**
    *   A comprehensive `ActivityService` logs key user actions like logins, heartbeats, and page views.
    *   Provides a `GET /activity/me/navigation-stats` endpoint that returns a user's last visited page and a list of their most frequented pages, enabling a personalized "Resume Session" and "Shortcuts" experience on the frontend.

*   **Support Ticketing System:**
    *   A full-featured two-way conversation system allowing registered users, guests, and admins to communicate.
    *   Tickets are categorized for easy filtering in admin views.
    *   Automated in-app and email notifications for admins on new tickets and for users on new replies.

*   **Advanced User Management:**
    *   CRUD operations for user profiles.
    *   **Role-Based Access Control (RBAC)** with `User`, `Admin`, `Owner`, and `Tester` roles, protected by a `RolesGuard`.
    *   Endpoints for banning/unbanning users, which triggers email notifications.

*   **Comprehensive Auditing:** A dedicated `AuditModule` to log sensitive administrative actions, such as role changes and account deletions, for accountability.

*   **Security & Performance:**
    *   **DDoS Protection & Rate Limiting** applied globally using `@nestjs/throttler`.
    *   Input validation on all DTOs using `class-validator`.
    *   Standard security headers configured with `helmet`.

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

    # JWT & Security
    JWT_SECRET=your_strong_jwt_secret_for_dev
    JWT_EXPIRATION_TIME=1h # e.g., 1h, 7d
    # CRITICAL: Must be a 32-character string. Use a password generator.
    TWO_FACTOR_ENCRYPTION_KEY=your_unique_32_char_encryption_key_here

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

    # Admin & CORS
    # A comma-separated list of emails to grant 'Owner' and 'Admin' roles on first login.
    ADMIN_LIST=your-admin-email@example.com,another-admin@example.com
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

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/sheikhmahmudulhasanshium/cirql-backend.git
cd cirql-backend
pnpm install