# Pavel SDK

Pavel SDK is a Python package for exploring dbt execution artifacts locally. It loads the same run results and graph summary JSON files that power the Pavel web experience and renders an interactive dashboard with timeline visualisations, worker activity graphs, model search and model dependency insights.

## Features

- Parse `run_results.json` and `graph_summary.json` exported from dbt
- Compute execution metrics and the critical path between models
- Launch an interactive Dash dashboard locally
- Display the dashboard inside notebooks using `IPython.display.IFrame`
- Extensible Python API for embedding the dashboard in your own applications

## Quick start

```python
from pavel_sdk import PavelDashboard

# Load data from dbt artifacts
app = PavelDashboard.from_dbt_artifacts(
    run_results_path="path/to/run_results.json",
    graph_summary_path="path/to/graph_summary.json",
)

# Run a local server (http://127.0.0.1:8050 by default)
app.run()

# Or display it inline in a notebook
app.iframe(height=900)
```

## Installation

Once published to PyPI the package can be installed via

```bash
pip install pavel-sdk
```

For local development clone the repository and install an editable build:

```bash
pip install -e .
```

## Command line usage

The package exposes a small CLI to launch the dashboard directly from the terminal:

```bash
pavel-sdk --run-results run_results.json --graph-summary graph_summary.json --port 8050
```

## Development

- Python 3.10+
- Install development dependencies: `pip install -e .[dev]`
- Run the test suite: `pytest`
- Format code: `ruff format` (lint: `ruff check`)

## License

MIT License.
