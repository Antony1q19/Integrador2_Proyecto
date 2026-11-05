from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--window-size=1280,800')
driver = webdriver.Chrome(options=opts)
driver.get("data:text/html;charset=utf-8,<html><body style='background:#1F4E79;color:white;font-family:sans-serif;padding:50px'><h1>Prueba Selenium Headless</h1><p>Captura real del navegador</p></body></html>")
os.makedirs("tests/usabilidad/evidencias", exist_ok=True)
driver.save_screenshot("tests/usabilidad/evidencias/test_selenium.png")
driver.quit()
print("Prueba Selenium completada con exito:", os.path.exists("tests/usabilidad/evidencias/test_selenium.png"))
