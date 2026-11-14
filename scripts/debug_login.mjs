import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9228;
const USER_DATA = path.join(process.cwd(), ".chrome_debug_profile");

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
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
  ]);

  await wait(2000);
  const newPageRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:3000/login`, {
    method: "PUT",
  });
  const pageTarget = await newPageRes.json();
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  await sendCdp(ws, "Page.enable");
  await sendCdp(ws, "Runtime.enable");

  await wait(2000);

  // Fill in login using native prototype setter
  const evalRes = await sendCdp(ws, "Runtime.evaluate", {
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
        if (!emailInput || !passInput || !btn) return "Inputs not found!";
        
        setNativeValue(emailInput, 'pilot@researchpilot.com');
        setNativeValue(passInput, 'PilotSecurePass123!');
        btn.click();
        return "Clicked submit with native setters";
      })()
    `,
    awaitPromise: true,
  });
  console.log("Login form action:", evalRes.result?.value);

  await wait(3000);

  const stateRes = await sendCdp(ws, "Runtime.evaluate", {
    expression: `JSON.stringify({
      url: window.location.href,
      token: localStorage.getItem('researchpilot_token'),
      error: document.querySelector('.text-red-400')?.textContent
    })`,
  });
  console.log("Current state after login:", stateRes.result?.value);

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
