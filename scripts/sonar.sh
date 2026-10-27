#!/usr/bin/env bash
# Runs both packages' tests with coverage and sends the analysis, with that coverage, to the
# SonarQube server. The same script runs in CI (.github/workflows/sonarqube.yml) and locally.
# Expects each package's dependencies to be installed (npm ci), and a Docker daemon for the
# API's integration tests.
#
# Reads SONAR_HOST_URL and SONAR_TOKEN from the environment. Locally they come from 1Password:
#   op run --env-file sonar.env -- scripts/sonar.sh
set -euo pipefail

for name in SONAR_HOST_URL SONAR_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "$name is not set. Run this through 'op run --env-file sonar.env -- ...'." >&2
    exit 1
  fi
done

cd "$(dirname "$0")/.."

# Stale reports from an earlier run would be reported as this one's.
rm -rf api/coverage web/coverage

# A failing test still lets the analysis through, so the server sees the code's issues; the
# script fails afterwards.
test_exit=0
(cd api && npm run test:coverage) || test_exit=$?
(cd web && npm run test:coverage) || test_exit=$?

# Reads sonar-project.properties. The scanner fetches a Java runtime from the server.
npx --yes @sonar/scan@5

if (( test_exit )); then
  echo 'Tests failed.' >&2
  exit "$test_exit"
fi
