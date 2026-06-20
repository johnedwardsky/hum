import os
import swisseph as swe

# Set the path to Swiss Ephemeris files (if they exist)
EPHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ephe')
if not os.path.exists(EPHE_PATH):
    os.makedirs(EPHE_PATH)
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
    swe.MEAN_NODE: {"name": "Северный Узел", "symbol": "☊"},
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
    seconds = int(round(seconds_float))
    
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

def calculate_chart(year, month, day, hour_gmt, lat, lon):
    """
    Calculates planetary positions and house cusps.
    hour_gmt should be a decimal hour in GMT (e.g. 14.5 for 14:30 GMT).
    """
    # 1. Calculate Julian Day UT
    jd_ut = swe.julday(year, month, day, hour_gmt)
    
    results = {
        "planets": [],
        "houses": [],
        "angles": {}
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
        
    # Add South Node (which is exactly opposite to Mean North Node)
    north_node_lon = [p["longitude"] for p in results["planets"] if p["id"] == swe.MEAN_NODE][0]
    north_node_speed = [p["speed"] for p in results["planets"] if p["id"] == swe.MEAN_NODE][0]
    south_node_lon = (north_node_lon + 180.0) % 360.0
    formatted_south = format_longitude(south_node_lon)
    results["planets"].append({
        "id": -1,
        "name": "Южный Узел",
        "symbol": "☋",
        "longitude": south_node_lon,
        "speed": north_node_speed,  # shares the node speed
        "is_retrograde": north_node_speed < 0,
        "formatted": formatted_south
    })
    
    # 3. Calculate Houses (Placidus system with fallback for high latitudes where Placidus has no mathematical solution)
    # swe.houses returns (cusps, ascmc)
    # cusps is 0-indexed (0 to 11 for houses 1 to 12)
    # lat and lon should be in degrees
    try:
        cusps, ascmc = swe.houses(jd_ut, lat, lon, b'P')
    except Exception:
        try:
            # Fallback to Porphyry system (quadrant system that doesn't fail at high latitudes)
            cusps, ascmc = swe.houses(jd_ut, lat, lon, b'O')
        except Exception:
            # Final fallback to Equal system
            cusps, ascmc = swe.houses(jd_ut, lat, lon, b'E')
    
    house_names = ["I (As)", "II", "III", "IV (Ic)", "V", "VI", "VII (Ds)", "VIII", "IX", "X (Mc)", "XI", "XII"]
    
    for i in range(1, 13):
        cusp_lon = cusps[i-1]
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
