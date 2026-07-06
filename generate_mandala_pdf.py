#!/usr/bin/env python3
"""
Generates Мандала_Первый_Циферблат_v2.pdf with all recalculated boundaries.

Boundary convention: [start, end) — left-closed, right-open.
Display: end shown as (end - 0.01") to indicate exclusion.

Structure:
  Section 1: All 64 Programs with boundaries
  Section 2: Lines breakdown for each program (6 lines per program)
  Section 3: Full breakdown for Program 25 (lines → colors → tones → bases → theoses)
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fpdf import FPDF

# ─── Constants from hexagram.py ──────────────────────────────────────────────
GATE_ORDER = [
    25, 17, 21, 51, 42,  3, 27, 24,  2, 23,
     8, 20, 16, 35, 45, 12, 15, 52, 39, 53,
    62, 56, 31, 33,  7,  4, 29, 59, 40, 64,
    47,  6, 46, 18, 48, 57, 32, 50, 28, 44,
     1, 43, 14, 34,  9,  5, 26, 11, 10, 58,
    38, 54, 61, 60, 41, 19, 13, 49, 30, 55,
    37, 63, 22, 36
]

WHEEL_START = 358.0 + 15.0 / 60.0  # 358.25° = 358° 15' 00"

GATE_INTERVAL  = 5.625                    # 360 / 64
LINE_INTERVAL  = GATE_INTERVAL / 6        # 0.9375°
COLOR_INTERVAL = LINE_INTERVAL / 6        # 0.15625°
TONE_INTERVAL  = COLOR_INTERVAL / 6       # 0.026041666...°
BASE_INTERVAL  = TONE_INTERVAL / 5        # 0.005208333...°
THEOS_INTERVAL = BASE_INTERVAL / 3        # 0.001736111...°

DISPLAY_EPS = 0.01 / 3600.0  # 0.01" in degrees


def deg_to_dms_str(deg):
    """Convert decimal degrees to formatted string: d° mm' ss.ss\" """
    deg = deg % 360.0
    d = int(deg)
    rem = (deg - d) * 60
    m = int(rem)
    s = (rem - m) * 60
    # Handle floating point edge cases
    if s >= 59.995:
        s = 0.0
        m += 1
    if m >= 60:
        m = 0
        d += 1
    if d >= 360:
        d = 0
    return f"{d}° {m:02d}' {s:05.2f}\""


def deg_to_dms_short(deg):
    """Shorter format: d° mm' ss\" (no fractional seconds)."""
    deg = deg % 360.0
    d = int(deg)
    rem = (deg - d) * 60
    m = int(rem)
    s = (rem - m) * 60
    s_int = int(round(s))
    if s_int >= 60:
        s_int = 0
        m += 1
    if m >= 60:
        m = 0
        d += 1
    if d >= 360:
        d = 0
    if s_int == 0:
        return f"{d}° {m:02d}'"
    return f"{d}° {m:02d}' {s_int:02d}\""


def interval_str(start_deg, end_deg):
    """Format interval [start, end) with end displayed as end - 0.01\"."""
    s = deg_to_dms_str(start_deg)
    e = deg_to_dms_str((end_deg - DISPLAY_EPS) % 360.0)
    return s, e


