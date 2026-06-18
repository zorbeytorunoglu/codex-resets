<h1 align="center">codex-resets</h1>

<p align="center">Show Codex reset-credit grant and expiry dates from your local Codex auth</p>

<p align="center">
  <a href="https://github.com/zorbeytorunoglu/codex-resets/actions/workflows/tests.yml"><img src="https://img.shields.io/github/actions/workflow/status/zorbeytorunoglu/codex-resets/tests.yml?branch=main&label=tests" alt="Tests" /></a>
  <a href="https://www.npmjs.com/package/@zorbeytorunoglu/codex-resets"><img src="https://img.shields.io/npm/v/@zorbeytorunoglu/codex-resets" alt="npm" /></a>
  <a href="https://github.com/zorbeytorunoglu/codex-resets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/zorbeytorunoglu/codex-resets?color=blue" alt="License" /></a>
</p>

---

## Overview

Codex shows how many reset credits are available, but not always when those credits expire. This CLI reads your local Codex auth, calls the same reset-credit backend endpoint, and prints the grant and expiry dates.

This is an unofficial local inspection tool. The endpoint is not a public API and may change or disappear.

## Install

~~~bash
npm install -g @zorbeytorunoglu/codex-resets
~~~

## Usage

~~~bash
codex-resets
~~~

Example output:

~~~text
Resets available: 2

1. One free rate limit reset
   Status: available
   Type: codex_rate_limits
   Granted: 2026-06-12 07:37:38 +03
   Expires: 2026-07-12 07:37:38 +03
   Time left: 23d 10h 10m
~~~

### Options

~~~text
codex-resets [--json] [--raw] [--warn-hours <hours>] [--auth <path>]
~~~

| Option | Description |
| --- | --- |
| <code>--json</code> | Print stable redacted JSON for scripts. |
| <code>--raw</code> | Print the raw endpoint response for local troubleshooting. Do not share blindly. |
| <code>--warn-hours &lt;hours&gt;</code> | Warn when a reset expires within this many hours. Default: <code>48</code>. |
| <code>--auth &lt;path&gt;</code> | Read a specific Codex <code>auth.json</code> file. |
| <code>--help</code> | Show help. |
| <code>--version</code> | Show package version. |

Auth lookup order:

1. <code>--auth &lt;path&gt;</code>
2. <code>$CODEX_HOME/auth.json</code>
3. <code>~/.codex/auth.json</code>

## Security

<code>codex-resets</code> reads <code>auth.json</code> locally at runtime. It does not copy, cache, or upload your token anywhere except as the bearer token required for the Codex backend request.

The default and <code>--json</code> outputs never include your access token, account ID, auth headers, or auth file contents. <code>--raw</code> may include account-specific metadata from the backend response and should not be pasted publicly.

## Development

~~~bash
npm install
npm run ci
~~~

## Release

Releases are automated from a clean, synced <code>main</code> branch:

1. Preview the release:

   ~~~bash
   npm run release -- patch --notes "Describe the user-visible change"
   ~~~

2. Publish it:

   ~~~bash
   npm run release -- patch --notes "Describe the user-visible change" --yes
   ~~~

The script updates version files and the changelog, runs checks, commits, tags, and pushes. GitHub Actions then builds the npm tarball, publishes to npm with provenance through trusted publishing, and creates a GitHub Release.
