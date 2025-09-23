"""Command line interface for launching the Pavel dashboard."""

from __future__ import annotations

from pathlib import Path
import typer

from .dashboard import PavelDashboard

app = typer.Typer(add_completion=False, help="Launch the Pavel dashboard from dbt artefacts")


@app.command()
def main(
    run_results: Path = typer.Option(..., exists=True, file_okay=True, dir_okay=False, help="Path to run_results.json"),
    graph_summary: Path = typer.Option(..., exists=True, file_okay=True, dir_okay=False, help="Path to graph_summary.json"),
    host: str = typer.Option("127.0.0.1", help="Host interface to bind the dashboard to"),
    port: int = typer.Option(8050, help="Port to listen on"),
) -> None:
    """Launch the dashboard server."""

    dashboard = PavelDashboard.from_dbt_artifacts(
        run_results_path=str(run_results),
        graph_summary_path=str(graph_summary),
    )
    typer.echo(
        f"Launching Pavel dashboard on http://{host}:{port} with {dashboard.dataset.total_models} models",
    )
    dashboard.run(host=host, port=port)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    app()
