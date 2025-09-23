"""Critical path calculation for dbt execution graphs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, MutableMapping

from .data import Dataset

__all__ = ["calculate_critical_path"]


@dataclass
class _Node:
    id: str
    duration: float
    parents: List[str]
    children: List[str]
    earliest_start: float = 0.0
    earliest_finish: float = 0.0
    latest_start: float = 0.0
    latest_finish: float = 0.0


def _build_graph(dataset: Dataset) -> Dict[str, _Node]:
    nodes: Dict[str, _Node] = {}
    for record in dataset.records.to_dict("records"):
        nodes[record["model"]] = _Node(
            id=record["model"],
            duration=float(record["duration"]),
            parents=[],
            children=[],
        )

    for link in dataset.links.to_dict("records"):
        source = link.get("source")
        target = link.get("target")
        if source in nodes and target in nodes:
            nodes[source].children.append(target)
            nodes[target].parents.append(source)

    return nodes


def calculate_critical_path(dataset: Dataset) -> List[str]:
    """Return the ordered list of model ids that form the critical path."""

    if dataset.records.empty:
        return []

    graph = _build_graph(dataset)
    if not graph:
        return []

    in_degree: MutableMapping[str, int] = {node_id: len(node.parents) for node_id, node in graph.items()}
    queue = [node_id for node_id, deg in in_degree.items() if deg == 0]
    order: List[str] = []

    while queue:
        current = queue.pop(0)
        order.append(current)
        node = graph[current]
        node.earliest_finish = node.earliest_start + node.duration
        for child_id in node.children:
            child = graph[child_id]
            child.earliest_start = max(child.earliest_start, node.earliest_finish)
            in_degree[child_id] -= 1
            if in_degree[child_id] == 0:
                queue.append(child_id)

    if not order:
        return []

    project_end = max(graph[node_id].earliest_finish for node_id in graph)
    for node_id in reversed(order):
        node = graph[node_id]
        if not node.children:
            node.latest_finish = project_end
        else:
            node.latest_finish = min(graph[child].latest_start for child in node.children)
        node.latest_start = node.latest_finish - node.duration

    # Reconstruct critical path
    critical_path: List[str] = []
    current = None
    for node_id in reversed(order):
        node = graph[node_id]
        if not node.children and abs(node.earliest_finish - node.latest_finish) < 1e-6:
            current = node_id
            break

    while current:
        critical_path.insert(0, current)
        parents = graph[current].parents
        next_parent = None
        for parent in parents:
            parent_node = graph[parent]
            if abs(parent_node.earliest_finish - parent_node.latest_finish) < 1e-6 and abs(
                parent_node.earliest_finish - graph[current].earliest_start
            ) < 1e-6:
                next_parent = parent
                break
        current = next_parent

    return critical_path
