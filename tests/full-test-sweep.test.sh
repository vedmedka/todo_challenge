#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
WORK_DIR="$TMP_DIR/workspace"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$WORK_DIR/scripts" "$WORK_DIR/backend" "$WORK_DIR/frontend"
cp "$SOURCE_ROOT/scripts/full-test-sweep.sh" "$WORK_DIR/scripts/full-test-sweep.sh"
chmod +x "$WORK_DIR/scripts/full-test-sweep.sh"
cat >"$WORK_DIR/scripts/persistence-smoke.sh" <<'FAKE_PERSISTENCE'
#!/usr/bin/env bash
set -euo pipefail

printf 'persistence ok\n'
FAKE_PERSISTENCE
chmod +x "$WORK_DIR/scripts/persistence-smoke.sh"

mkdir -p "$WORK_DIR/test-results/full-sweep/runs/existing-diagnostics"
printf 'keep diagnostics\n' >"$WORK_DIR/test-results/full-sweep/runs/existing-diagnostics/keep.txt"

FAKE_BIN="$TMP_DIR/bin"
mkdir -p "$FAKE_BIN"

cat >"$FAKE_BIN/docker" <<'FAKE_DOCKER'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >>"${FAKE_DOCKER_LOG:?}"

if [[ "$1" != "compose" ]]; then
  echo "unexpected docker invocation: $*" >&2
  exit 91
fi

shift
case "$1" in
  up)
    if [[ "$*" != "up -d --build --force-recreate" ]]; then
      echo "compose up must force-recreate stateful services: $*" >&2
      exit 94
    fi
    exit 0
    ;;
  exec)
    shift
    if [[ "$1" == "-T" ]]; then
      shift
    fi
    service="$1"
    shift
    case "$service:$*" in
      "backend:mvn verify")
        mkdir -p backend/target/surefire-reports
        mkdir -p backend/target/site/jacoco
        mkdir -p backend/target/pit-reports/202608150000
        printf '<testsuite tests="1" failures="0" errors="0"/>\n' >backend/target/surefire-reports/TEST-backend.xml
        printf '<html>jacoco</html>\n' >backend/target/site/jacoco/index.html
        printf '<report><counter type="INSTRUCTION" missed="10" covered="90"/><counter type="BRANCH" missed="20" covered="80"/><counter type="LINE" missed="5" covered="95"/></report>\n' >backend/target/site/jacoco/jacoco.xml
        printf '<html>pit</html>\n' >backend/target/pit-reports/202608150000/index.html
        printf '<BugCollection/>\n' >backend/target/spotbugsXml.xml
        printf 'backend ok\n'
        ;;
      "frontend:npm run lint")
        printf 'lint ok\n'
        ;;
      "frontend:npm run test:coverage")
        mkdir -p frontend/coverage/todo-frontend
        printf '<html>coverage</html>\n' >frontend/coverage/todo-frontend/index.html
        printf 'Statements   : 90%%\n'
        printf 'Branches     : 80%%\n'
        printf 'Functions    : 85%%\n'
        printf 'Lines        : 91%%\n'
        printf 'unit ok\n'
        ;;
      "frontend:npm run e2e")
        mkdir -p frontend/test-results/e2e
        printf '{"status":"passed"}\n' >frontend/test-results/.last-run.json
        printf 'trace\n' >frontend/test-results/e2e/trace.txt
        printf 'e2e ok\n'
        ;;
      *)
        echo "unexpected compose exec command: $service:$*" >&2
        exit 92
        ;;
    esac
    ;;
  *)
    echo "unexpected compose command: $*" >&2
    exit 93
    ;;
esac
FAKE_DOCKER
chmod +x "$FAKE_BIN/docker"

export PATH="$FAKE_BIN:$PATH"
export FAKE_DOCKER_LOG="$TMP_DIR/docker.log"

cd "$WORK_DIR"
OUTPUT="$TMP_DIR/full-sweep-output.txt"
scripts/full-test-sweep.sh >"$OUTPUT"

SUMMARY="$WORK_DIR/test-results/full-sweep/latest-summary.json"
if [[ ! -f "$SUMMARY" ]]; then
  echo "missing latest-summary.json" >&2
  exit 1
fi

