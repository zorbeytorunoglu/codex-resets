# Releasing

1. Update <code>package.json</code>, <code>src/version.js</code>, and <code>CHANGELOG.md</code>.
2. Run <code>npm run ci</code>.
3. Commit the release.
4. Tag the commit with <code>vX.Y.Z</code>.
5. Push <code>main</code> and the tag.

The release workflow publishes to npm through trusted publishing. Configure npm trusted publishing for:

- Package: <code>@zorbeytorunoglu/codex-resets</code>
- Repository: <code>zorbeytorunoglu/codex-resets</code>
- Workflow: <code>release.yml</code>
- Environment: none
