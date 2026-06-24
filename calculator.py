import os
import urllib.request
import ssl
import swisseph as swe

# Set the path to Swiss Ephemeris files (if they exist)
EPHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ephe')
if not os.path.exists(EPHE_PATH):
    os.makedirs(EPHE_PATH)

# Auto-download ephemeris files if they are missing
REQUIRED_EPHE_FILES = {
    "sepl_18.se1": "https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/sepl_18.se1",
    "semo_18.se1": "https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/semo_18.se1",
    "seas_18.se1": "https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/seas_18.se1"
}
for filename, url in REQUIRED_EPHE_FILES.items():
    filepath = os.path.join(EPHE_PATH, filename)
    if not os.path.exists(filepath):
        try:
            # Bypass SSL verification to avoid issues on platforms like macOS/Render with missing certificates
            ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(url, context=ctx) as response, open(filepath, 'wb') as out_file:
                out_file.write(response.read())
        except Exception as e:
            # Fallback warning
            pass

swe.set_ephe_path(EPHE_PATH)

ZODIAC_SIGNS = [
    {"name": "Овен", "symbol": "♈", "ru": "Овен"},
    {"name": "Телец", "symbol": "♉", "ru": "Телец"},
    {"name": "Близнецы", "symbol": "♊", "ru": "Близнецы"},
    {"name": "Рак", "symbol": "♋", "ru": "Рак"},
    {"name": "Лев", "symbol": "♌", "ru": "Лев"},
    {"name": "Дева", "symbol": "♍", "ru": "Дева"},
    {"name": "Весы", "symbol": "♎", "ru": "Весы"},
    {"name": "Скорпион", "symbol": "♏", "ru": "Скорпион"},
    {"name": "Стрелец", "symbol": "♐", "ru": "Стрелец"},
    {"name": "Козерог", "symbol": "♑", "ru": "Козерог"},
    {"name": "Водолей", "symbol": "♒", "ru": "Водолей"},
    {"name": "Рыбы", "symbol": "♓", "ru": "Рыбы"},
]

PLANETS_MAP = {
    swe.SUN: {"name": "Солнце", "symbol": "☉"},
    swe.MOON: {"name": "Луна", "symbol": "☽"},
    swe.MERCURY: {"name": "Меркурий", "symbol": "☿"},
    swe.VENUS: {"name": "Венера", "symbol": "♀"},
    swe.MARS: {"name": "Марс", "symbol": "♂"},
    swe.JUPITER: {"name": "Юпитер", "symbol": "♃"},
    swe.SATURN: {"name": "Сатурн", "symbol": "♄"},
    swe.URANUS: {"name": "Уран", "symbol": "♅"},
    swe.NEPTUNE: {"name": "Нептун", "symbol": "♆"},
    swe.PLUTO: {"name": "Плутон", "symbol": "♇"},
    swe.TRUE_NODE: {"name": "Истинный Северный Узел", "symbol": "☊"},
    swe.MEAN_NODE: {"name": "Средний Северный Узел", "symbol": "☊"},
    swe.CHIRON: {"name": "Хирон", "symbol": "⚷"},
    swe.MEAN_APOG: {"name": "Лилит (средняя)", "symbol": "⚸"},
    swe.OSCU_APOG: {"name": "Лилит (истинная)", "symbol": "⚸"},
    swe.INTP_APOG: {"name": "Лилит (интерп.)", "symbol": "⚸"},
    swe.INTP_PERG: {"name": "Приап (интерп.)", "symbol": "⯓"},
}

