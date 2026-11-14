import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9240;
const USER_DATA = path.join(process.cwd(), ".chrome_auth_profile");

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
  console.log("1. Starting Chrome headless on port " + PORT);
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

  console.log("2. CDP WebSocket connected.");
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

  await wait(2000);

  const outDir = path.join(process.cwd(), "docs", "screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // --- SCREEN 1: /login Desktop 1440px ---
  console.log("3. Capturing /login Desktop 1440px...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(1500);

  const loginDeskShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const loginDeskPath = path.join(outDir, "auth-redesign-login-1440.png");
  fs.writeFileSync(loginDeskPath, Buffer.from(loginDeskShot.data, "base64"));
  console.log(`Saved: ${loginDeskPath}`);

  // --- SCREEN 2: /login Autofill clicked ---
  console.log("4. Clicking Autofill Demo Credentials...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const autofillBtn = buttons.find(b => b.textContent && b.textContent.includes('Autofill'));
      if (autofillBtn) autofillBtn.click();
    `,
  });
  await wait(1000);

  const autofillShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const autofillPath = path.join(outDir, "auth-redesign-login-autofill-1440.png");
  fs.writeFileSync(autofillPath, Buffer.from(autofillShot.data, "base64"));
  console.log(`Saved: ${autofillPath}`);

  // --- SCREEN 3: /login Mobile 390px ---
  console.log("5. Capturing /login Mobile 390px...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await wait(1500);

  const loginMobShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const loginMobPath = path.join(outDir, "auth-redesign-login-390.png");
  fs.writeFileSync(loginMobPath, Buffer.from(loginMobShot.data, "base64"));
  console.log(`Saved: ${loginMobPath}`);

  // --- SCREEN 4: /register Desktop 1440px ---
  console.log("6. Navigating to /register...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/register" });
  await wait(2500);

  const regDeskShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const regDeskPath = path.join(outDir, "auth-redesign-register-1440.png");
  fs.writeFileSync(regDeskPath, Buffer.from(regDeskShot.data, "base64"));
  console.log(`Saved: ${regDeskPath}`);

  // --- SCREEN 5: /register with validation error ---
  console.log("7. Triggering validation error on /register...");
  await sendCdp(ws, "Runtime.evaluate", {
    expression: `
      (function() {
        function setVal(selector, val) {
          const el = document.querySelector(selector);
          if (el) {
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(el, val);
            else el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        setVal('input[type="email"]', 'newuser@researchpilot.com');
        const passInputs = Array.from(document.querySelectorAll('input[type="password"]'));
        if (passInputs[0]) {
          const proto = Object.getPrototypeOf(passInputs[0]);
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(passInputs[0], 'SecurePassword123!');
          passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (passInputs[1]) {
          const proto = Object.getPrototypeOf(passInputs[1]);
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(passInputs[1], 'MismatchPassword');
          passInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.type === 'submit');
        if (submitBtn) submitBtn.click();
      })();
    `,
  });
  await wait(1500);

  const regErrShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const regErrPath = path.join(outDir, "auth-redesign-register-error-1440.png");
  fs.writeFileSync(regErrPath, Buffer.from(regErrShot.data, "base64"));
  console.log(`Saved: ${regErrPath}`);

  // --- SCREEN 6: /register Mobile 390px ---
  console.log("8. Capturing /register Mobile 390px...");
  await sendCdp(ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await wait(1500);

  const regMobShot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const regMobPath = path.join(outDir, "auth-redesign-register-390.png");
  fs.writeFileSync(regMobPath, Buffer.from(regMobShot.data, "base64"));
  console.log(`Saved: ${regMobPath}`);

  console.log("Console errors detected:", consoleErrors);

  ws.close();
  chromeProc.kill();
  console.log("Auth capture script completed successfully.");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
