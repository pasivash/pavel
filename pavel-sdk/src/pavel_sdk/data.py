"""Utilities for loading dbt execution artefacts."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Mapping, MutableMapping, Sequence, Tuple, Union

import numpy as np
import pandas as pd

__all__ = [
    "ExecutionRecord",
    "Link",
    "Dataset",
    "load_dbt_artifacts",
]

JsonLike = Union[str, Path, Mapping[str, object]]


@dataclass(frozen=True)
class ExecutionRecord:
    """Represents a single dbt model execution."""

    worker: str
    started_at: datetime
    completed_at: datetime
    model: str

    @property
    def duration(self) -> float:
        """Return the execution duration in seconds."""

        return (self.completed_at - self.started_at).total_seconds()

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "worker": self.worker,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat(),
            "model": self.model,
            "duration": self.duration,
        }


@dataclass(frozen=True)
class Link:
    """Represents a dependency edge between two models."""

    source: str
    target: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {"source": self.source, "target": self.target}


@dataclass
class Dataset:
    """In-memory representation of execution records and dependencies."""

    records: pd.DataFrame
    links: pd.DataFrame

    @classmethod
    def from_records(cls, records: Sequence[ExecutionRecord], links: Sequence[Link]) -> "Dataset":
        records_df = pd.DataFrame([r.as_dict() for r in records])
        links_df = pd.DataFrame([l.as_dict() for l in links]) if links else pd.DataFrame(columns=["source", "target"])
        if not records_df.empty:
            records_df["started_at"] = pd.to_datetime(records_df["started_at"], utc=True).dt.tz_convert(None)
            records_df["completed_at"] = pd.to_datetime(records_df["completed_at"], utc=True).dt.tz_convert(None)
            records_df["duration"] = (
                records_df["completed_at"] - records_df["started_at"]
            ).dt.total_seconds()
        return cls(records=records_df, links=links_df)

    @property
    def total_duration(self) -> float:
        if self.records.empty:
            return 0.0
        start = self.records["started_at"].min()
        end = self.records["completed_at"].max()
        return float((end - start).total_seconds())

    @property
    def total_models(self) -> int:
        return int(self.records.shape[0])

    @property
    def total_workers(self) -> int:
        if self.records.empty:
            return 0
        return int(self.records["worker"].nunique())

    def to_payload(self) -> Tuple[List[MutableMapping[str, object]], List[MutableMapping[str, object]]]:
        records_payload = (
            self.records.assign(
                started_at=lambda df: df["started_at"].dt.strftime("%Y-%m-%dT%H:%M:%S.%f"),
                completed_at=lambda df: df["completed_at"].dt.strftime("%Y-%m-%dT%H:%M:%S.%f"),
            )
            .replace({np.nan: None})
            .to_dict("records")
        )
        links_payload = self.links.replace({np.nan: None}).to_dict("records")
        return records_payload, links_payload


def _load_json_object(value: JsonLike) -> Mapping[str, object]:
    if isinstance(value, Mapping):
        return value
    path = Path(value)
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def load_dbt_artifacts(
    run_results: JsonLike,
    graph_summary: JsonLike,
    *,
    ignore_thread_id: str = "main",
) -> Dataset:
    """Parse dbt artefacts into a :class:`Dataset`.

    Parameters
    ----------
    run_results:
        Either a mapping already loaded from ``run_results.json`` or a path to the file.
    graph_summary:
        Either a mapping already loaded from ``graph_summary.json`` or a path to the file.
    ignore_thread_id:
        Optional thread identifier to drop from the run results. dbt typically uses ``"main"``
        for bookkeeping which does not represent a real execution slot.
    """

    run_results_obj = _load_json_object(run_results)
    graph_summary_obj = _load_json_object(graph_summary)

    results = run_results_obj.get("results")
    if not isinstance(results, Sequence):
        raise ValueError("run_results JSON must contain a 'results' array")

    graph_nodes = graph_summary_obj.get("with_test_edges")
    if not isinstance(graph_nodes, Mapping):
        raise ValueError("graph_summary JSON must contain a 'with_test_edges' mapping")

    records: List[ExecutionRecord] = []
    for item in results:
        if not isinstance(item, Mapping):
            continue
        thread_id = item.get("thread_id")
        if not isinstance(thread_id, str) or thread_id == ignore_thread_id:
            continue

        timing = item.get("timing")
        if not isinstance(timing, Sequence):
            continue

        compile_started = _extract_timing(timing, "compile", "started_at")
        execute_finished = _extract_timing(timing, "execute", "completed_at")
        unique_id = item.get("unique_id")

        if not (compile_started and execute_finished and isinstance(unique_id, str)):
            continue

        started_at = _coerce_datetime(compile_started)
        completed_at = _coerce_datetime(execute_finished)
        records.append(
            ExecutionRecord(
                worker=thread_id,
                started_at=started_at,
                completed_at=completed_at,
                model=unique_id,
            )
        )

    links: List[Link] = []
    for node in graph_nodes.values():
        if not isinstance(node, Mapping):
            continue
        name = node.get("name")
        if not isinstance(name, str):
            continue
        successors = node.get("succ", [])
        if isinstance(successors, Sequence):
            for successor in successors:
                successor_node = None
                if isinstance(successor, str):
                    successor_node = graph_nodes.get(successor)
                    if not isinstance(successor_node, Mapping):
                        successor_node = next(
                            (
                                candidate
                                for candidate in graph_nodes.values()
                                if isinstance(candidate, Mapping) and candidate.get("name") == successor
                            ),
                            None,
                        )
                else:
                    successor_node = graph_nodes.get(str(successor))

                if isinstance(successor_node, Mapping):
                    successor_name = successor_node.get("name")
                    if isinstance(successor_name, str):
                        links.append(Link(source=name, target=successor_name))

    if not records:
        raise ValueError("No execution records found in run results artefact")

    return Dataset.from_records(records, links)


def _extract_timing(timing: Sequence[object], name: str, key: str) -> Union[str, None]:
    for entry in timing:
        if not isinstance(entry, Mapping):
            continue
        if entry.get("name") == name:
            value = entry.get(key)
            if isinstance(value, str):
                return value
    return None


def _coerce_datetime(value: str) -> datetime:
    dt = pd.to_datetime(value, utc=True)
    if isinstance(dt, pd.Series):  # pragma: no cover - defensive
        dt = dt.iloc[0]
    if not isinstance(dt, pd.Timestamp):
        raise ValueError(f"Unable to parse datetime value: {value!r}")
    return dt.to_pydatetime().replace(tzinfo=None)