grep -q '"status": "passed"' "$SUMMARY"
grep -q '"name": "backend"' "$SUMMARY"
grep -q '"name": "backend-persistence"' "$SUMMARY"
grep -q '"name": "frontend-lint"' "$SUMMARY"
grep -q '"name": "frontend-unit"' "$SUMMARY"
grep -q '"name": "frontend-e2e"' "$SUMMARY"

test -f "$WORK_DIR/test-results/full-sweep/runs/existing-diagnostics/keep.txt"

RUN_DIR="$(find "$WORK_DIR/test-results/full-sweep/runs" -mindepth 2 -maxdepth 2 -path '*/suites' -type d | sed 's#/suites$##' | head -1)"
if [[ -z "$RUN_DIR" ]]; then
  echo "missing full sweep run directory" >&2
  exit 1
fi

test -f "$RUN_DIR/suites/backend/summary.json"
test -f "$RUN_DIR/suites/backend-persistence/summary.json"
test -f "$RUN_DIR/suites/frontend-lint/summary.json"
test -f "$RUN_DIR/suites/frontend-unit/summary.json"
test -f "$RUN_DIR/suites/frontend-e2e/summary.json"
grep -q '"instruction_percent": 90.00' "$RUN_DIR/suites/backend/summary.json"
grep -q '"branch_percent": 80.00' "$RUN_DIR/suites/backend/summary.json"
grep -q '"line_percent": 95.00' "$RUN_DIR/suites/backend/summary.json"
grep -q '"backend_coverage"' "$RUN_DIR/suites/backend/summary.json"
grep -q '"backend_mutation_testing"' "$RUN_DIR/suites/backend/summary.json"
grep -q '"backend_static_analysis"' "$RUN_DIR/suites/backend/summary.json"
grep -q '"backend_architecture_boundaries"' "$RUN_DIR/suites/backend/summary.json"
grep -q '"report": "test-results/full-sweep/runs/.*/suites/backend/artifacts/jacoco/index.html"' "$RUN_DIR/suites/backend/summary.json"
grep -q '"report": "test-results/full-sweep/runs/.*/suites/backend/artifacts/pit-reports/index.html"' "$RUN_DIR/suites/backend/summary.json"
grep -q '"report": "test-results/full-sweep/runs/.*/suites/backend/artifacts/spotbugsXml.xml"' "$RUN_DIR/suites/backend/summary.json"
grep -q '"metric_references"' "$SUMMARY"
test -f "$RUN_DIR/suites/backend/output.log"
test -f "$RUN_DIR/suites/backend-persistence/output.log"
test -f "$RUN_DIR/suites/frontend-lint/output.log"
test -f "$RUN_DIR/suites/frontend-unit/output.log"
test -f "$RUN_DIR/suites/frontend-e2e/output.log"
test -f "$RUN_DIR/suites/backend/artifacts/surefire-reports/TEST-backend.xml"
test -f "$RUN_DIR/suites/backend/artifacts/jacoco/index.html"
test -f "$RUN_DIR/suites/backend/artifacts/pit-reports/202608150000/index.html"
test -f "$RUN_DIR/suites/backend/artifacts/spotbugsXml.xml"
test -f "$RUN_DIR/suites/frontend-e2e/artifacts/test-results/.last-run.json"
test -f "$RUN_DIR/suites/frontend-e2e/artifacts/test-results/e2e/trace.txt"

grep -q 'compose up -d --build --force-recreate' "$FAKE_DOCKER_LOG"
grep -q 'Full test sweep: passed' "$OUTPUT"
grep -q 'Suite results:' "$OUTPUT"
grep -Eq 'backend[[:space:]]+passed' "$OUTPUT"
grep -Eq 'frontend-e2e[[:space:]]+passed' "$OUTPUT"
grep -q 'Backend metric reports:' "$OUTPUT"
grep -q 'Architecture boundaries (ArchUnit): test-results/full-sweep/runs/.*/suites/backend/artifacts/surefire-reports' "$OUTPUT"
grep -q 'Coverage (JaCoCo): test-results/full-sweep/runs/.*/suites/backend/artifacts/jacoco/index.html' "$OUTPUT"
grep -q 'Mutation testing (PIT): test-results/full-sweep/runs/.*/suites/backend/artifacts/pit-reports/index.html' "$OUTPUT"
grep -q 'Static analysis (SpotBugs): test-results/full-sweep/runs/.*/suites/backend/artifacts/spotbugsXml.xml' "$OUTPUT"
