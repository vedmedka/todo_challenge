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
        printf '<testsuite tests="1" failures="0" errors="0"/>\n' >backend/target/surefire-reports/TEST-backend.xml
        printf 'backend ok\n'
        ;;
      "frontend:npm run lint")
        printf 'lint ok\n'
        ;;
      "frontend:npm test")
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
test -f "$RUN_DIR/suites/frontend-lint/summary.json"
test -f "$RUN_DIR/suites/frontend-unit/summary.json"
test -f "$RUN_DIR/suites/frontend-e2e/summary.json"
test -f "$RUN_DIR/suites/backend/output.log"
test -f "$RUN_DIR/suites/frontend-lint/output.log"
test -f "$RUN_DIR/suites/frontend-unit/output.log"
test -f "$RUN_DIR/suites/frontend-e2e/output.log"
test -f "$RUN_DIR/suites/backend/artifacts/surefire-reports/TEST-backend.xml"
test -f "$RUN_DIR/suites/frontend-e2e/artifacts/test-results/.last-run.json"
test -f "$RUN_DIR/suites/frontend-e2e/artifacts/test-results/e2e/trace.txt"

grep -q 'compose up -d --build --force-recreate' "$FAKE_DOCKER_LOG"
grep -q 'Full test sweep: passed' "$OUTPUT"
grep -q 'Suite results:' "$OUTPUT"
grep -Eq 'backend[[:space:]]+passed' "$OUTPUT"
grep -Eq 'frontend-e2e[[:space:]]+passed' "$OUTPUT"
