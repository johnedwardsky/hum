import os
import ssl

# Bypass SSL certificate verification on macOS globally and for geopy
ssl._create_default_https_context = ssl._create_unverified_context
try:
    import geopy.geocoders
    geopy.geocoders.options.default_ssl_context = ssl._create_unverified_context()
except Exception as e:
    pass

import urllib.request
import json
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from geopy.geocoders import Nominatim
import pytz

import calculator
import compatibility_data

app = Flask(__name__)

# Initialize geolocator
geolocator = Nominatim(user_agent="humantica_astrology_app")

def get_timezone_by_coords(lat, lon):
    """
    Attempts to look up the timezone name from coordinates using timeapi.io.
    Falls back to estimating timezone from longitude if offline or failed.
    """
    try:
        url = f"https://timeapi.io/api/TimeZone/coordinate?latitude={lat}&longitude={lon}"
        req = urllib.request.Request(url, headers={'User-Agent': 'humantica_astrology_app'})
        with urllib.request.urlopen(req, timeout=4) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            tz_name = res_data.get('timeZone')
            if tz_name in pytz.all_timezones:
                return tz_name
    except Exception as e:
        print(f"Error fetching timezone from API: {e}")
    
    # Fallback: estimate timezone from longitude (15 degrees = 1 hour offset)
    # Note: pytz uses reversed signs for Etc/GMT zones (Etc/GMT-3 is UTC+3)
    offset = round(lon / 15.0)
    sign = '-' if offset >= 0 else '+'
    offset_abs = abs(offset)
    
    tz_name = f"Etc/GMT{sign}{offset_abs}"
    if tz_name in pytz.all_timezones:
        return tz_name
    return "UTC"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/geocode', methods=['GET'])
def geocode():
    query = request.args.get('query', '')
    if not query:
        return jsonify([])
    
    try:
        locations = geolocator.geocode(query, exactly_one=False, limit=5, language="ru")
        if not locations:
            return jsonify([])
        
        results = []
        for loc in locations:
            results.append({
                "display_name": loc.address,
                "lat": loc.latitude,
                "lon": loc.longitude
            })
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def calculate_person_chart(data):
    birth_date = data.get('birth_date')  # YYYY-MM-DD
    birth_time = data.get('birth_time')  # HH:MM or HH:MM:SS
    lat = data.get('lat')
    lon = data.get('lon')
    is_gmt = data.get('is_gmt', False)
    
    if not birth_date or not birth_time:
        raise ValueError("Дата и время обязательны")
        
    time_obj = None
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            time_obj = datetime.strptime(birth_time, fmt).time()
            break
        except ValueError:
            continue
    if not time_obj:
        raise ValueError("Неверный формат времени. Используйте ЧЧ:ММ или ЧЧ:ММ:СС")
        
    date_obj = datetime.strptime(birth_date, "%Y-%m-%d").date()
    dt_local = datetime.combine(date_obj, time_obj)
    
    if not is_gmt:
        if lat is None or lon is None:
            raise ValueError("Координаты обязательны для расчета местного времени")
        try:
            lat = float(lat)
            lon = float(lon)
        except ValueError:
            raise ValueError("Неверный формат координат")
        
    timezone_name = "UTC"
    if is_gmt:
        dt_gmt = dt_local.replace(tzinfo=pytz.UTC)
        dt_localized = dt_local.replace(tzinfo=pytz.UTC)
    else:
        timezone_name = get_timezone_by_coords(lat, lon)
        local_tz = pytz.timezone(timezone_name)
        dt_localized = local_tz.localize(dt_local, is_dst=None)
        dt_gmt = dt_localized.astimezone(pytz.UTC)
        
    if is_gmt:
        utc_offset_str = "UTC+0"
    else:
        offset_seconds = dt_localized.utcoffset().total_seconds()
        offset_hours = offset_seconds / 3600.0
        utc_offset_str = f"UTC{'+' if offset_hours >= 0 else ''}{offset_hours:g}"
        
    gmt_year = dt_gmt.year
    gmt_month = dt_gmt.month
    gmt_day = dt_gmt.day
    gmt_hour_dec = dt_gmt.hour + dt_gmt.minute / 60.0 + dt_gmt.second / 3600.0
    
    calc_lat = lat if lat is not None else 0.0
    calc_lon = lon if lon is not None else 0.0
    
    house_system = data.get('house_system', 'P')
    try:
        cusp_offset = float(data.get('cusp_offset', 0.0))
    except (ValueError, TypeError):
        cusp_offset = 0.0

    use_polar_equal = bool(data.get('use_polar_equal', False))
    try:
        polar_boundary = float(data.get('polar_boundary', 62.0))
    except (ValueError, TypeError):
        polar_boundary = 62.0

    chart_data = calculator.calculate_chart(
        gmt_year, gmt_month, gmt_day, gmt_hour_dec, calc_lat, calc_lon,
        house_system=house_system, cusp_offset=cusp_offset,
        use_polar_equal=use_polar_equal, polar_boundary=polar_boundary
    )
    
    # Attach interpretations from interpretations database
    try:
        import interpretations
        for p in chart_data["planets"]:
            planet_name = p["name"]
            sign_name = p["formatted"]["sign"]
            
            # Map node names to their base interpretations key
            mapping_name = planet_name
            if "Северный Узел" in planet_name:
                mapping_name = "Северный Узел"
            elif "Южный Узел" in planet_name:
                mapping_name = "Южный Узел"
                
            p_texts = interpretations.PLANETS_TEXTS.get(mapping_name, {})
            p["interpretation"] = p_texts.get(sign_name, f"Индивидуальное влияние {planet_name} в знаке {sign_name}.")

        for h in chart_data["houses"]:
            house_num = str(h["number"])
            sign_name = h["formatted"]["sign"]
            h_texts = interpretations.HOUSES_TEXTS.get(house_num, {})
            h["interpretation"] = h_texts.get(sign_name, f"Влияние {h['name']} в знаке {sign_name}.")
    except Exception as err:
        print(f"Error mapping interpretations: {err}")
        
    chart_data["metadata"] = {
        "birth_date_local": birth_date,
        "birth_time_local": birth_time,
        "timezone": timezone_name,
        "utc_offset": utc_offset_str,
        "datetime_gmt": dt_gmt.strftime("%Y-%m-%d %H:%M:%S"),
        "latitude": lat,
        "longitude": lon,
        "is_gmt": is_gmt,
        "house_system": house_system,
        "cusp_offset": cusp_offset,
        "use_polar_equal": use_polar_equal,
        "polar_boundary": polar_boundary,
        "calculated_house_system": chart_data.get("calculated_house_system", house_system)
    }
    
    return chart_data

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.get_json() or {}
    try:
        chart_data = calculate_person_chart(data)
        return jsonify(chart_data)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Ошибка расчета: {str(e)}"}), 500

