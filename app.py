from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from datetime import datetime
import os
import math
import socket
import re
import random

SUPABASE_URL = "https://xenzdtsehhmfkkhkemcl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbnpkdHNlaGhtZmtraGtlbWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDM4NjcsImV4cCI6MjA5NjM3OTg2N30.D47wx3Izukwkh_2MDOYu5o9hy0usFOPxGwiMUvYTXDU"

app = Flask(__name__)
app.secret_key = "mpos-secret-key-2024"
CORS(app)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================
# YOUR ADMIN EMAIL - FILLED WITH YOUR EMAIL
# ============================================================

YOUR_ADMIN_EMAIL = "rosiewanjiru47@gmail.com"
YOUR_ADMIN_PASSWORD = "admin123"

def create_or_update_admin():
    """Create or update admin user with YOUR email"""
    try:
        response = supabase.table('users').select('*').eq('email', YOUR_ADMIN_EMAIL).execute()
        
        if response.data:
            admin = response.data[0]
            if admin.get('password_hash') != YOUR_ADMIN_PASSWORD or not admin.get('is_active'):
                supabase.table('users').update({
                    'password_hash': YOUR_ADMIN_PASSWORD,
                    'is_active': True,
                    'role': 'admin'
                }).eq('user_id', admin['user_id']).execute()
                print(f"✅ Admin user updated with your email: {YOUR_ADMIN_EMAIL}")
            else:
                print(f"✅ Admin user already exists with email: {YOUR_ADMIN_EMAIL}")
        else:
            old_admin = supabase.table('users').select('*').eq('username', 'admin').execute()
            if old_admin.data:
                admin = old_admin.data[0]
                supabase.table('users').update({
                    'email': YOUR_ADMIN_EMAIL,
                    'password_hash': YOUR_ADMIN_PASSWORD,
                    'is_active': True,
                    'role': 'admin'
                }).eq('user_id', admin['user_id']).execute()
                print(f"✅ Updated existing admin with your email: {YOUR_ADMIN_EMAIL}")
            else:
                email_check = supabase.table('users').select('*').eq('email', YOUR_ADMIN_EMAIL).execute()
                if email_check.data:
                    user = email_check.data[0]
                    supabase.table('users').update({
                        'password_hash': YOUR_ADMIN_PASSWORD,
                        'is_active': True,
                        'role': 'admin',
                        'username': 'rosie'
                    }).eq('user_id', user['user_id']).execute()
                    print(f"✅ Updated existing user to admin: {YOUR_ADMIN_EMAIL}")
                else:
                    supabase.table('users').insert({
                        'email': YOUR_ADMIN_EMAIL,
                        'username': 'rosie',
                        'full_name': 'Rosie Wanjiru',
                        'role': 'admin',
                        'password_hash': YOUR_ADMIN_PASSWORD,
                        'is_active': True,
                        'created_at': datetime.now().isoformat(),
                        'phone': '0712345678'
                    }).execute()
                    print(f"✅ New admin user created with your email: {YOUR_ADMIN_EMAIL}")
                
        print("\n" + "="*50)
        print("🔑 YOUR ADMIN LOGIN CREDENTIALS:")
        print(f"   Email: {YOUR_ADMIN_EMAIL}")
        print(f"   Password: {YOUR_ADMIN_PASSWORD}")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"⚠️ Error creating admin: {e}")
        print("\n⚠️ Please run this SQL in Supabase SQL Editor:")
        print(f"INSERT INTO users (email, username, full_name, role, password_hash, is_active, created_at, phone)")
        print(f"VALUES ('{YOUR_ADMIN_EMAIL}', 'rosie', 'Rosie Wanjiru', 'admin', '{YOUR_ADMIN_PASSWORD}', true, NOW(), '0712345678');")

# Run admin creation
create_or_update_admin()

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def calculate_eta(items):
    """Calculate estimated time for order completion"""
    base_time = 0
    for item in items:
        if item.get('category') == 'food':
            base_time += 8
        else:
            base_time += 3
    return max(base_time, 5)

