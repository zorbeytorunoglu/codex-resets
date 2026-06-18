# Contributing

## Development

~~~bash
npm install
npm run ci
~~~

Keep the package dependency-free unless a dependency removes meaningful maintenance risk. This CLI handles a small local-auth and HTTP request flow, so extra dependencies are usually not justified.

## Security

Never add logs, test fixtures, or examples containing real <code>auth.json</code> contents, bearer tokens, account IDs, or raw private endpoint responses.
