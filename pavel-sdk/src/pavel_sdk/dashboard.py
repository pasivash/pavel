"""Dash powered dashboard for Pavel."""

from __future__ import annotations

import socket
import threading
import time
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from dash import ALL, Dash, Input, Output, State, ctx, dcc, html

from .critical_path import calculate_critical_path
from .data import Dataset, load_dbt_artifacts

__all__ = ["PavelDashboard"]


SUMMARY_CARD_STYLE = {
    "backgroundColor": "#ffffff",
    "padding": "12px 16px",
    "borderRadius": "8px",
    "boxShadow": "0 1px 2px rgba(15, 23, 42, 0.08)",
    "display": "flex",
    "flexDirection": "column",
}

SUMMARY_LABEL_STYLE = {"fontSize": "12px", "color": "#6b7280", "marginBottom": "4px"}
SUMMARY_VALUE_STYLE = {"fontSize": "16px", "fontWeight": "600", "color": "#111827"}

@dataclass
class PavelDashboard:
    """Encapsulates the Pavel interactive dashboard."""

    dataset: Dataset
    critical_path: List[str]
    _app: Optional[Dash] = None
    _thread: Optional[threading.Thread] = None
    _port: Optional[int] = None

    @classmethod
    def from_dbt_artifacts(cls, *, run_results_path: str, graph_summary_path: str) -> "PavelDashboard":
        dataset = load_dbt_artifacts(run_results_path, graph_summary_path)
        critical_path = calculate_critical_path(dataset)
        return cls(dataset=dataset, critical_path=critical_path)

    def run(self, *, host: str = "127.0.0.1", port: int = 8050, debug: bool = False) -> None:
        """Start the dashboard server and block until it stops."""

        app = self._build_app()
        app.run_server(host=host, port=port, debug=debug, use_reloader=False)

    def iframe(self, *, host: str = "127.0.0.1", port: Optional[int] = None, height: int = 900, width: str = "100%"):
        """Return an ``IPython.display.IFrame`` pointing at a running dashboard instance."""

        from IPython.display import IFrame

        if port is None:
            port = _find_free_port()

        if self._thread and self._thread.is_alive():
            url = f"http://{host}:{self._port}"
            return IFrame(url, width=width, height=height)

        app = self._build_app()
        self._port = port

        def _run():
            app.run_server(host=host, port=port, debug=False, use_reloader=False)

        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()
        time.sleep(1.0)
        url = f"http://{host}:{port}"
        return IFrame(url, width=width, height=height)

    # ------------------------------------------------------------------
    # Dash layout & callbacks
    # ------------------------------------------------------------------

    def _build_app(self) -> Dash:
        if self._app:
            return self._app

        records_payload, links_payload = self.dataset.to_payload()
        critical_path = self.critical_path

        app = Dash(__name__)
        app.title = "Pavel"

        app.layout = html.Div(
            [
                dcc.Store(id="records-store", data=records_payload),
                dcc.Store(id="links-store", data=links_payload),
                dcc.Store(id="critical-path-store", data=critical_path),
                dcc.Store(id="selected-model-store"),
                html.H1("Pipeline Analytics & Visualization for Execution Logs", style={"fontSize": "28px", "marginBottom": "12px"}),
                html.Div(
                    [
                        html.Div(
                            [
                                html.Span("Total Duration", style=SUMMARY_LABEL_STYLE),
                                html.Span(_format_duration(self.dataset.total_duration), style=SUMMARY_VALUE_STYLE),
                            ],
                            style=SUMMARY_CARD_STYLE,
                        ),
                        html.Div(
                            [
                                html.Span("Models", style=SUMMARY_LABEL_STYLE),
                                html.Span(f"{self.dataset.total_models}", style=SUMMARY_VALUE_STYLE),
                            ],
                            style=SUMMARY_CARD_STYLE,
                        ),
                        html.Div(
                            [
                                html.Span("Workers", style=SUMMARY_LABEL_STYLE),
                                html.Span(f"{self.dataset.total_workers}", style=SUMMARY_VALUE_STYLE),
                            ],
                            style=SUMMARY_CARD_STYLE,
                        ),
                    ],
                    style={
                        "display": "flex",
                        "gap": "12px",
                        "marginBottom": "24px",
                        "flexWrap": "wrap",
                    },
                ),
                html.Div(
                    [
                        html.Div(
                            [
                                html.Label("Search models", style={"display": "block", "fontWeight": 600}),
                                dcc.Dropdown(
                                    id="model-dropdown",
                                    options=[{"label": model, "value": model} for model in sorted(self.dataset.records["model"].unique())],
                                    placeholder="Search models...",
                                    style={"width": "100%"},
                                ),
                                html.Div(
                                    [
                                        dcc.Checklist(
                                            id="critical-path-toggle",
                                            options=[{"label": "Highlight critical path", "value": "critical"}],
                                            value=["critical"] if critical_path else [],
                                            style={"marginTop": "12px"},
                                        ),
                                        html.Button("Reset selection", id="reset-selection", n_clicks=0, style={"marginTop": "12px"}),
                                    ],
                                    style={"display": "flex", "gap": "16px", "alignItems": "center"},
                                ),
                            ],
                            style={"flex": "1", "minWidth": "260px"},
                        ),
                        html.Div(
                            [
                                dcc.Graph(id="worker-activity-graph", config={"displayModeBar": False}),
                            ],
                            style={"flex": "1", "minWidth": "320px"},
                        ),
                    ],
                    style={"display": "flex", "gap": "24px", "flexWrap": "wrap", "marginBottom": "24px"},
                ),
                html.Div(
                    [
                        dcc.Graph(id="timeline-graph", config={"displayModeBar": False}),
                    ],
                    style={"marginBottom": "24px"},
                ),
                html.Div(
                    [
                        html.Div(
                            [
                                html.H2("Critical Path", style={"fontSize": "20px", "marginBottom": "8px"}),
                                html.P(
                                    f"Length: {len(critical_path)} models" if critical_path else "No critical path available",
                                    id="critical-path-summary",
                                    style={"marginBottom": "8px"},
                                ),
                                html.Div(id="critical-path-list", style={"display": "flex", "flexWrap": "wrap", "gap": "8px"}),
                            ],
                            style={"flex": "1", "minWidth": "280px", "backgroundColor": "#ffffff", "padding": "16px", "borderRadius": "8px", "boxShadow": "0 1px 2px rgba(15,23,42,0.08)"},
                        ),
                        html.Div(
                            [
                                html.H2("Model Details", style={"fontSize": "20px", "marginBottom": "8px"}),
                                html.Div(id="model-details", children=_render_empty_details()),
                            ],
                            style={"flex": "1", "minWidth": "320px", "backgroundColor": "#ffffff", "padding": "16px", "borderRadius": "8px", "boxShadow": "0 1px 2px rgba(15,23,42,0.08)"},
                        ),
                    ],
                    style={"display": "flex", "gap": "24px", "flexWrap": "wrap"},
                ),
            ],
            style={
                "fontFamily": "Inter, system-ui, sans-serif",
                "backgroundColor": "#f8fafc",
                "minHeight": "100vh",
                "padding": "24px",
            },
        )

        self._register_callbacks(app)
        self._app = app
        return app

    def _register_callbacks(self, app: Dash) -> None:
        @app.callback(
            Output("selected-model-store", "data"),
            [
                Input("model-dropdown", "value"),
                Input("timeline-graph", "clickData"),
                Input("reset-selection", "n_clicks"),
            ],
            State("selected-model-store", "data"),
        )
        def _update_selected_model(dropdown_value, click_data, reset_clicks, current):  # type: ignore[unused-ignore]
            trigger = ctx.triggered_id
            if trigger == "reset-selection":
                return None
            if trigger == "timeline-graph" and click_data:
                try:
                    return click_data["points"][0]["customdata"][0]
                except (KeyError, IndexError, TypeError):
                    return current
            if trigger == "model-dropdown":
                return dropdown_value
            return current

        @app.callback(
            Output("model-dropdown", "value"),
            Input("selected-model-store", "data"),
        )
        def _sync_dropdown(selected_model):  # type: ignore[unused-ignore]
            return selected_model

        @app.callback(
            Output("timeline-graph", "figure"),
            Input("records-store", "data"),
            Input("selected-model-store", "data"),
            Input("critical-path-toggle", "value"),
            State("critical-path-store", "data"),
        )
        def _update_timeline(records_data, selected_model, toggle_value, critical_path_data):  # type: ignore[unused-ignore]
            df = _records_dataframe(records_data)
            highlight = critical_path_data if toggle_value and "critical" in toggle_value else []
            return _build_timeline_figure(df, selected_model, highlight)

        @app.callback(
            Output("worker-activity-graph", "figure"),
            Input("records-store", "data"),
            Input("selected-model-store", "data"),
        )
        def _update_worker_activity(records_data, selected_model):  # type: ignore[unused-ignore]
            df = _records_dataframe(records_data)
            return _build_worker_activity_figure(df, selected_model)

        @app.callback(
            Output("model-details", "children"),
            Input("selected-model-store", "data"),
            State("records-store", "data"),
            State("links-store", "data"),
        )
        def _update_model_details(selected_model, records_data, links_data):  # type: ignore[unused-ignore]
            df = _records_dataframe(records_data)
            links_df = pd.DataFrame(links_data or [])
            return _render_model_details(df, links_df, selected_model)

        @app.callback(
            Output("critical-path-summary", "children"),
            Output("critical-path-list", "children"),
            Input("critical-path-store", "data"),
            Input("selected-model-store", "data"),
        )
        def _update_critical_path_summary(path_data, selected_model):  # type: ignore[unused-ignore]
            if not path_data:
                return "No critical path available", []
            summary = f"Length: {len(path_data)} models"
            chips = []
            for model in path_data:
                chips.append(
                    html.Button(
                        model,
                        n_clicks=0,
                        id={"type": "critical-chip", "model": model},
                        style={
                            "padding": "4px 8px",
                            "border": "1px solid #0f172a",
                            "backgroundColor": "#0ea5e9" if model == selected_model else "#e0f2fe",
                            "color": "#0f172a",
                            "borderRadius": "999px",
                        },
                    )
                )
            return summary, chips

        @app.callback(
            Output("selected-model-store", "data"),
            Input({"type": "critical-chip", "model": ALL}, "n_clicks"),
            State({"type": "critical-chip", "model": ALL}, "id"),
            State("selected-model-store", "data"),
            prevent_initial_call=True,
        )
        def _handle_chip_click(clicks, _ids, current):  # type: ignore[unused-ignore]
            trigger = ctx.triggered_id
            if isinstance(trigger, dict):
                return trigger.get("model", current)
            return current

    # ------------------------------------------------------------------
    # Helper functions
    # ------------------------------------------------------------------


