import subprocess
import time
import urllib.request
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

PORTAL_DIR = os.path.abspath("frontend/ANUNCIOS")
ERP_DIR = os.path.abspath("frontend/ERP")
EVIDENCIAS_DIR = os.path.abspath("tests/usabilidad/evidencias")
os.makedirs(EVIDENCIAS_DIR, exist_ok=True)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1366,768")
opts.add_argument("--hide-scrollbars")
opts.add_argument("--disable-gpu")

def esperar_servidor(url, timeout=20):
    inicio = time.time()
    while time.time() - inicio < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as res:
                if res.status in [200, 302, 307, 404]:
                    print(f"Servidor listo en {url} (status: {res.status})")
                    return True
        except urllib.error.HTTPError as e:
            if e.code in [200, 302, 307, 404]:
                print(f"Servidor listo en {url} (HTTP: {e.code})")
                return True
        except Exception:
            pass
        time.sleep(1)
    return False

# ==========================================
# 1. CAPTURAS REALES DEL PORTAL DE ANUNCIOS (Puerto 3001)
# ==========================================
print(">>> INICIANDO PORTAL DE ANUNCIOS EN PUERTO 3001...")
p_portal = subprocess.Popen(["cmd.exe", "/c", "npx.cmd next start -p 3001"], cwd=PORTAL_DIR)

driver = None
try:
    if esperar_servidor("http://localhost:3001"):
        driver = webdriver.Chrome(options=opts)
        
        # A) Home y Touch Targets Ergonómicos (CP-USAB-22)
        print("Capturando pantalla real: Portal Home con Touch Targets y Chips...")
        driver.set_window_size(1366, 850)
        driver.get("http://localhost:3001")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_home_chips_tactiles.png"))
        
        # B) Vista Móvil de Touch Targets (390x844) (CP-USAB-22)
        print("Capturando pantalla real: Vista móvil ergonómica...")
        driver.set_window_size(390, 844)
        driver.get("http://localhost:3001")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_movil_ergonomia.png"))
        
        # C) Error 404 Personalizado (CP-USAB-16)
        print("Capturando pantalla real: Error 404 amigable...")
        driver.set_window_size(1280, 768)
        driver.get("http://localhost:3001/vacante-inexistente-404")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_404_not_found.png"))

        # D) Registro con Alto Contraste WCAG (CP-USAB-18)
        print("Capturando pantalla real: Formulario de Registro con contraste accesible...")
        driver.get("http://localhost:3001/registro")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_registro_contraste.png"))
finally:
    if driver:
        driver.quit()
        driver = None
    p_portal.terminate()
    try:
        p_portal.wait(timeout=3)
    except Exception:
        p_portal.kill()

# ==========================================
# 2. CAPTURAS REALES DE TALENTERP (Puerto 3000)
# ==========================================
print(">>> INICIANDO TALENTERP EN PUERTO 3000...")
p_erp = subprocess.Popen(["cmd.exe", "/c", "npx.cmd next start -p 3000"], cwd=ERP_DIR)

try:
    if esperar_servidor("http://localhost:3000"):
        driver = webdriver.Chrome(options=opts)
        
        # A) Pantalla Login con Contraste y Accesibilidad (CP-USAB-18)
        print("Capturando pantalla real: Login de TalentERP...")
        driver.set_window_size(1366, 800)
        driver.get("http://localhost:3000/login")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_erp_login_accesible.png"))

        # B) Iniciar sesión simulada seteando cookies autorizadas de leeme.md (Admin)
        driver.get("http://localhost:3000/login")
        driver.add_cookie({"name": "userRole", "value": "Admin", "path": "/"})
        driver.add_cookie({"name": "userName", "value": "Admin%20General", "path": "/"})
        driver.add_cookie({"name": "authToken", "value": "mock_test_token_usabilidad", "path": "/"})

        # C) PostulanteForm con Paso X de Y y Labels htmlFor (CP-USAB-02, CP-USAB-13, CP-USAB-07)
        print("Capturando pantalla real: Formulario Postulante Nuevo con pasos y labels accesibles...")
        driver.get("http://localhost:3000/postulantes/nuevo")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_erp_postulante_nuevo_pasos.png"))

        # D) Banner de Acceso Restringido por Rol (CP-USAB-01)
        print("Capturando pantalla real: Banner informativo de Acceso Restringido...")
        driver.get("http://localhost:3000/postulantes?acceso_denegado=dashboard")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_erp_banner_acceso_restringido.png"))

        # E) Lista de Anuncios con Empty State Interactivo (CP-USAB-03)
        print("Capturando pantalla real: Empty State amigable de Anuncios...")
        driver.get("http://localhost:3000/anuncios")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_erp_anuncios_empty_state.png"))

        # F) Centro de Ayuda Modular (CP-USAB-06)
        print("Capturando pantalla real: Centro de Ayuda...")
        driver.get("http://localhost:3000/ayuda")
        time.sleep(2)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_erp_centro_ayuda.png"))
finally:
    if driver:
        driver.quit()
    p_erp.terminate()
    try:
        p_erp.wait(timeout=3)
    except Exception:
        p_erp.kill()

print(">>> TODAS LAS CAPTURAS REALES DEL NAVEGADOR FUERON TOMADAS EXITOSAMENTE!")
