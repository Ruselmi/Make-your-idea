from playwright.sync_api import sync_playwright
import os
import time
import subprocess
import atexit
import sys

def run():
    # Start Python HTTP Server
    print("Starting HTTP Server...")
    proc = subprocess.Popen([sys.executable, "-m", "http.server", "8080", "--directory", "dist"])

    def cleanup():
        print("Stopping HTTP Server...")
        proc.kill()

    atexit.register(cleanup)

    # Wait for server
    time.sleep(2)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Listen for console
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        url = "http://localhost:8080"
        print(f"Navigating to {url}")
        page.goto(url)

        # 1. Check Loader
        print("Checking for loader...")
        loader = page.locator("#initial-loader")
        if loader.is_visible():
             print("Loader found.")

        # 2. Wait
        print("Waiting 6 seconds...")
        time.sleep(6)

        # 3. Click Continue
        print("Clicking Continue...")
        btn = page.locator("#continue-btn")
        if btn.is_visible():
            btn.click()
        else:
            print("ERROR: Continue button not found!")

        time.sleep(2)

        # 4. Check App
        print("Checking for App content...")
        try:
             # Look for unique app text "MYC" or "Studio"
             # Since default is Studio, check for "Studio" pill or "Canvas Ready"
             page.wait_for_selector("text=MYC", timeout=5000)
             print("SUCCESS: App Loaded!")
             page.screenshot(path="verification_success.png")
        except:
             print("FAILURE: App did not render.")
             page.screenshot(path="verification_fail.png")

        browser.close()

if __name__ == "__main__":
    run()
