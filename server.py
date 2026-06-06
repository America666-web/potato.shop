"""
Simple Python Flask server for KuzPotato authentication
Run: python server.py
"""
from flask import Flask, request, jsonify, session
import base64
import os
import requests
import uuid
import base64
import os
import requests
from flask_cors import CORS
import sqlite3
import bcrypt
import json
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'secret-key'
CORS(app)

# Imgbb API key (server-side). Set to your key.
IMGBB_KEY = os.environ.get('IMGBB_KEY') or '99bfa0f74cab61309582eec9c1565e64'

# Static frontend files
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def static_proxy(path):
    return app.send_static_file(path)

# Database initialization
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        full_name TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('PRAGMA table_info(users)')
    columns = [row[1] for row in c.fetchall()]
    if 'full_name' not in columns:
        c.execute("ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''")
    if 'avatar_url' not in columns:
        c.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''")
    if 'token' not in columns:
        c.execute("ALTER TABLE users ADD COLUMN token TEXT DEFAULT ''")
    
    # products table
    c.execute('''CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        price REAL DEFAULT 0,
        note TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(recipient_id) REFERENCES users(id)
    )''')
    
    # Add admin user
    admin_email = 'fortter'
    admin_pass = bcrypt.hashpw('4205'.encode(), bcrypt.gensalt()).decode()
    
    try:
        c.execute('INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)',
                 (admin_email, admin_pass, 'admin', 'active'))
        conn.commit()
    except sqlite3.IntegrityError:
        pass
    
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def get_current_user():
    # Prefer token-based auth via Authorization header: 'Bearer <token>'
    auth = request.headers.get('Authorization', '')
    if auth and auth.startswith('Bearer '):
        token = auth.split(' ', 1)[1].strip()
        if token:
            user = get_user_by_token(token)
            if user:
                return {
                    'id': user['id'],
                    'email': user['email'],
                    'role': user['role'],
                    'status': user['status'],
                    'full_name': user['full_name'] or '',
                    'avatar_url': user['avatar_url'] or ''
                }
    return session.get('user')


def get_user_by_token(token):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE token = ? LIMIT 1', (token,))
    user = c.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    conn.close()
    return user

def get_admin_user():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE role = ? LIMIT 1', ('admin',))
    admin = c.fetchone()
    conn.close()
    return admin

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    conn = get_db()
    c = conn.cursor()
    
    try:
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        # New users get status 'мирный'
        c.execute('INSERT INTO users (email, password, status, full_name, avatar_url) VALUES (?, ?, ?, ?, ?)',
             (email, hashed, 'мирный', '', ''))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'User registered successfully'}), 200
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'user exists'}), 400
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db()
    c = conn.cursor()
    
    try:
        c.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'no user'}), 400
        
        if user['status'] not in ('active', 'мирный'):
            conn.close()
            return jsonify({'error': 'user disabled'}), 403
        
        if not bcrypt.checkpw(password.encode(), user['password'].encode()):
            conn.close()
            return jsonify({'error': 'wrong pass'}), 400
        # generate token for API auth (allows per-tab identities)
        token = uuid.uuid4().hex
        c.execute('UPDATE users SET token = ? WHERE id = ?', (token, user['id']))
        conn.commit()

        session_user = {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'status': user['status'],
            'full_name': user['full_name'] or '',
            'avatar_url': user['avatar_url'] or '',
            'token': token
        }
        session['user'] = session_user
        conn.close()
        return jsonify(session_user), 200
    
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/me', methods=['GET'])
def get_user():
    return jsonify(session.get('user') or None), 200