class MandalaDoc(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        # Register Calibri font for Cyrillic support
        font_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 'Bodigraph', 'fonts', 'calibri.ttf')
        if os.path.exists(font_path):
            self.add_font('Calibri', '', font_path, uni=True)
            self.font_name = 'Calibri'
        else:
            self.font_name = 'Helvetica'

        self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        if self.page_no() > 1:
            self.set_font(self.font_name, '', 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 5, 'Мандала — Первый Циферблат v2', align='L')
            self.cell(0, 5, f'Стр. {self.page_no()}', align='R', new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(200, 200, 200)
            self.line(10, 12, 200, 12)
            self.ln(3)

    def footer(self):
        self.set_y(-10)
        self.set_font(self.font_name, '', 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 5, 'Конвенция границ: [старт; финиш) — левая включена, правая исключена',
                  align='C')

    def title_page(self):
        self.add_page()
        self.ln(60)
        self.set_font(self.font_name, '', 28)
        self.set_text_color(30, 30, 80)
        self.cell(0, 15, 'МАНДАЛА', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font(self.font_name, '', 22)
        self.set_text_color(60, 60, 120)
        self.cell(0, 12, 'Первый Циферблат', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font(self.font_name, '', 14)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, 'Версия 2.0 — Обновлённые границы', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(20)

        # Legend
        self.set_font(self.font_name, '', 11)
        self.set_text_color(40, 40, 40)
        self.cell(0, 8, 'Правило для границ:', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font(self.font_name, '', 10)
        self.cell(0, 7, 'Левая граница включается, правая — исключается [старт; финиш)',
                  align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(5)
        self.cell(0, 7, 'Начало колеса: 358° 15\' 00"', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

        # Hierarchy info
        self.set_font(self.font_name, '', 10)
        info_lines = [
            '1 Программа = 5° 37\' 30" = 5.625°',
            '1 Линия = 0° 56\' 15" = 0.9375°  (Программа / 6)',
            '1 Цвет = 0° 09\' 22.50" = 0.15625°  (Линия / 6)',
            '1 Тон = 0° 01\' 33.75" = 0.026041...°  (Цвет / 6)',
            '1 База = 0° 00\' 18.75" = 0.005208...°  (Тон / 5)',
            '1 Теос = 0° 00\' 06.25" = 0.001736...°  (База / 3)',
        ]
        for line in info_lines:
            self.cell(0, 6, line, align='C', new_x="LMARGIN", new_y="NEXT")

        self.ln(10)
        self.set_font(self.font_name, '', 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, '1 Программа = 6 Линий = 36 Цветов = 216 Тонов = 1080 Баз = 3240 Теосов',
                  align='C', new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, '64 Программы × 3240 = 207 360 Теосов на полный круг 360°',
                  align='C', new_x="LMARGIN", new_y="NEXT")

    def section_header(self, title, font_size=16):
        self.add_page()
        self.set_font(self.font_name, '', font_size)
        self.set_text_color(30, 30, 80)
        self.cell(0, 12, title, align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_draw_color(30, 30, 80)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def table_row(self, cols, widths, height=6, fill=False, bold=False, font_size=8):
        self.set_font(self.font_name, '', font_size)
        if fill:
            self.set_fill_color(230, 235, 245)
        self.set_text_color(30, 30, 30)
        for i, (col, w) in enumerate(zip(cols, widths)):
            self.cell(w, height, str(col), border=1, fill=fill, align='C')
        self.ln(height)

    def table_header_row(self, cols, widths, height=7, font_size=8):
        self.set_font(self.font_name, '', font_size)
        self.set_fill_color(40, 50, 90)
        self.set_text_color(255, 255, 255)
        for col, w in zip(cols, widths):
            self.cell(w, height, str(col), border=1, fill=True, align='C')
        self.ln(height)
        self.set_text_color(30, 30, 30)

    def programs_section(self):
        """Section 1: All 64 programs."""
        self.section_header('Раздел 1: 64 Программы (Гексаграммы)')

        widths = [12, 20, 50, 50, 58]
        headers = ['№', 'Гекс.', 'Старт (включён)', 'Финиш (исключён)', 'Интервал']

        self.table_header_row(headers, widths)

        for i in range(64):
            gate = GATE_ORDER[i]
            start = (WHEEL_START + i * GATE_INTERVAL) % 360.0
            end = (WHEEL_START + (i + 1) * GATE_INTERVAL) % 360.0
            s_str = deg_to_dms_str(start)
            e_display = deg_to_dms_str((end - DISPLAY_EPS) % 360.0)

            fill = (i % 2 == 0)

            if self.get_y() > 270:
                self.add_page()
                self.ln(5)
                self.table_header_row(headers, widths)

            self.table_row(
                [str(i + 1), str(gate), s_str, e_display,
                 f"{s_str} — {e_display}"],
                widths, fill=fill
            )

    def lines_section(self):
        """Section 2: Lines for all 64 programs."""
        self.section_header('Раздел 2: Линии (6 на каждую Программу)')

        for prog_idx in range(64):
            gate = GATE_ORDER[prog_idx]
            prog_start = (WHEEL_START + prog_idx * GATE_INTERVAL) % 360.0
            prog_end = (WHEEL_START + (prog_idx + 1) * GATE_INTERVAL) % 360.0

            # Check if we need a new page (need ~60mm for a program block)
            if self.get_y() > 230:
                self.add_page()
                self.ln(5)

            # Program header
            self.set_font(self.font_name, '', 10)
            self.set_text_color(30, 30, 80)
            ps = deg_to_dms_str(prog_start)
            pe = deg_to_dms_str((prog_end - DISPLAY_EPS) % 360.0)
            self.cell(0, 7,
                      f'Программа {prog_idx + 1}: Гексаграмма {gate}  [{ps} — {pe}]',
                      new_x="LMARGIN", new_y="NEXT")

            widths = [15, 55, 55, 65]
            headers = ['Линия', 'Старт (включён)', 'Финиш (исключён)', 'Интервал']
            self.table_header_row(headers, widths, height=6, font_size=7)

            for line_idx in range(6):
                line_start = (prog_start + line_idx * LINE_INTERVAL) % 360.0
                line_end = (prog_start + (line_idx + 1) * LINE_INTERVAL) % 360.0
                ls = deg_to_dms_str(line_start)
                le = deg_to_dms_str((line_end - DISPLAY_EPS) % 360.0)

                fill = (line_idx % 2 == 0)
                self.table_row(
                    [str(line_idx + 1), ls, le, f"{ls} — {le}"],
                    widths, height=5, fill=fill, font_size=7
                )

            self.ln(3)

    def full_breakdown_program(self, prog_idx):
        """Section 3: Full breakdown for one program (lines → colors → tones → bases → theoses)."""
        gate = GATE_ORDER[prog_idx]
        prog_start = (WHEEL_START + prog_idx * GATE_INTERVAL) % 360.0
        prog_end = (WHEEL_START + (prog_idx + 1) * GATE_INTERVAL) % 360.0
        ps = deg_to_dms_str(prog_start)
        pe = deg_to_dms_str((prog_end - DISPLAY_EPS) % 360.0)

        self.section_header(
            f'Раздел 3: Полная разбивка — Программа {prog_idx+1} (Гекс. {gate})', 14)
        self.set_font(self.font_name, '', 9)
        self.set_text_color(60, 60, 60)
        self.cell(0, 6, f'Интервал: {ps} — {pe}', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

        for line_idx in range(6):
            line_start = (prog_start + line_idx * LINE_INTERVAL) % 360.0
            line_end = (prog_start + (line_idx + 1) * LINE_INTERVAL) % 360.0

            # Line header
            if self.get_y() > 250:
                self.add_page()
                self.ln(3)

            self.set_font(self.font_name, '', 10)
            self.set_text_color(30, 60, 120)
            ls = deg_to_dms_str(line_start)
            le = deg_to_dms_str((line_end - DISPLAY_EPS) % 360.0)
            self.cell(0, 7, f'Линия {line_idx + 1}: {ls} — {le}',
                      new_x="LMARGIN", new_y="NEXT")

            # Colors table
            widths = [15, 50, 50]
            headers = ['Цвет', 'Старт', 'Финиш']
            self.table_header_row(headers, widths, height=5, font_size=7)

            for color_idx in range(6):
                color_start = (line_start + color_idx * COLOR_INTERVAL) % 360.0
                color_end = (line_start + (color_idx + 1) * COLOR_INTERVAL) % 360.0
                cs = deg_to_dms_str(color_start)
                ce = deg_to_dms_str((color_end - DISPLAY_EPS) % 360.0)
                fill = (color_idx % 2 == 0)
                self.table_row([str(color_idx + 1), cs, ce],
                               widths, height=4.5, fill=fill, font_size=6.5)

            self.ln(2)

            # Tones detail for each color
            for color_idx in range(6):
                color_start = (line_start + color_idx * COLOR_INTERVAL) % 360.0

                if self.get_y() > 250:
                    self.add_page()
                    self.ln(3)

                self.set_font(self.font_name, '', 8)
                self.set_text_color(80, 80, 140)
                self.cell(0, 5,
                          f'  Цвет {color_idx + 1} → Тоны:',
                          new_x="LMARGIN", new_y="NEXT")

                tw = [12, 45, 45]
                self.table_header_row(['Тон', 'Старт', 'Финиш'], tw, height=4.5, font_size=6)

                for tone_idx in range(6):
                    tone_start = (color_start + tone_idx * TONE_INTERVAL) % 360.0
                    tone_end = (color_start + (tone_idx + 1) * TONE_INTERVAL) % 360.0
                    ts = deg_to_dms_str(tone_start)
                    te = deg_to_dms_str((tone_end - DISPLAY_EPS) % 360.0)
                    fill = (tone_idx % 2 == 0)
                    self.table_row([str(tone_idx + 1), ts, te],
                                   tw, height=4, fill=fill, font_size=6)

                self.ln(1)

    def bases_theoses_example(self, prog_idx):
        """Section 4: Bases and Theoses for first line/color/tone of a program."""
        gate = GATE_ORDER[prog_idx]
        prog_start = (WHEEL_START + prog_idx * GATE_INTERVAL) % 360.0

        self.section_header(
            f'Раздел 4: Базы и Теосы — Гекс. {gate}, Линия 1, Цвет 1, Тон 1', 12)

        tone_start = prog_start  # Line 1, Color 1, Tone 1

        self.set_font(self.font_name, '', 9)
        self.set_text_color(40, 40, 40)
        ts = deg_to_dms_str(tone_start)
        te = deg_to_dms_str((tone_start + TONE_INTERVAL - DISPLAY_EPS) % 360.0)
        self.cell(0, 6, f'Тон 1 интервал: {ts} — {te}',
                  align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

        for base_idx in range(5):
            base_start = (tone_start + base_idx * BASE_INTERVAL) % 360.0
            base_end = (tone_start + (base_idx + 1) * BASE_INTERVAL) % 360.0

            if self.get_y() > 255:
                self.add_page()
                self.ln(3)

            self.set_font(self.font_name, '', 9)
            self.set_text_color(40, 80, 40)
            bs = deg_to_dms_str(base_start)
            be = deg_to_dms_str((base_end - DISPLAY_EPS) % 360.0)
            self.cell(0, 6, f'База {base_idx + 1}: {bs} — {be}',
                      new_x="LMARGIN", new_y="NEXT")

            # Theoses
            tw = [12, 50, 50]
            self.table_header_row(['Теос', 'Старт', 'Финиш'], tw, height=5, font_size=7)

            for theos_idx in range(3):
                theos_start = (base_start + theos_idx * THEOS_INTERVAL) % 360.0
                theos_end = (base_start + (theos_idx + 1) * THEOS_INTERVAL) % 360.0
                ths = deg_to_dms_str(theos_start)
                the = deg_to_dms_str((theos_end - DISPLAY_EPS) % 360.0)
                fill = (theos_idx % 2 == 0)
                self.table_row([str(theos_idx + 1), ths, the],
                               tw, height=5, fill=fill, font_size=7)
            self.ln(2)

        # Also show ALL 6 tones x 5 bases x 3 theoses for Line 1, Color 1
        self.section_header(
            f'Раздел 4б: Все Базы×Теосы — Гекс. {gate}, Л.1, Ц.1 (все 6 Тонов)', 11)

        for tone_idx in range(6):
            t_start = (prog_start + tone_idx * TONE_INTERVAL) % 360.0

            if self.get_y() > 240:
                self.add_page()
                self.ln(3)

            self.set_font(self.font_name, '', 9)
            self.set_text_color(30, 30, 80)
            t_s = deg_to_dms_str(t_start)
            t_e = deg_to_dms_str((t_start + TONE_INTERVAL - DISPLAY_EPS) % 360.0)
            self.cell(0, 6, f'Тон {tone_idx + 1}: {t_s} — {t_e}',
                      new_x="LMARGIN", new_y="NEXT")

            tw = [10, 10, 45, 45]
            self.table_header_row(['База', 'Теос', 'Старт', 'Финиш'],
                                  tw, height=4.5, font_size=6)

            row_n = 0
            for base_idx in range(5):
                for theos_idx in range(3):
                    abs_start = (t_start + base_idx * BASE_INTERVAL
                                 + theos_idx * THEOS_INTERVAL) % 360.0
                    abs_end = (abs_start + THEOS_INTERVAL) % 360.0
                    s = deg_to_dms_str(abs_start)
                    e = deg_to_dms_str((abs_end - DISPLAY_EPS) % 360.0)
                    fill = (row_n % 2 == 0)
                    self.table_row(
                        [str(base_idx + 1), str(theos_idx + 1), s, e],
                        tw, height=4, fill=fill, font_size=6
                    )
                    row_n += 1

            self.ln(2)


def main():
    print("Generating Мандала_Первый_Циферблат_v2.pdf ...")

    doc = MandalaDoc()
    doc.set_title('Мандала — Первый Циферблат v2')
    doc.set_author('Humantica')

    # Section 0: Title page
    print("  Title page...")
    doc.title_page()

    # Section 1: All 64 programs
    print("  Section 1: 64 Programs...")
    doc.programs_section()

    # Section 2: Lines for all 64 programs
    print("  Section 2: Lines for all programs...")
    doc.lines_section()

    # Section 3: Full breakdown for Program 25 (index 0)
    print("  Section 3: Full breakdown Program 25 (colors + tones)...")
    doc.full_breakdown_program(0)  # index 0 = Gate 25

    # Section 4: Bases and Theoses example
    print("  Section 4: Bases & Theoses example...")
    doc.bases_theoses_example(0)

    # Save
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               'Мандала_Первый_Циферблат_v2.pdf')
    doc.output(output_path)
    print(f"\n✓ PDF saved: {output_path}")
    print(f"  Pages: {doc.pages_count}")


if __name__ == '__main__':
    main()
