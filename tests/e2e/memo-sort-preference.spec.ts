import { expect, test, type Page } from "@playwright/test";
import { format, templatesRegExp, ui } from "./fixtures/ui-labels";

const storageKey = "edgeever.memoSort";
const modes = [
  ["updated-desc", ui.options.memoSort.updatedDesc],
  ["created-desc", ui.options.memoSort.createdDesc],
  ["title-asc", ui.options.memoSort.titleAsc],
  ["title-desc", ui.options.memoSort.titleDesc],
] as const;

const openSort = async (page: Page) => {
  await page.getByRole("button", { name: ui.memoList.moreActions, exact: true }).click();
  return page.getByRole("menuitem", { name: templatesRegExp(ui.memoList.sortTitle) });
};

const chooseSort = async (page: Page, label: string) => {
  await (await openSort(page)).hover();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
};

for (const [mode, label] of modes) {
  test(`remembers ${mode} when the workspace reopens`, async ({ page }) => {
    await page.goto("/");
    await chooseSort(page, label);
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(mode);

    const requestedSorts: Array<string | null> = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname === "/api/v1/memos" && request.method() === "GET") {
        requestedSorts.push(url.searchParams.get("sort"));
      }
    });
    await page.reload();
    await expect(await openSort(page)).toHaveText(format(ui.memoList.sortTitle, { label }));
    // A populated local mirror can satisfy the list without an HTTP query.
    expect(requestedSorts.every(value => value === mode)).toBe(true);
  });
}

for (const stored of [null, "unknown-sort"]) {
  test(`keeps the default when the stored sort is ${stored === null ? "absent" : "invalid"}`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      localStorage.setItem("edgeever.notebookSort", "custom");
    }, { key: storageKey, value: stored });
    await page.goto("/");
    await expect(await openSort(page)).toHaveText(format(ui.memoList.sortTitle, { label: ui.options.memoSort.updatedDesc }));
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(stored);
    expect(await page.evaluate(() => localStorage.getItem("edgeever.notebookSort"))).toBe("custom");
  });
}

test("keeps in-session sorting usable when preference storage is blocked", async ({ page }) => {
  await page.addInitScript(key => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(name) {
      if (name === key) throw new DOMException("Blocked", "SecurityError");
      return get.call(this, name);
    };
    Storage.prototype.setItem = function(name, value) {
      if (name === key) throw new DOMException("Blocked", "SecurityError");
      set.call(this, name, value);
    };
  }, storageKey);
  await page.goto("/");
  await chooseSort(page, ui.options.memoSort.titleAsc);
  await expect(await openSort(page)).toHaveText(format(ui.memoList.sortTitle, { label: ui.options.memoSort.titleAsc }));
  await page.reload();
  await expect(await openSort(page)).toHaveText(format(ui.memoList.sortTitle, { label: ui.options.memoSort.updatedDesc }));
});