@app.route('/api/profile', methods=['POST'])
def update_profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    full_name = (data.get('full_name') or '').strip()
    avatar_url = (data.get('avatar_url') or '').strip()

    conn = get_db()
    c = conn.cursor()
    try:
        c.execute('UPDATE users SET full_name = ?, avatar_url = ? WHERE id = ?',
                  (full_name, avatar_url, user['id']))
        conn.commit()
        session['user']['full_name'] = full_name
        session['user']['avatar_url'] = avatar_url
        conn.close()
        return jsonify({'success': True, 'full_name': full_name, 'avatar_url': avatar_url}), 200
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/upload_avatar', methods=['POST'])
def upload_avatar():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    if not IMGBB_KEY:
        return jsonify({'error': 'Server imgbb key not configured'}), 500

    try:
        blob = file.read()
        b64 = base64.b64encode(blob).decode()
        resp = requests.post('https://api.imgbb.com/1/upload', data={'key': IMGBB_KEY, 'image': b64})
        data = resp.json()
        if not resp.ok or 'data' not in data:
            return jsonify({'error': data.get('error', {}).get('message', 'Upload failed')}), 500

        url = data['data'].get('url') or data['data'].get('display_url')

        # Optionally save avatar_url to user's profile in DB
        conn = get_db()
        c = conn.cursor()
        c.execute('UPDATE users SET avatar_url = ? WHERE id = ?', (url, user['id']))
        conn.commit()
        conn.close()

        # update session copy
        session['user']['avatar_url'] = url

        return jsonify({'url': url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/upload_product_image', methods=['POST'])
def upload_product_image():
    user = get_current_user()
    if not user or user.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    if not IMGBB_KEY:
        return jsonify({'error': 'Server imgbb key not configured'}), 500

    try:
        blob = file.read()
        b64 = base64.b64encode(blob).decode()
        resp = requests.post('https://api.imgbb.com/1/upload', data={'key': IMGBB_KEY, 'image': b64})
        data = resp.json()
        if not resp.ok or 'data' not in data:
            return jsonify({'error': data.get('error', {}).get('message', 'Upload failed')}), 500

        url = data['data'].get('url') or data['data'].get('display_url')
        return jsonify({'url': url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products', methods=['POST'])
def create_product():
    user = get_current_user()
    if not user or user.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    image_url = (data.get('image_url') or '').strip()
    price = data.get('price') or 0
    note = (data.get('note') or '').strip()

    if not title:
        return jsonify({'error': 'Title required'}), 400

    conn = get_db()
    c = conn.cursor()
    try:
        c.execute('INSERT INTO products (title, description, image_url, price, note) VALUES (?, ?, ?, ?, ?)',
                  (title, description, image_url, price, note))
        conn.commit()
        prod_id = c.lastrowid
        c.execute('SELECT * FROM products WHERE id = ?', (prod_id,))
        row = c.fetchone()
        conn.close()
        return jsonify(dict(row)), 200
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/products', methods=['GET'])
def list_products():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM products ORDER BY created_at DESC')
    rows = c.fetchall()
    products = [dict(r) for r in rows]
    conn.close()
    return jsonify(products), 200


@app.route('/api/products/<int:prod_id>', methods=['GET', 'PUT', 'DELETE'])
def product_detail(prod_id):
    user = get_current_user()
    conn = get_db()
    c = conn.cursor()
    if request.method == 'GET':
        c.execute('SELECT * FROM products WHERE id = ?', (prod_id,))
        row = c.fetchone()
        conn.close()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(dict(row)), 200

    if request.method == 'PUT':
        # only admin may update
        if not user or user.get('role') != 'admin':
            conn.close()
            return jsonify({'error': 'Unauthorized'}), 401
        data = request.json or {}
        title = (data.get('title') or '').strip()
        description = (data.get('description') or '').strip()
        image_url = (data.get('image_url') or '').strip()
        price = data.get('price') or 0
        note = (data.get('note') or '').strip()
        if not title:
            conn.close()
            return jsonify({'error': 'Title required'}), 400
        try:
            c.execute('UPDATE products SET title=?, description=?, image_url=?, price=?, note=? WHERE id=?',
                      (title, description, image_url, price, note, prod_id))
            conn.commit()
            c.execute('SELECT * FROM products WHERE id = ?', (prod_id,))
            row = c.fetchone()
            conn.close()
            return jsonify(dict(row)), 200
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 500

    if request.method == 'DELETE':
        if not user or user.get('role') != 'admin':
            conn.close()
            return jsonify({'error': 'Unauthorized'}), 401
        try:
            c.execute('DELETE FROM products WHERE id = ?', (prod_id,))
            conn.commit()
            conn.close()
            return jsonify({'status': 'deleted'}), 200
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'ok': True}), 200

@app.route('/api/chat/send', methods=['POST'])
def send_chat_message():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json or {}
    text = (data.get('text') or '').strip()
    recipient_id = data.get('recipientId')

    if not text:
        return jsonify({'error': 'Message text required'}), 400

    conn = get_db()
    c = conn.cursor()

    if user['role'] == 'admin':
        if not recipient_id:
            conn.close()
            return jsonify({'error': 'Recipient required for admin'}), 400
        recipient = get_user_by_id(recipient_id)
        if not recipient:
            conn.close()
            return jsonify({'error': 'Recipient not found'}), 404
        target_id = recipient_id
    else:
        admin = get_admin_user()
        if not admin:
            conn.close()
            return jsonify({'error': 'No admin found'}), 500
        target_id = admin['id']

    c.execute('INSERT INTO messages (sender_id, recipient_id, text) VALUES (?, ?, ?)',
              (user['id'], target_id, text))
    conn.commit()
    message_id = c.lastrowid
    c.execute('SELECT * FROM messages WHERE id = ?', (message_id,))
    message = c.fetchone()
    conn.close()

    return jsonify({
        'id': message['id'],
        'sender_id': message['sender_id'],
        'recipient_id': message['recipient_id'],
        'text': message['text'],
        'created_at': message['created_at']
    }), 200

@app.route('/api/chat/conversations', methods=['GET'])
def get_chat_conversations():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db()
    c = conn.cursor()

    if user['role'] == 'admin':
        admin_id = user['id']
        c.execute('''
            SELECT u.id, u.email, COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS display_name, MAX(m.created_at) AS last_at,
                   (SELECT text
                    FROM messages
                    WHERE (sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id)
                    ORDER BY created_at DESC LIMIT 1) AS last_message
            FROM users u
            JOIN messages m ON (u.id = m.sender_id AND m.recipient_id = ?) OR (u.id = m.recipient_id AND m.sender_id = ?)
            WHERE u.role != 'admin'
            GROUP BY u.id, u.email, u.full_name
            ORDER BY last_at DESC
        ''', (admin_id, admin_id, admin_id, admin_id))
        rows = c.fetchall()
        convs = [
            {
                'id': row['id'],
                'email': row['email'],
                'displayName': row['display_name'],
                'lastMessage': row['last_message'],
                'lastAt': row['last_at']
            }
            for row in rows
        ]
    else:
        admin = get_admin_user()
        if not admin:
            conn.close()
            return jsonify({'error': 'No admin found'}), 500
        convs = [{
            'id': admin['id'],
            'email': admin['email'],
            'displayName': admin['email'],
            'lastMessage': None,
            'lastAt': None
        }]

    conn.close()
    return jsonify(convs), 200

@app.route('/api/chat/messages', methods=['GET'])
def get_chat_messages():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    user_id = user['id']
    partner_id = request.args.get('with', type=int)

    if user['role'] == 'admin':
        if not partner_id:
            return jsonify({'error': 'Partner required'}), 400
        partner = get_user_by_id(partner_id)
        if not partner:
            return jsonify({'error': 'Partner not found'}), 404
    else:
        admin = get_admin_user()
        if not admin:
            return jsonify({'error': 'No admin found'}), 500
        partner_id = admin['id']

    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT * FROM messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ORDER BY created_at ASC
    ''', (user_id, partner_id, partner_id, user_id))
    rows = c.fetchall()
    messages = [
        {
            'id': row['id'],
            'sender_id': row['sender_id'],
            'recipient_id': row['recipient_id'],
            'text': row['text'],
            'created_at': row['created_at']
        }
        for row in rows
    ]
    conn.close()
    return jsonify(messages), 200

if __name__ == '__main__':
    print('Server running on http://localhost:3000')
    app.run(host='localhost', port=3000, debug=True)
