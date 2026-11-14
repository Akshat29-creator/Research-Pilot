import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const USER_DATA = path.join(process.cwd(), ".chrome_shell_profile");

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
  console.log("Starting Chrome for AppShell capture...");
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

  // Create login page
  const newPageRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:3000/login`, {
    method: "PUT",
  });
  const pageTarget = await newPageRes.json();
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  await sendCdp(ws, "Page.enable");
  await sendCdp(ws, "Runtime.enable");

  await wait(1500);

  // Fill login
  console.log("Logging in...");
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

  await wait(3000);

  // 1. Dashboard Desktop 1440px
  console.log("Capturing Dashboard Shell 1440px...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(1000);
  const shot1440 = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "docs/screenshots/dashboard-shell-1440.png"),
    Buffer.from(shot1440.data, "base64")
  );

  // 2. Dashboard Mobile 390px
  console.log("Capturing Dashboard Shell 390px...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await wait(1000);
  const shot390 = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "docs/screenshots/dashboard-shell-390.png"),
    Buffer.from(shot390.data, "base64")
  );

  // 3. Settings page Desktop 1440px
  console.log("Capturing Settings Shell 1440px...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/settings" });
  await wait(2000);
  const shotSettings = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "docs/screenshots/settings-shell-1440.png"),
    Buffer.from(shotSettings.data, "base64")
  );

  ws.close();
  chromeProc.kill();
  console.log("All AppShell screenshots captured successfully!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
