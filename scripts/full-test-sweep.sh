#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_ROOT="$ROOT_DIR/test-results/full-sweep"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$RESULTS_ROOT/runs/$RUN_ID"

if [[ -e "$RUN_DIR" ]]; then
  RUN_ID="${RUN_ID}-$$"
  RUN_DIR="$RESULTS_ROOT/runs/$RUN_ID"
fi

SUITES_DIR="$RUN_DIR/suites"
mkdir -p "$SUITES_DIR" || exit 1

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_SECONDS="$(date -u +%s)"

suite_names=()
suite_commands=()
suite_statuses=()
suite_exit_codes=()
suite_durations=()
suite_logs=()
suite_summaries=()
suite_artifacts=()
suite_coverages=()
suite_metric_references=()

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "$value"
}

relative_path() {
  local path="$1"
  printf '%s' "${path#"$ROOT_DIR"/}"
}

copy_artifact_dir() {
  local source="$1"
  local destination="$2"

  if [[ ! -e "$source" ]]; then
    return 1
  fi

  rm -rf "$destination"
  mkdir -p "$(dirname "$destination")"
  cp -R "$source" "$destination" || return 1
  return 0
}

clear_source_results() {
  rm -rf \
    "$ROOT_DIR/backend/target/surefire-reports" \
    "$ROOT_DIR/backend/target/site/jacoco" \
    "$ROOT_DIR/backend/target/pit-reports" \
    "$ROOT_DIR/backend/target/spotbugsXml.xml" \
    "$ROOT_DIR/frontend/coverage" \
    "$ROOT_DIR/frontend/test-results" \
    "$ROOT_DIR/frontend/playwright-report"
}

join_json_strings() {
  local raw="$1"
  local first=true
  printf '['
  if [[ -n "$raw" ]]; then
    IFS='|' read -r -a values <<<"$raw"
    for value in "${values[@]}"; do
      if [[ "$first" == true ]]; then
        first=false
      else
        printf ', '
      fi
      printf '"%s"' "$(json_escape "$value")"
    done
  fi
  printf ']'
}

append_metric_reference() {
  local current="$1"
  local key="$2"
  local tool="$3"
  local report="$4"
  local description="$5"

  if [[ -z "$report" ]]; then
    printf '%s' "$current"
    return
  fi

  if [[ "$current" != "{" ]]; then
    current="$current, "
  fi

  printf '%s"%s": {"tool": "%s", "report": "%s", "description": "%s"}' \
    "$current" \
    "$(json_escape "$key")" \
    "$(json_escape "$tool")" \
    "$(json_escape "$report")" \
    "$(json_escape "$description")"
}

build_backend_metric_references() {
  local surefire_report="$1"
  local jacoco_report="$2"
  local pit_report="$3"
  local spotbugs_report="$4"
  local references="{"

  references="$(append_metric_reference "$references" \
    "backend_architecture_boundaries" \
    "ArchUnit" \
    "$surefire_report" \
    "Architecture boundary tests are included in backend Surefire results.")"
  references="$(append_metric_reference "$references" \
    "backend_coverage" \
    "JaCoCo" \
    "$jacoco_report" \
    "Backend instruction, branch, and line coverage report.")"
  references="$(append_metric_reference "$references" \
    "backend_mutation_testing" \
    "PIT" \
    "$pit_report" \
    "Application and domain mutation testing report.")"
  references="$(append_metric_reference "$references" \
    "backend_static_analysis" \
    "SpotBugs" \
    "$spotbugs_report" \
    "Static analysis findings report.")"

  if [[ "$references" == "{" ]]; then
    printf 'null'
    return
  fi

  printf '%s}' "$references"
}

metric_reference_report() {
  local metric_references="$1"
  local metric_key="$2"

  printf '%s' "$metric_references" | sed -n "s/.*\"$metric_key\": {[^}]*\"report\": \"\\([^\"]*\\)\".*/\\1/p"
}

extract_coverage_metric() {
  local log_path="$1"
  local label="$2"

  awk -F'[:%]' -v label="$label" '
    $1 ~ label {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2)
      print $2
      exit
    }
  ' "$log_path"
}

