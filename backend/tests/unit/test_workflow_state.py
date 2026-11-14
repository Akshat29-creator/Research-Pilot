from app.workflows.state import create_initial_state


def test_create_initial_state_defaults():
    state = create_initial_state("HNSW vs IVFFlat latency benchmarks")

    assert state["query"] == "HNSW vs IVFFlat latency benchmarks"
    assert len(state["session_id"]) > 0
    assert len(state["execution_id"]) > 0
    assert state["user_id"] == "anonymous"
    assert state["status"] == "INITIALIZED"
    assert state["iteration_count"] == 0
    assert state["max_iterations"] == 3
    assert state["sources"] == []
    assert state["evidence"] == []
    assert state["analysis"] is None
    assert state["draft_report"] is None
    assert state["review_feedback"] is None
    assert state["timings"] == {}


def test_create_initial_state_custom_params():
    state = create_initial_state(
        query="Custom Query",
        session_id="custom-session-123",
        user_id="user-456",
        max_iterations=5,
    )

    assert state["query"] == "Custom Query"
    assert state["session_id"] == "custom-session-123"
    assert state["user_id"] == "user-456"
    assert state["max_iterations"] == 5
