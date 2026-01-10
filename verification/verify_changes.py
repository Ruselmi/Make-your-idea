from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Determine the absolute path to the HTML files
        cwd = os.getcwd()
        ludo_path = f"file://{cwd}/ludo.html"
        index_path = f"file://{cwd}/index.html"

        print(f"Navigating to {ludo_path}")
        page.goto(ludo_path)

        # Verify Ludo Offline Mode Button
        try:
            page.click("button#mode-offline")
            page.wait_for_timeout(500)
            page.screenshot(path="verification/ludo_offline.png")
            print("Screenshot taken: verification/ludo_offline.png")
        except Exception as e:
            print(f"Error checking Ludo: {e}")

        # Verify Index Offline Mode & Options
        print(f"Navigating to {index_path}")
        page.goto(index_path)
        try:
            page.click("button#mode-offline")
            page.wait_for_timeout(500)

            # Check Uno Duel option existence
            page.click("button#btn-start-game", timeout=1000) # Should be hidden or show lobby
            # Actually, to check the select option, we might need to be "Host" or just inspect the DOM
            # But the offline mode button click shows the UI changed.

            page.screenshot(path="verification/index_offline.png")
            print("Screenshot taken: verification/index_offline.png")
        except Exception as e:
            print(f"Error checking Index: {e}")

        browser.close()

if __name__ == "__main__":
    run()
