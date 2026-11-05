import subprocess
import time
import urllib.request
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

PORTAL_DIR = os.path.abspath("frontend/ANUNCIOS")
EVIDENCIAS_DIR = os.path.abspath("tests/usabilidad/evidencias")

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1366,768")
opts.add_argument("--hide-scrollbars")
opts.add_argument("--disable-gpu")

print(">>> INICIANDO PORTAL DE ANUNCIOS EN PUERTO 3001...")
p_portal = subprocess.Popen(["cmd.exe", "/c", "npx.cmd next start -p 3001"], cwd=PORTAL_DIR)

# Esperamos 5 segundos para que Next.js enlace el puerto 3001
time.sleep(5)

driver = None
try:
    driver = webdriver.Chrome(options=opts)
    
    # 1. Home con Touch Targets y Chips (CP-USAB-22)
    print("Capturando pantalla real: Portal Home...")
    driver.set_window_size(1366, 850)
    driver.get("http://localhost:3001")
    time.sleep(3)
    driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_home_chips_tactiles.png"))

    # 2. Vista Móvil (390x844) (CP-USAB-22)
    print("Capturando pantalla real: Móvil Touch Targets...")
    driver.set_window_size(390, 844)
    driver.get("http://localhost:3001")
    time.sleep(3)
    driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_movil_ergonomia.png"))

    # 3. Error 404 Personalizado (CP-USAB-16)
    print("Capturando pantalla real: 404 amigable...")
    driver.set_window_size(1280, 768)
    driver.get("http://localhost:3001/vacante-expirada-404")
    time.sleep(3)
    driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_404_not_found.png"))

    # 4. Formulario de Registro (CP-USAB-18)
    print("Capturando pantalla real: Registro accesible...")
    driver.get("http://localhost:3001/registro")
    time.sleep(3)
    driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_registro_contraste.png"))

    # 5. Perfil de Postulante con PerfilCompletenessBar (CP-USAB-05)
    print("Capturando pantalla real: Perfil con barra de completitud...")
    # Seteamos cookie de sesión para entrar al perfil
    driver.get("http://localhost:3001/login")
    driver.add_cookie({"name": "authToken", "value": "mock_postulante_jwt", "path": "/"})
    driver.get("http://localhost:3001/perfil")
    time.sleep(3)
    driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_perfil_completitud.png"))

finally:
    if driver:
        driver.quit()
    p_portal.terminate()
    try:
        p_portal.wait(timeout=3)
    except Exception:
        p_portal.kill()

print(">>> CAPTURAS DEL PORTAL FINALIZADAS CON EXITO.")
