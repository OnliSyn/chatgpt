# ONLI MCP Service

This project provides a minimal implementation of an **Onli Model Context Protocol (MCP) service**.  The service exposes a set of functions that help map business use cases to the correct ONLI model configuration (Denomination, Symmetric or Series) and plan the corresponding transaction flow.  These functions are intended to be used by appliances or agents integrating with the Onli Cloud v3 API.

## Overview

The MCP service encapsulates the logic for:

- **Recommending a build configuration** based on the input use case (whether assets are fungible units, discrete items, or belong to a series).
- **Planning a flow** that reflects how a transaction should be executed on the Onli Cloud: e.g. self‑vault moves, owner‑to‑owner transfers or conditional, appliance‑mediated transfers.
- **Generating API requests** for the Cloud API endpoints (`/issue`, `/askToMove`, `/changeOwner` and `/changeOwners`).

This repository is a simple starting point for developers looking to integrate ONLI into their applications.  It is not production ready, and does not include server or network code.  Extend the functions here or wrap them in a web service as needed.

## File Structure

```
onli_mcp_service/
├── src/
│   ├── index.js    # main library code defining MCP functions
│   └── schemas.js  # JSON schemas for inputs and outputs
├── package.json    # project metadata
└── README.md       # overview and usage
```

## Usage

Install dependencies (if using the MCP SDK) and require the library in your code:

```js
const mcp = require('./src');

// Example input for recommending configuration
const input = {
  needs_denominations: true,
  needs_series: false,
  unit_is_unique: false
};

const recommendation = mcp.recommend_configuration(input);
console.log(recommendation);

// Plan a flow
const flow = mcp.plan_flow({
  entry: 'owner-vault',
  pattern: 'owner-to-owner',
  condition: null,
  config: 'Denomination',
  amount: 10,
  parties: { from_owner: 'usr-A', to_owner: 'usr-B' }
});
console.log(flow);

// Generate request bodies
const requests = mcp.generate_requests(flow, { app_symbol: 'ENGMA', app_key: 'app-key-code' });
console.log(requests);
```

## License

MIT