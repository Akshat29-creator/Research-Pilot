# ResearchPilot AI: Troubleshooting & Host Environment Guide

## 1. Host Ollama Networking & `OLLAMA_HOST=0.0.0.0`

### 1.1 Why `OLLAMA_HOST=0.0.0.0` Is Required
When ResearchPilot backend runs inside Docker Compose, it resides on an isolated container bridge network. By default, Ollama on Windows binds strictly to `127.0.0.1:11434` (localhost). 
From inside the Docker container, requests sent to `host.docker.internal:11434` arrive via the Docker gateway IP (e.g. `172.17.0.1` or `192.168.65.254`). Because Ollama only listens on loopback, the connection is refused (`ConnectionRefusedError: [Errno 111] Connection refused`).

To allow the container to reach the host Ollama instance, Ollama must bind to all network interfaces (`0.0.0.0:11434`).

### 1.2 How to Configure `OLLAMA_HOST=0.0.0.0` on Windows
1. **System Environment Variable**:
   - Press `Win + R`, type `sysdm.cpl`, press Enter.
   - Go to the **Advanced** tab -> click **Environment Variables**.
   - Under **User variables** (or **System variables**), click **New**:
     - Variable name: `OLLAMA_HOST`
     - Variable value: `0.0.0.0:11434`
   - Click **OK** to save.
2. **Restart Ollama**:
   - Exit the Ollama taskbar app completely (right-click taskbar tray icon -> **Quit Ollama**).
   - Re-launch Ollama from the Start Menu or run in PowerShell:
     ```powershell
     ollama serve
     ```
3. **Verify Binding**:
   - In PowerShell, run:
     ```powershell
     netstat -ano | findstr 11434
     ```
   - It should report `TCP 0.0.0.0:11434 ... LISTENING` instead of `127.0.0.1:11434`.

---

## 2. Security Warning: LAN Exposure & Firewall Hardening

> [!CAUTION]
> **LAN EXPOSURE RISK**: Binding Ollama to `0.0.0.0` causes the Ollama REST API to listen on **all network interfaces**, including your local Wi-Fi / Ethernet adapter. Any device on the same local network (LAN / public Wi-Fi) can send inference requests or download models to your machine unless blocked by a firewall.

### Recommended Firewall Protection (Windows Defender)
Ensure your Windows network profile is set to **Private** or create a Windows Defender rule to block inbound port 11434 from external LAN adapters:
1. Open PowerShell as Administrator.
2. Allow incoming traffic on port 11434 **only** from the local Docker/WSL2 subnet, or ensure external connections are blocked:
   ```powershell
   # Ensure inbound port 11434 is blocked on Public network profiles
   New-NetFirewallRule -DisplayName "Block Ollama External LAN" -Direction Inbound -LocalPort 11434 -Protocol TCP -Profile Public -Action Block
   ```
3. When using untrusted or public Wi-Fi networks, ensure your connection profile is set to **Public network**.

---

## 3. Docker Compose Gateway (`host.docker.internal`)

In `docker-compose.yml`, the backend service communicates with host Ollama using:
```yaml
services:
  backend:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
```
This maps `host.docker.internal` to the host's internal bridge gateway IP inside the container.

---

## 4. VRAM Telemetry & "Degraded" Readiness Probe

### 4.1 In-Container VRAM Telemetry
Inside the backend container, the application queries Ollama's HTTP API:
`GET http://host.docker.internal:11434/api/ps`

Response structure:
```json
{
  "models": [
    {
      "name": "qwen3:8b",
      "model": "qwen3:8b",
      "size": 5200000000,
      "size_vram": 5200000000
    }
  ]
}
```
- If `size_vram < size`, Ollama is offloading layers to system RAM (VRAM exhaustion).
- If free VRAM headroom is estimated to be below `VRAM_WARN_THRESHOLD_MB` (configurable in `.env`, default `5500` MB):
  - The `/api/v1/ready` endpoint returns HTTP 200 with status:
    ```json
    {
      "status": "degraded",
      "warnings": [
        "Available VRAM below threshold (5500 MB). Risk of layer offloading or slow inference."
      ],
      "checks": {
        "database": "healthy",
        "redis": "healthy",
        "ollama": "healthy",
        "vram": "degraded"
      }
    }
    ```
  - This informs the user in the UI without crashing the container or failing Kubernetes/Docker health checks.

---

## 5. Diagnostic Commands Reference

| Check | Command | Expected Output |
|---|---|---|
| **Host Ollama Status** | `curl -s http://localhost:11434/api/tags` | JSON listing installed models |
| **Active Running Model** | `ollama ps` | Table of currently loaded models in VRAM |
| **GPU Memory Headroom** | `nvidia-smi` | Memory usage table (RTX 5060) |
| **Backend Liveness** | `curl -s http://localhost:8000/api/v1/health` | `{"status":"ok"}` |
| **Backend Readiness** | `curl -s http://localhost:8000/api/v1/ready` | `{"status":"healthy"}` or `{"status":"degraded"}` |
| **SearXNG Health** | `curl -s http://localhost:8080/healthz` | HTTP 200 / OK |
