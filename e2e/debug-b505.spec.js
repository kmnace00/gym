import { test, expect } from "playwright/test";
const url = "http://localhost:8080/index.html";

test("debug B5-05 state after day switch", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem("gym-tool-v2", JSON.stringify({
    v: 2, cur: "fri", idx: 0, bodyweight: 75,
    state: {
      "fri:0": { done: 1, load: 60, reps: 6, rir: 2, topHits: 0, lastRir: 2, sets: [{ load: 60, reps: 6, rir: 2 }] },
      "sat:0": { done: 1, load: 90, reps: 5, rir: 2, topHits: 0, lastRir: 2, sets: [{ load: 90, reps: 5, rir: 2 }] }
    }, liftHistory: {}
  }));
  await page.reload();
  await page.locator(".liftrow").first().click();
  await page.locator("[data-set='0']").click();
  await page.locator("#loadUp").click();
  console.log("after loadUp:", await page.locator("#loadVal").textContent());
  console.log("days visible?", await page.locator('.day[data-day="sat"]').isVisible());
  await page.locator('.day[data-day="sat"]').click();
  console.log("sat state:", await page.evaluate(() => localStorage.getItem("gym-tool-v2")));
  await page.locator(".liftrow").first().click();
  console.log("sat lift1 load:", await page.locator("#loadVal").textContent());
});