extract_coverage_summary() {
  local log_path="$1"
  local statements
  local branches
  local functions
  local lines

  statements="$(extract_coverage_metric "$log_path" "Statements")"
  branches="$(extract_coverage_metric "$log_path" "Branches")"
  functions="$(extract_coverage_metric "$log_path" "Functions")"
  lines="$(extract_coverage_metric "$log_path" "Lines")"

  if [[ -z "$statements" || -z "$branches" || -z "$functions" || -z "$lines" ]]; then
    printf 'null'
    return
  fi

  printf '{"statements_percent": %s, "branches_percent": %s, "functions_percent": %s, "lines_percent": %s}' \
    "$statements" \
    "$branches" \
    "$functions" \
    "$lines"
}

jacoco_counter_percent() {
  local xml_path="$1"
  local counter_type="$2"

  tr '<' '\n' <"$xml_path" | awk -v counter_type="$counter_type" '
    /^counter / && $0 ~ "type=\"" counter_type "\"" {
      line = $0
    }
    END {
      if (line == "") {
        exit 1
      }

      missed = line
      covered = line
      sub(/.*missed="/, "", missed)
      sub(/".*/, "", missed)
      sub(/.*covered="/, "", covered)
      sub(/".*/, "", covered)

      total = missed + covered
      if (total == 0) {
        printf "0.00"
      } else {
        printf "%.2f", (covered * 100) / total
      }
    }
  '
}

extract_jacoco_coverage_summary() {
  local xml_path="$1"
  local instructions
  local branches
  local lines

  if [[ ! -f "$xml_path" ]]; then
    printf 'null'
    return
  fi

  instructions="$(jacoco_counter_percent "$xml_path" "INSTRUCTION")" || {
    printf 'null'
    return
  }
  branches="$(jacoco_counter_percent "$xml_path" "BRANCH")" || {
    printf 'null'
    return
  }
  lines="$(jacoco_counter_percent "$xml_path" "LINE")" || {
    printf 'null'
    return
  }

  printf '{"instruction_percent": %s, "branch_percent": %s, "line_percent": %s}' \
    "$instructions" \
    "$branches" \
    "$lines"
}

format_coverage_for_table() {
  local coverage="$1"
  local statements
  local branches
  local functions
  local lines
  local instructions

  if [[ "$coverage" == "null" || -z "$coverage" ]]; then
    printf '-'
    return
  fi

  instructions="$(printf '%s' "$coverage" | sed -n 's/.*"instruction_percent": \([0-9.]*\).*/\1/p')"
  if [[ -n "$instructions" ]]; then
    branches="$(printf '%s' "$coverage" | sed -n 's/.*"branch_percent": \([0-9.]*\).*/\1/p')"
    lines="$(printf '%s' "$coverage" | sed -n 's/.*"line_percent": \([0-9.]*\).*/\1/p')"

    printf 'I:%s%% B:%s%% L:%s%%' "$instructions" "$branches" "$lines"
    return
  fi

  statements="$(printf '%s' "$coverage" | sed -n 's/.*"statements_percent": \([0-9.]*\).*/\1/p')"
  branches="$(printf '%s' "$coverage" | sed -n 's/.*"branches_percent": \([0-9.]*\).*/\1/p')"
  functions="$(printf '%s' "$coverage" | sed -n 's/.*"functions_percent": \([0-9.]*\).*/\1/p')"
  lines="$(printf '%s' "$coverage" | sed -n 's/.*"lines_percent": \([0-9.]*\).*/\1/p')"

  printf 'S:%s%% B:%s%% F:%s%% L:%s%%' "$statements" "$branches" "$functions" "$lines"
}

record_suite() {
  local name="$1"
  local command="$2"
  local status="$3"
  local exit_code="$4"
  local duration="$5"
  local log_path="$6"
  local summary_path="$7"
  local artifact_paths="$8"
  local coverage="$9"
  local metric_references="${10}"

  suite_names+=("$name")
  suite_commands+=("$command")
  suite_statuses+=("$status")
  suite_exit_codes+=("$exit_code")
  suite_durations+=("$duration")
  suite_logs+=("$log_path")
  suite_summaries+=("$summary_path")
  suite_artifacts+=("$artifact_paths")
  suite_coverages+=("$coverage")
  suite_metric_references+=("$metric_references")
}

write_suite_summary() {
  local name="$1"
  local command="$2"
  local status="$3"
  local exit_code="$4"
  local duration="$5"
  local log_path="$6"
  local summary_path="$7"
  local artifact_paths="$8"
  local coverage="$9"
  local metric_references="${10}"
  local summary_file="$ROOT_DIR/$summary_path"

  {
    printf '{\n'
    printf '  "run_id": "%s",\n' "$(json_escape "$RUN_ID")"
    printf '  "name": "%s",\n' "$(json_escape "$name")"
    printf '  "command": "%s",\n' "$(json_escape "$command")"
    printf '  "status": "%s",\n' "$(json_escape "$status")"
    printf '  "exit_code": %s,\n' "$exit_code"
    printf '  "duration_seconds": %s,\n' "$duration"
    printf '  "log": "%s",\n' "$(json_escape "$log_path")"
    printf '  "artifacts": '
    join_json_strings "$artifact_paths"
    printf ',\n'
    printf '  "coverage": %s,\n' "$coverage"
    printf '  "metric_references": %s\n' "$metric_references"
    printf '}\n'
  } >"$summary_file"
}

run_suite() {
  local name="$1"
  shift
  local command="$*"
  local suite_dir="$SUITES_DIR/$name"
  local artifact_dir="$suite_dir/artifacts"
  local log_path="$suite_dir/output.log"
  local summary_path
  local started
  local finished
  local exit_code
  local status
  local artifacts=""
  local coverage="null"
  local metric_references="null"
  local surefire_report=""
  local jacoco_report=""
  local pit_report=""
  local spotbugs_report=""

  mkdir -p "$artifact_dir" || exit 1
  summary_path="$(relative_path "$suite_dir/summary.json")"

  printf 'Running %s...\n' "$name"
  started="$(date -u +%s)"
  (
    cd "$ROOT_DIR" || exit 1
    "$@"
  ) >"$log_path" 2>&1
  exit_code=$?
  finished="$(date -u +%s)"

  if [[ "$exit_code" -eq 0 ]]; then
    status="passed"
  else
    status="failed"
  fi

  case "$name" in
    backend)
      if copy_artifact_dir "$ROOT_DIR/backend/target/surefire-reports" "$artifact_dir/surefire-reports"; then
        artifacts="$(relative_path "$artifact_dir/surefire-reports")"
        surefire_report="$(relative_path "$artifact_dir/surefire-reports")"
      fi
      coverage="$(extract_jacoco_coverage_summary "$ROOT_DIR/backend/target/site/jacoco/jacoco.xml")"
      if copy_artifact_dir "$ROOT_DIR/backend/target/site/jacoco" "$artifact_dir/jacoco"; then
        jacoco_report="$(relative_path "$artifact_dir/jacoco/index.html")"
        if [[ -n "$artifacts" ]]; then
          artifacts="$artifacts|$(relative_path "$artifact_dir/jacoco")"
        else
          artifacts="$(relative_path "$artifact_dir/jacoco")"
        fi
      fi
      if copy_artifact_dir "$ROOT_DIR/backend/target/pit-reports" "$artifact_dir/pit-reports"; then
        pit_report="$(relative_path "$artifact_dir/pit-reports/index.html")"
        if [[ -n "$artifacts" ]]; then
          artifacts="$artifacts|$(relative_path "$artifact_dir/pit-reports")"
        else
          artifacts="$(relative_path "$artifact_dir/pit-reports")"
        fi
      fi
      if [[ -f "$ROOT_DIR/backend/target/spotbugsXml.xml" ]]; then
        cp "$ROOT_DIR/backend/target/spotbugsXml.xml" "$artifact_dir/spotbugsXml.xml"
        spotbugs_report="$(relative_path "$artifact_dir/spotbugsXml.xml")"
        if [[ -n "$artifacts" ]]; then
          artifacts="$artifacts|$(relative_path "$artifact_dir/spotbugsXml.xml")"
        else
          artifacts="$(relative_path "$artifact_dir/spotbugsXml.xml")"
        fi
      fi
      metric_references="$(build_backend_metric_references "$surefire_report" "$jacoco_report" "$pit_report" "$spotbugs_report")"
      ;;
    frontend-unit)
      if copy_artifact_dir "$ROOT_DIR/frontend/coverage" "$artifact_dir/coverage"; then
        artifacts="$(relative_path "$artifact_dir/coverage")"
      fi
      coverage="$(extract_coverage_summary "$log_path")"
      ;;
    frontend-e2e)
      if copy_artifact_dir "$ROOT_DIR/frontend/test-results" "$artifact_dir/test-results"; then
        artifacts="$(relative_path "$artifact_dir/test-results")"
      fi
      if copy_artifact_dir "$ROOT_DIR/frontend/playwright-report" "$artifact_dir/playwright-report"; then
        if [[ -n "$artifacts" ]]; then
          artifacts="$artifacts|$(relative_path "$artifact_dir/playwright-report")"
        else
          artifacts="$(relative_path "$artifact_dir/playwright-report")"
        fi
      fi
      ;;
  esac

  local relative_log_path
  local duration
  relative_log_path="$(relative_path "$log_path")"
  duration="$((finished - started))"
  write_suite_summary "$name" "$command" "$status" "$exit_code" "$duration" "$relative_log_path" "$summary_path" "$artifacts" "$coverage" "$metric_references"
  record_suite "$name" "$command" "$status" "$exit_code" "$duration" "$relative_log_path" "$summary_path" "$artifacts" "$coverage" "$metric_references"

  if [[ "$exit_code" -eq 0 ]]; then
    printf 'Passed %s.\n' "$name"
  else
    printf 'Failed %s. See %s.\n' "$name" "$(relative_path "$log_path")"
  fi
}

write_summary() {
  local status="$1"
  local exit_code="$2"
  local finished_at="$3"
  local duration="$4"
  local summary="$RESULTS_ROOT/latest-summary.json"

  {
    printf '{\n'
    printf '  "run_id": "%s",\n' "$(json_escape "$RUN_ID")"
    printf '  "status": "%s",\n' "$(json_escape "$status")"
    printf '  "exit_code": %s,\n' "$exit_code"
    printf '  "started_at": "%s",\n' "$(json_escape "$STARTED_AT")"
    printf '  "finished_at": "%s",\n' "$(json_escape "$finished_at")"
    printf '  "duration_seconds": %s,\n' "$duration"
    printf '  "run_dir": "%s",\n' "$(json_escape "$(relative_path "$RUN_DIR")")"
    printf '  "suites": [\n'

    local index
    for index in "${!suite_names[@]}"; do
      if [[ "$index" -gt 0 ]]; then
        printf ',\n'
      fi
      printf '    {\n'
      printf '      "name": "%s",\n' "$(json_escape "${suite_names[$index]}")"
      printf '      "command": "%s",\n' "$(json_escape "${suite_commands[$index]}")"
      printf '      "status": "%s",\n' "$(json_escape "${suite_statuses[$index]}")"
      printf '      "exit_code": %s,\n' "${suite_exit_codes[$index]}"
      printf '      "duration_seconds": %s,\n' "${suite_durations[$index]}"
      printf '      "log": "%s",\n' "$(json_escape "${suite_logs[$index]}")"
      printf '      "summary": "%s",\n' "$(json_escape "${suite_summaries[$index]}")"
      printf '      "artifacts": '
      join_json_strings "${suite_artifacts[$index]}"
      printf ',\n'
      printf '      "coverage": %s,\n' "${suite_coverages[$index]}"
      printf '      "metric_references": %s\n' "${suite_metric_references[$index]}"
      printf '    }'
    done

    printf '\n'
    printf '  ]\n'
    printf '}\n'
  } >"$summary"
}

print_human_summary() {
  local status="$1"
  local summary_path="$2"

  printf '\n'
  printf 'Full test sweep: %s\n' "$status"
  printf 'Run ID: %s\n' "$RUN_ID"
  printf 'Results: %s\n' "$summary_path"
  printf '\n'
  printf 'Suite results:\n'
  printf '%-18s %-8s %-8s %-35s %s\n' "Suite" "Status" "Seconds" "Coverage" "Summary"

  local index
  for index in "${!suite_names[@]}"; do
    printf '%-18s %-8s %-8s %-35s %s\n' \
      "${suite_names[$index]}" \
      "${suite_statuses[$index]}" \
      "${suite_durations[$index]}s" \
      "$(format_coverage_for_table "${suite_coverages[$index]}")" \
      "${suite_summaries[$index]}"
  done

  for index in "${!suite_names[@]}"; do
    if [[ "${suite_names[$index]}" != "backend" || "${suite_metric_references[$index]}" == "null" ]]; then
      continue
    fi

    local references="${suite_metric_references[$index]}"
    local architecture_report
    local coverage_report
    local mutation_report
    local static_report
    architecture_report="$(metric_reference_report "$references" "backend_architecture_boundaries")"
    coverage_report="$(metric_reference_report "$references" "backend_coverage")"
    mutation_report="$(metric_reference_report "$references" "backend_mutation_testing")"
    static_report="$(metric_reference_report "$references" "backend_static_analysis")"

    printf '\n'
    printf 'Backend metric reports:\n'
    if [[ -n "$architecture_report" ]]; then
      printf '  Architecture boundaries (ArchUnit): %s\n' "$architecture_report"
    fi
    if [[ -n "$coverage_report" ]]; then
      printf '  Coverage (JaCoCo): %s\n' "$coverage_report"
    fi
    if [[ -n "$mutation_report" ]]; then
      printf '  Mutation testing (PIT): %s\n' "$mutation_report"
    fi
    if [[ -n "$static_report" ]]; then
      printf '  Static analysis (SpotBugs): %s\n' "$static_report"
    fi
    break
  done
}

printf 'Preparing Docker Compose services...\n'
compose_started="$(date -u +%s)"
compose_suite_dir="$SUITES_DIR/docker-compose-up"
compose_log="$compose_suite_dir/output.log"
mkdir -p "$compose_suite_dir" || exit 1
(
  cd "$ROOT_DIR" || exit 1
  docker compose up -d --build --force-recreate
) >"$compose_log" 2>&1
compose_exit=$?
compose_finished="$(date -u +%s)"
compose_duration="$((compose_finished - compose_started))"
compose_log_path="$(relative_path "$compose_log")"
compose_summary_path="$(relative_path "$compose_suite_dir/summary.json")"

if [[ "$compose_exit" -ne 0 ]]; then
  write_suite_summary "docker-compose-up" "docker compose up -d --build --force-recreate" "failed" "$compose_exit" "$compose_duration" "$compose_log_path" "$compose_summary_path" "" "null" "null"
  record_suite "docker-compose-up" "docker compose up -d --build --force-recreate" "failed" "$compose_exit" "$compose_duration" "$compose_log_path" "$compose_summary_path" "" "null" "null"
else
  write_suite_summary "docker-compose-up" "docker compose up -d --build --force-recreate" "passed" 0 "$compose_duration" "$compose_log_path" "$compose_summary_path" "" "null" "null"
  record_suite "docker-compose-up" "docker compose up -d --build --force-recreate" "passed" 0 "$compose_duration" "$compose_log_path" "$compose_summary_path" "" "null" "null"
  clear_source_results
  run_suite "backend" docker compose exec -T backend mvn verify
  run_suite "backend-persistence" "$ROOT_DIR/scripts/persistence-smoke.sh"
  run_suite "frontend-lint" docker compose exec -T frontend npm run lint
  run_suite "frontend-unit" docker compose exec -T frontend npm run test:coverage
  run_suite "frontend-e2e" docker compose exec -T frontend npm run e2e
fi

overall_exit=0
for exit_code in "${suite_exit_codes[@]}"; do
  if [[ "$exit_code" -ne 0 ]]; then
    overall_exit=1
    break
  fi
done

if [[ "$overall_exit" -eq 0 ]]; then
  overall_status="passed"
else
  overall_status="failed"
fi

FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FINISHED_SECONDS="$(date -u +%s)"
write_summary "$overall_status" "$overall_exit" "$FINISHED_AT" "$((FINISHED_SECONDS - START_SECONDS))"

print_human_summary "$overall_status" "$(relative_path "$RESULTS_ROOT/latest-summary.json")"
exit "$overall_exit"
