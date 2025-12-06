from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random

CROSS_ORIGIN = True

# Serve frontend static files from the sibling `frontend` folder so backend and frontend
# are available from the same Flask process (single origin).
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)  # Enable CORS for frontend requests

# Data storage (in production, use a database)
TOURISTS_FILE = 'tourists.json'
ADMINS_FILE = 'admins.json'
LOCATIONS_FILE = 'locations.json'
SOS_ALERTS_FILE = 'sos_alerts.json'

# Initialize data files if they don't exist
def init_data_files():
    if not os.path.exists(TOURISTS_FILE):
        with open(TOURISTS_FILE, 'w') as f:
            json.dump({}, f)
    if not os.path.exists(ADMINS_FILE):
        with open(ADMINS_FILE, 'w') as f:
            json.dump({}, f)
    if not os.path.exists(LOCATIONS_FILE):
        with open(LOCATIONS_FILE, 'w') as f:
            json.dump({}, f)
    if not os.path.exists(SOS_ALERTS_FILE):
        with open(SOS_ALERTS_FILE, 'w') as f:
            json.dump([], f)

init_data_files()

# Email configuration (you can set these as environment variables)
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')  # Your email
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')  # Your app password
FROM_EMAIL = os.getenv('FROM_EMAIL', SMTP_USERNAME)

def send_email(to_email, subject, body):
    """
    Send email using SMTP
    """
    try:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print("Email credentials not configured")
            return False
            
        # Create message
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add body to email
        msg.attach(MIMEText(body, 'html'))
        
        # Create SMTP session
        print(f"Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()  # Enable security
        print(f"Logging in as {SMTP_USERNAME}...")
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        # Send email
        print(f"Sending email to {to_email}...")
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, to_email, text)
        server.quit()
        print("Email sent successfully!")
        
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"SMTP Authentication Error: {str(e)}")
        print("Please check your SMTP_USERNAME and SMTP_PASSWORD")
        return False
    except smtplib.SMTPException as e:
        print(f"SMTP Error: {str(e)}")
        return False
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return False

