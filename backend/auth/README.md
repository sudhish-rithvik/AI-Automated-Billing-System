# Smart Checkout Authentication Server

This is the authentication server for the Smart Checkout System. It handles user registration, login, password reset, and profile management.

## Features

- User registration with email verification
- User login with JWT authentication
- Remember me functionality
- Password reset with OTP verification
- Profile management
- Session management

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Create a `.env` file in the root directory with the following variables:
     ```
     PORT=5001
     JWT_SECRET=your_jwt_secret_key_change_this_in_production
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASS=your_email_app_password
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_SECURE=false
     FRONTEND_URL=http://localhost:5173
     ```

3. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- **POST /api/register** - Register a new user
- **POST /api/login** - Login a user
- **POST /api/remember-me-login** - Auto-login with remember me token
- **POST /api/send-otp** - Send OTP for password reset
- **POST /api/verify-otp** - Verify OTP
- **POST /api/reset-password** - Reset password

### User Management

- **PUT /api/profile** - Update user profile
- **GET /api/sessions** - Get user sessions
- **DELETE /api/sessions/:id** - Revoke a session

## Default Test User

For testing purposes, a default admin user is created:

- Email: admin@example.com
- Password: password123

**Note:** This is for development only. Remove this in production.
