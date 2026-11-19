import { expect, test } from "@playwright/test";
import { ui } from "./fixtures/ui-labels";

test("starts at the note list after a renderer failure instead of reopening the previous note", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rtnote.renderer-recovery-required", "1");
  });
  await page.goto("/");

  await expect(page.getByRole("status").getByText(ui.errorScreens.safeModeTitle)).toBeVisible();
  const firstMemo = page.locator("[data-memo-id]").first();
  await expect(firstMemo).toBeVisible();
  await firstMemo.click();

  await expect(page.getByText(ui.errorScreens.safeModeTitle)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("rtnote.renderer-recovery-required"))).toBeNull();
});
