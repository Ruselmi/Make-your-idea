
from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    # iPhone 12 Pro dimensions for mobile testing
    iphone_12_pro = playwright.devices['iPhone 12 Pro']
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(**iphone_12_pro)
    page = context.new_page()

    try:
        print("Navigating to Uno Game...")
        page.goto("http://localhost:8000/uno.html")

        # Wait for game to load
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # 1. Setup Game (Offline Mode)
        print("Setting up Offline Game...")
        page.click("#mode-offline") # Select Offline
        time.sleep(0.5)

        # Select 2 Players
        page.select_option("#offline-player-count", "2")

        # Start Game
        print("Starting Game...")
        page.click("button:has-text('MULAI LOKAL / BOT')")

        # Wait for Game Screen
        expect(page.locator("#screen-game")).to_be_visible()
        time.sleep(2) # Allow animations

        # 2. Verify Discard Pile (The Fix)
        # Check if the card in discard-pile has classes indicating a card (not empty white box)
        print("Verifying Discard Pile...")
        discard_card = page.locator("#discard-pile .card")
        expect(discard_card).to_be_visible()

        # Get class attribute to ensure it has a color class (e.g., c-red, c-blue, etc.)
        classes = discard_card.get_attribute("class")
        print(f"Discard Card Classes: {classes}")

        if not any(color in classes for color in ['c-red', 'c-blue', 'c-green', 'c-yellow', 'c-black']):
            print("ERROR: Discard card does not have a color class!")
            # Take screenshot even if failed
            page.screenshot(path="verification/uno_mobile_fail.png")
            raise Exception("Discard card is not rendered correctly (White Card Bug)")

        # Check inner HTML for content (icon or number)
        inner_html = discard_card.inner_html()
        if not inner_html or inner_html.strip() == "":
             print("ERROR: Discard card is empty!")
             raise Exception("Discard card has no content")

        # 3. Verify Layout (Mobile Optimization)
        # Check if Music Widget is visible and not overlapping player hand too much
        # We can check positions via JS evaluation or just take a screenshot for visual confirm
        print("Verifying Mobile Layout...")

        # Take Screenshot
        screenshot_path = "verification/uno_mobile_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"Test Failed: {e}")
        page.screenshot(path="verification/uno_error.png")
        raise e
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
