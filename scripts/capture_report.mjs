import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9232;
const USER_DATA = path.join(process.cwd(), ".chrome_report_profile");

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
  console.log("Starting Chrome for Report Viewer capture...");
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

  // Authenticate
  console.log("Logging into backend...");
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

  // Navigate to Report Viewer
  console.log("Navigating to Report Viewer /reports/sess_01JBM8...");
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/reports/sess_01JBM8" });
  await wait(3000);

  // 1. Desktop 1440px view
  console.log("Capturing Desktop 1440px view...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(2000);

  const deskShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const deskPath = path.join(outDir, "report-redesign-1440.png");
  fs.writeFileSync(deskPath, Buffer.from(deskShot.data, "base64"));
  console.log(`Saved: ${deskPath}`);

  // 2. Open Citation Popover
  console.log("Triggering Citation Chip Popover on 1440px...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const citationBtn = document.querySelector('button[aria-label*="Citation [1]"]');
      if (citationBtn) citationBtn.click();
    `,
  });
  await wait(1500);

  const popoverShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const popoverPath = path.join(outDir, "report-redesign-1440-citation-popover.png");
  fs.writeFileSync(popoverPath, Buffer.from(popoverShot.data, "base64"));
  console.log(`Saved: ${popoverPath}`);

  // Close popover
  await sendCdp(ws, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
  });
  await wait(800);

  // 3. Open Slide-Over Sources Drawer
  console.log("Opening Slide-over Sources Drawer on 1440px...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const srcBtn = buttons.find(b => b.textContent && b.textContent.includes('Sources'));
      if (srcBtn) srcBtn.click();
    `,
  });
  await wait(1500);

  const drawerShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const drawerPath = path.join(outDir, "report-redesign-1440-sources-drawer.png");
  fs.writeFileSync(drawerPath, Buffer.from(drawerShot.data, "base64"));
  console.log(`Saved: ${drawerPath}`);

  // Close drawer
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    `,
  });
  await wait(800);

  // 4. Switch to Edit Mode
  console.log("Switching to Edit Mode on 1440px...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Edit Mode'));
      if (editBtn) editBtn.click();
    `,
  });
  await wait(1200);

  const editShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const editPath = path.join(outDir, "report-redesign-1440-edit-mode.png");
  fs.writeFileSync(editPath, Buffer.from(editShot.data, "base64"));
  console.log(`Saved: ${editPath}`);

  // Switch back to Rendered View
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const viewBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Rendered View'));
      if (viewBtn) viewBtn.click();
    `,
  });
  await wait(800);

  // 5. Mobile Viewport 390px
  console.log("Emulating Mobile viewport 390px...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await wait(2000);

  const mobShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const mobPath = path.join(outDir, "report-redesign-390.png");
  fs.writeFileSync(mobPath, Buffer.from(mobShot.data, "base64"));
  console.log(`Saved: ${mobPath}`);

  ws.close();
  chromeProc.kill();
  console.log("Report Viewer capture complete!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
