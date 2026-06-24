"""
Human Design Gate/Hexagram calculation module.

Divides the 360° zodiac wheel into 64 gates (programs/hexagrams),
each further subdivided into lines, colors, tones, bases, and theoses.

The wheel follows the I Ching Rave Mandala order, starting at 358°15'01".
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
LINE_INTERVAL  = GATE_INTERVAL / 6        # 0.9375
COLOR_INTERVAL = LINE_INTERVAL / 6        # 0.15625
TONE_INTERVAL  = COLOR_INTERVAL / 6       # 0.026041666...
BASE_INTERVAL  = TONE_INTERVAL / 5        # 0.005208333...  (divided by 5, not 6!)
THEOS_INTERVAL = BASE_INTERVAL / 3        # 0.001736111...


def calculate_hexagram(longitude):
    """
    Given an ecliptic longitude (0-360°), returns the Human Design gate details.

    Returns a dict with:
        gate     - Gate/Hexagram number (1-64)
        line     - Line number (1-6)
        color    - Color number (1-6)
        tone     - Tone number (1-6)
        base     - Base number (1-5)
        theos    - Theos number (1-3)
        position - Position index on the wheel (1-64)
    """
    # Calculate offset from wheel start
    offset = (longitude - WHEEL_START) % 360.0

    # Determine gate position (0-63)
    gate_index = int(offset / GATE_INTERVAL)
    if gate_index >= 64:
        gate_index = 63  # safety clamp

    gate_number = GATE_ORDER[gate_index]

    # Offset within the gate
    gate_offset = offset - gate_index * GATE_INTERVAL

    # Line (1-6)
    line = int(gate_offset / LINE_INTERVAL) + 1
    if line > 6:
        line = 6
    line_offset = gate_offset - (line - 1) * LINE_INTERVAL

    # Color (1-6)
    color = int(line_offset / COLOR_INTERVAL) + 1
    if color > 6:
        color = 6
    color_offset = line_offset - (color - 1) * COLOR_INTERVAL

    # Tone (1-6)
    tone = int(color_offset / TONE_INTERVAL) + 1
    if tone > 6:
        tone = 6
    tone_offset = color_offset - (tone - 1) * TONE_INTERVAL

    # Base (1-5)
    base = int(tone_offset / BASE_INTERVAL) + 1
    if base > 5:
        base = 5
    base_offset = tone_offset - (base - 1) * BASE_INTERVAL

    # Theos (1-3)
    theos = int(base_offset / THEOS_INTERVAL) + 1
    if theos > 3:
        theos = 3

    return {
        "gate": gate_number,
        "line": line,
        "color": color,
        "tone": tone,
        "base": base,
        "theos": theos,
        "position": gate_index + 1  # 1-based position on the wheel
    }


if __name__ == "__main__":
    # Quick verification with known boundaries
    print("=== Hexagram Calculation Verification ===\n")

    # Test: start of Gate 25 at 358°15'01"
    h = calculate_hexagram(358.25027778)
    print(f"358°15'01\" -> Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']} (expected Gate 25)")

    # Test: end of Gate 25 / start of Gate 17 boundary
    h = calculate_hexagram(3.875)  # 3°52'30"
    print(f"3°52'30\"  -> Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']} (expected Gate 25, line 6)")

    h = calculate_hexagram(3.875 + 1.0/3600.0)  # 3°52'31"
    print(f"3°52'31\"  -> Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']} (expected Gate 17)")

    # Test: Sun at 93.164° (from earlier test)
    h = calculate_hexagram(93.164)
    print(f"\nSun 93°09'50\" -> Gate {h['gate']}.{h['line']}.{h['color']}.{h['tone']}.{h['base']}.{h['theos']}")

    # Test all 64 gate boundaries
    print("\n--- All 64 gate starts ---")
    for i in range(64):
        start_lon = (WHEEL_START + i * GATE_INTERVAL) % 360.0
        h = calculate_hexagram(start_lon)
        expected = GATE_ORDER[i]
        status = "✓" if h["gate"] == expected else "✗"
        print(f"  {status} Position {i+1:2d}: {start_lon:10.4f}° -> Gate {h['gate']:2d} (expected {expected:2d})")
