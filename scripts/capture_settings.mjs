import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9239;
const USER_DATA = path.join(process.cwd(), ".chrome_settings_profile");

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

  const newPageRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:3000/login`, {
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

  // Navigate to /settings
  console.log("5. Navigating to /settings...");
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/settings" });

  // Poll until h1 contains Settings
  let loaded = false;
  for (let i = 0; i < 30; i++) {
    await wait(500);
    const evalRes = await sendCdp(ws, "Runtime.evaluate", {
      expression: `document.querySelector('h1')?.textContent || ''`,
    });
    if (evalRes?.result?.value?.includes("Settings")) {
      loaded = true;
      console.log("Settings page loaded: " + evalRes.result.value);
      break;
    }
  }

  if (!loaded) {
    console.warn("Timed out waiting for h1 to contain Settings");
  }

  await wait(2000);

  const outDir = path.join(process.cwd(), "docs", "screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop 1440px view (Default Safe Envelope)
  console.log("6. Capturing Desktop 1440px view (top)...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(1500);

  const deskShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const deskPath = path.join(outDir, "settings-redesign-1440.png");
  fs.writeFileSync(deskPath, Buffer.from(deskShot.data, "base64"));
  console.log(`Saved: ${deskPath}`);

  // 2. Adjust context length to 8192 tokens to trigger warning
  console.log("7. Adjusting context slider to 8192 to trigger VRAM capacity warning...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      (function() {
        const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
        if (sliders.length > 0) {
          const slider = sliders[0];
          const proto = Object.getPrototypeOf(slider);
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(slider, '8192');
          else slider.value = '8192';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })();
    `,
  });
  await wait(1500);

  const warnShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const warnPath = path.join(outDir, "settings-redesign-1440-warning.png");
  fs.writeFileSync(warnPath, Buffer.from(warnShot.data, "base64"));
  console.log(`Saved: ${warnPath}`);

  // Reset context back to 4096
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      (function() {
        const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
        if (sliders.length > 0) {
          const slider = sliders[0];
          const proto = Object.getPrototypeOf(slider);
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(slider, '4096');
          else slider.value = '4096';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })();
    `,
  });
  await wait(1000);

  // 3. Scroll down to capture Database, Guardrails, and Appearance
  console.log("8. Scrolling down on 1440px to capture Database & Storage...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const headings = Array.from(document.querySelectorAll('h3'));
      const target = headings.find(h => h.textContent.includes('Local Database'));
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'center' });
    `,
  });
  await wait(1500);

  const bottomShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const bottomPath = path.join(outDir, "settings-redesign-1440-bottom.png");
  fs.writeFileSync(bottomPath, Buffer.from(bottomShot.data, "base64"));
  console.log(`Saved: ${bottomPath}`);

  // 4. Open Danger Purge Dialog
  console.log("9. Opening Danger Purge Dialog...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const purgeBtn = buttons.find(b => b.textContent && b.textContent.includes('Purge All Data'));
      if (purgeBtn) purgeBtn.click();
    `,
  });
  await wait(1500);

  const purgeShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const purgePath = path.join(outDir, "settings-redesign-1440-purge-dialog.png");
  fs.writeFileSync(purgePath, Buffer.from(purgeShot.data, "base64"));
  console.log(`Saved: ${purgePath}`);

  // Close Dialog with Escape
  await sendCdp(ws, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
  });
  await wait(1000);

  // 5. Mobile 390px responsive view
  console.log("10. Capturing Mobile 390px view...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `document.querySelector('h1')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
  });
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await wait(1500);

  const mobShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const mobPath = path.join(outDir, "settings-redesign-390.png");
  fs.writeFileSync(mobPath, Buffer.from(mobShot.data, "base64"));
  console.log(`Saved: ${mobPath}`);

  console.log("Console errors detected:", consoleErrors);

  ws.close();
  chromeProc.kill();
  console.log("Settings capture script completed successfully.");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
