# -*- coding: utf-8 -*-
import os
import sys
import unittest
from datetime import datetime
import pytz
import swisseph as swe

sys.path.append(os.getcwd())
import app
import calculator
import hexagram
import cities_data


class TestKrasnoyarskCalculation(unittest.TestCase):
    """
    Acceptance Criteria Tests for Humantica Human Design & Astrological Engine:
    Case: 18.07.1986, 04:20, Krasnoyarsk, Russia.
    """

    def setUp(self):
        self.lat = 56.0153
        self.lon = 92.8932
        self.birth_date = "1986-07-18"
        self.birth_date_dot = "18.07.1986"
        self.birth_time = "04:20"

    def test_coordinates_and_geocoding(self):
        """R3: Confirm lat/lon parsing points correctly to Krasnoyarsk (56.0153° N, 92.8932° E)."""
        matches = cities_data.search_local_cities("красноярск")
        self.assertTrue(len(matches) > 0, "Krasnoyarsk should be found in local cities")
        krasnoyarsk = matches[0]
        self.assertEqual(krasnoyarsk["lat"], 56.0153)
        self.assertEqual(krasnoyarsk["lon"], 92.8932)
        print(f"\n[PASS] Krasnoyarsk Coordinates: {krasnoyarsk['lat']}° N, {krasnoyarsk['lon']}° E")

    def test_timezone_historical_offset(self):
        """R1: Confirm historical USSR daylight saving time in summer 1986 results in UTC+8."""
        tz_name = app.get_timezone_by_coords(self.lat, self.lon)
        self.assertEqual(tz_name, "Asia/Krasnoyarsk")
        
        local_tz = pytz.timezone(tz_name)
        dt_local = datetime(1986, 7, 18, 4, 20)
        dt_localized = local_tz.localize(dt_local, is_dst=None)
        dt_gmt = dt_localized.astimezone(pytz.UTC)
        
        offset_seconds = dt_localized.utcoffset().total_seconds()
        offset_hours = offset_seconds / 3600.0
        
        # In summer 1986, USSR DST was active (UTC+7 + 1h = UTC+8)
        self.assertEqual(offset_hours, 8.0, "Krasnoyarsk in July 1986 must have UTC+8 offset")
        self.assertEqual(dt_gmt.strftime("%Y-%m-%d %H:%M:%S"), "1986-07-17 20:20:00")
        print(f"[PASS] Timezone: {tz_name}, Offset: UTC+{int(offset_hours)}, GMT Time: {dt_gmt}")

    def test_planetary_positions_and_pinpoint_divergence(self):
        """R1 & R2: Compute chart and pinpoint divergence against UTC+7 / UTC+8 baselines."""
        chart = app.calculate_person_chart({
            "birth_date": self.birth_date,
            "birth_time": self.birth_time,
            "lat": self.lat,
            "lon": self.lon
        })
        
        planets = {p["name"]: p for p in chart["planets"]}
        design_planets = {p["name"]: p for p in chart["design_planets"]}
        
        sun = planets["Солнце"]
        moon = planets["Луна"]
        earth = planets["Земля"]
        design_sun = design_planets["Солнце"]
        design_moon = design_planets["Луна"]
        design_earth = design_planets["Земля"]
        
        # Verify Personality Sun: 24° 56' 53" Cancer (Gate 62, Line 5, Color 3)
        self.assertEqual(sun["formatted"]["sign"], "Рак")
        self.assertEqual(sun["formatted"]["deg"], 24)
        self.assertEqual(sun["formatted"]["min"], 56)
        self.assertEqual(sun["hexagram"]["gate"], 62)
        self.assertEqual(sun["hexagram"]["line"], 5)
        self.assertEqual(sun["hexagram"]["color"], 3)
        
        # Verify Personality Moon: 4° 43' 39" Sagittarius (Gate 34, Line 5, Color 6)
        self.assertEqual(moon["formatted"]["sign"], "Стрелец")
        self.assertEqual(moon["formatted"]["deg"], 4)
        self.assertEqual(moon["formatted"]["min"], 43)
        self.assertEqual(moon["hexagram"]["gate"], 34)
        self.assertEqual(moon["hexagram"]["line"], 5)
        self.assertEqual(moon["hexagram"]["color"], 6)

        # Verify Personality Earth: 24° 56' 53" Capricorn (Gate 61, Line 5, Color 3)
        self.assertEqual(earth["formatted"]["sign"], "Козерог")
        self.assertEqual(earth["formatted"]["deg"], 24)
        self.assertEqual(earth["formatted"]["min"], 56)
        self.assertEqual(earth["hexagram"]["gate"], 61)
        self.assertEqual(earth["hexagram"]["line"], 5)
        
        # Verify Design Sun: 26° 56' 53" Aries (Gate 3, Line 1, Color 4)
        self.assertEqual(design_sun["formatted"]["sign"], "Овен")
        self.assertEqual(design_sun["formatted"]["deg"], 26)
        self.assertEqual(design_sun["formatted"]["min"], 56)
        self.assertEqual(design_sun["hexagram"]["gate"], 3)
        self.assertEqual(design_sun["hexagram"]["line"], 1)
        self.assertEqual(design_sun["hexagram"]["color"], 4)
        
        # Verify Design Moon: 24° 53' 46" Cancer (Gate 62, Line 5, Color 3)
        self.assertEqual(design_moon["formatted"]["sign"], "Рак")
        self.assertEqual(design_moon["formatted"]["deg"], 24)
        self.assertEqual(design_moon["formatted"]["min"], 53)
        self.assertEqual(design_moon["hexagram"]["gate"], 62)
        self.assertEqual(design_moon["hexagram"]["line"], 5)

        # Verify Design Earth: 26° 56' 53" Libra (Gate 50, Line 1, Color 4)
        self.assertEqual(design_earth["formatted"]["sign"], "Весы")
        self.assertEqual(design_earth["formatted"]["deg"], 26)
        self.assertEqual(design_earth["formatted"]["min"], 56)
        self.assertEqual(design_earth["hexagram"]["gate"], 50)
        self.assertEqual(design_earth["hexagram"]["line"], 1)
        
        # Verify Design Solar Arc: exactly 88 degrees prior to birth Sun
        solar_arc_diff = (sun["longitude"] - design_sun["longitude"]) % 360.0
        self.assertAlmostEqual(solar_arc_diff, 88.0, places=6, msg="Design Solar Arc must be exactly 88.0°")
        
        # Pinpoint divergence if UTC+7 was erroneously used:
        # At UTC+7 (21:20 UTC), Moon would have progressed to 5° 20' 20" Sagittarius (Gate 34, Line 6)
        jd_utc7 = swe.julday(1986, 7, 17, 21 + 20/60.0)
        res_moon_utc7, _ = swe.calc_ut(jd_utc7, swe.MOON, swe.FLG_SWIEPH | swe.FLG_SPEED)
        hex_moon_utc7 = hexagram.calculate_hexagram(res_moon_utc7[0])
        
        print(f"[PASS] Personality Sun: {sun['formatted']['formatted']} -> Gate {sun['hexagram']['gate']}.{sun['hexagram']['line']}.{sun['hexagram']['color']}")
        print(f"[PASS] Personality Moon: {moon['formatted']['formatted']} -> Gate {moon['hexagram']['gate']}.{moon['hexagram']['line']}.{moon['hexagram']['color']}")
        print(f"[PASS] Design Sun: {design_sun['formatted']['formatted']} -> Gate {design_sun['hexagram']['gate']}.{design_sun['hexagram']['line']}.{design_sun['hexagram']['color']}")
        print(f"[PASS] Design Moon: {design_moon['formatted']['formatted']} -> Gate {design_moon['hexagram']['gate']}.{design_moon['hexagram']['line']}.{design_moon['hexagram']['color']}")
        print(f"[PASS] Solar Arc: {solar_arc_diff:.8f}° (Exact 88.0° HD specification verified)")
        print(f"[INFO] Erroneous UTC+7 baseline would produce Moon: {res_moon_utc7[0]:.4f}° -> Gate {hex_moon_utc7['gate']}.{hex_moon_utc7['line']} (discrepancy explained)")

    def test_flexible_date_formats(self):
        """Test that date formats like DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY produce identical charts."""
        chart1 = app.calculate_person_chart({
            "birth_date": "1986-07-18",
            "birth_time": "04:20",
            "lat": self.lat,
            "lon": self.lon
        })
        chart2 = app.calculate_person_chart({
            "birth_date": "18.07.1986",
            "birth_time": "04:20",
            "lat": self.lat,
            "lon": self.lon
        })
        chart3 = app.calculate_person_chart({
            "birth_date": "18/07/1986",
            "birth_time": "04:20",
            "lat": self.lat,
            "lon": self.lon
        })
        
        self.assertEqual(chart1["metadata"]["datetime_gmt"], chart2["metadata"]["datetime_gmt"])
        self.assertEqual(chart1["metadata"]["datetime_gmt"], chart3["metadata"]["datetime_gmt"])
        self.assertEqual(chart1["planets"][0]["longitude"], chart2["planets"][0]["longitude"])
        self.assertEqual(chart1["planets"][1]["longitude"], chart3["planets"][1]["longitude"])

    def test_string_coordinates_and_is_gmt(self):
        """Test that string coordinate inputs and is_gmt flag are handled gracefully without type errors."""
        chart_str = app.calculate_person_chart({
            "birth_date": "1986-07-18",
            "birth_time": "04:20",
            "lat": "56.0153",
            "lon": "92.8932",
            "is_gmt": True
        })
        self.assertEqual(chart_str["metadata"]["timezone"], "UTC")
        self.assertEqual(chart_str["metadata"]["latitude"], 56.0153)
        self.assertEqual(chart_str["metadata"]["longitude"], 92.8932)
        self.assertEqual(chart_str["metadata"]["datetime_gmt"], "1986-07-18 04:20:00")

    def test_coordinate_validation(self):
        """Test invalid coordinate bounds raise appropriate ValueError."""
        with self.assertRaises(ValueError):
            app.calculate_person_chart({
                "birth_date": "1986-07-18",
                "birth_time": "04:20",
                "lat": 95.0,
                "lon": 92.8932
            })

        with self.assertRaises(ValueError):
            app.calculate_person_chart({
                "birth_date": "1986-07-18",
                "birth_time": "04:20",
                "lat": 56.0153,
                "lon": 400.0
            })

    def test_coordinate_type_and_nan_checks(self):
        """Test boolean, NaN, and Inf inputs in coordinates are rejected with ValueError."""
        for invalid_val in [True, False, float('nan'), float('inf'), float('-inf')]:
            with self.assertRaises(ValueError):
                app.calculate_person_chart({
                    "birth_date": "1986-07-18",
                    "birth_time": "04:20",
                    "lat": invalid_val,
                    "lon": 92.8932
                })
            with self.assertRaises(ValueError):
                app.calculate_person_chart({
                    "birth_date": "1986-07-18",
                    "birth_time": "04:20",
                    "lat": 56.0153,
                    "lon": invalid_val
                })
            with self.assertRaises(ValueError):
                calculator.calculate_chart(1986, 7, 17, 20.333, invalid_val, 92.8932)
            with self.assertRaises(ValueError):
                calculator.calculate_chart(1986, 7, 17, 20.333, 56.0153, invalid_val)

        # get_timezone_by_coords should safely return UTC for invalid non-numeric inputs
        self.assertEqual(app.get_timezone_by_coords(float('nan'), float('nan')), "UTC")
        self.assertEqual(app.get_timezone_by_coords(float('inf'), 0.0), "UTC")
        self.assertEqual(app.get_timezone_by_coords(True, False), "UTC")


