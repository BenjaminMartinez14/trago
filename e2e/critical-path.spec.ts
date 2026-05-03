import { test, expect } from "@playwright/test";

const VENUE = "club-demo";

test.describe("critical customer path", () => {
  test("menu → cart → checkout → test-pay → confirmation", async ({ page }) => {
    // 1. Open menu
    await page.goto(`/${VENUE}`);
    await expect(page).toHaveTitle(/Trago|Club/i);

    // 2. Add the first product to the cart
    const firstAddButton = page.locator("button:has-text('+'), button:has-text('Agregar')").first();
    await firstAddButton.waitFor({ state: "visible", timeout: 15_000 });
    await firstAddButton.click();

    // 3. Open cart
    await page.locator("a:has-text('Ver pedido'), a[href*='/cart']").first().click();
    await expect(page).toHaveURL(/\/cart/);

    // 4. Continue to checkout
    await page.locator("a:has-text('Ir al pago'), a[href*='/checkout']").first().click();
    await expect(page).toHaveURL(/\/checkout/);

    // 5. Skip the tip step
    await page.locator("button:has-text('Continuar al pago'), button:has-text('Pagar')").first().click();

    // 6. Use the test-pay button (only present in TEST_ MP key environments)
    const testPayBtn = page.locator("button:has-text('Pago de prueba')");
    await testPayBtn.waitFor({ state: "visible", timeout: 30_000 });
    await testPayBtn.click();

    // 7. Verify confirmation page reached
    await expect(page).toHaveURL(/\/order\/[0-9a-f-]+/, { timeout: 30_000 });
    await expect(page.locator("text=Pedido")).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible(); // QR code rendered
  });
});
