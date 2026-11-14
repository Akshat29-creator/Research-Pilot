import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9229;
const USER_DATA = path.join(process.cwd(), ".chrome_workspace_profile");

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
  console.log("Starting Chrome for Research Workspace capture...");
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

  console.log("CDP WebSocket connected.");
  await sendCdp(ws, "Page.enable");
  await sendCdp(ws, "Runtime.enable");

  await wait(1500);

  // Perform real login with prototype setter
  console.log("Logging into backend with valid credentials...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      (async () => {
        function setNativeValue(element, value) {
          const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
          const prototype = Object.getPrototypeOf(element);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
          if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
          } else if (valueSetter) {
            valueSetter.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        const btn = document.querySelector('button[type="submit"]');
        if (emailInput && passInput && btn) {
          setNativeValue(emailInput, 'pilot@researchpilot.com');
          setNativeValue(passInput, 'PilotSecurePass123!');
          btn.click();
        }
      })();
    `,
  });

  await wait(3000);

  const outDir = path.join(process.cwd(), "docs", "screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Navigate to Research Workspace
  console.log("Navigating to Research Workspace /research/sess_01JBM8...");
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/research/sess_01JBM8" });
  await wait(3500); // Wait for React Flow layout and animations to settle

  // 1. Capture Desktop 1440px
  console.log("Capturing Desktop 1440px view...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(2000);

  const deskShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const deskPath = path.join(outDir, "workspace-redesign-1440.png");
  fs.writeFileSync(deskPath, Buffer.from(deskShot.data, "base64"));
  console.log(`Saved: ${deskPath}`);

  // 2. Open Human Approval Modal on desktop to capture the pause modal
  console.log("Opening Human Approval Modal on 1440px...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewBtn = buttons.find(b => b.textContent && b.textContent.includes('Review Checkpoint'));
      if (reviewBtn) reviewBtn.click();
    `,
  });
  await wait(1500);

  const modalShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const modalPath = path.join(outDir, "workspace-redesign-1440-approval-modal.png");
  fs.writeFileSync(modalPath, Buffer.from(modalShot.data, "base64"));
  console.log(`Saved: ${modalPath}`);

  // Close modal with Escape or clicking backdrop
  await sendCdp(ws, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
  });
  await wait(1000);

  // 3. Capture Mobile 390px (Graph & Stream tab)
  console.log("Emulating Mobile viewport 390px (Graph tab)...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await wait(2000);

  const mobShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const mobPath = path.join(outDir, "workspace-redesign-390.png");
  fs.writeFileSync(mobPath, Buffer.from(mobShot.data, "base64"));
  console.log(`Saved: ${mobPath}`);

  // 4. Switch to Mobile Sources Tab
  console.log("Switching to Mobile Sources tab...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const sourcesBtn = buttons.find(b => b.textContent && b.textContent.includes('Sources'));
      if (sourcesBtn) sourcesBtn.click();
    `,
  });
  await wait(1500);

  const mobSourcesShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const mobSourcesPath = path.join(outDir, "workspace-redesign-390-sources.png");
  fs.writeFileSync(mobSourcesPath, Buffer.from(mobSourcesShot.data, "base64"));
  console.log(`Saved: ${mobSourcesPath}`);

  ws.close();
  chromeProc.kill();
  console.log("Research Workspace capture complete!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
