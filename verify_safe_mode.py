from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # We need to serve the file or open it directly
        # Since we are in a sandbox, let's assume we can open the file path
        # But Playwright needs a URL.
        # We can use file:// protocol

        cwd = os.getcwd()
        safe_mode_path = f"file://{cwd}/dist/SafeMode.html"

        print(f"Navigating to {safe_mode_path}")
        page.goto(safe_mode_path)

        # Verify title
        title = page.title()
        print(f"Page Title: {title}")
        assert "SAFE MODE" in title

        # Verify Canvas
        canvas = page.query_selector("canvas")
        assert canvas is not None
        print("Canvas found.")

        # Verify Return Button
        btn = page.get_by_text("RETURN TO MAIN SYSTEM")
        assert btn.is_visible()
        print("Return button found.")

        page.screenshot(path="verification_safe_mode_v2.png")
        print("Screenshot saved to verification_safe_mode_v2.png")

        browser.close()

if __name__ == "__main__":
    run()