@app.route('/send-otp', methods=['POST'])
def send_otp():
    """
    Send OTP to user email
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'email' not in data:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        email = data.get('email')
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP temporarily (in production, use Redis or database with expiration)
        otp_storage_file = 'otp_storage.json'
        otp_data = {}
        if os.path.exists(otp_storage_file):
            with open(otp_storage_file, 'r') as f:
                otp_data = json.load(f)
        
        otp_data[email] = {
            'otp': otp,
            'timestamp': datetime.now().isoformat(),
            'expires_at': (datetime.now().timestamp() + 600)  # 10 minutes
        }
        
        with open(otp_storage_file, 'w') as f:
            json.dump(otp_data, f, indent=2)
        
        # Email content
        subject = 'Your Yatra Lok Verification Code'
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #00d4ff, #ff006e); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-box {{ background: #fff; border: 2px solid #00d4ff; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #00d4ff; letter-spacing: 5px; font-family: monospace; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Yatra Lok</h1>
                    <p>Verification Code</p>
                </div>
                <div class="content">
                    <h2>Hello!</h2>
                    <p>Thank you for registering with Yatra Lok. Please use the following verification code to complete your registration:</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0; color: #666;">Your OTP is:</p>
                        <div class="otp-code">{otp}</div>
                    </div>
                    
                    <p><strong>This OTP is valid for 10 minutes.</strong></p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Yatra Lok. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email
        email_sent = False
        email_error = None
        
        if SMTP_USERNAME and SMTP_PASSWORD:
            email_sent = send_email(email, subject, body)
            if email_sent:
                print(f"\n{'='*50}")
                print(f"✓ OTP EMAIL SENT SUCCESSFULLY")
                print(f"{'='*50}")
                print(f"To: {email}")
                print(f"OTP: {otp}")
                print(f"{'='*50}\n")
            else:
                email_error = "Failed to send email. Check email configuration."
                print(f"\n{'='*50}")
                print(f"✗ EMAIL SEND FAILED")
                print(f"{'='*50}")
                print(f"To: {email}")
                print(f"OTP: {otp} (shown below for testing)")
                print(f"Error: Email sending failed. Please check SMTP configuration.")
                print(f"{'='*50}\n")
        else:
            # Email not configured
            print(f"\n{'='*50}")
            print(f"⚠ OTP GENERATED (Email not configured)")
            print(f"{'='*50}")
            print(f"To: {email}")
            print(f"OTP: {otp}")
            print(f"This OTP is valid for 10 minutes.")
            print(f"{'='*50}")
            print("To enable email sending, set these environment variables:")
            print("  SMTP_USERNAME=your-email@gmail.com")
            print("  SMTP_PASSWORD=your-app-password")
            print("  SMTP_SERVER=smtp.gmail.com (optional)")
            print("  SMTP_PORT=587 (optional)")
            print(f"{'='*50}\n")
        
        # Always return OTP in response (for testing/fallback display)
        response_data = {
            'success': True,
            'otp': otp,
            'email': email
        }
        
        if email_sent:
            response_data['message'] = 'OTP sent successfully to your email'
        elif email_error:
            response_data['message'] = email_error
            response_data['email_sent'] = False
        else:
            response_data['message'] = 'OTP generated (email not configured - check console or screen)'
            response_data['email_sent'] = False
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error sending OTP: {str(e)}'
        }), 500

@app.route('/save-tourist', methods=['POST'])
def save_tourist():
    """
    Save tourist registration data
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'age', 'gender', 'email', 'mobile', 'city', 'address', 'digitalID']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Load existing tourists
        with open(TOURISTS_FILE, 'r') as f:
            tourists = json.load(f)
        
        # Check if email already exists
        email = data.get('email').lower()
        if email in tourists:
            return jsonify({
                'success': False,
                'message': 'Tourist with this email already exists'
            }), 409
        
        # Check if digital ID already exists
        digital_id = data.get('digitalID')
        for tourist in tourists.values():
            if tourist.get('digitalID') == digital_id:
                return jsonify({
                    'success': False,
                    'message': 'Digital ID already exists'
                }), 409
        
        # Add registration timestamp
        tourist_data = {
            **data,
            'email': email,
            'registrationDate': datetime.now().isoformat(),
            'lastUpdated': datetime.now().isoformat()
        }
        
        # Save tourist
        tourists[email] = tourist_data
        
        with open(TOURISTS_FILE, 'w') as f:
            json.dump(tourists, f, indent=2)
        
        print(f"\n{'='*50}")
        print(f"TOURIST REGISTERED")
        print(f"{'='*50}")
        print(f"Name: {tourist_data['name']}")
        print(f"Email: {tourist_data['email']}")
        print(f"Digital ID: {tourist_data['digitalID']}")
        print(f"Registration Date: {tourist_data['registrationDate']}")
        print(f"{'='*50}\n")
        
        return jsonify({
            'success': True,
            'message': 'Tourist registered successfully',
            'data': {
                'digitalID': tourist_data['digitalID'],
                'email': tourist_data['email']
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error saving tourist: {str(e)}'
        }), 500

@app.route('/save-admin', methods=['POST'])
def save_admin():
    """
    Save admin registration data
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'mobile', 'email', 'city', 'adminDigitalID', 'password']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Load existing admins
        with open(ADMINS_FILE, 'r') as f:
            admins = json.load(f)
        
        # Check if email already exists
        email = data.get('email').lower()
        if email in admins:
            return jsonify({
                'success': False,
                'message': 'Admin with this email already exists'
            }), 409
        
        # Check if admin digital ID already exists
        admin_digital_id = data.get('adminDigitalID')
        for admin in admins.values():
            if admin.get('adminDigitalID') == admin_digital_id:
                return jsonify({
                    'success': False,
                    'message': 'Admin Digital ID already exists'
                }), 409
        
        # Add registration timestamp
        admin_data = {
            **data,
            'email': email,
            'role': 'admin',
            'registrationDate': datetime.now().isoformat(),
            'lastUpdated': datetime.now().isoformat()
        }
        
        # Save admin
        admins[email] = admin_data
        
        with open(ADMINS_FILE, 'w') as f:
            json.dump(admins, f, indent=2)
        
        print(f"\n{'='*50}")
        print(f"ADMIN REGISTERED")
        print(f"{'='*50}")
        print(f"Name: {admin_data['name']}")
        print(f"Email: {admin_data['email']}")
        print(f"Admin Digital ID: {admin_data['adminDigitalID']}")
        print(f"Registration Date: {admin_data['registrationDate']}")
        print(f"{'='*50}\n")
        
        return jsonify({
            'success': True,
            'message': 'Admin registered successfully',
            'data': {
                'adminDigitalID': admin_data['adminDigitalID'],
                'email': admin_data['email']
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error saving admin: {str(e)}'
        }), 500

@app.route('/track-location', methods=['POST'])
def track_location():
    """
    Track and save tourist location
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['digitalID', 'latitude', 'longitude']
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        digital_id = data.get('digitalID')
        latitude = float(data.get('latitude'))
        longitude = float(data.get('longitude'))
        
        # Validate coordinates
        if not (-90 <= latitude <= 90):
            return jsonify({
                'success': False,
                'message': 'Invalid latitude (must be between -90 and 90)'
            }), 400
        
        if not (-180 <= longitude <= 180):
            return jsonify({
                'success': False,
                'message': 'Invalid longitude (must be between -180 and 180)'
            }), 400
        
        # Load existing locations
        with open(LOCATIONS_FILE, 'r') as f:
            locations = json.load(f)
        
        # Create location entry
        location_entry = {
            'digitalID': digital_id,
            'latitude': latitude,
            'longitude': longitude,
            'accuracy': data.get('accuracy'),
            'altitude': data.get('altitude'),
            'heading': data.get('heading'),
            'speed': data.get('speed'),
            'timestamp': datetime.now().isoformat(),
            'lastSeenTime': datetime.now().isoformat()
        }
        
        # Save location (append to history)
        if digital_id not in locations:
            locations[digital_id] = {
                'current': location_entry,
                'history': []
            }
        else:
            # Add current to history (keep last 100 entries)
            if 'current' in locations[digital_id]:
                locations[digital_id]['history'].append(locations[digital_id]['current'])
                if len(locations[digital_id]['history']) > 100:
                    locations[digital_id]['history'] = locations[digital_id]['history'][-100:]
            
            locations[digital_id]['current'] = location_entry
        
        with open(LOCATIONS_FILE, 'w') as f:
            json.dump(locations, f, indent=2)
        
        print(f"\n{'='*50}")
        print(f"LOCATION TRACKED")
        print(f"{'='*50}")
        print(f"Digital ID: {digital_id}")
        print(f"Latitude: {latitude}")
        print(f"Longitude: {longitude}")
        print(f"Timestamp: {location_entry['timestamp']}")
        print(f"{'='*50}\n")
        
        return jsonify({
            'success': True,
            'message': 'Location tracked successfully',
            'data': {
                'digitalID': digital_id,
                'latitude': latitude,
                'longitude': longitude,
                'timestamp': location_entry['timestamp']
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': f'Invalid data format: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error tracking location: {str(e)}'
        }), 500

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verify OTP sent to user email
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'email' not in data or 'otp' not in data:
            return jsonify({
                'success': False,
                'message': 'Email and OTP are required'
            }), 400
        
        email = data.get('email')
        entered_otp = data.get('otp')
        
        # Load OTP storage
        otp_storage_file = 'otp_storage.json'
        if not os.path.exists(otp_storage_file):
            return jsonify({
                'success': False,
                'message': 'OTP not found or expired'
            }), 400
        
        with open(otp_storage_file, 'r') as f:
            otp_data = json.load(f)
        
        # Check if OTP exists for this email
        if email not in otp_data:
            return jsonify({
                'success': False,
                'message': 'OTP not found or expired'
            }), 400
        
        stored_otp_info = otp_data[email]
        stored_otp = stored_otp_info.get('otp')
        expires_at = stored_otp_info.get('expires_at', 0)
        
        # Check if OTP is expired
        if datetime.now().timestamp() > expires_at:
            # Remove expired OTP
            del otp_data[email]
            with open(otp_storage_file, 'w') as f:
                json.dump(otp_data, f, indent=2)
            return jsonify({
                'success': False,
                'message': 'OTP has expired. Please request a new one.'
            }), 400
        
        # Verify OTP
        if entered_otp == stored_otp:
            # Remove OTP after successful verification
            del otp_data[email]
            with open(otp_storage_file, 'w') as f:
                json.dump(otp_data, f, indent=2)
            
            return jsonify({
                'success': True,
                'message': 'OTP verified successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid OTP'
            }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error verifying OTP: {str(e)}'
        }), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """
    Serve frontend files
    """
    if path == '' or path == '/':
        return app.send_static_file('index.html')
    try:
        return app.send_static_file(path)
    except:
        return app.send_static_file('index.html')

@app.route('/health', methods=['GET'])
def health():
    """
    Health check endpoint
    """
    return jsonify({
        'success': True,
        'message': 'Server is running',
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/locations', methods=['GET'])
def get_locations():
    """
    Return locations mapping (country -> state -> cities)
    """
    try:
        with open(LOCATIONS_FILE, 'r') as f:
            data = json.load(f)
        return jsonify({ 'success': True, 'data': data }), 200
    except Exception as e:
        return jsonify({ 'success': False, 'message': f'Error loading locations: {str(e)}' }), 500

@app.route('/sos-alert', methods=['POST'])
def sos_alert():
    """
    Handle SOS alert from tourist
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Log SOS alert
        sos_alerts = []
        
        if os.path.exists(SOS_ALERTS_FILE):
            with open(SOS_ALERTS_FILE, 'r') as f:
                sos_alerts = json.load(f)
        
        # Add new SOS alert
        sos_alerts.append({
            **data,
            'received_at': datetime.now().isoformat()
        })
        
        # Save to file
        with open(SOS_ALERTS_FILE, 'w') as f:
            json.dump(sos_alerts, f, indent=2)
        
        print(f"\n{'='*50}")
        print(f"🚨 SOS ALERT RECEIVED")
        print(f"{'='*50}")
        print(f"Timestamp: {data.get('timestamp', 'N/A')}")
        if data.get('user'):
            print(f"User: {data['user'].get('name', 'N/A')} ({data['user'].get('email', 'N/A')})")
        print(f"Tourist Mobile: {data.get('touristMobile', 'N/A')} ⬅️ CALL THIS NUMBER")
        if data.get('location'):
            loc = data['location']
            print(f"Location: {loc.get('latitude', 'N/A')}, {loc.get('longitude', 'N/A')}")
        print(f"Admin Number: {data.get('adminNumber', 'N/A')}")
        print(f"{'='*50}\n")
        
        return jsonify({
            'success': True,
            'message': 'SOS alert received and logged'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error processing SOS alert: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Yatra Lok Backend Server")
    print("="*50)
    print("Server starting on http://127.0.0.1:5000")
    print("Available endpoints:")
    print("  POST /send-otp")
    print("  POST /verify-otp")
    print("  POST /save-tourist")
    print("  POST /save-admin")
    print("  POST /track-location")
    print("  POST /sos-alert")
    print("  GET  /health")
    print("="*50)
    if SMTP_USERNAME and SMTP_PASSWORD:
        print("Email configuration: ✓ Enabled")
    else:
        print("Email configuration: ✗ Not configured (using console mode)")
        print("Set SMTP_USERNAME and SMTP_PASSWORD to enable email sending")
    print("="*50 + "\n")
    
    # When running as main, serve frontend static index at root.
    # Static files are served from the `frontend` folder by Flask automatically
    # because we set `static_folder='../frontend'` above. Visiting
    # http://127.0.0.1:5000/ will serve `frontend/index.html`.
    app.run(debug=True, host='0.0.0.0', port=5000)

