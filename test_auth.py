import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8000"

def print_result(name, success, details=""):
    status = "OK" if success else "FALLA"
    color = "\033[92m" if success else "\033[91m"
    reset = "\033[0m"
    print(f"[{color}{status}{reset}] {name} {details}")
    if not success:
        sys.exit(1)

def request_json(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None and not isinstance(data, (bytes, bytearray)):
        if "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"
        
        if headers["Content-Type"] == "application/x-www-form-urlencoded":
            data = urllib.parse.urlencode(data).encode('utf-8')
        else:
            data = json.dumps(data).encode('utf-8')

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            return response.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        return e.code, json.loads(body) if body else None
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return 500, None

def main():
    print("Iniciando pruebas de API...")
    import urllib.parse
    import time
    
    timestamp = int(time.time())
    email = f"test_script_{timestamp}@example.com"
    test_user = {
        "email": email,
        "password": "Password123!",
        "nombres": "Test API",
        "apellidos": "Usuario",
        "documentoTipo": "DNI",
        "documentoNumero": f"12345{timestamp % 1000:03d}",
        "aceptaTratamientoDatos": True
    }
    
    # 1. Registro
    status, body = request_json(f"{BASE_URL}/api/v1/publico/auth/registro", method="POST", data=test_user)
    print_result("Registro", status in (201, 400), f"Status: {status} Body: {body}") 

    # 2. Login
    login_data = {
        "email": email,
        "password": test_user["password"]
    }
    status, body = request_json(
        f"{BASE_URL}/api/v1/publico/auth/login", 
        method="POST", 
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    print_result("Login", status == 200, f"Status: {status} Body: {body}")
    
    token = body.get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Obtener perfil
    status, body = request_json(f"{BASE_URL}/api/v1/publico/auth/me", method="GET", headers=headers)
    print_result("Obtener perfil (me)", status == 200, f"Status: {status}")
    
    # 4. Separación de tokens (intentar usar en ERP, assuming /api/v1/empresas exists and needs erp token)
    # We will just verify the token is for 'anuncios'
    import base64
    payload = token.split(".")[1]
    payload += "=" * ((4 - len(payload) % 4) % 4)
    decoded = json.loads(base64.b64decode(payload).decode('utf-8'))
    print_result("Verificar AUD del token", decoded.get("aud") == "anuncios", f"AUD: {decoded.get('aud')}")

    # 5. Recuperación de contraseña
    recovery_data = {"email": test_user["email"]}
    status, body = request_json(f"{BASE_URL}/api/v1/publico/auth/recuperar-password", method="POST", data=recovery_data)
    print_result("Recuperación de contraseña", status == 200, f"Status: {status}")

    print("\n¡Todas las pruebas pasaron correctamente!")

if __name__ == "__main__":
    main()
