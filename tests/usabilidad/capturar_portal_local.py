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

def esperar_servidor(url, timeout=35):
    inicio = time.time()
    while time.time() - inicio < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as res:
                if res.status in [200, 302, 307, 404]:
                    print(f"Servidor listo en {url} (status: {res.status})")
                    return True
        except Exception:
            pass
        time.sleep(1.5)
    return False

print(">>> INICIANDO SERVIDOR LOCAL DEL PORTAL DE POSTULACION (PUERTO 3001)...")
proc_portal = subprocess.Popen(
    ["cmd.exe", "/c", "npx.cmd next dev -p 3001"],
    cwd=PORTAL_DIR,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

driver = None
try:
    if esperar_servidor("http://localhost:3001"):
        driver = webdriver.Chrome(options=opts)
        
        # 1. Captura Home del Portal (CP-USAB-22 y CP-USAB-18: Touch targets, contraste)
        print("Capturando Home de Anuncios...")
        driver.set_window_size(1366, 800)
        driver.get("http://localhost:3001")
        time.sleep(4)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_home_anuncios.png"))
        
        # 2. Captura Móvil de Touch Targets (CP-USAB-22)
        print("Capturando versión móvil (375x812)...")
        driver.set_window_size(390, 844)
        driver.get("http://localhost:3001")
        time.sleep(3)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_movil_touch_targets.png"))
        
        # 3. Captura 404 Personalizado (CP-USAB-16)
        print("Capturando página 404 personalizada...")
        driver.set_window_size(1280, 768)
        driver.get("http://localhost:3001/ruta-inexistente-o-vacante-expirada")
        time.sleep(3)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_404_not_found.png"))
        
        # 4. Captura Registro con contraste WCAG AAA
        print("Capturando formulario de registro...")
        driver.get("http://localhost:3001/registro")
        time.sleep(3)
        driver.save_screenshot(os.path.join(EVIDENCIAS_DIR, "captura_real_portal_registro.png"))
    else:
        print("No se pudo iniciar el portal en el tiempo límite.")
finally:
    if driver:
        driver.quit()
    proc_portal.terminate()
    try:
        proc_portal.wait(timeout=3)
    except Exception:
        proc_portal.kill()

print(">>> PROCESO DE CAPTURA DEL PORTAL FINALIZADO.")