class TestDSTTransitions(unittest.TestCase):
    """
    Test historical DST boundary transitions (spring-forward gap and fall-back overlap).
    """

    def test_spring_forward_gap_resolution(self):
        """Test birth during non-existent spring-forward clock jump (02:00 -> 03:00)."""
        chart = app.calculate_person_chart({
            "birth_date": "1986-03-30",
            "birth_time": "02:30",
            "lat": 56.0153,
            "lon": 92.8932
        })
        self.assertIsNotNone(chart["metadata"]["datetime_gmt"])
        self.assertEqual(chart["metadata"]["timezone"], "Asia/Krasnoyarsk")

    def test_fall_back_overlap_resolution(self):
        """Test birth during ambiguous fall-back clock overlap (03:00 -> 02:00)."""
        chart = app.calculate_person_chart({
            "birth_date": "1986-09-28",
            "birth_time": "02:30",
            "lat": 56.0153,
            "lon": 92.8932
        })
        self.assertIsNotNone(chart["metadata"]["datetime_gmt"])
        self.assertEqual(chart["metadata"]["timezone"], "Asia/Krasnoyarsk")


class TestBoundaryAndLoopCalculations(unittest.TestCase):
    """
    Acceptance Criteria: Verify 360-degree boundary arithmetic, degree looping, and edge cases.
    """

    def test_format_longitude_boundaries(self):
        """Test degree formatting near 0° and 360° boundaries."""
        # 0° -> Aries 0° 0' 0"
        f0 = calculator.format_longitude(0.0)
        self.assertEqual(f0["sign"], "Овен")
        self.assertEqual(f0["deg"], 0)
        
        # 360.0° -> wraps to Aries 0° 0' 0"
        f360 = calculator.format_longitude(360.0)
        self.assertEqual(f360["sign"], "Овен")
        self.assertEqual(f360["deg"], 0)
        
        # -0.0001° -> wraps to Pisces 29° 59' 59"
        f_neg = calculator.format_longitude(-0.0001)
        self.assertEqual(f_neg["sign"], "Рыбы")
        self.assertEqual(f_neg["deg"], 29)
        self.assertEqual(f_neg["min"], 59)
        
        # 359.9999° -> Pisces 29° 59' 59"
        f359 = calculator.format_longitude(359.9999)
        self.assertEqual(f359["sign"], "Рыбы")
        self.assertEqual(f359["deg"], 29)
        self.assertEqual(f359["min"], 59)

    def test_hexagram_wheel_boundaries(self):
        """Test Human Design Rave Mandala 360-degree wrapping and boundaries."""
        # Wheel starts at 358.25° (Gate 25.1.1.1.1.1)
        h_start = hexagram.calculate_hexagram(hexagram.WHEEL_START)
        self.assertEqual(h_start["gate"], 25)
        self.assertEqual(h_start["line"], 1)
        self.assertEqual(h_start["position"], 1)
        
        # Just before 358.25° is Gate 36 Line 6 (position 64)
        h_end = hexagram.calculate_hexagram(hexagram.WHEEL_START - 1e-9)
        self.assertEqual(h_end["gate"], 36)
        self.assertEqual(h_end["line"], 6)
        self.assertEqual(h_end["position"], 64)
        
        # 0.0° and 360.0° must give identical gate details
        h0 = hexagram.calculate_hexagram(0.0)
        h360 = hexagram.calculate_hexagram(360.0)
        self.assertEqual(h0, h360)
        self.assertEqual(h0["gate"], 25)
        self.assertEqual(h0["line"], 2)

    def test_design_jd_across_all_seasons(self):
        """Test calculate_design_jd across all months of the year."""
        for month in range(1, 13):
            jd_birth = swe.julday(2024, month, 15, 12.0)
            res_sun, _ = swe.calc_ut(jd_birth, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SPEED)
            birth_sun_lon = res_sun[0]
            
            design_jd = calculator.calculate_design_jd(jd_birth, birth_sun_lon)
            res_design_sun, _ = swe.calc_ut(design_jd, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SPEED)
            design_sun_lon = res_design_sun[0]
            
            diff = (birth_sun_lon - design_sun_lon) % 360.0
            self.assertAlmostEqual(diff, 88.0, places=6, msg=f"Failed 88° arc for month {month}")