@app.route('/api/zodiac_compatibility', methods=['GET'])
def zodiac_compatibility():
    sign1 = request.args.get('sign1', '')
    sign2 = request.args.get('sign2', '')
    if not sign1 or not sign2:
        return jsonify({"error": "Оба знака обязательны"}), 400
        
    try:
        res = compatibility_data.get_zodiac_compatibility(sign1, sign2)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/synastry', methods=['POST'])
def calculate_synastry():
    data = request.get_json() or {}
    p1_data = data.get('p1')
    p2_data = data.get('p2')
    
    if not p1_data or not p2_data:
        return jsonify({"error": "Данные обоих партнеров обязательны"}), 400
        
    try:
        chart1 = calculate_person_chart(p1_data)
        chart2 = calculate_person_chart(p2_data)
        
        # Calculate aspects between chart1["planets"] and chart2["planets"]
        aspects = []
        aspect_configs = [
            {"name": "Соединение", "angle": 0, "orb": 8, "symbol": "☌"},
            {"name": "Оппозиция", "angle": 180, "orb": 8, "symbol": "☍"},
            {"name": "Тригон", "angle": 120, "orb": 7, "symbol": "△"},
            {"name": "Квадрат", "angle": 90, "orb": 7, "symbol": "□"},
            {"name": "Секстиль", "angle": 60, "orb": 6, "symbol": "⚹"},
        ]
        
        for planet1 in chart1["planets"]:
            for planet2 in chart2["planets"]:
                diff = abs(planet1["longitude"] - planet2["longitude"])
                dist = min(diff, 360 - diff)
                
                for config in aspect_configs:
                    if abs(dist - config["angle"]) <= config["orb"]:
                        p1_name = planet1["name"]
                        p2_name = planet2["name"]
                        asp_name = config["name"]
                        
                        if asp_name in ["Тригон", "Секстиль"]:
                            asp_type = "harmonic"
                        elif asp_name in ["Квадрат", "Оппозиция"]:
                            asp_type = "tense"
                        else: # Conjunction
                            if p1_name in ["Сатурн", "Плутон", "Марс"] or p2_name in ["Сатурн", "Плутон", "Марс"]:
                                asp_type = "tense"
                            else:
                                asp_type = "harmonic"
                                
                        interp = compatibility_data.get_synastry_aspect_interpretation(p1_name, p2_name, asp_name)
                        
                        aspects.append({
                            "p1_planet": p1_name,
                            "p1_symbol": planet1["symbol"],
                            "p1_longitude": planet1["longitude"],
                            "p2_planet": p2_name,
                            "p2_symbol": planet2["symbol"],
                            "p2_longitude": planet2["longitude"],
                            "aspect_name": asp_name,
                            "aspect_symbol": config["symbol"],
                            "orb": round(abs(dist - config["angle"]), 2),
                            "type": asp_type,
                            "interpretation": interp
                        })
                        break
                        
        p1_sun = [p for p in chart1["planets"] if p["name"] == "Солнце"][0]["formatted"]["sign"]
        p2_sun = [p for p in chart2["planets"] if p["name"] == "Солнце"][0]["formatted"]["sign"]
        
        scores = compatibility_data.calculate_synastry_scores(aspects, p1_sun, p2_sun)
        
        # Element interaction text
        el1 = compatibility_data.ZODIAC_ELEMENTS.get(p1_sun, "Огонь")
        el2 = compatibility_data.ZODIAC_ELEMENTS.get(p2_sun, "Огонь")
        ordered_el = (el1, el2) if el1 <= el2 else (el2, el1)
        el_relation = compatibility_data.ELEMENTS_RELATION.get(ordered_el, {"text": ""})
        
        return jsonify({
            "p1": chart1,
            "p2": chart2,
            "aspects": aspects,
            "scores": scores,
            "elements_text": el_relation["text"]
        })
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Ошибка расчета синастрии: {str(e)}"}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
