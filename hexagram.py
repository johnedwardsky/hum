"""
Human Design Gate/Hexagram calculation module.

Divides the 360° zodiac wheel into 64 gates (programs/hexagrams),
each further subdivided into lines, colors, tones, bases, and theoses.

The wheel follows the I Ching Rave Mandala order, starting at 358°15'01".

Boundary convention (right-closed intervals):
    Every interval is defined as [start, end] — closed on BOTH sides.
    A longitude that falls exactly ON a boundary belongs to the interval
    that ENDS there (the previous interval), NOT the one that starts there.
    This matches the PDF report where the displayed start of each next
    interval is shown as previous_end + 0.01" to avoid visual ambiguity.

    Implemented via: if remainder < BOUNDARY_EPS and index > 0 → use index-1
    BOUNDARY_EPS = 1e-9° ≈ 3.6e-6" (far smaller than 0.01", handles only
    exact floating-point boundary hits from Swiss Ephemeris output).
"""

# The I Ching Rave Mandala gate order (64 gates around the wheel)
# Position 0 starts at 358°15'01" ecliptic longitude
GATE_ORDER = [
    25, 17, 21, 51, 42,  3, 27, 24,  2, 23,
     8, 20, 16, 35, 45, 12, 15, 52, 39, 53,
    62, 56, 31, 33,  7,  4, 29, 59, 40, 64,
    47,  6, 46, 18, 48, 57, 32, 50, 28, 44,
     1, 43, 14, 34,  9,  5, 26, 11, 10, 58,
    38, 54, 61, 60, 41, 19, 13, 49, 30, 55,
    37, 63, 22, 36
]

# Wheel start: 358°15'01" = 358 + 15/60 + 1/3600
WHEEL_START = 358.0 + 15.0 / 60.0 + 1.0 / 3600.0  # 358.25027778°

# Subdivision intervals in degrees
GATE_INTERVAL  = 5.625                    # 360 / 64
LINE_INTERVAL  = GATE_INTERVAL / 6        # 0.9375°
COLOR_INTERVAL = LINE_INTERVAL / 6        # 0.15625°
TONE_INTERVAL  = COLOR_INTERVAL / 6       # 0.02604166...°
BASE_INTERVAL  = TONE_INTERVAL / 5        # 0.00520833...°  (÷5, not ÷6!)
THEOS_INTERVAL = BASE_INTERVAL / 3        # 0.00173611...°

# Epsilon for right-closed boundary semantics.
# If a computed offset is < BOUNDARY_EPS from a lower boundary (i.e. the
# value sits exactly ON the mathematical boundary due to floating-point),
# it is attributed to the PREVIOUS interval (as its END point).
# 1e-9° ≈ 3.6e-6" — much smaller than Swiss Ephemeris precision (~0.001")
# so this only fires on true exact-boundary hits, not on normal values.
BOUNDARY_EPS = 1e-9


def _right_closed_index(value, interval, max_idx):
    """
    Return the 0-based index for `value` within intervals of `interval` width,
    using right-closed [start, end] semantics.

    A value exactly on a boundary (remainder ≈ 0) belongs to the PREVIOUS
    interval (index - 1), unless it is the very first interval (index 0).

    Parameters
    ----------
    value    : float  offset within the current level (≥ 0)
    interval : float  width of each sub-interval
    max_idx  : int    maximum allowed index (safety clamp)

    Returns
    -------
    (index, remainder)  where remainder = value - index * interval
    """
    idx = int(value / interval)
    if idx >= max_idx:
        idx = max_idx - 1
    remainder = value - idx * interval
    # Right-closed: exact boundary hit → attribute to previous interval
    if remainder < BOUNDARY_EPS and idx > 0:
        idx -= 1
        remainder = value - idx * interval
    return idx, remainder


