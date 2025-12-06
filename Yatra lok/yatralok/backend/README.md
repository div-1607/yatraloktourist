# Yatra Lok Backend

Flask backend API for Yatra Lok application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure email (optional but recommended):
   - Set environment variables for email sending:
   ```bash
   # Windows PowerShell
   $env:SMTP_USERNAME="your-email@gmail.com"
   $env:SMTP_PASSWORD="your-app-password"
   $env:FROM_EMAIL="your-email@gmail.com"
   
   # Windows CMD
   set SMTP_USERNAME=your-email@gmail.com
   set SMTP_PASSWORD=your-app-password
   set FROM_EMAIL=your-email@gmail.com
   
   # Linux/Mac
   export SMTP_USERNAME="your-email@gmail.com"
   export SMTP_PASSWORD="your-app-password"
   export FROM_EMAIL="your-email@gmail.com"
   ```
   
   **For Gmail:**
   - Use an App Password (not your regular password)
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Generate an app password and use it as SMTP_PASSWORD
   
   **Note:** If email is not configured, OTP will be printed to console and returned in response (for testing only)

3. Run the server:
```bash
python app.py
```

The server will start on `http://127.0.0.1:5000`

## API Endpoints

### POST /send-otp
Send OTP to user email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Email configured):**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email"
}
```

**Response (Email not configured - testing mode):**
```json
{
  "success": true,
  "message": "OTP generated (email not configured)",
  "otp": "123456"
}
```

### POST /verify-otp
Verify OTP sent to user email

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

### POST /save-tourist
Save tourist registration data

**Request Body:**
```json
{
  "name": "John Doe",
  "age": "25",
  "gender": "male",
  "email": "john@example.com",
  "mobile": "1234567890",
  "city": "Mumbai",
  "address": "123 Main St",
  "digitalID": "YT12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tourist registered successfully",
  "data": {
    "digitalID": "YT12345",
    "email": "john@example.com"
  }
}
```

### POST /save-admin
Save admin registration data

**Request Body:**
```json
{
  "name": "Admin User",
  "mobile": "9876543210",
  "email": "admin@example.com",
  "city": "Delhi",
  "adminDigitalID": "AD12345",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "adminDigitalID": "AD12345",
    "email": "admin@example.com"
  }
}
```

### POST /track-location
Track and save tourist location

**Request Body:**
```json
{
  "digitalID": "YT12345",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "accuracy": 10.5,
  "altitude": 50.0,
  "heading": 90.0,
  "speed": 5.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location tracked successfully",
  "data": {
    "digitalID": "YT12345",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "timestamp": "2025-01-05T10:30:00.123456"
  }
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-01-05T10:30:00.123456"
}
```

## Data Storage

Data is stored in JSON files:
- `tourists.json` - Tourist registrations
- `admins.json` - Admin registrations
- `locations.json` - Location tracking data

## Notes

- CORS is enabled for frontend requests
- All timestamps are in ISO format
- Location history is limited to last 100 entries per user
- OTP is sent via email if configured, otherwise printed to console
- OTP expires after 10 minutes
- Default SMTP server: smtp.gmail.com (port 587)
- For other email providers, set SMTP_SERVER and SMTP_PORT environment variables