def get_menu_items():
    """Get all available menu items"""
    try:
        response = supabase.table('menu_items').select('*').eq('is_available', True).execute()
        return response.data
    except Exception as e:
        print(f"Error getting menu: {e}")
        return []

def get_all_active_orders():
    """Get all active orders with details"""
    try:
        response = supabase.table('orders')\
            .select('*, order_items(*, menu_items(*)), transactions(*)')\
            .neq('status', 'billed')\
            .execute()
        
        for order in response.data:
            waiter = supabase.table('users').select('full_name').eq('user_id', order.get('waiter_id')).execute()
            order['waiter_name'] = waiter.data[0]['full_name'] if waiter.data else 'Unknown'
            
            if order['order_items']:
                items_for_eta = []
                for item in order['order_items']:
                    if item.get('menu_items'):
                        items_for_eta.append({
                            'category': item['menu_items'].get('category', 'food')
                        })
                order['eta'] = calculate_eta(items_for_eta)
                created_at = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
                minutes_passed = (datetime.now() - created_at).total_seconds() / 60
                remaining = max(0, order['eta'] - minutes_passed)
                order['remaining_minutes'] = int(remaining)
                order['eta_display'] = f"{int(remaining)} min" if remaining > 0 else "Ready now"
            else:
                order['eta'] = 5
                order['remaining_minutes'] = 5
                order['eta_display'] = "5 min"
                
        return response.data
    except Exception as e:
        print(f"Error getting active orders: {e}")
        return []

# ============================================================
# ROUTES
# ============================================================

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/signup')
def signup_page():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('signup.html')

@app.route('/forgot-password')
def forgot_password_page():
    return render_template('forgot_password.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('dashboard.html', 
                         role=session.get('role'),
                         username=session.get('username'),
                         full_name=session.get('full_name'),
                         user_id=session.get('user_id'),
                         email=session.get('email'))

# ============================================================
# API ROUTES
# ============================================================

