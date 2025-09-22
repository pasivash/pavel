# Pavel Visualization API

This project provides a UI for uploading dbt execution logs and visualizing them.

In addition to the web interface, you can now create visualizations programmatically by
posting your dbt `run_results.json` and graph summary data to the dataset API.

## Programmatic dataset uploads

Send a `POST` request to `/api/datasets` with either `application/json` or
`multipart/form-data` content. The payload must include the contents of both dbt
artifacts.

### JSON payload example

```bash
curl -X POST "https://<your-host>/api/datasets" \
  -H "Content-Type: application/json" \
  -d '{
        "run_results": { ... },
        "graph_summary": { ... }
      }'
```

### Multipart form example

```bash
curl -X POST "https://<your-host>/api/datasets" \
  -F run_results=@run_results.json \
  -F graph_summary=@graph_summary.json
```

The response includes a dataset identifier, an access token, and a direct URL to the visualization:

```json
{
  "datasetId": "a1b2c3d4",
  "token": "1f2e3d4c-5b6a-7980-1234-56789abcdef0",
  "url": "https://<your-host>/pavel/res?dataset=a1b2c3d4&token=1f2e3d4c-5b6a-7980-1234-56789abcdef0",
  "records": 42,
  "links": 120
}
```

Opening the returned URL loads the uploaded dataset and renders the visualization
without needing to go through the manual upload flow. The token acts as a bearer
credential—include it when calling `/api/datasets/{datasetId}` to retrieve the
data programmatically.

Datasets are stored in-memory for one hour. Upload them again if you need a fresh link
after the data expires.

