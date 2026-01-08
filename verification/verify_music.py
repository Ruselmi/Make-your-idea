from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Verify index.html Music Widget
        index_path = f"file://{os.path.abspath('index.html')}"
        print(f"Navigating to {index_path}")
        page.goto(index_path)

        # Wait for Music Widget
        page.wait_for_selector("#music-widget")
        print("Music widget found in index.html")

        # Click Search button to open modal
        page.click("#music-widget button:has(.fa-search)")
        page.wait_for_selector("#modal-music")
        print("Music search modal opened")

        page.screenshot(path="verification/music_system_index.png")
        print("Screenshot taken: verification/music_system_index.png")

        # Verify ludo.html Music Widget
        ludo_path = f"file://{os.path.abspath('ludo.html')}"
        print(f"Navigating to {ludo_path}")
        page.goto(ludo_path)

        page.wait_for_selector("#music-widget")
        print("Music widget found in ludo.html")

        page.screenshot(path="verification/music_system_ludo.png")
        print("Screenshot taken: verification/music_system_ludo.png")

        browser.close()

if __name__ == "__main__":
    run()
