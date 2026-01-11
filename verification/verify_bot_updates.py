from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        cwd = os.getcwd()
        ludo_path = f"file://{cwd}/ludo.html"
        index_path = f"file://{cwd}/index.html"

        # 1. Verify Ludo Offline Options
        print(f"Navigating to {ludo_path}")
        page.goto(ludo_path)

        page.click("button#mode-offline")
        page.wait_for_selector("#controls-offline")

        # Check Selectors
        if page.is_visible("#offline-player-count") and page.is_visible("#offline-mode-type"):
            print("Ludo Offline Selectors: Verified")
        else:
            print("Ludo Offline Selectors: Failed")

        page.screenshot(path="verification/ludo_offline_options.png")

        # 2. Verify Index (Uno/Chess) Offline Options
        print(f"Navigating to {index_path}")
        page.goto(index_path)

        page.click("button#mode-offline")

        # Check Chess Options
        if page.is_visible("button:has-text('VS BOT')"):
             print("Chess Offline Options: Verified")

        # Check Uno Options
        if page.is_visible("#uno-bot-count"):
             print("Uno Offline Options: Verified")

        page.screenshot(path="verification/index_offline_options.png")

        browser.close()

if __name__ == "__main__":
    run()
