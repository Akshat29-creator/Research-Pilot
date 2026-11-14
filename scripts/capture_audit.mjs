import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const USER_DATA = path.join(process.cwd(), ".chrome_audit_profile");

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
  console.log("Starting Chrome with remote debugging...");
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
  ]);

  // Wait for Chrome to open port
  let targets = null;
  for (let i = 0; i < 20; i++) {
    await wait(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        targets = await res.json();
        break;
      }
    } catch {
      // retry
    }
  }

  if (!targets) {
    console.error("Failed to connect to Chrome debugging port");
    chromeProc.kill();
    process.exit(1);
  }

  // Create new page
  const newPageRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:3000/login`, {
    method: "PUT",
  });
  const pageTarget = await newPageRes.json();
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  console.log("WebSocket connected to CDP");

  await sendCdp(ws, "Page.enable");
  await sendCdp(ws, "Runtime.enable");

  // Wait for page load
  await wait(1500);

  // Fill in login credentials and submit
  console.log("Filling login credentials...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      (async () => {
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        const form = document.querySelector('form');
        if (emailInput && passInput && form) {
          emailInput.value = 'test@researchpilot.local';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.value = 'TestPassword123!';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = form.querySelector('button[type="submit"]');
          if (btn) btn.click();
        }
      })();
    `,
  });

  // Wait for redirect to /dashboard and data fetch
  console.log("Waiting for dashboard redirect and telemetry...");
  await wait(3000);

  // Take 1440px screenshot
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(500);

  const shot1440 = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "docs/screenshots/audit/dashboard-1440.png"),
    Buffer.from(shot1440.data, "base64")
  );
  console.log("Captured dashboard-1440.png");

  // Take 390px screenshot
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await wait(500);

  const shot390 = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "docs/screenshots/audit/dashboard-390.png"),
    Buffer.from(shot390.data, "base64")
  );
  console.log("Captured dashboard-390.png");

  // Clean up
  ws.close();
  chromeProc.kill();
  console.log("All dashboard screenshots captured successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
