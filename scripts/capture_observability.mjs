import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9235;
const USER_DATA = path.join(process.cwd(), ".chrome_obs_profile_2");

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendCdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const handler = (evt) => {
      const msg = JSON.parse(evt.data.toString());
      if (msg.id === id) {
        ws.removeEventListener("message", handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  console.log("1. Fetching valid JWT auth token from backend...");
  const authRes = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "pilot@researchpilot.com",
      password: "PilotSecurePass123!",
    }),
  });
  const authData = await authRes.json();
  const token = authData.access_token;
  if (!token) throw new Error("Could not obtain auth token");
  console.log("Token obtained successfully.");

  console.log("2. Starting Chrome headless on port " + PORT);
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await wait(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        targets = await res.json();
        break;
      }
    } catch {}
  }

  if (!targets) {
    chromeProc.kill();
    throw new Error("Could not connect to Chrome port");
  }

  const newPageRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:3000/`, {
    method: "PUT",
  });
  const pageTarget = await newPageRes.json();
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));

  console.log("3. CDP WebSocket connected.");
  await sendCdp(ws, "Page.enable");
  await sendCdp(ws, "Runtime.enable");

  const consoleErrors = [];
  ws.addEventListener("message", (evt) => {
    try {
      const msg = JSON.parse(evt.data.toString());
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(" "));
      }
    } catch {}
  });

  await wait(1000);

  // Set token directly in localStorage
  console.log("4. Setting researchpilot_token in browser localStorage...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `localStorage.setItem('researchpilot_token', '${token}');`,
  });

  // Navigate to /observability
  console.log("5. Navigating to /observability...");
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/observability" });

  // Poll until h1 contains Observability
  let loaded = false;
  for (let i = 0; i < 30; i++) {
    await wait(500);
    const evalRes = await sendCdp(ws, "Runtime.evaluate", {
      expression: `document.querySelector('h1')?.textContent || ''`,
    });
    if (evalRes?.result?.value?.includes("Observability")) {
      loaded = true;
      console.log("Observability page loaded: " + evalRes.result.value);
      break;
    }
  }

  if (!loaded) {
    console.warn("Timed out waiting for h1 to contain Observability; checking current page...");
    const curState = await sendCdp(ws, "Runtime.evaluate", {
      expression: `({ url: location.href, title: document.title, body: document.body.innerText.slice(0, 300) })`,
      returnByValue: true,
    });
    console.log("Current state:", curState.result.value);
  }

  await wait(2000);

  const outDir = path.join(process.cwd(), "docs", "screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop 1440px view
  console.log("6. Capturing Desktop 1440px view...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(2000);

  const deskShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const deskPath = path.join(outDir, "observability-redesign-1440.png");
  fs.writeFileSync(deskPath, Buffer.from(deskShot.data, "base64"));
  console.log(`Saved: ${deskPath}`);

  // 2. Click "Per-Agent Stages" tab in LatencyChart
  console.log("7. Switching to Per-Agent Stages view in LatencyChart...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const stagesBtn = buttons.find(b => b.textContent && b.textContent.includes('Per-Agent Stages'));
      if (stagesBtn) stagesBtn.click();
    `,
  });
  await wait(1500);

  const stagesShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const stagesPath = path.join(outDir, "observability-redesign-1440-stages.png");
  fs.writeFileSync(stagesPath, Buffer.from(stagesShot.data, "base64"));
  console.log(`Saved: ${stagesPath}`);

  // 3. Scroll down on 1440px to capture System Health Grid, Reliability Card, and Event Stream
  console.log("8. Scrolling down on 1440px to capture infrastructure & log stream...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const headings = Array.from(document.querySelectorAll('h3'));
      const target = headings.find(h => h.textContent.includes('Infrastructure') || h.textContent.includes('Diagnostics'));
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    `,
  });
  await wait(1500);

  const bottomShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const bottomPath = path.join(outDir, "observability-redesign-1440-bottom.png");
  fs.writeFileSync(bottomPath, Buffer.from(bottomShot.data, "base64"));
  console.log(`Saved: ${bottomPath}`);

  // 4. Mobile 390px responsive view (top)
  console.log("9. Capturing Mobile 390px view (top)...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `document.querySelector('h1')?.scrollIntoView({ behavior: 'instant' });`,
  });
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await wait(1500);

  const mobShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const mobPath = path.join(outDir, "observability-redesign-390.png");
  fs.writeFileSync(mobPath, Buffer.from(mobShot.data, "base64"));
  console.log(`Saved: ${mobPath}`);

  // 5. Mobile 390px responsive view (scrolled to charts)
  console.log("10. Capturing Mobile 390px view (charts & health)...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const headings = Array.from(document.querySelectorAll('h3'));
      const target = headings.find(h => h.textContent.includes('Execution Latency'));
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    `,
  });
  await wait(1500);

  const mobChartsShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const mobChartsPath = path.join(outDir, "observability-redesign-390-charts.png");
  fs.writeFileSync(mobChartsPath, Buffer.from(mobChartsShot.data, "base64"));
  console.log(`Saved: ${mobChartsPath}`);

  console.log("Console errors detected:", consoleErrors);

  ws.close();
  chromeProc.kill();
  console.log("Observability capture script completed successfully.");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
