import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = "F:/Projects/lekala-site";
const API = "http://127.0.0.1:7070";
const UI = "http://127.0.0.1:5175/tools/vse";
const NODE_ID = "SR00001";
const NODE_ID_LOWER = NODE_ID.toLowerCase();
const ANNOTATIONS_PATH = path.join(ROOT, "tools", "vse", "node_annotations.json");
const STD_SVG_PATH = path.join(ROOT, "public", "vse", `${NODE_ID}_std.svg`);
const REPORT_DIR = path.join(ROOT, "tools", "vse", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "contract_playwright_sr00001_report.json");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.response = json;
    throw err;
  }
  return json;
}

async function gotoWithRetry(page, url, attempts = 5) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await page.goto(url, { waitUntil: "commit", timeout: 30000 });
      await page.locator(".vse-node-search").waitFor({ timeout: 120000 });
      return;
    } catch (err) {
      lastError = err;
      await sleep(1500);
    }
  }
  throw lastError || new Error(`Unable to open ${url}`);
}

async function readStdSvg() {
  return fs.readFile(STD_SVG_PATH, "utf8");
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function softFail(list, message, details = {}) {
  list.push({ message, details });
}

function first(arr, pred) {
  return arr.find(pred);
}

function hasPathWithAttr(svgText, attr, value) {
  return svgText.includes(`${attr}="${value}"`);
}

function hasListAttrContaining(svgText, attr, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`${attr}="[^"]*${escapedValue}[^"]*"`);
  return rx.test(svgText);
}

function countPathsForGroupAndRole(svgText, groupKey, role) {
  const escapedGroup = groupKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`data-role="${escapedRole}"[^>]*data-group-key="${escapedGroup}"|data-group-key="${escapedGroup}"[^>]*data-role="${escapedRole}"`, "g");
  return (svgText.match(rx) || []).length;
}

function pathHasElemAndRole(svgText, elemKey, role) {
  const escapedElem = elemKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`data-role="${escapedRole}"[^>]*data-elem-key="${escapedElem}"|data-elem-key="${escapedElem}"[^>]*data-role="${escapedRole}"`);
  return rx.test(svgText);
}