def format_longitude(lon):
    """Converts a longitude (0-360) into zodiac sign, degrees, minutes, seconds."""
    sign_index = int(lon // 30) % 12
    sign_info = ZODIAC_SIGNS[sign_index]
    
    sign_deg = lon % 30
    deg = int(sign_deg)
    
    minutes_float = (sign_deg - deg) * 60.0
    minutes = int(minutes_float)
    
    seconds_float = (minutes_float - minutes) * 60.0
    seconds = int(seconds_float)  # Truncated consistently to match Sotis Online
    
    # Handle rounding up to 60 seconds
    if seconds >= 60:
        seconds = 0
        minutes += 1
    if minutes >= 60:
        minutes = 0
        deg += 1
    if deg >= 30:
        deg = 0
        sign_index = (sign_index + 1) % 12
        sign_info = ZODIAC_SIGNS[sign_index]
        
    return {
        "deg": deg,
        "min": minutes,
        "sec": seconds,
        "sign": sign_info["ru"],
        "symbol": sign_info["symbol"],
        "formatted": f"{deg}° {minutes:02d}' {seconds:02d}\" {sign_info['symbol']} ({sign_info['ru']})"
    }

def calculate_chart(year, month, day, hour_gmt, lat, lon, house_system='P', cusp_offset=0.0, use_polar_equal=False, polar_boundary=62.0):
    """
    Calculates planetary positions and house cusps.
    hour_gmt should be a decimal hour in GMT (e.g. 14.5 for 14:30 GMT).
    """
    # 1. Calculate Julian Day UT
    jd_ut = swe.julday(year, month, day, hour_gmt)
    
    results = {
        "planets": [],
        "houses": [],
        "angles": {},
        "calculated_house_system": house_system
    }
    
    # 2. Calculate Planets
    for planet_id, info in PLANETS_MAP.items():
        # swe.calc_ut returns (longitude, latitude, distance, speed_lon, speed_lat, speed_dist)
        res, flags = swe.calc_ut(jd_ut, planet_id)
        longitude = res[0]
        speed_lon = res[3]
        
        # Check retrograde status
        is_retrograde = speed_lon < 0
        
        # Add to results
        formatted = format_longitude(longitude)
        results["planets"].append({
            "id": planet_id,
            "name": info["name"],
            "symbol": info["symbol"],
            "longitude": longitude,
            "speed": speed_lon,
            "is_retrograde": is_retrograde,
            "formatted": formatted
        })
        
    # Add True South Node (which is exactly opposite to True North Node)
    true_node_lon = [p["longitude"] for p in results["planets"] if p["id"] == swe.TRUE_NODE][0]
    true_node_speed = [p["speed"] for p in results["planets"] if p["id"] == swe.TRUE_NODE][0]
    true_south_node_lon = (true_node_lon + 180.0) % 360.0
    results["planets"].append({
        "id": -2,
        "name": "Истинный Южный Узел",
        "symbol": "☋",
        "longitude": true_south_node_lon,
        "speed": true_node_speed,  # shares the node speed
        "is_retrograde": true_node_speed < 0,
        "formatted": format_longitude(true_south_node_lon)
    })
    
    # Add Mean South Node (which is exactly opposite to Mean North Node)
    mean_node_lon = [p["longitude"] for p in results["planets"] if p["id"] == swe.MEAN_NODE][0]
    mean_node_speed = [p["speed"] for p in results["planets"] if p["id"] == swe.MEAN_NODE][0]
    mean_south_node_lon = (mean_node_lon + 180.0) % 360.0
    results["planets"].append({
        "id": -1,
        "name": "Средний Южный Узел",
        "symbol": "☋",
        "longitude": mean_south_node_lon,
        "speed": mean_node_speed,  # shares the node speed
        "is_retrograde": mean_node_speed < 0,
        "formatted": format_longitude(mean_south_node_lon)
    })

    # Add Earth (opposition of the Sun)
    sun_lon = [p["longitude"] for p in results["planets"] if p["id"] == swe.SUN][0]
    sun_speed = [p["speed"] for p in results["planets"] if p["id"] == swe.SUN][0]
    earth_lon = (sun_lon - 180.0) % 360.0
    results["planets"].append({
        "id": -3,
        "name": "Земля",
        "symbol": "♁",
        "longitude": earth_lon,
        "speed": sun_speed,
        "is_retrograde": False,
        "formatted": format_longitude(earth_lon)
    })
    
    # 3. Sort planets in a predefined professional astrological order
    planet_order = [
        "Солнце",
        "Луна",
        "Меркурий",
        "Венера",
        "Земля",
        "Марс",
        "Юпитер",
        "Сатурн",
        "Уран",
        "Нептун",
        "Плутон",
        "Истинный Северный Узел",
        "Истинный Южный Узел",
        "Средний Северный Узел",
        "Средний Южный Узел",
        "Хирон",
        "Лилит (истинная)",
        "Лилит (средняя)",
        "Лилит (интерп.)",
        "Приап (интерп.)"
    ]
    results["planets"].sort(key=lambda p: planet_order.index(p["name"]) if p["name"] in planet_order else 999)

    
    # 4. Calculate Houses (with fallback if the selected system fails)
    effective_house_system = house_system
    if house_system == 'P' and use_polar_equal and abs(lat) > polar_boundary:
        effective_house_system = 'D'
        
    results["calculated_house_system"] = effective_house_system

    hs_code = effective_house_system.encode('utf-8') if isinstance(effective_house_system, str) else effective_house_system
    try:
        cusps, ascmc = swe.houses(jd_ut, lat, lon, hs_code)
    except Exception:
        try:
            # Fallback to Porphyry system (quadrant system that doesn't fail at high latitudes)
            cusps, ascmc = swe.houses(jd_ut, lat, lon, b'O')
        except Exception:
            # Final fallback to Equal system (from MC)
            cusps, ascmc = swe.houses(jd_ut, lat, lon, b'D')
    
    cusps_list = list(cusps)
    if effective_house_system == 'D' and cusp_offset != 0.0:
        for i in range(12):
            cusps_list[i] = (cusps_list[i] + cusp_offset) % 360.0

    house_names = ["I (As)", "II", "III", "IV (Ic)", "V", "VI", "VII (Ds)", "VIII", "IX", "X (Mc)", "XI", "XII"]
    
    for i in range(1, 13):
        cusp_lon = cusps_list[i-1]
        formatted = format_longitude(cusp_lon)
        results["houses"].append({
            "number": i,
            "name": house_names[i-1],
            "longitude": cusp_lon,
            "formatted": formatted
        })
        
    # Store Ascendant and MC explicitly
    results["angles"] = {
        "ascendant": format_longitude(ascmc[0]),
        "mc": format_longitude(ascmc[1])
    }
    
    return results

if __name__ == "__main__":
    # Quick test run: 2026-06-19 17:07:46 MSK -> 14:07:46 GMT
    # Moscow coordinates: lat=55.7558, lon=37.6173
    # Hour in GMT: 14 + 7/60 + 46/3600 = 14.12944
    res = calculate_chart(2026, 6, 19, 14.12944, 55.7558, 37.6173)
    print("Planets:")
    for p in res["planets"]:
        retro = " R" if p["is_retrograde"] else ""
        print(f"{p['symbol']} {p['name']}{retro}: {p['formatted']['formatted']}")
    print("\nHouses:")
    for h in res["houses"]:
        print(f"House {h['name']}: {h['formatted']['formatted']}")
