"""
Water Tracker API - Flask Backend
Complete REST API for water intake tracking with JWT authentication
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import jwt
import bcrypt
from functools import wraps
from dotenv import load_dotenv
import os
import mysql.connector
from mysql.connector import Error

# Load environment variables
load_dotenv()

# Flask app initialization
app = Flask(__name__)
CORS(app, origins=os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(','))

# Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
ALGORITHM = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30))

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'water_tracker')
}

def get_db_connection():
    """Create database connection"""
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        print(f"Database error: {e}")
        return None

def hash_password(password):
    """Hash password with bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, hashed):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id, email):
    """Create JWT token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'detail': 'Missing authorization token'}), 401
        
        try:
            token = token.split(' ')[1] if ' ' in token else token
            payload = verify_token(token)
            if not payload:
                return jsonify({'detail': 'Invalid or expired token'}), 401
            request.user_id = payload['user_id']
            request.email = payload['email']
        except Exception as e:
            return jsonify({'detail': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated

# ============== ROUTES ==============

@app.route('/', methods=['GET'])
def root():
    """API info"""
    return jsonify({
        'name': 'Water Tracker API',
        'version': '1.0.0',
        'docs': '/api/docs',
        'health': '/api/health'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    conn = get_db_connection()
    db_status = 'connected' if conn else 'disconnected'
    if conn:
        conn.close()
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'database': db_status
    })

# ============== AUTHENTICATION ==============

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'detail': 'Email and password required'}), 400
    
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name', '')
    daily_goal = data.get('daily_goal', 2000)
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
        if cursor.fetchone():
            return jsonify({'detail': 'Email already registered'}), 400
        
        # Hash password
        password_hash = hash_password(password)
        
        # Insert user
        cursor.execute(
            'INSERT INTO users (email, password_hash, full_name, daily_goal) VALUES (%s, %s, %s, %s)',
            (email, password_hash, full_name, daily_goal)
        )
        user_id = cursor.lastrowid
        
        # Insert reminder settings
        cursor.execute(
            'INSERT INTO reminder_settings (user_id, enabled, interval_minutes) VALUES (%s, %s, %s)',
            (user_id, True, 60)
        )
        
        conn.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id,
            'email': email
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'detail': 'Email and password required'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT id, password_hash FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        if not user or not verify_password(password, user[1]):
            return jsonify({'detail': 'Invalid email or password'}), 401
        
        user_id = user[0]
        token = create_token(user_id, email)
        
        return jsonify({
            'access_token': token,
            'token_type': 'bearer',
            'user_id': user_id,
            'email': email
        }), 200
        
    except Exception as e:
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current user info"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, email, full_name, daily_goal FROM users WHERE id = %s',
            (request.user_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'detail': 'User not found'}), 404
        
        return jsonify({
            'id': user[0],
            'email': user[1],
            'full_name': user[2],
            'daily_goal': user[3]
        }), 200
        
    except Exception as e:
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auth/me', methods=['PUT'])
@token_required
def update_current_user():
    """Update current user"""
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        
        if 'daily_goal' in data:
            cursor.execute(
                'UPDATE users SET daily_goal = %s WHERE id = %s',
                (data['daily_goal'], request.user_id)
            )
        
        conn.commit()
        
        return jsonify({'message': 'User updated successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============== WATER INTAKE ==============

@app.route('/api/water', methods=['POST'])
@token_required
def add_water():
    """Add water intake"""
    data = request.get_json()
    amount = data.get('amount')
    
    if not amount or amount <= 0:
        return jsonify({'detail': 'Valid amount required'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        today = datetime.now().date()
        
        # Insert water intake
        cursor.execute(
            'INSERT INTO water_intake (user_id, amount, date, intake_time) VALUES (%s, %s, %s, NOW())',
            (request.user_id, amount, today)
        )
        intake_id = cursor.lastrowid
        
        # Update daily stats
        cursor.execute(
            'SELECT total_intake FROM daily_stats WHERE user_id = %s AND date = %s',
            (request.user_id, today)
        )
        stat = cursor.fetchone()
        
        # Get user's daily goal
        cursor.execute('SELECT daily_goal FROM users WHERE id = %s', (request.user_id,))
        user = cursor.fetchone()
        daily_goal = user[0] if user else 2000
        
        if stat:
            new_total = stat[0] + amount
            goal_achieved = new_total >= daily_goal
            glasses_count = new_total // 250
            cursor.execute(
                'UPDATE daily_stats SET total_intake = %s, goal_achieved = %s, glasses_count = %s WHERE user_id = %s AND date = %s',
                (new_total, goal_achieved, glasses_count, request.user_id, today)
            )
        else:
            goal_achieved = amount >= daily_goal
            glasses_count = amount // 250
            cursor.execute(
                'INSERT INTO daily_stats (user_id, date, total_intake, goal_achieved, glasses_count) VALUES (%s, %s, %s, %s, %s)',
                (request.user_id, today, amount, goal_achieved, glasses_count)
            )
        
        conn.commit()
        
        return jsonify({
            'id': intake_id,
            'amount': amount,
            'message': 'Water intake added successfully'
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/water/today', methods=['GET'])
@token_required
def get_today_intakes():
    """Get today's water intakes"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        today = datetime.now().date()
        
        cursor.execute(
            'SELECT id, amount, intake_time FROM water_intake WHERE user_id = %s AND date = %s ORDER BY intake_time DESC',
            (request.user_id, today)
        )
        
        intakes = []
        for row in cursor.fetchall():
            intakes.append({
                'id': row[0],
                'amount': row[1],
                'intake_time': row[2].isoformat() if row[2] else None,
                'date': today.isoformat()
            })
        
        return jsonify(intakes), 200
        
    except Exception as e:
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/water/history', methods=['GET'])
@token_required
def get_history():
    """Get water intake history"""
    days = request.args.get('days', 7, type=int)
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        start_date = datetime.now().date() - timedelta(days=days)
        
        cursor.execute(
            'SELECT id, amount, intake_time, date FROM water_intake WHERE user_id = %s AND date >= %s ORDER BY intake_time DESC',
            (request.user_id, start_date)
        )
        
        intakes = []
        for row in cursor.fetchall():
            intakes.append({
                'id': row[0],
                'amount': row[1],
                'intake_time': row[2].isoformat() if row[2] else None,
                'date': row[3].isoformat()
            })
        
        return jsonify(intakes), 200
        
    except Exception as e:
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/water/<int:intake_id>', methods=['DELETE'])
@token_required
def delete_intake(intake_id):
    """Delete water intake"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Get intake info
        cursor.execute(
            'SELECT amount, date FROM water_intake WHERE id = %s AND user_id = %s',
            (intake_id, request.user_id)
        )
        intake = cursor.fetchone()
        
        if not intake:
            return jsonify({'detail': 'Intake not found'}), 404
        
        amount, intake_date = intake
        
        # Delete intake
        cursor.execute('DELETE FROM water_intake WHERE id = %s', (intake_id,))
        
        # Update daily stats
        cursor.execute(
            'SELECT daily_goal FROM users WHERE id = %s', (request.user_id,)
        )
        user = cursor.fetchone()
        daily_goal = user[0] if user else 2000
        
        cursor.execute(
            'SELECT total_intake FROM daily_stats WHERE user_id = %s AND date = %s',
            (request.user_id, intake_date)
        )
        stat = cursor.fetchone()
        
        if stat:
            new_total = max(0, stat[0] - amount)
            goal_achieved = new_total >= daily_goal
            glasses_count = new_total // 250
            cursor.execute(
                'UPDATE daily_stats SET total_intake = %s, goal_achieved = %s, glasses_count = %s WHERE user_id = %s AND date = %s',
                (new_total, goal_achieved, glasses_count, request.user_id, intake_date)
            )
        
        conn.commit()
        
        return jsonify({'message': 'Intake deleted successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============== STATISTICS ==============

@app.route('/api/stats/today', methods=['GET'])
@token_required
def get_today_stats():
    """Get today's statistics"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        today = datetime.now().date()
        
        # Get or create daily stats
        cursor.execute(
            'SELECT total_intake, goal_achieved, glasses_count FROM daily_stats WHERE user_id = %s AND date = %s',
            (request.user_id, today)
        )
        
        stat = cursor.fetchone()
        if stat:
            total_intake, goal_achieved, glasses_count = stat
        else:
            total_intake, goal_achieved, glasses_count = 0, False, 0
        
        # Get daily goal
        cursor.execute('SELECT daily_goal FROM users WHERE id = %s', (request.user_id,))
        user = cursor.fetchone()
        daily_goal = user[0] if user else 2000
        
        return jsonify({
            'date': today.isoformat(),
            'total_intake': total_intake,
            'goal_achieved': goal_achieved,
            'glasses_count': glasses_count,
            'daily_goal': daily_goal,
            'percentage': round((total_intake / daily_goal * 100) if daily_goal else 0)
        }), 200
        
    except Exception as e:
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    """Get complete dashboard data"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'detail': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        today = datetime.now().date()
        
        # Get user
        cursor.execute(
            'SELECT id, email, full_name, daily_goal FROM users WHERE id = %s',
            (request.user_id,)
        )
        user = cursor.fetchone()
        
        # Get today's stats
        cursor.execute(
            'SELECT total_intake, goal_achieved, glasses_count FROM daily_stats WHERE user_id = %s AND date = %s',
            (request.user_id, today)
        )
        stat = cursor.fetchone()
        
        # Get today's intakes
        cursor.execute(
            'SELECT id, amount, intake_time FROM water_intake WHERE user_id = %s AND date = %s ORDER BY intake_time DESC',
            (request.user_id, today)
        )
        
        intakes = []
        for row in cursor.fetchall():
            intakes.append({
                'id': row[0],
                'amount': row[1],
                'intake_time': row[2].isoformat() if row[2] else None
            })
        
        if not stat:
            total_intake, goal_achieved, glasses_count = 0, False, 0
        else:
            total_intake, goal_achieved, glasses_count = stat
        
        return jsonify({
            'user': {
                'id': user[0],
                'email': user[1],
                'full_name': user[2],
                'daily_goal': user[3]
            },
            'today_stats': {
                'total_intake': total_intake,
                'goal_achieved': goal_achieved,
                'glasses_count': glasses_count,
                'percentage': round((total_intake / user[3] * 100) if user[3] else 0)
            },
            'today_intakes': intakes
        }), 200
        
    except Exception as e:
        return jsonify({'detail': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============== ERROR HANDLERS ==============

@app.errorhandler(404)
def not_found(error):
    return jsonify({'detail': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'detail': 'Internal server error'}), 500

# ============== MAIN ==============

if __name__ == '__main__':
    print("🚀 Starting Flask server")
    print(f"📚 Health check: http://localhost:{os.getenv('API_PORT', 8000)}/api/health")
    print("💧 Water Tracker API is ready!")
    
    app.run(
        host=os.getenv('API_HOST', '0.0.0.0'),
        port=int(os.getenv('API_PORT', 8000)),
        debug=os.getenv('ENVIRONMENT', 'development') == 'development'
    )