async function main() {
  const startedAt = new Date().toISOString();
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const report = {
    node_id: NODE_ID,
    started_at: startedAt,
    commands: [
      "python tools/vse/api_server.py",
      "npm run dev -- --host 0.0.0.0 --port 5175",
      "node tools/vse/contract_playwright_check.mjs",
    ],
    script: "tools/vse/contract_playwright_check.mjs",
    status: "FAIL",
    steps: [],
    artifacts: {},
  };
  const softFailures = [];

  const annotationsBackup = await fs.readFile(ANNOTATIONS_PATH, "utf8");
  let renamedStd = null;
  try {
    report.steps.push({ step: "ui_ready", ok: true, url: UI });

    const initialState = await fetchJson(`${API}/api/node-state/${NODE_ID}`);
    assert(initialState?.ok, "node-state did not return ok=true");
    assert(Array.isArray(initialState.groups) && initialState.groups.length > 0, "node-state has no groups");
    assert(Array.isArray(initialState.elements) && initialState.elements.length > 0, "node-state has no elements");

    const targetGroup = first(initialState.groups, g => g.group_key === "hw_zipper|#1a1a1a|#1a1a1a|1.0|false");
    assert(targetGroup, "target zipper group not found");
    const targetElements = initialState.elements.filter(e => e.group_key === targetGroup.group_key);
    assert(targetElements.length >= 2, "not enough target zipper elements", { count: targetElements.length });
    const groupCheckElem = first(targetElements, e => e.elem_key === "3251e8a3f3f3f8bb") || targetElements[0];
    assert(groupCheckElem?.elem_key, "target zipper element not found");
    const targetElem = first(
      initialState.elements,
      e => e.detected_role === "callout_line" && !e.override_role && e.elem_key && e.group_key
    );
    assert(targetElem?.elem_key, "separate element override candidate not found");

    const initialTrace = await fetchJson(`${API}/api/node-contract-trace/${NODE_ID}`);
    assert(initialTrace?.ok, "contract trace did not return ok=true");
    const initialStd = await readStdSvg();
    assert(hasPathWithAttr(initialStd, "data-elem-key", targetElem.elem_key), "std.svg missing target element data-elem-key", { elem_key: targetElem.elem_key });
    assert(initialStd.includes('data-role='), "std.svg missing data-role");
    if (!hasPathWithAttr(initialStd, "data-group-key", targetGroup.group_key)) {
      softFail(softFailures, "zipper group has no exact rendered path for group_key before edit", { group_key: targetGroup.group_key });
    }
    assert(
      hasPathWithAttr(initialStd, "data-group-key", targetGroup.group_key),
      "std.svg missing target data-group-key",
      { group_key: targetGroup.group_key }
    );
    assert(
      hasListAttrContaining(initialStd, "data-source-elem-keys", groupCheckElem.elem_key),
      "generated zipper symbol missing source elem trace",
      { elem_key: groupCheckElem.elem_key }
    );
    report.steps.push({
      step: "initial_trace",
      ok: true,
      group_key: targetGroup.group_key,
      zipper_elem_key: groupCheckElem.elem_key,
      elem_key: targetElem.elem_key,
    });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    page.setDefaultTimeout(30000);

    await gotoWithRetry(page, UI);
    await page.locator(".vse-node-search").fill(NODE_ID);
    await page.locator(".vse-node-tab", { hasText: NODE_ID }).first().click();
    await page.waitForTimeout(2000);
    await page.locator(".vse-node-styles").waitFor();
    await page.getByTestId("contract-monitor-open").click();
    await page.locator("text=Groups Trace").waitFor();
    await page.screenshot({ path: path.join(REPORT_DIR, "contract-monitor-initial.png"), fullPage: true });
    report.artifacts.initial_monitor_screenshot = "tools/vse/reports/contract-monitor-initial.png";

    report.steps.push({ step: "contract_monitor_open", ok: true });

    const groupIndex = initialState.groups.findIndex(g => g.group_key === targetGroup.group_key);
    assert(groupIndex >= 0, "target group index not found");
    const groupRows = page.locator(".vse-node-styles tbody tr");
    const targetGroupRow = groupRows.nth(groupIndex);
    const groupSelect = targetGroupRow.locator("select.vse-role-sel-sm");
    assert((await groupSelect.inputValue()) === "hw_zipper", "target group UI value is not hw_zipper");
    await groupSelect.selectOption("hw_buckle");
    await page.waitForTimeout(500);
    report.steps.push({ step: "group_draft_changed", ok: true });
    await page.getByTestId("contract-monitor-close").click();
    await page.waitForTimeout(300);

    await page.locator(`svg [data-elem-key="${targetElem.elem_key}"]`).first().click();
    await page.locator(".vse-row-selected-el").waitFor();
    const selectedElemCode = await page.locator(".vse-row-selected-el code").nth(0).innerText().catch(() => "");
    await page.getByTestId("contract-monitor-open").click();
    await page.locator(".vse-contract-drawer").locator("text=Selected element").waitFor();
    const monitorAfterClick = await page.locator(".vse-contract-drawer").innerText();
    assert(monitorAfterClick.includes(targetElem.elem_key), "selected element not reflected in Contract Monitor", { elem_key: targetElem.elem_key, selectedElemCode });
    const selectedTraceBeforeSave = await fetchJson(`${API}/api/node-contract-trace/${NODE_ID}`);
    const selectedTraceElemBeforeSave = first(selectedTraceBeforeSave.elements, e => e.elem_key === targetElem.elem_key);
    assert(selectedTraceElemBeforeSave, "selected elem_key missing from contract trace", { elem_key: targetElem.elem_key });
    assert(!(selectedTraceElemBeforeSave.warnings || []).includes("std.svg path cannot be mapped to elem_key"), "selected element still reports unmapped elem_key", selectedTraceElemBeforeSave);
    await page.getByTestId("contract-monitor-close").click();
    await page.waitForTimeout(300);
    const selectedElemSelect = page.locator(".vse-row-selected-el select.vse-role-sel-sm");
    const initialElemUiRole = await selectedElemSelect.inputValue();
    assert(initialElemUiRole === "callout_line", "selected element initial value is not callout_line", { actual: initialElemUiRole });
    await selectedElemSelect.selectOption("construction_line");
    await page.getByTestId("element-draft-save").click();
    report.steps.push({ step: "element_draft_changed", ok: true, elem_key: targetElem.elem_key });

    const putPromise = page.waitForResponse(resp => resp.url().toLowerCase().includes(`/api/node-annotations/${NODE_ID_LOWER}`) && resp.request().method() === "PUT", { timeout: 60000 });
    const regenPromise = page.waitForResponse(resp => resp.url().toLowerCase().includes(`/api/regenerate-node/${NODE_ID_LOWER}`) && resp.request().method() === "POST", { timeout: 120000 });
    await page.getByTestId("compare-save-regenerate").click();
    const putResp = await putPromise;
    const regenResp = await regenPromise;
    const putJson = await putResp.json();
    const regenJson = await regenResp.json();
    report.steps.push({ step: "ui_save_requests", ok: true, put_ok: putJson?.ok, regen_ok: regenJson?.ok });
    assert(putJson?.ok, "UI PUT /api/node-annotations returned not ok", putJson);
    assert(regenJson?.ok, "UI POST /api/regenerate-node returned not ok", regenJson);

    await page.waitForTimeout(3000);
    const postSaveState = await fetchJson(`${API}/api/node-state/${NODE_ID}`);
    const postSaveTrace = await fetchJson(`${API}/api/node-contract-trace/${NODE_ID}`);
    const postSaveStd = await readStdSvg();

    const savedGroup = first(postSaveState.groups, g => g.group_key === targetGroup.group_key);
    const savedElem = first(postSaveState.elements, e => e.elem_key === targetElem.elem_key);
    assert(savedGroup?.override_role === "hw_buckle", "group override_role not persisted", savedGroup || {});
    assert(savedGroup?.final_role === "hw_buckle", "group final_role not updated", savedGroup || {});
    assert(savedElem?.override_role === "construction_line", "element override_role not persisted", savedElem || {});
    assert(savedElem?.final_role === "construction_line", "element final_role not updated", savedElem || {});
    assert(pathHasElemAndRole(postSaveStd, targetElem.elem_key, "construction_line"), "std.svg does not render elem_key as construction_line", { elem_key: targetElem.elem_key });

    const savedTraceGroup = first(postSaveTrace.groups, g => g.group_key === targetGroup.group_key);
    const savedTraceElem = first(postSaveTrace.elements, e => e.elem_key === targetElem.elem_key);
    assert(savedTraceGroup?.saved, "group trace is not saved", savedTraceGroup || {});
    assert(savedTraceElem?.saved && savedTraceElem?.rendered, "element trace is not saved/rendered", savedTraceElem || {});
    assert(savedTraceElem?.rendered_role === savedTraceElem?.final_role, "element rendered_role != final_role after save", savedTraceElem || {});
    if (countPathsForGroupAndRole(postSaveStd, targetGroup.group_key, "hw_buckle") < 1) {
      softFail(softFailures, "group override did not produce keyed rendered path in std.svg", {
        group_key: targetGroup.group_key,
        expected_role: "hw_buckle",
      });
    }
    if (!savedTraceGroup?.rendered || (savedTraceGroup?.warnings || []).includes("std.svg paths cannot be mapped to group_key")) {
      softFail(softFailures, "group trace stayed unmapped after save/regenerate", savedTraceGroup || {});
    }
    report.steps.push({ step: "post_save_api_and_svg", ok: true });

    await page.reload({ waitUntil: "commit", timeout: 30000 }).catch(() => {});
    await page.locator(".vse-node-search").waitFor({ timeout: 120000 });
    await page.locator(".vse-node-search").fill(NODE_ID);
    await page.locator(".vse-node-tab", { hasText: NODE_ID }).first().click();
    await page.waitForTimeout(2000);
    await page.getByTestId("contract-monitor-open").click();
    await page.locator("text=Groups Trace").waitFor();
    await page.getByTestId("contract-monitor-close").click();
    await page.waitForTimeout(300);
    await page.locator(`svg [data-elem-key="${targetElem.elem_key}"]`).first().click();
    await page.waitForTimeout(500);
    await page.getByTestId("contract-monitor-open").click();
    await page.locator("text=Groups Trace").waitFor();
    const reloadedTraceText = await page.locator(".vse-contract-drawer").innerText();
    assert(reloadedTraceText.includes(targetGroup.group_key), "reloaded Contract Monitor lost group_key", { group_key: targetGroup.group_key });
    assert(reloadedTraceText.includes(targetElem.elem_key), "reloaded Contract Monitor lost elem_key", { elem_key: targetElem.elem_key });
    assert(!reloadedTraceText.includes("fallback_by_role"), "fallback_by_role appeared in Contract Monitor");
    assert(!reloadedTraceText.includes("fallback_by_index"), "fallback_by_index appeared in Contract Monitor");
    report.steps.push({ step: "reload_preserves_keys", ok: true });

    renamedStd = `${STD_SVG_PATH}.bak-playwright`;
    await fs.rename(STD_SVG_PATH, renamedStd);
    report.steps.push({ step: "std_svg_removed", ok: true });

    const regenAfterDelete = await fetchJson(`${API}/api/regenerate-node/${NODE_ID}`, { method: "POST" });
    assert(regenAfterDelete?.ok, "API regenerate after std.svg delete failed", regenAfterDelete || {});
    const regeneratedStd = await readStdSvg();
    assert(hasPathWithAttr(regeneratedStd, "data-elem-key", targetElem.elem_key), "regenerated std.svg lost target element data-elem-key", { elem_key: targetElem.elem_key });
    assert(hasPathWithAttr(regeneratedStd, "data-group-key", targetGroup.group_key), "regenerated std.svg lost data-group-key", { group_key: targetGroup.group_key });
    assert(pathHasElemAndRole(regeneratedStd, targetElem.elem_key, "construction_line"), "regenerated std.svg element role mismatch after delete/regenerate");
    const finalTrace = await fetchJson(`${API}/api/node-contract-trace/${NODE_ID}`);
    const finalElem = first(finalTrace.elements, e => e.elem_key === targetElem.elem_key);
    assert(finalElem?.rendered_role === finalElem?.final_role, "final trace mismatch after delete/regenerate", finalElem || {});
    const finalGroup = first(finalTrace.groups, g => g.group_key === targetGroup.group_key);
    if (!finalGroup?.rendered || (finalGroup?.warnings || []).includes("std.svg paths cannot be mapped to group_key")) {
      softFail(softFailures, "group trace still unmapped after std.svg delete/regenerate", finalGroup || {});
    }
    await page.reload({ waitUntil: "commit", timeout: 30000 }).catch(() => {});
    await page.locator(".vse-node-search").waitFor({ timeout: 120000 });
    await page.locator(".vse-node-search").fill(NODE_ID);
    await page.locator(".vse-node-tab", { hasText: NODE_ID }).first().click();
    await page.waitForTimeout(1500);
    await page.getByTestId("contract-monitor-open").click();
    await page.locator("text=Groups Trace").waitFor();
    await page.getByTestId("contract-monitor-close").click();
    await page.waitForTimeout(300);
    await page.locator(`svg [data-elem-key="${targetElem.elem_key}"]`).first().click();
    await page.waitForTimeout(500);
    await page.getByTestId("contract-monitor-open").click();
    await page.locator("text=Groups Trace").waitFor();
    const afterDeleteReloadText = await page.locator(".vse-contract-drawer").innerText();
    assert(afterDeleteReloadText.includes(targetElem.elem_key), "elem_key missing from monitor after delete/regenerate/reload");
    report.steps.push({ step: "delete_regenerate_reload", ok: true });

    await page.screenshot({ path: path.join(REPORT_DIR, "contract-monitor-final.png"), fullPage: true });
    report.artifacts.final_monitor_screenshot = "tools/vse/reports/contract-monitor-final.png";
    await browser.close();

    report.status = softFailures.length ? "FAIL" : "PASS";
    report.summary = {
      group_key: targetGroup.group_key,
      elem_key: targetElem.elem_key,
      group_final_role: "hw_buckle",
      elem_final_role: "construction_line",
      exact_keyed_trace_verified: !softFailures.length,
    };
    if (softFailures.length) {
      report.soft_failures = softFailures;
    }
  } catch (error) {
    report.status = "FAIL";
    report.failure = {
      message: error?.message || String(error),
      details: error?.details || null,
      stack: error?.stack || null,
    };
  } finally {
    try {
      await fs.writeFile(ANNOTATIONS_PATH, annotationsBackup, "utf8");
      await fetchJson(`${API}/api/regenerate-node/${NODE_ID}`, { method: "POST" });
    } catch {
      // best effort restore
    }
    try {
      if (renamedStd) {
        await fs.rm(renamedStd, { force: true });
      }
    } catch {
      // best effort cleanup
    }
    report.finished_at = new Date().toISOString();
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "PASS") process.exitCode = 1;
  }
}

main().catch(async error => {
  console.error(error);
  process.exitCode = 1;
});
