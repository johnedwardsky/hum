import os
import urllib.request
import json
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from geopy.geocoders import Nominatim
import pytz
import ssl

# Bypass SSL certificate verification on macOS
ssl._create_default_https_context = ssl._create_unverified_context

import calculator

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

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.get_json() or {}
    
    birth_date = data.get('birth_date')  # YYYY-MM-DD
    birth_time = data.get('birth_time')  # HH:MM or HH:MM:SS
    lat = data.get('lat')
    lon = data.get('lon')
    is_gmt = data.get('is_gmt', False)
    
    if not birth_date or not birth_time:
        return jsonify({"error": "Дата и время обязательны"}), 400
        
    try:
        # Parse time
        time_obj = None
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                time_obj = datetime.strptime(birth_time, fmt).time()
                break
            except ValueError:
                continue
        if not time_obj:
            return jsonify({"error": "Неверный формат времени. Используйте ЧЧ:ММ или ЧЧ:ММ:СС"}), 400
            
        # Combine date and time
        date_obj = datetime.strptime(birth_date, "%Y-%m-%d").date()
        dt_local = datetime.combine(date_obj, time_obj)
        
        # Check coordinates if not GMT
        if not is_gmt:
            if lat is None or lon is None:
                return jsonify({"error": "Координаты обязательны для расчета местного времени"}), 400
            try:
                lat = float(lat)
                lon = float(lon)
            except ValueError:
                return jsonify({"error": "Неверный формат координат"}), 400
        
        # Convert local time to GMT (UTC)
        timezone_name = "UTC"
        if is_gmt:
            dt_gmt = dt_local.replace(tzinfo=pytz.UTC)
            dt_localized = dt_local.replace(tzinfo=pytz.UTC)
        else:
            timezone_name = get_timezone_by_coords(lat, lon)
            local_tz = pytz.timezone(timezone_name)
            # Localize using pytz to handle historical transitions correctly
            dt_localized = local_tz.localize(dt_local, is_dst=None)
            dt_gmt = dt_localized.astimezone(pytz.UTC)
            
        # Get UTC offset for display
        if is_gmt:
            utc_offset_str = "UTC+0"
        else:
            offset_seconds = dt_localized.utcoffset().total_seconds()
            offset_hours = offset_seconds / 3600.0
            utc_offset_str = f"UTC{'+' if offset_hours >= 0 else ''}{offset_hours:g}"
            
        # Calculate Julian details
        gmt_year = dt_gmt.year
        gmt_month = dt_gmt.month
        gmt_day = dt_gmt.day
        gmt_hour_dec = dt_gmt.hour + dt_gmt.minute / 60.0 + dt_gmt.second / 3600.0
        
        # Run Swisseph calculations
        calc_lat = lat if lat is not None else 0.0
        calc_lon = lon if lon is not None else 0.0
        
        chart_data = calculator.calculate_chart(
            gmt_year, gmt_month, gmt_day, gmt_hour_dec, calc_lat, calc_lon
        )
        
        # Add metadata
        chart_data["metadata"] = {
            "birth_date_local": birth_date,
            "birth_time_local": birth_time,
            "timezone": timezone_name,
            "utc_offset": utc_offset_str,
            "datetime_gmt": dt_gmt.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": lat,
            "longitude": lon,
            "is_gmt": is_gmt
        }
        
        return jsonify(chart_data)
        
    except Exception as e:
        return jsonify({"error": f"Ошибка расчета: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
