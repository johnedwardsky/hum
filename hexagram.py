"""
Human Design Gate/Hexagram calculation module.

Divides the 360° zodiac wheel into 64 gates (programs/hexagrams),
each further subdivided into lines, colors, tones, bases, and theoses.

The wheel follows the I Ching Rave Mandala order, starting at 358°15'00".

Boundary convention (left-closed, right-open intervals):
    Every interval is defined as [start, end) — closed on the LEFT,
    open on the RIGHT.
    A longitude that falls exactly ON a boundary belongs to the interval
    that STARTS there (the next interval), NOT the one that ends there.

    This follows the natural time convention:
    - A minute 14:10 lasts from 14:10:00 to 14:10:59.999...
      At 14:11:00 the next minute begins.
    - A new day starts exactly at 00:00:00 — midnight is the first
      instant of the new day, not the last of the old one.

    For display purposes, the end of an interval is shown as
    end_boundary - 0.01" to avoid visual ambiguity (e.g., line 1 of
    program 25 displays as 358°15'00" — 359°11'14.99").
"""

# The I Ching Rave Mandala gate order (64 gates around the wheel)
# Position 0 starts at 358°15'00" ecliptic longitude
GATE_ORDER = [
    25, 17, 21, 51, 42,  3, 27, 24,  2, 23,
     8, 20, 16, 35, 45, 12, 15, 52, 39, 53,
    62, 56, 31, 33,  7,  4, 29, 59, 40, 64,
    47,  6, 46, 18, 48, 57, 32, 50, 28, 44,
     1, 43, 14, 34,  9,  5, 26, 11, 10, 58,
    38, 54, 61, 60, 41, 19, 13, 49, 30, 55,
    37, 63, 22, 36
]

# Wheel start: 358°15'00" = 358 + 15/60
WHEEL_START = 358.0 + 15.0 / 60.0  # 358.25°

# Subdivision intervals in degrees (aligned with HexagramParserV3)
GATE_INTERVAL  = 5.625                    # 360 / 64
LINE_INTERVAL  = GATE_INTERVAL / 6        # 0.9375°
COLOR_INTERVAL = LINE_INTERVAL / 6        # 0.15625°
TONE_INTERVAL  = COLOR_INTERVAL / 6        # 0.02604166...°
BASE_INTERVAL  = TONE_INTERVAL / 5          # 0.00520833...°
THEOS_INTERVAL = BASE_INTERVAL / 3        # 0.00173611...°



def _left_closed_index(value, interval, max_idx):
    """
    Return the 0-based index for `value` within intervals of `interval` width,
    using left-closed, right-open [start, end) semantics.

    A value exactly on a boundary belongs to the interval that STARTS there
    (the next interval), not the one that ends there.

    Standard int() truncation naturally implements [start, end) for
    positive values: int(boundary / interval) = next_index.

    To handle floating-point edge cases (especially at deep subdivision
    levels like theos), we snap up when the remainder is within 1e-9°
    of a full interval — meaning the value is effectively on the next
    boundary.

    Parameters
    ----------
    value    : float  offset within the current level (≥ 0)
    interval : float  width of each sub-interval
    max_idx  : int    maximum allowed index (safety clamp)

    Returns
    -------
    (index, remainder)  where remainder = value - index * interval
    """
    SNAP_EPS = 1e-9  # ≈ 3.6e-6 arcseconds, well below any real precision

    idx = int(value / interval)
    remainder = value - idx * interval

    # Snap-up: if remainder ≈ full interval, the value is on the NEXT boundary.
    # For [start, end) it belongs to the next interval.
    if (interval - remainder) < SNAP_EPS:
        idx += 1
        remainder = 0.0

    if idx >= max_idx:
        idx = max_idx - 1
        remainder = value - idx * interval

    # Guard against tiny negative remainders from floating-point arithmetic
    if remainder < 0:
        remainder = 0.0

    return idx, remainder