class TestRegressionOtherLocations(unittest.TestCase):
    """
    Ensure calculations remain accurate across various dates, timezones, and coordinates.
    """

    def test_moscow_chart(self):
        chart = app.calculate_person_chart({
            "birth_date": "2024-01-01",
            "birth_time": "12:00",
            "lat": 55.7558,
            "lon": 37.6173
        })
        self.assertEqual(chart["metadata"]["timezone"], "Europe/Moscow")
        self.assertEqual(chart["metadata"]["utc_offset"], "UTC+3")
        self.assertEqual(chart["metadata"]["datetime_gmt"], "2024-01-01 09:00:00")

    def test_southern_and_western_hemisphere(self):
        # Rio de Janeiro (-22.9068° S, -43.1729° W)
        chart_rio = app.calculate_person_chart({
            "birth_date": "1995-12-25",
            "birth_time": "15:30",
            "lat": -22.9068,
            "lon": -43.1729
        })
        self.assertIn("America", chart_rio["metadata"]["timezone"])
        self.assertEqual(chart_rio["metadata"]["latitude"], -22.9068)
        self.assertEqual(chart_rio["metadata"]["longitude"], -43.1729)

        # New York (40.7128° N, -74.0060° W)
        chart_ny = app.calculate_person_chart({
            "birth_date": "2001-09-11",
            "birth_time": "08:46",
            "lat": 40.7128,
            "lon": -74.0060
        })
        self.assertIn("America", chart_ny["metadata"]["timezone"])
        self.assertEqual(chart_ny["metadata"]["utc_offset"], "UTC-4")

    def test_high_latitude_polar(self):
        # Murmansk (68.9585° N, 33.0827° E) with use_polar_equal=True
        chart = app.calculate_person_chart({
            "birth_date": "2024-06-21",
            "birth_time": "12:00",
            "lat": 68.9585,
            "lon": 33.0827,
            "house_system": "P",
            "use_polar_equal": True,
            "polar_boundary": 62.0
        })
        self.assertEqual(len(chart["houses"]), 12)
        self.assertEqual(chart["metadata"]["calculated_house_system"], "D")

    def test_polar_unhandled_placidus_fallback(self):
        # High polar latitude with Placidus where use_polar_equal=False
        # Must gracefully fall back to Porphyry ('O') instead of crashing
        chart = app.calculate_person_chart({
            "birth_date": "2024-06-21",
            "birth_time": "12:00",
            "lat": 78.0,
            "lon": 15.0,
            "house_system": "P",
            "use_polar_equal": False
        })
        self.assertEqual(len(chart["houses"]), 12)
        self.assertEqual(chart["metadata"]["calculated_house_system"], "O")

    def test_longitude_normalization_0_to_360(self):
        """Test that 0-360 degree longitudes (e.g. 285.994° for -74.006°) work identically."""
        tz_neg = app.get_timezone_by_coords(40.7128, -74.0060)
        tz_pos = app.get_timezone_by_coords(40.7128, 285.9940)
        self.assertEqual(tz_neg, tz_pos)
        self.assertEqual(tz_pos, "America/New_York")

        chart_neg = app.calculate_person_chart({
            "birth_date": "2000-01-01",
            "birth_time": "12:00",
            "lat": 40.7128,
            "lon": -74.0060
        })
        chart_pos = app.calculate_person_chart({
            "birth_date": "2000-01-01",
            "birth_time": "12:00",
            "lat": 40.7128,
            "lon": 285.9940
        })
        self.assertEqual(chart_neg["metadata"]["datetime_gmt"], chart_pos["metadata"]["datetime_gmt"])
        self.assertEqual(chart_neg["planets"][0]["longitude"], chart_pos["planets"][0]["longitude"])

    def test_global_offline_timezones(self):
        """Test that major global hubs and regional capitals resolve offline to correct IANA zones without network calls."""
        cities = [
            (51.5074, -0.1278, "Europe/London"),
            (48.8566, 2.3522, "Europe/Paris"),
            (52.5200, 13.4050, "Europe/Berlin"),
            (35.6762, 139.6503, "Asia/Tokyo"),
            (39.9042, 116.4074, "Asia/Shanghai"),
            (1.3521, 103.8198, "Asia/Singapore"),
            (28.6139, 77.2090, "Asia/Kolkata"),
            (41.0082, 28.9784, "Europe/Istanbul"),
            (41.8781, -87.6298, "America/Chicago"),
            (37.7749, -122.4194, "America/Los_Angeles"),
            (-33.8688, 151.2093, "Australia/Sydney"),
            (-36.8485, 174.7633, "Pacific/Auckland"),
            (21.3069, -157.8583, "Pacific/Honolulu"),
            (30.0444, 31.2357, "Africa/Cairo"),
            (-26.2041, 28.0473, "Africa/Johannesburg"),
            (52.2297, 21.0122, "Europe/Warsaw"),
            # Russian regional & Far East capitals
            (62.0397, 129.7422, "Asia/Yakutsk"),
            (59.5638, 150.8036, "Asia/Magadan"),
            (53.0452, 158.6483, "Asia/Kamchatka"),
            (64.7337, 177.5089, "Asia/Anadyr"),
            (46.9541, 142.7360, "Asia/Sakhalin"),
            (52.0339, 113.5009, "Asia/Chita"),
            (50.2728, 127.5358, "Asia/Yakutsk"),
            (68.9585, 33.0827, "Europe/Moscow"),
            (64.5401, 40.5433, "Europe/Moscow"),
        ]
        for lat, lon, expected_tz in cities:
            tz = app.get_timezone_by_coords(lat, lon)
            self.assertEqual(tz, expected_tz, f"Failed for coords {lat}, {lon}")

    def test_extreme_longitude_and_date_line_timezones(self):
        """Test Far East 180° meridian, Chukotka wrap-around, and Prime Meridian timezone lookup."""
        # 180.0° and -180.0° at high Russian latitudes should resolve to Asia/Kamchatka
        self.assertEqual(cities_data.get_nearest_timezone(64.0, 180.0), "Asia/Kamchatka")
        self.assertEqual(cities_data.get_nearest_timezone(64.0, -180.0), "Asia/Kamchatka")
        self.assertEqual(cities_data.get_nearest_timezone(64.0, -170.0), "Asia/Kamchatka")
        self.assertEqual(cities_data.get_nearest_timezone(64.0, 190.0), "Asia/Kamchatka")

        # Prime meridian / Equator (0.0, 0.0)
        self.assertEqual(app.get_timezone_by_coords(0.0, 0.0), "UTC")


