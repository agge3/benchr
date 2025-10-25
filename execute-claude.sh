#!/usr/bin/env bash
set -euo pipefail

# Arguments
DIR="$1"
SRC="$2"
LANG="$3"
COMPILER="$4"
OPTS="${5:-}"

# Output files
BIN="$DIR/bin"
OUT_RAW="$DIR/out.raw"
PERF_STDERR="$DIR/perf.stderr"
TIME_STDERR="$DIR/time.stderr"
VMSTAT_RAW="$DIR/vmstat.raw"
ASM_OUT="$DIR/asm.out"
RESULT_JSON="$DIR/result.json"
COMPILE_STDERR="$DIR/compile.stderr"

EXIT_STATUS=0
COMPILE_ERROR=255

# Ensure clean state
rm -f "$BIN" "$OUT_RAW" "$PERF_STDERR" "$TIME_STDERR" "$VMSTAT_RAW" "$ASM_OUT" "$RESULT_JSON" "$COMPILE_STDERR"

run_and_capture() {
	EXIT_STATUS=0
	perf stat -e cycles,instructions,cache-misses,branch-misses \
		-o "$PERF_STDERR" \
		/usr/bin/time -v -o "$TIME_STDERR" \
		"$BIN" > "$OUT_RAW" 2>&1 || EXIT_STATUS=$?
}

case "$LANG" in
	c|cpp)
		echo "[execute.sh] Compiling $LANG code with $COMPILER $OPTS..."
		
		# --- compile ---
		if ! $COMPILER $OPTS -o "$BIN" "$SRC" 2>"$COMPILE_STDERR"; then
			COMPILE_ERR=$(cat "$COMPILE_STDERR" 2>/dev/null || echo "Unknown compilation error")
			jq -n \
				--arg err "$COMPILE_ERR" \
				'{
					success: false,
					error: "compilation failed",
					compilation: {
						success: false,
						error: "compilation failed",
						details: $err
					}
				}' > "$RESULT_JSON"
			exit $COMPILE_ERROR
		fi
		
		echo "[execute.sh] Compilation successful"
		
		# --- disassemble ---
		objdump -d "$BIN" > "$ASM_OUT" 2>&1 || echo "/* disassembly failed */" > "$ASM_OUT"
		
		# --- background vmstat ---
		vmstat -n 1 > "$VMSTAT_RAW" 2>&1 &
		VMSTAT_PID=$!
		
		# Ensure vmstat cleanup
		trap "kill $VMSTAT_PID 2>/dev/null || true; wait $VMSTAT_PID 2>/dev/null || true" EXIT
		
		echo "[execute.sh] Running binary..."
		
		# --- run + measure ---
		run_and_capture
		
		echo "[execute.sh] Execution complete (exit: $EXIT_STATUS)"
		
		# --- cleanup vmstat ---
		kill "$VMSTAT_PID" 2>/dev/null || true
		wait "$VMSTAT_PID" 2>/dev/null || true
		
		# --- parse metrics ---
		if command -v jc &>/dev/null; then
			PERF_JSON=$(jc --perf-stat < "$PERF_STDERR" 2>/dev/null || echo '{}')
			TIME_JSON=$(jc --time < "$TIME_STDERR" 2>/dev/null || echo '{}')
			VMSTAT_JSON=$(jc --vmstat < "$VMSTAT_RAW" 2>/dev/null || echo '[]')
		else
			echo "[execute.sh] Warning: jc not installed, metrics will be empty"
			PERF_JSON='{}'
			TIME_JSON='{}'
			VMSTAT_JSON='[]'
		fi
		
		# --- escape output safely ---
		if [ -f "$OUT_RAW" ]; then
			PROGRAM_OUTPUT=$(cat "$OUT_RAW" | jq -Rs . 2>/dev/null || echo '""')
		else
			PROGRAM_OUTPUT='""'
		fi
		
		if [ -f "$ASM_OUT" ]; then
			ASM_CONTENT=$(cat "$ASM_OUT" | jq -Rs . 2>/dev/null || echo '""')
		else
			ASM_CONTENT='""'
		fi
		
		# Get source file size
		SRC_SIZE=$(stat -c%s "$SRC" 2>/dev/null || echo "0")
		
		# Get current timestamp
		TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
		
		# --- compose final JSON ---
		jq -n \
			--argjson perf "$PERF_JSON" \
			--argjson time "$TIME_JSON" \
			--argjson vmstat "$VMSTAT_JSON" \
			--argjson output "$PROGRAM_OUTPUT" \
			--argjson asm "$ASM_CONTENT" \
			--arg exit_code "$EXIT_STATUS" \
			--arg timestamp "$TIMESTAMP" \
			--arg lang "$LANG" \
			--arg compiler "$COMPILER" \
			--arg opts "$OPTS" \
			--arg src_size "$SRC_SIZE" \
			'{
				success: true,
				timestamp: $timestamp,
				exit_code: ($exit_code | tonumber),
				output: $output,
				asm: $asm,
				perf: $perf,
				time: $time,
				vmstat: $vmstat,
				compilation: {
					success: true,
					error: null,
					details: null
				},
				metadata: {
					language: $lang,
					compiler: $compiler,
					opts: $opts,
					source_size_bytes: ($src_size | tonumber)
				}
			}' > "$RESULT_JSON"
		;;
		
	py|python)
		echo "[execute.sh] Python execution not yet implemented"
		TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
		jq -n \
			--arg timestamp "$TIMESTAMP" \
			'{
				success: false,
				timestamp: $timestamp,
				error: "python execution not yet implemented"
			}' > "$RESULT_JSON"
		exit 1
		;;
		
	*)
		echo "[execute.sh] Unsupported language: $LANG"
		TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
		jq -n \
			--arg lang "$LANG" \
			--arg timestamp "$TIMESTAMP" \
			'{
				success: false,
				timestamp: $timestamp,
				error: "unsupported language",
				language: $lang
			}' > "$RESULT_JSON"
		exit 1
		;;
esac

exit $EXIT_STATUS
