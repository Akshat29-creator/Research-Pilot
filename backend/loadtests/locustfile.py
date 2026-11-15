import logging
import uuid

from locust import HttpUser, between, task

logger = logging.getLogger("researchpilot.loadtest")


class HealthAndReadUser(HttpUser):
    """Simulates high-concurrency read-heavy traffic across API endpoints."""

    wait_time = between(0.1, 0.5)

    @task(5)
    def check_health(self):
        """Liveness probe: verifies minimal latency and zero error rate."""
        self.client.get("/api/v1/health", name="/api/v1/health")

    @task(3)
    def check_ready(self):
        """Readiness probe: inspects database, redis, and Ollama connectivity."""
        self.client.get("/api/v1/ready", name="/api/v1/ready")

    @task(4)
    def scrape_metrics(self):
        """Scrape Prometheus metrics endpoint under operational monitoring load."""
        self.client.get("/metrics", name="/metrics")

    @task(2)
    def system_telemetry(self):
        """Poll host Ollama GPU VRAM and semaphore telemetry."""
        self.client.get("/api/v1/system/telemetry", name="/api/v1/system/telemetry")


class ResearchWorkflowLoadUser(HttpUser):
    """Simulates realistic user sessions submitting queries and querying session status."""

    wait_time = between(1.0, 2.5)

    def on_start(self):
        """Register a unique user account and obtain a JWT bearer token."""
        unique_id = uuid.uuid4().hex[:8]
        self.email = f"load_user_{unique_id}@researchpilot.ai"
        self.password = "LoadTestPass123!"

        reg_payload = {"email": self.email, "password": self.password}
        with self.client.post(
            "/api/v1/auth/register",
            json=reg_payload,
            name="/api/v1/auth/register",
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                data = resp.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                self.token = None
                self.headers = {}
                resp.failure(f"Registration failed with code {resp.status_code}")

    @task(3)
    def list_sessions(self):
        """List active user sessions."""
        if not self.headers:
            return
        self.client.get(
            "/api/v1/research/sessions",
            headers=self.headers,
            name="/api/v1/research/sessions",
        )

    @task(1)
    def submit_research_job(self):
        """Submit lightweight research job to measure queue dwell time under single-GPU lock."""
        if not self.headers:
            return
        payload = {
            "query": "Empirical load testing of asynchronous vector pipelines",
            "title": "Load Test Research Job",
            "max_iterations": 1,
            "approval_required": False,
        }
        with self.client.post(
            "/api/v1/research/sessions",
            json=payload,
            headers=self.headers,
            name="/api/v1/research/sessions [CREATE]",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                data = resp.json()
                session_id = data.get("id")
                if session_id:
                    # Probe session detail immediately
                    self.client.get(
                        f"/api/v1/research/sessions/{session_id}",
                        headers=self.headers,
                        name="/api/v1/research/sessions/{id}",
                    )
            else:
                resp.failure(f"Job creation failed with code {resp.status_code}")
