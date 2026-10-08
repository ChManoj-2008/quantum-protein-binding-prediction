import urllib.request
import json
import sqlite3
import random

API = 'http://localhost:8000'

def post(url, data, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(
        API + url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json', **headers}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def test_full_auth_flow():
    print("=== 1. Test Demo User Login ===")
    status, res = post('/api/auth/login', {'email': 'demo@qbindai.com', 'password': 'QuantumAI@2026'})
    assert status == 200, f"Demo login failed: {status} {res}"
    print("Demo Login: SUCCESS - User:", res['user']['email'])
    demo_token = res['token']

    print("\n=== 2. Test Get Me with Token ===")
    req_me = urllib.request.Request(f"{API}/api/auth/me", headers={'Authorization': f'Bearer {demo_token}'})
    with urllib.request.urlopen(req_me) as resp:
        me = json.loads(resp.read().decode('utf-8'))
    assert me['email'] == 'demo@qbindai.com'
    print("Session validation /api/auth/me: SUCCESS - Name:", me['full_name'], "Verified:", me['is_verified'])

    print("\n=== 3. Test Register New User ===")
    test_email = f"user_{random.randint(10000, 99999)}@biotech-research.edu"
    test_password = "SecurePassword@2026"
    status, res = post('/api/auth/register', {
        'full_name': 'Dr. Barbara McClintock',
        'email': test_email,
        'password': test_password
    })
    assert status == 200, f"Register failed: {status} {res}"
    print(f"Register: SUCCESS - Created {test_email}")

    print("\n=== 4. Test Login Before Email Verification (Should be 403 Forbidden) ===")
    status, res = post('/api/auth/login', {'email': test_email, 'password': test_password})
    assert status == 403, f"Expected 403 for unverified user, got {status}"
    print("Unverified user blocked: SUCCESS (403 Forbidden)")

    print("\n=== 5. Test Email Verification ===")
    conn = sqlite3.connect('backend/qbindai_auth.db')
    cursor = conn.cursor()
    cursor.execute(
        "SELECT code FROM verification_codes WHERE email=? AND purpose='email_verification' ORDER BY created_at DESC LIMIT 1",
        (test_email,)
    )
    code_row = cursor.fetchone()
    assert code_row is not None, "Verification code not found in DB"
    verify_code = code_row[0]
    print(f"Retrieved verification code from DB: {verify_code}")

    status, res = post('/api/auth/verify-email', {'email': test_email, 'code': verify_code})
    assert status == 200, f"Email verification failed: {status} {res}"
    print("Verify Email: SUCCESS -", res['message'])

    print("\n=== 6. Test Login After Email Verification ===")
    status, res = post('/api/auth/login', {'email': test_email, 'password': test_password})
    assert status == 200, f"Login after verification failed: {status} {res}"
    assert res['user']['is_verified'] is True
    print("Login After Verification: SUCCESS - Token issued!")
    new_user_token = res['token']

    print("\n=== 7. Test Forgot Password Request ===")
    status, res = post('/api/auth/forgot-password', {'email': test_email})
    assert status == 200, f"Forgot password failed: {status} {res}"
    print("Forgot Password request: SUCCESS -", res['message'])

    cursor.execute(
        "SELECT code FROM verification_codes WHERE email=? AND purpose='password_reset' ORDER BY created_at DESC LIMIT 1",
        (test_email,)
    )
    reset_code = cursor.fetchone()[0]
    print(f"Retrieved reset code from DB: {reset_code}")

    print("\n=== 8. Test Reset Password with New Password ===")
    new_password = "UpdatedSecurePassword@2026!"
    status, res = post('/api/auth/reset-password', {
        'email': test_email,
        'code': reset_code,
        'new_password': new_password
    })
    assert status == 200, f"Reset password failed: {status} {res}"
    print("Reset Password: SUCCESS -", res['message'])

    print("\n=== 9. Test Login With Old Password (Must Fail with 401) ===")
    status, res = post('/api/auth/login', {'email': test_email, 'password': test_password})
    assert status == 401, f"Expected 401 for old password, got {status}"
    print("Old password rejected: SUCCESS (401 Unauthorized)")

    print("\n=== 10. Test Login With New Password ===")
    status, res = post('/api/auth/login', {'email': test_email, 'password': new_password})
    assert status == 200, f"Login with new password failed: {status} {res}"
    print("New password accepted: SUCCESS - Token issued!")
    session_to_logout = res['token']

    print("\n=== 11. Test Logout Session Invalidation ===")
    status, res = post('/api/auth/logout', {}, headers={'Authorization': f'Bearer {session_to_logout}'})
    assert status == 200, f"Logout failed: {status} {res}"
    print("Logout: SUCCESS - Session invalidated")

    try:
        req_invalid = urllib.request.Request(f"{API}/api/auth/me", headers={'Authorization': f'Bearer {session_to_logout}'})
        urllib.request.urlopen(req_invalid)
        assert False, "Token should be invalid after logout!"
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("Logged out token rejected: SUCCESS (401 Unauthorized)")

    conn.close()
    print("\n==========================================")
    print("🎉 ALL 11 AUTHENTICATION TESTS PASSED!")
    print("==========================================")

if __name__ == '__main__':
    test_full_auth_flow()