@app.route('/api/login', methods=['POST'])
def api_login():
    """Login with email and password"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    
    print(f"🔑 Login attempt with email: {email}")
    
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password required'})
    
    if not validate_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format'})
    
    try:
        response = supabase.table('users').select('*').eq('email', email).execute()
        
        if not response.data:
            response = supabase.table('users').select('*').eq('username', email).execute()
            if response.data:
                user = response.data[0]
                if not user.get('email'):
                    supabase.table('users').update({
                        'email': f"{user['username']}@zurisands.com"
                    }).eq('user_id', user['user_id']).execute()
                    response = supabase.table('users').select('*').eq('user_id', user['user_id']).execute()
        
        if not response.data or len(response.data) == 0:
            print(f"❌ User not found: {email}")
            return jsonify({'success': False, 'message': 'No account found with this email. Please sign up.'})
        
        user = response.data[0]
        db_password = user.get('password_hash', '')
        
        print(f"👤 Found user: {user.get('full_name')}")
        print(f"📧 Email: {user.get('email')}")
        print(f"✅ Active: {user.get('is_active')}")
        
        if not user.get('is_active', False):
            return jsonify({'success': False, 'message': 'Account pending approval. Please wait for admin.'})
        
        if db_password == 'pending' or not db_password:
            return jsonify({'success': False, 'message': 'Account not fully set up. Contact admin.'})
        
        if password == db_password:
            session['user_id'] = user['user_id']
            session['email'] = user.get('email', email)
            session['username'] = user.get('username', 'admin')
            session['full_name'] = user['full_name']
            session['role'] = user['role']
            
            print(f"✅ Login successful: {email}")
            return jsonify({
                'success': True, 
                'role': user['role'],
                'full_name': user['full_name']
            })
        else:
            print(f"❌ Password mismatch")
            return jsonify({'success': False, 'message': 'Invalid password'})
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'})

@app.route('/api/logout')
def api_logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/signup-request', methods=['POST'])
def api_signup_request():
    """Sign up request API endpoint - using email and phone (NO PASSWORD)"""
    data = request.get_json()
    full_name = data.get('full_name')
    email = data.get('email', '').strip().lower()
    username = data.get('username')
    role = data.get('role')
    phone = data.get('phone', '').strip()
    
    print(f"📝 Signup request: {email} - {full_name} - {role} - Phone: {phone}")
    
    if not full_name or not email or not username or not role or not phone:
        return jsonify({'success': False, 'message': 'All fields are required'})
    
    if not validate_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format'})
    
    if len(phone) < 10:
        return jsonify({'success': False, 'message': 'Please enter a valid phone number'})
    
    try:
        existing_email = supabase.table('users').select('*').eq('email', email).execute()
        if existing_email.data:
            return jsonify({'success': False, 'message': 'Email already registered'})
        
        existing_username = supabase.table('users').select('*').eq('username', username).execute()
        if existing_username.data:
            return jsonify({'success': False, 'message': 'Username already taken'})
        
        existing_phone = supabase.table('users').select('*').eq('phone', phone).execute()
        if existing_phone.data:
            return jsonify({'success': False, 'message': 'Phone number already registered'})
        
        supabase.table('users').insert({
            'email': email,
            'username': username,
            'full_name': full_name,
            'role': role,
            'phone': phone,
            'password_hash': 'pending',
            'is_active': False,
            'created_at': datetime.now().isoformat()
        }).execute()
        
        print(f"✅ User {email} created successfully with phone: {phone}")
        return jsonify({'success': True, 'message': 'Request submitted. Admin will review and assign password.'})
    except Exception as e:
        print(f"❌ Signup error: {e}")
        return jsonify({'success': False, 'message': str(e)})

# ============================================================
# FORGOT PASSWORD - FIXED (NO updated_at)
# ============================================================

@app.route('/api/forgot-password', methods=['POST'])
def api_forgot_password():
    """Handle forgot password - send verification code"""
    data = request.get_json()
    phone = data.get('phone', '').strip()
    
    print(f"📱 Password reset request for phone: {phone}")
    
    if not phone:
        return jsonify({'success': False, 'message': 'Phone number required'})
    
    try:
        response = supabase.table('users').select('*').eq('phone', phone).execute()
        
        if not response.data:
            return jsonify({'success': False, 'message': 'Phone number not found. Please contact admin.'})
        
        verification_code = str(random.randint(1000, 9999))
        
        session['reset_phone'] = phone
        session['reset_code'] = verification_code
        session['reset_code_expiry'] = datetime.now().timestamp() + 300
        
        print(f"📱 Verification Code for {phone}: {verification_code}")
        
        return jsonify({
            'success': True, 
            'message': 'Verification code sent to your phone',
            'code': verification_code
        })
        
    except Exception as e:
        print(f"❌ Forgot password error: {e}")
        return jsonify({'success': False, 'message': str(e)})

# ============================================================
# RESET PASSWORD - FIXED (NO updated_at)
# ============================================================

@app.route('/api/reset-password', methods=['POST'])
def api_reset_password():
    """Verify code and reset password (Public endpoint)"""
    data = request.get_json()
    code = data.get('code', '').strip()
    new_password = data.get('new_password', '').strip()
    
    print(f"🔑 Password reset attempt with code: {code}")
    
    if not code or not new_password:
        return jsonify({'success': False, 'message': 'Code and new password required'})
    
    if len(new_password) < 4:
        return jsonify({'success': False, 'message': 'Password must be at least 4 characters'})
    
    try:
        if 'reset_phone' not in session:
            return jsonify({'success': False, 'message': 'Session expired. Please request a new code.'})
        
        if datetime.now().timestamp() > session.get('reset_code_expiry', 0):
            return jsonify({'success': False, 'message': 'Code expired. Please request a new one.'})
        
        if code != session.get('reset_code'):
            return jsonify({'success': False, 'message': 'Invalid verification code'})
        
        phone = session['reset_phone']
        
        supabase.table('users').update({
            'password_hash': new_password
        }).eq('phone', phone).execute()
        
        session.pop('reset_phone', None)
        session.pop('reset_code', None)
        session.pop('reset_code_expiry', None)
        
        print(f"✅ Password reset successful for phone: {phone}")
        
        return jsonify({
            'success': True, 
            'message': 'Password reset successfully! You can now login.'
        })
        
    except Exception as e:
        print(f"❌ Reset password error: {e}")
        return jsonify({'success': False, 'message': str(e)})

# ============================================================
# USER MANAGEMENT - FIXED with all endpoints
# ============================================================

@app.route('/api/pending-users', methods=['GET'])
def api_pending_users():
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'})
    
    try:
        response = supabase.table('users').select('*').eq('is_active', False).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/approve-user', methods=['POST'])
def api_approve_user():
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'})
    
    data = request.get_json()
    user_id = data.get('user_id')
    password = data.get('password', 'waiter123')
    
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID required'})
    
    try:
        result = supabase.table('users').update({
            'password_hash': password,
            'is_active': True
        }).eq('user_id', user_id).execute()
        
        if result.data:
            return jsonify({'success': True, 'message': 'User approved successfully'})
        else:
            return jsonify({'success': False, 'message': 'User not found'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/all-users', methods=['GET'])
def api_all_users():
    """Get all users (admin only) - FIXED"""
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'})
    
    try:
        response = supabase.table('users').select('*').order('created_at', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/delete-user', methods=['DELETE'])
def api_delete_user():
    """Delete a user (admin only) - FIXED"""
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'})
    
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID required'})
    
    try:
        # First delete all orders created by this user (foreign key constraint)
        supabase.table('orders').delete().eq('waiter_id', user_id).execute()
        
        # Then delete the user
        supabase.table('users').delete().eq('user_id', user_id).execute()
        return jsonify({'success': True, 'message': 'User deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/reset-password-admin', methods=['POST'])
def api_reset_password_admin():
    """Reset user password (admin only) - FIXED"""
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'})
    
    data = request.get_json()
    user_id = data.get('user_id')
    password = data.get('password')
    
    if not user_id or not password:
        return jsonify({'success': False, 'message': 'User ID and password required'})
    
    if len(password) < 4:
        return jsonify({'success': False, 'message': 'Password must be at least 4 characters'})
    
    try:
        supabase.table('users').update({
            'password_hash': password
        }).eq('user_id', user_id).execute()
        return jsonify({'success': True, 'message': 'Password reset successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============================================================
# MENU ROUTES
# ============================================================

@app.route('/api/menu')
def api_menu():
    menu = get_menu_items()
    return jsonify(menu)

@app.route('/api/add-menu-item', methods=['POST'])
def api_add_menu_item():
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'})
    
    data = request.get_json()
    name = data.get('name')
    price = data.get('price')
    category = data.get('category')
    description = data.get('description', '')
    
    if not name or not price or not category:
        return jsonify({'success': False, 'message': 'Name, price and category are required'})
    
    try:
        supabase.table('menu_items').insert({
            'name': name,
            'description': description,
            'price': float(price),
            'category': category,
            'is_available': True
        }).execute()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/delete-menu-item', methods=['DELETE'])
def api_delete_menu_item():
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'})
    
    data = request.get_json()
    item_id = data.get('item_id')
    
    if not item_id:
        return jsonify({'success': False, 'message': 'Item ID required'})
    
    try:
        check = supabase.table('menu_items').select('*').eq('item_id', item_id).execute()
        if not check.data:
            return jsonify({'success': False, 'message': 'Item not found'})
        
        supabase.table('menu_items').delete().eq('item_id', item_id).execute()
        return jsonify({'success': True, 'message': 'Item deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ============================================================
# ORDER ROUTES
# ============================================================

@app.route('/api/orders', methods=['POST'])
def api_create_order():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    
    data = request.get_json()
    items = data.get('items', [])
    table_number = data.get('table_number')
    room_number = data.get('room_number')
    total_amount = data.get('total_amount')
    
    if not items:
        return jsonify({'success': False, 'message': 'No items in order'})
    
    if not table_number and not room_number:
        return jsonify({'success': False, 'message': 'Table or Room number required'})
    
    order_number = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    menu_items = get_menu_items()
    menu_dict = {item['item_id']: item for item in menu_items}
    
    order_items_with_cats = []
    for item in items:
        menu_item = menu_dict.get(item['menu_item_id'], {})
        order_items_with_cats.append({
            'category': menu_item.get('category', 'food'),
            'quantity': item['quantity']
        })
    
    eta_minutes = calculate_eta(order_items_with_cats)
    
    try:
        order_response = supabase.table('orders').insert({
            'order_number': order_number,
            'waiter_id': session['user_id'],
            'table_number': table_number,
            'room_number': room_number,
            'total_amount': float(total_amount),
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }).execute()
        
        order = order_response.data[0]
        
        for item in items:
            supabase.table('order_items').insert({
                'order_id': order['order_id'],
                'menu_item_id': item['menu_item_id'],
                'quantity': item['quantity'],
                'unit_price': float(item['price']),
                'special_instructions': item.get('instructions', '')
            }).execute()
        
        supabase.table('transactions').insert({
            'order_id': order['order_id'],
            'total_amount': float(total_amount),
            'payment_status': 'unpaid'
        }).execute()
        
        return jsonify({
            'success': True, 
            'order_id': order['order_id'],
            'eta_minutes': eta_minutes,
            'message': f'Order submitted! Estimated wait time: {eta_minutes} minutes'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/all-active-orders')
def api_all_active_orders():
    orders = get_all_active_orders()
    return jsonify(orders)

@app.route('/api/kitchen-orders')
def api_kitchen_orders():
    try:
        response = supabase.table('orders')\
            .select('*, order_items(*, menu_items(*))')\
            .neq('status', 'billed')\
            .execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/update-order-status', methods=['POST'])
def api_update_order_status():
    data = request.get_json()
    order_id = data.get('order_id')
    status = data.get('status')
    
    if not order_id or not status:
        return jsonify({'success': False, 'message': 'Order ID and status required'})
    
    try:
        supabase.table('orders').update({
            'status': status,
            'updated_at': datetime.now().isoformat()
        }).eq('order_id', order_id).execute()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/all-orders')
def api_all_orders():
    if session.get('role') not in ['cashier', 'admin']:
        return jsonify({'success': False, 'message': 'Access denied'})
    
    try:
        response = supabase.table('orders').select('*, order_items(*, menu_items(*)), transactions(*)').execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/mark-paid', methods=['POST'])
def api_mark_paid():
    if session.get('role') not in ['cashier', 'admin']:
        return jsonify({'success': False, 'message': 'Access denied'})
    
    data = request.get_json()
    order_id = data.get('order_id')
    
    if not order_id:
        return jsonify({'success': False, 'message': 'Order ID required'})
    
    try:
        supabase.table('transactions').update({
            'payment_status': 'paid',
            'paid_at': datetime.now().isoformat(),
            'cashier_id': session['user_id']
        }).eq('order_id', order_id).execute()
        
        supabase.table('orders').update({
            'status': 'billed'
        }).eq('order_id', order_id).execute()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============================================================
# RUN APP
# ============================================================

if __name__ == '__main__':
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print("\n" + "="*50)
    print("🏨 MPOS HOTEL SYSTEM IS RUNNING!")
    print("="*50)
    print(f"📍 Access from laptop: http://127.0.0.1:5000")
    print(f"📍 Access from phone: http://{local_ip}:5000")
    print("="*50)
    print("\n🔑 YOUR ADMIN LOGIN:")
    print(f"   Email: rosiewanjiru47@gmail.com")
    print(f"   Password: admin123")
    print("="*50)
    print("\n📝 New users can sign up at: http://127.0.0.1:5000/signup")
    print("\n🔑 Forgot Password: http://127.0.0.1:5000/forgot-password")
    print("="*50 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)