const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { dayTabCheck } = require("../tools/check-ids.js");

const root = path.join(__dirname, "..");
const program = fs.readFileSync(path.join(root, "program.js"), "utf8");
const stats = fs.readFileSync(path.join(root, "stats.js"), "utf8");

test("the day-tab guard reads the days the app actually renders", () => {
  const tabs = dayTabCheck(program, stats);
  assert.equal(tabs.error, null);
  assert.deepEqual(tabs.days, ["fri", "sat", "sun"]);
});

test("a tab for a day the program dropped fails the guard", () => {
  const shifted = stats.replace('var names = ["fri", "sat", "sun"]', 'var names = ["fri", "sat", "mon"]');
  assert.notEqual(shifted, stats, "fixture must change the real tab list");
  const tabs = dayTabCheck(program, shifted);
  assert.match(tabs.error, /day tabs not in program\.js DAYS: mon/);
  assert.match(tabs.error, /program days without a tab: sun/);
});

test("a program day with no tab fails the guard too", () => {
  const shifted = program.replace(/^ {4}sun: \{/m, "    mon: {");
  assert.notEqual(shifted, program, "fixture must change a real DAYS key");
  const tabs = dayTabCheck(shifted, stats);
  assert.match(tabs.error, /day tabs not in program\.js DAYS: sun/);
  assert.match(tabs.error, /program days without a tab: mon/);
});

test("a duplicated tab day fails the guard", () => {
  const duped = stats.replace('var names = ["fri", "sat", "sun"]', 'var names = ["fri", "sat", "sat"]');
  assert.notEqual(duped, stats, "fixture must change the real tab list");
  const tabs = dayTabCheck(program, duped);
  assert.match(tabs.error, /duplicate day tabs: sat/);
});