def calculate_hexagram(longitude):
    """
    Given an ecliptic longitude (0–360°), returns the Human Design gate details.

    Boundary convention: left-closed, right-open intervals [start, end).
    A longitude exactly on a mathematical boundary belongs to the interval
    that STARTS there (the next interval), not the one that ends there.

    This follows the natural time convention: the start of an interval
    is included, the end point is excluded and belongs to the next interval.

    Returns a dict with:
        gate     - Gate/Hexagram number (1-64)
        line     - Line number (1-6)
        color    - Color number (1-6)
        tone     - Tone number (1-6)
        base     - Base number (1-5)
        theos    - Theos number (1-3)
        position - Position index on the wheel (1-based)
    """
    # Calculate offset from wheel start (0° … 360°)
    offset = (longitude - WHEEL_START) % 360.0

    # ── Gate (0–63) ──────────────────────────────────────────────────────────
    gate_index, gate_offset = _left_closed_index(offset, GATE_INTERVAL, 64)
    gate_number = GATE_ORDER[gate_index]

    # ── Line (1–6) ───────────────────────────────────────────────────────────
    line_index, line_offset = _left_closed_index(gate_offset, LINE_INTERVAL, 6)
    line = line_index + 1

    # ── Color (1–6) ──────────────────────────────────────────────────────────
    color_index, color_offset = _left_closed_index(line_offset, COLOR_INTERVAL, 6)
    color = color_index + 1

    # ── Tone (1–6) ───────────────────────────────────────────────────────────
    tone_index, tone_offset = _left_closed_index(color_offset, TONE_INTERVAL, 6)
    tone = tone_index + 1

    # ── Base (1–5) ───────────────────────────────────────────────────────────
    base_index, base_offset = _left_closed_index(tone_offset, BASE_INTERVAL, 5)
    base = base_index + 1

    # ── Theos (1–3) ──────────────────────────────────────────────────────────
    theos_index, _ = _left_closed_index(base_offset, THEOS_INTERVAL, 3)
    theos = theos_index + 1

    return {
        "gate":     gate_number,
        "line":     line,
        "color":    color,
        "tone":     tone,
        "base":     base,
        "theos":    theos,
        "position": gate_index + 1,  # 1-based position on the wheel
    }


def _deg_to_dms(deg):
    """Convert decimal degrees to (d, m, s) string for display."""
    d = int(deg)
    rem = (deg - d) * 60
    m = int(rem)
    s = (rem - m) * 60
    return f"{d}° {m:02d}' {s:05.2f}\""


