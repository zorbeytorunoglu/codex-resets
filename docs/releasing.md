# Releasing

Use the release script from a clean, synced <code>main</code> branch.

Dry run:

~~~bash
npm run release -- patch --notes "Describe the user-visible change"
~~~

Publish to production:

~~~bash
npm run release -- patch --notes "Describe the user-visible change" --yes
~~~

The script updates <code>package.json</code>, <code>package-lock.json</code>, <code>src/version.js</code>, and <code>CHANGELOG.md</code>, then runs <code>npm run ci</code>, commits, tags, and pushes <code>main</code> plus the release tag.

Accepted release targets:

- <code>patch</code>
- <code>minor</code>
- <code>major</code>
- explicit semver, for example <code>0.2.0</code>

The release workflow publishes to npm through trusted publishing. Configure npm trusted publishing for:

- Package: <code>@zorbeytorunoglu/codex-resets</code>
- Repository: <code>zorbeytorunoglu/codex-resets</code>
- Workflow: <code>release.yml</code>
- Environment: none
