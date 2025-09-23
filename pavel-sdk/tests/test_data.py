from __future__ import annotations

import json

import pytest

from pavel_sdk.critical_path import calculate_critical_path
from pavel_sdk.data import load_dbt_artifacts


def _sample_run_results() -> dict:
    return {
        "results": [
            {
                "thread_id": "Thread-1",
                "unique_id": "model.a",
                "timing": [
                    {"name": "compile", "started_at": "2024-05-01T12:00:00+00:00"},
                    {"name": "execute", "completed_at": "2024-05-01T12:05:00+00:00"},
                ],
            },
            {
                "thread_id": "Thread-2",
                "unique_id": "model.b",
                "timing": [
                    {"name": "compile", "started_at": "2024-05-01T12:03:00+00:00"},
                    {"name": "execute", "completed_at": "2024-05-01T12:10:00+00:00"},
                ],
            },
            {
                "thread_id": "main",
                "unique_id": "model.ignored",
                "timing": [],
            },
        ]
    }


def _sample_graph_summary() -> dict:
    return {
        "with_test_edges": {
            "a": {"name": "model.a", "succ": ["b"]},
            "b": {"name": "model.b", "succ": []},
        }
    }


def test_load_dbt_artifacts(tmp_path):
    run_results_path = tmp_path / "run_results.json"
    graph_summary_path = tmp_path / "graph_summary.json"

    run_results_path.write_text(json.dumps(_sample_run_results()), encoding="utf-8")
    graph_summary_path.write_text(json.dumps(_sample_graph_summary()), encoding="utf-8")

    dataset = load_dbt_artifacts(run_results_path, graph_summary_path)

    assert dataset.total_models == 2
    assert dataset.total_workers == 2
    assert pytest.approx(dataset.total_duration, rel=1e-3) == 600.0
    assert set(dataset.links["target"]) == {"model.b"}


def test_dataset_payload_roundtrip(tmp_path):
    run_results_path = tmp_path / "run_results.json"
    graph_summary_path = tmp_path / "graph_summary.json"
    run_results_path.write_text(json.dumps(_sample_run_results()), encoding="utf-8")
    graph_summary_path.write_text(json.dumps(_sample_graph_summary()), encoding="utf-8")

    dataset = load_dbt_artifacts(run_results_path, graph_summary_path)
    records_payload, links_payload = dataset.to_payload()

    assert len(records_payload) == 2
    assert len(links_payload) == 1
    assert all("model" in record for record in records_payload)


def test_calculate_critical_path(tmp_path):
    run_results_path = tmp_path / "run_results.json"
    graph_summary_path = tmp_path / "graph_summary.json"
    run_results_path.write_text(json.dumps(_sample_run_results()), encoding="utf-8")
    graph_summary_path.write_text(json.dumps(_sample_graph_summary()), encoding="utf-8")

    dataset = load_dbt_artifacts(run_results_path, graph_summary_path)
    critical_path = calculate_critical_path(dataset)
    assert critical_path == ["model.a", "model.b"]
