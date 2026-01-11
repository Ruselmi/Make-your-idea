from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        cwd = os.getcwd()
        ludo_path = f"file://{cwd}/ludo.html"
        index_path = f"file://{cwd}/index.html"

        # 1. Verify Ludo Info Modal
        print(f"Navigating to {ludo_path}")
        page.goto(ludo_path)

        # Click "Cara Main" on Home
        page.click("button:has-text('Cara Main')")
        page.wait_for_selector("#modal-info")

        # Check text content
        content = page.text_content("#modal-info")
        if "Mulai" in content and "Tabrak" in content:
            print("Ludo Info Modal: Verified")
        else:
            print("Ludo Info Modal: Failed text check")

        page.screenshot(path="verification/ludo_info_modal.png")
        page.click("#modal-info button") # Close it

        # Start Offline Game and check auto-show
        page.click("button#mode-offline")
        page.click("button:has-text('MAIN 1 HP')")
        page.wait_for_timeout(500)

        # Check if modal is visible again (auto-show)
        if page.is_visible("#modal-info"):
             print("Ludo Auto-Show Info: Verified")
        else:
             print("Ludo Auto-Show Info: Failed")

        page.screenshot(path="verification/ludo_offline_game_info.png")


        # 2. Verify Index (Uno) Info Modal
        print(f"Navigating to {index_path}")
        page.goto(index_path)

        # Setup host game to test start logic
        page.click("button#mode-offline")
        page.click("button:has-text('MAIN OFFLINE')") # Create offline lobby

        # Wait for lobby
        page.wait_for_selector("#lobby-panel")

        # Select Uno Flip
        page.select_option("#game-mode-select", "UNO_FLIP")

        # Start Game
        page.click("button#btn-start-game")

        # Wait for game screen and modal
        page.wait_for_selector("#screen-game")
        page.wait_for_timeout(1000) # Wait for fade in

        if page.is_visible("#modal-info"):
            title = page.text_content("#info-title")
            content = page.text_content("#info-content")
            if "Aturan UNO_FLIP" in title or "Aturan FLIP" in title:
                 print("Uno Info Modal: Title Verified")
            if "FLIP MODE" in content:
                 print("Uno Info Modal: Content Verified")
            page.screenshot(path="verification/uno_info_modal.png")
        else:
            print("Uno Info Modal: Not Visible")

        browser.close()

if __name__ == "__main__":
    run()