def _records_dataframe(records: Optional[Sequence[dict]]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame(columns=["model", "worker", "started_at", "completed_at", "duration"])

    df = pd.DataFrame(records)
    df["started_at"] = pd.to_datetime(df["started_at"])
    df["completed_at"] = pd.to_datetime(df["completed_at"])
    if "duration" not in df:
        df["duration"] = (df["completed_at"] - df["started_at"]).dt.total_seconds()
    return df


def _build_timeline_figure(df: pd.DataFrame, selected_model: Optional[str], critical_path: Sequence[str]) -> go.Figure:
    if df.empty:
        return go.Figure()

    highlight_set = set(critical_path)

    def _colour(row):
        if selected_model and row["model"] == selected_model:
            return "Selected"
        if row["model"] in highlight_set:
            return "Critical Path"
        return "Normal"

    df = df.copy()
    df["_state"] = df.apply(_colour, axis=1)

    worker_order = sorted(df["worker"].unique(), key=_worker_sort_key)

    fig = px.timeline(
        df,
        x_start="started_at",
        x_end="completed_at",
        y="worker",
        color="_state",
        category_orders={"worker": worker_order},
        color_discrete_map={
            "Normal": "#d1d5db",
            "Critical Path": "#0ea5e9",
            "Selected": "#2563eb",
        },
        hover_data={
            "model": True,
            "worker": True,
            "duration": True,
            "_state": False,
        },
        custom_data=["model", "worker", "duration"],
    )
    fig.update_layout(
        showlegend=False,
        margin=dict(l=120, r=20, t=40, b=40),
        plot_bgcolor="#ffffff",
        paper_bgcolor="#ffffff",
        hoverlabel=dict(bgcolor="#0f172a", font_color="#ffffff"),
    )
    fig.update_yaxes(autorange="reversed")
    fig.update_traces(marker=dict(line=dict(color="#0f172a", width=0.5)))
    fig.update_traces(hovertemplate="<b>%{customdata[0]}</b><br>Worker: %{customdata[1]}<br>Duration: %{customdata[2]:.0f}s<extra></extra>")
    return fig


def _build_worker_activity_figure(df: pd.DataFrame, selected_model: Optional[str]) -> go.Figure:
    if df.empty:
        return go.Figure()

    activity = _calculate_worker_activity(df)
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=activity["time"],
            y=activity["active_workers"],
            mode="lines",
            line=dict(color="#2563eb", width=2),
            hovertemplate="%{x|%H:%M:%S}: %{y} workers<extra></extra>",
        )
    )

    if selected_model:
        match = df[df["model"] == selected_model]
        if not match.empty:
            start = match["started_at"].iloc[0]
            end = match["completed_at"].iloc[0]
            fig.add_vrect(
                x0=start,
                x1=end,
                fillcolor="rgba(14, 165, 233, 0.2)",
                line_width=0,
                annotation_text=selected_model,
                annotation_position="top left",
            )

    fig.update_layout(
        margin=dict(l=40, r=20, t=30, b=40),
        plot_bgcolor="#ffffff",
        paper_bgcolor="#ffffff",
        xaxis_title="Time",
        yaxis_title="Active workers",
    )
    return fig