if __name__ == "__main__":
    print("=== Hexagram Calculation Verification ===")
    print(f"    Boundary convention: left-closed, right-open [start, end)")
    print(f"    WHEEL_START = {WHEEL_START}° = {_deg_to_dms(WHEEL_START)}\n")

    # ── Display epsilon: 0.01" in degrees ────────────────────────────────────
    DISPLAY_EPS = 0.01 / 3600.0   # 0.01" in degrees

    # ═══════════════════════════════════════════════════════════════════════════
    # Test 1: Gate 25 starts at WHEEL_START = 358°15'00"
    # ═══════════════════════════════════════════════════════════════════════════
    print("── Test 1: Gate 25 start ──")
    h = calculate_hexagram(WHEEL_START)
    ok = h['gate'] == 25 and h['line'] == 1
    print(f"  358°15'00\" → Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']}"
          f"  {'✓' if ok else '✗'} (expected Gate 25, Line 1)")

    # ═══════════════════════════════════════════════════════════════════════════
    # Test 2: Boundary between Gate 25 and Gate 17
    #   Gate 25: [358°15'00", 3°52'30")
    #   Gate 17: [3°52'30", 9°30'00")
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n── Test 2: Boundary Gate 25 → Gate 17 ──")
    boundary_25_17 = (WHEEL_START + GATE_INTERVAL) % 360.0  # = 3°52'30" = 3.875°

    # Just before boundary → still Gate 25
    h = calculate_hexagram(boundary_25_17 - DISPLAY_EPS)
    ok1 = h['gate'] == 25
    print(f"  3°52'29.99\" (just before boundary) → Gate {h['gate']}"
          f"  {'✓' if ok1 else '✗'} (expected 25)")

    # Exactly on boundary → Gate 17 (left-closed: boundary starts new interval)
    h = calculate_hexagram(boundary_25_17)
    ok2 = h['gate'] == 17 and h['line'] == 1
    print(f"  3°52'30.00\" (exactly on boundary) → Gate {h['gate']}.{h['line']}"
          f"  {'✓' if ok2 else '✗'} (expected 17.1 — new interval starts here)")

    # Just after boundary → Gate 17
    h = calculate_hexagram(boundary_25_17 + DISPLAY_EPS)
    ok3 = h['gate'] == 17
    print(f"  3°52'30.01\" (just after boundary) → Gate {h['gate']}"
          f"  {'✓' if ok3 else '✗'} (expected 17)")

    # ═══════════════════════════════════════════════════════════════════════════
    # Test 3: Line boundaries within Gate 25
    #   Line 1: [358°15'00", 359°11'15")
    #   Line 2: [359°11'15", 00°07'30")
    #   ...
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n── Test 3: Line boundaries within Gate 25 ──")
    print(f"  Program 25: {_deg_to_dms(WHEEL_START)} — {_deg_to_dms((WHEEL_START + GATE_INTERVAL) % 360.0)}")
    for i in range(6):
        line_start = (WHEEL_START + i * LINE_INTERVAL) % 360.0
        line_end = (WHEEL_START + (i + 1) * LINE_INTERVAL) % 360.0
        # Display end as end - 0.01"
        line_end_display = (line_end - DISPLAY_EPS) % 360.0
        h = calculate_hexagram(line_start)
        ok = h['gate'] == 25 and h['line'] == i + 1
        print(f"  Line {i+1}: {_deg_to_dms(line_start)} — {_deg_to_dms(line_end_display)}"
              f"  → Gate {h['gate']}.{h['line']}  {'✓' if ok else '✗'}")

    # Verify boundary between line 1 and line 2
    line2_start = (WHEEL_START + LINE_INTERVAL) % 360.0  # 359°11'15"
    h_before = calculate_hexagram(line2_start - DISPLAY_EPS)
    h_on = calculate_hexagram(line2_start)
    ok_before = h_before['gate'] == 25 and h_before['line'] == 1
    ok_on = h_on['gate'] == 25 and h_on['line'] == 2
    print(f"\n  359°11'14.99\" → Line {h_before['line']}  {'✓' if ok_before else '✗'} (expected Line 1)")
    print(f"  359°11'15.00\" → Line {h_on['line']}  {'✓' if ok_on else '✗'} (expected Line 2 — new interval)")

    # ═══════════════════════════════════════════════════════════════════════════
    # Test 4: Theos-level boundary (Gate 25 · L1 · C1 · T1 · B1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n── Test 4: Theos boundary (Gate 25 · L1 · C1 · T1 · B1) ──")
    theos_boundary = WHEEL_START + THEOS_INTERVAL  # end of Theos 1 = start of Theos 2

    h = calculate_hexagram(theos_boundary - DISPLAY_EPS)
    ok1 = h['theos'] == 1
    print(f"  Before boundary → Theos {h['theos']}  {'✓' if ok1 else '✗'} (expected Theos 1)")

    h = calculate_hexagram(theos_boundary)
    ok2 = h['theos'] == 2
    print(f"  Exactly on boundary → Theos {h['theos']}  {'✓' if ok2 else '✗'} (expected Theos 2 — new interval)")

    h = calculate_hexagram(theos_boundary + DISPLAY_EPS)
    ok3 = h['theos'] == 2
    print(f"  After boundary → Theos {h['theos']}  {'✓' if ok3 else '✗'} (expected Theos 2)")

    # ═══════════════════════════════════════════════════════════════════════════
    # Test 5: All 64 gate boundaries
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n── Test 5: All 64 gate boundary checks ──")
    all_ok = True
    for i in range(64):
        start_lon = (WHEEL_START + i * GATE_INTERVAL) % 360.0
        # Exactly at start → should be gate i (left-closed)
        h = calculate_hexagram(start_lon)
        expected = GATE_ORDER[i]
        ok = h["gate"] == expected
        if not ok:
            all_ok = False
            print(f"  ✗ Position {i+1:2d}: {_deg_to_dms(start_lon)} → Gate {h['gate']} (expected {expected})")
    if all_ok:
        print("  ✓ All 64 gate start checks passed (exact boundary → correct gate)")

    # Also verify that just before each boundary → previous gate
    all_ok2 = True
    for i in range(64):
        start_lon = (WHEEL_START + i * GATE_INTERVAL) % 360.0
        h = calculate_hexagram(start_lon - DISPLAY_EPS)
        prev_idx = (i - 1) % 64
        expected_prev = GATE_ORDER[prev_idx]
        ok = h["gate"] == expected_prev
        if not ok:
            all_ok2 = False
            print(f"  ✗ Position {i+1:2d}: {_deg_to_dms(start_lon)}-ε → Gate {h['gate']} (expected {expected_prev})")
    if all_ok2:
        print("  ✓ All 64 gate boundary-ε checks passed (just before → previous gate)")

    # ═══════════════════════════════════════════════════════════════════════════
    # Test 6: Verify specific program boundaries from the specification
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n── Test 6: Spot-check specific program boundaries ──")
    # Format: (gate_number, start_degrees)
    spot_checks = [
        (25, 358.25),           # 358° 15' 00"
        (17, 3.875),            # 3° 52' 30"
        (21, 9.5),              # 9° 30' 00"
        (51, 15.125),           # 15° 07' 30"
        (42, 20.75),            # 20° 45' 00"
        (3,  26.375),           # 26° 22' 30"
        (27, 32.0),             # 32° 00' 00"
        (1,  223.25),           # 223° 15' 00"
        (36, 352.625),          # 352° 37' 30"
    ]
    all_spot_ok = True
    for gate_num, start_deg in spot_checks:
        h = calculate_hexagram(start_deg)
        ok = h['gate'] == gate_num and h['line'] == 1
        if not ok:
            all_spot_ok = False
            print(f"  ✗ {_deg_to_dms(start_deg)} → Gate {h['gate']}.{h['line']} (expected {gate_num}.1)")
        else:
            print(f"  ✓ {_deg_to_dms(start_deg)} → Gate {h['gate']}.{h['line']}")
    if all_spot_ok:
        print("  All spot-checks passed!")
