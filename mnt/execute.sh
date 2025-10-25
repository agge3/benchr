#!/usr/bin/env bash
set -euo pipefail
set -x

DIR="$1"
SRC="$2"
LANG="$3"
COMPILER="$4"
OPTS="${5:-}"

BIN="$DIR/bin"
OUT_RAW="$DIR/out.raw"
PERF_STDERR="$DIR/perf.stderr"
TIME_STDERR="$DIR/time.stderr"
VMSTAT_RAW="$DIR/vmstat.raw"
ASM_OUT="$DIR/asm.out"
RESULT_JSON="$DIR/result.json"

EXIT_STATUS=0
COMPILE_ERROR=255

run_and_capture() {
	perf stat -e cycles,instructions,cache-misses,branch-misses \
		-o "$PERF_STDERR" \
		/usr/bin/time -vo "$TIME_STDERR" \
		"$BIN" > "$OUT_RAW" 2>&1 || EXIT_STATUS=$?
}

case "$LANG" in
	c|cpp)
		# --- compile ---
		if ! "$COMPILER" $OPTS -o "$BIN" "$SRC" 2>&1; then
			echo '{"error":"compilation failed"}' > "$RESULT_JSON"
			exit $COMPILE_ERROR
		fi

		# --- disassemble ---
		objdump -d "$BIN" > "$ASM_OUT" 2>&1 || true

		# --- background vmstat ---
		vmstat -n 1 > "$VMSTAT_RAW" &
		VMSTAT_PID=$!

		# --- run + measure ---
		run_and_capture

		# --- cleanup ---
		kill "$VMSTAT_PID" 2>/dev/null || true
		kill "$VMSTAT_PID" 2>/dev/null || true

		# --- parse metrics ---
		PERF_JSON=$(jc --perf-stat < "$PERF_STDERR" 2>/dev/null || echo '{}')
		TIME_JSON=$(jc --time < "$TIME_STDERR" 2>/dev/null || echo '{}')
		VMSTAT_JSON=$(jc --vmstat < "$VMSTAT_RAW" 2>/dev/null || echo '{}')

		# --- escape stdout/stderr safely ---
		PROGRAM_OUTPUT=$(jq -Rs . < "$OUT_RAW")
		ASM_CONTENT=$(jq -Rs . < "$ASM_OUT")

		# --- compose final JSON ---
		jq -n \
			--argjson perf "$PERF_JSON" \
			--argjson time "$TIME_JSON" \
			--argjson vmstat "$VMSTAT_JSON" \
			--arg output "$PROGRAM_OUTPUT" \
			--arg asm "$ASM_CONTENT" \
			--arg exit_code "$EXIT_STATUS" \
			'{
				exit_code: ($exit_code | tonumber),
				output: $output,
				asm: $asm,
				perf: $perf,
				time: $time,
				vmstat: $vmstat
			}' > "$RESULT_JSON"
		;;

	py|python)
		echo '{"note":"python execution not yet implemented"}' > "$RESULT_JSON"
		;;

	*)
		echo "{\"error\":\"unsupported language: $LANG\"}" > "$RESULT_JSON"
		exit 1
		;;
esac

exit $EXIT_STATUS
