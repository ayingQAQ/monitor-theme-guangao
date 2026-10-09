# Project instructions

- Follow the official Monitor theme and architecture guides linked in README.
- Keep fixes scoped to the requested behavior; preserve card proportions and unrelated typography.
- Do not commit credentials, real node data, databases, local deployment records or environment files. Use labeled development fixtures for screenshots.
- For each bug fix, reproduce the failure, add an appropriate regression check, fix it and run the relevant verification.
- The maintainer requests automatic publication after verified bug fixes: commit and push to GitHub, increment the patch version consistently in theme.json, package.json and package-lock.json, and publish a new formal Release with theme.tar.gz and its checksum. Do not reuse or move published version tags.
- Run the Hub archive-root check and validate installation on a dedicated test Hub when available. Do not modify existing agents or active site settings while testing.
- Include MIT and third-party notices in the source and distributable package.
- Release titles must be the version tag only (for example, v0.1.4). Keep release notes brief.