def _calculate_worker_activity(df: pd.DataFrame, freq: str = "5S") -> pd.DataFrame:
    start = df["started_at"].min()
    end = df["completed_at"].max()
    if start is None or end is None or pd.isna(start) or pd.isna(end):
        return pd.DataFrame(columns=["time", "active_workers"])
    index = pd.date_range(start=start.floor("S"), end=end.ceil("S"), freq=freq)
    if index.empty:
        index = pd.DatetimeIndex([start, end])

    starts = pd.Series(1, index=df["started_at"])
    ends = pd.Series(-1, index=df["completed_at"])
    events = pd.concat([starts, ends]).sort_index()
    events = events.groupby(level=0).sum()
    activity = events.cumsum()
    activity = activity.reindex(index, method="ffill").fillna(0)
    return pd.DataFrame({"time": activity.index, "active_workers": activity.values.astype(int)})


def _render_model_details(records: pd.DataFrame, links: pd.DataFrame, model: Optional[str]):
    if not model:
        return _render_empty_details()
    match = records[records["model"] == model]
    if match.empty:
        return _render_empty_details()
    record = match.iloc[0]
    parents = links[links["target"] == model]["source"].tolist()
    children = links[links["source"] == model]["target"].tolist()
    return html.Div(
        [
            html.P([html.Strong("Model:"), html.Span(f" {model}")]),
            html.P([html.Strong("Worker:"), html.Span(f" {record['worker']}")]),
            html.P(
                [
                    html.Strong("Execution time:"),
                    html.Span(f" {record['started_at'].strftime('%Y-%m-%d %H:%M:%S')}"),
                    html.Span(" → "),
                    html.Span(record["completed_at"].strftime("%Y-%m-%d %H:%M:%S")),
                ]
            ),
            html.P([html.Strong("Duration:"), html.Span(f" {int(record['duration'])} seconds")]),
            html.Hr(),
            html.H3("Parents", style={"fontSize": "16px"}),
            html.Ul([html.Li(parent) for parent in parents] or [html.Li("None")]),
            html.H3("Children", style={"fontSize": "16px"}),
            html.Ul([html.Li(child) for child in children] or [html.Li("None")]),
        ]
    )


def _render_empty_details():
    return html.P("Select a model to view details", style={"color": "#6b7280"})


def _worker_sort_key(worker: str) -> Tuple[int, str]:
    import re

    match = re.search(r"\d+", worker)
    numeric = int(match.group()) if match else 0
    return numeric, worker


def _format_duration(seconds: float) -> str:
    seconds = int(seconds)
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours}h {minutes}m {secs}s"


def _find_free_port() -> int:
    sock = socket.socket()
    sock.bind(("", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port