def calculate_hexagram(longitude):
    """
    Given an ecliptic longitude (0–360°), returns the Human Design gate details.

    Boundary convention: right-closed intervals [start, end].
    A longitude exactly on a mathematical boundary belongs to the interval
    that ENDS there (previous interval), not the one that begins there.
    This is consistent with the Rave Mandala PDF report where successive
    interval starts are displayed as previous_end + 0.01".

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
    gate_index, gate_offset = _right_closed_index(offset, GATE_INTERVAL, 64)
    gate_number = GATE_ORDER[gate_index]

    # ── Line (1–6) ───────────────────────────────────────────────────────────
    line_index, line_offset = _right_closed_index(gate_offset, LINE_INTERVAL, 6)
    line = line_index + 1

    # ── Color (1–6) ──────────────────────────────────────────────────────────
    color_index, color_offset = _right_closed_index(line_offset, COLOR_INTERVAL, 6)
    color = color_index + 1

    # ── Tone (1–6) ───────────────────────────────────────────────────────────
    tone_index, tone_offset = _right_closed_index(color_offset, TONE_INTERVAL, 6)
    tone = tone_index + 1

    # ── Base (1–5) ───────────────────────────────────────────────────────────
    base_index, base_offset = _right_closed_index(tone_offset, BASE_INTERVAL, 5)
    base = base_index + 1

    # ── Theos (1–3) ──────────────────────────────────────────────────────────
    theos_index, _ = _right_closed_index(base_offset, THEOS_INTERVAL, 3)
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


if __name__ == "__main__":
    print("=== Hexagram Calculation Verification ===\n")

    # ── Gate-level boundary tests ────────────────────────────────────────────
    THEOS_EPSILON = 0.01 / 3600.0   # 0.01" in degrees (display gap)

    # Gate 25 starts at WHEEL_START = 358°15'01"
    h = calculate_hexagram(WHEEL_START)
    print(f"358°15'01\" (start of Gate 25) → Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']}  (expected 25)")

    # The mathematical boundary between Gate 25 and Gate 17 is at 3°52'31"
    boundary_25_17 = (WHEEL_START + GATE_INTERVAL) % 360.0   # = 3.87527...°
    h = calculate_hexagram(boundary_25_17 - THEOS_EPSILON)   # just before → Gate 25
    print(f"3°52'30.99\" (end of Gate 25)   → Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']}  (expected 25)")

    h = calculate_hexagram(boundary_25_17)                    # exactly on boundary → Gate 25 (right-closed)
    print(f"3°52'31.00\" (boundary, right-closed) → Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']}  (expected 25)")

    h = calculate_hexagram(boundary_25_17 + THEOS_EPSILON)   # just after → Gate 17
    print(f"3°52'31.01\" (start of Gate 17) → Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']}  (expected 17)")

    # ── Theos-level boundary test (Line 1, Color 1, Tone 1, Base 1) ─────────
    print("\n── Theos boundary (Gate 25 · L1 · C1 · T1 · B1) ──")
    theos_boundary = WHEEL_START + THEOS_INTERVAL             # end of Theos 1
    h = calculate_hexagram(theos_boundary - THEOS_EPSILON)
    print(f"  Theos 1 end   → ...{h['color']}.{h['tone']}.{h['base']}.{h['theos']}  (expected Theos 1)")
    h = calculate_hexagram(theos_boundary)
    print(f"  Exactly on boundary → ...{h['color']}.{h['tone']}.{h['base']}.{h['theos']}  (expected Theos 1, right-closed)")
    h = calculate_hexagram(theos_boundary + THEOS_EPSILON)
    print(f"  Theos 2 start → ...{h['color']}.{h['tone']}.{h['base']}.{h['theos']}  (expected Theos 2)")

    # ── All 64 gate boundaries ───────────────────────────────────────────────
    print("\n── All 64 gate boundary checks ──")
    all_ok = True
    for i in range(64):
        start_lon = (WHEEL_START + i * GATE_INTERVAL) % 360.0
        # Just after boundary → should be gate i
        h = calculate_hexagram(start_lon + THEOS_EPSILON)
        expected = GATE_ORDER[i]
        ok = h["gate"] == expected
        if not ok:
            all_ok = False
            print(f"  ✗ Position {i+1:2d}: {start_lon:.4f}°+ε → Gate {h['gate']} (expected {expected})")
    if all_ok:
        print("  ✓ All 64 gate start+ε checks passed")
