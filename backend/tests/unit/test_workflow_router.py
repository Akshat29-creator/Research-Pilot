from app.workflows.router import route_after_review
from app.workflows.state import create_initial_state


def test_route_after_review_passed():
    state = create_initial_state("query")
    state["iteration_count"] = 1
    state["review_feedback"] = {
        "passed": True,
        "grounding_score": 0.95,
        "critique": "Solid grounding",
    }

    next_node = route_after_review(state)
    assert next_node == "final_report"


def test_route_after_review_failed_iterations_remain():
    state = create_initial_state("query", max_iterations=3)
    state["iteration_count"] = 1
    state["review_feedback"] = {
        "passed": False,
        "grounding_score": 0.65,
        "critique": "Missing citations",
    }

    next_node = route_after_review(state)
    assert next_node == "writer"


def test_route_after_review_failed_max_iterations_reached():
    state = create_initial_state("query", max_iterations=3)
    state["iteration_count"] = 3
    state["review_feedback"] = {
        "passed": False,
        "grounding_score": 0.70,
        "critique": "Unverified claims",
    }

    # Must bound the loop and exit to final_report
    next_node = route_after_review(state)
    assert next_node == "final_report"


def test_route_after_review_none_feedback():
    state = create_initial_state("query")
    state["iteration_count"] = 0
    state["review_feedback"] = None

    next_node = route_after_review(state)
    assert next_node == "writer"