class TestApiEndpoints(unittest.TestCase):
    """
    Test Flask API endpoints for calculate and synastry.
    """

    def setUp(self):
        app.app.testing = True
        self.client = app.app.test_client()

    def test_api_calculate_krasnoyarsk(self):
        resp = self.client.post("/api/calculate", json={
            "birth_date": "18.07.1986",
            "birth_time": "04:20",
            "lat": 56.0153,
            "lon": 92.8932
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["metadata"]["timezone"], "Asia/Krasnoyarsk")
        self.assertEqual(data["metadata"]["datetime_gmt"], "1986-07-17 20:20:00")
        self.assertEqual(len(data["planets"]), 20)
        self.assertEqual(len(data["design_planets"]), 20)

    def test_api_calculate_validation_errors(self):
        resp = self.client.post("/api/calculate", json={})
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("error", data)

        resp2 = self.client.post("/api/calculate", json={
            "birth_date": "18.07.1986",
            "birth_time": "04:20",
            "lat": "invalid",
            "lon": 92.8932
        })
        self.assertEqual(resp2.status_code, 400)

    def test_api_synastry(self):
        resp = self.client.post("/api/synastry", json={
            "p1": {
                "birth_date": "18.07.1986",
                "birth_time": "04:20",
                "lat": 56.0153,
                "lon": 92.8932
            },
            "p2": {
                "birth_date": "1990-05-15",
                "birth_time": "14:30",
                "lat": 55.7558,
                "lon": 37.6173
            }
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn("p1", data)
        self.assertIn("p2", data)
        self.assertIn("aspects", data)
        self.assertIn("scores", data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
