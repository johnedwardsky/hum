import calculator
import pytz
from datetime import datetime

def run_test():
    print("=== Humantica Calculation Test ===")
    
    # Target: 2026-06-19 17:07:46 Moscow local time (UTC+3)
    # GMT time: 14:07:46 UTC
    local_tz = pytz.timezone("Europe/Moscow")
    local_dt = local_tz.localize(datetime(2026, 6, 19, 17, 7, 46))
    gmt_dt = local_dt.astimezone(pytz.UTC)
    
    print(f"Local time: {local_dt}")
    print(f"GMT time:   {gmt_dt}")
    
    # Coordinates for Moscow
    lat = 55.7558
    lon = 37.6173
    
    gmt_hour_dec = gmt_dt.hour + gmt_dt.minute / 60.0 + gmt_dt.second / 3600.0
    
    # Calculate with Placidus (b'P')
    print("\n--- Calculations (Placidus) ---")
    res = calculator.calculate_chart(gmt_dt.year, gmt_dt.month, gmt_dt.day, gmt_hour_dec, lat, lon)
    
    print("Planets:")
    for p in res["planets"]:
        retro = " [R]" if p["is_retrograde"] else ""
        print(f"  {p['symbol']} {p['name']:<15}{retro:<5}: {p['formatted']['formatted']}")
        
    print("\nHouses:")
    for h in res["houses"]:
        print(f"  {h['name']:<10}: {h['formatted']['formatted']}")
        
    print("\n=== Humantica Compatibility & Synastry Test ===")
    import compatibility_data
    
    # 1. Test Zodiac Sign Compatibility
    comp = compatibility_data.get_zodiac_compatibility("Овен", "Лев")
    print("\nZodiac Compatibility (Овен + Лев):")
    print(f"  Love score:       {comp['love']}% (Expected: 95%)")
    print(f"  Friendship score: {comp['friendship']}% (Expected: 90%)")
    print(f"  Business score:   {comp['work']}% (Expected: 85%)")
    print(f"  Overall score:    {comp['overall']}%")
    print(f"  Description:      {comp['description'][:60]}...")
    
    assert comp['love'] == 95, "Failed zodiac love score check!"
    assert comp['overall'] > 80, "Failed zodiac overall score check!"
    
    # 2. Test Synastry Aspects & Scoring
    # Mock some aspects
    mock_aspects = [
        {"p1_planet": "Венера", "p2_planet": "Марс", "aspect_name": "Соединение", "type": "harmonic"},
        {"p1_planet": "Солнце", "p2_planet": "Луна", "aspect_name": "Тригон", "type": "harmonic"},
        {"p1_planet": "Венера", "p2_planet": "Сатурн", "aspect_name": "Квадрат", "type": "tense"}
    ]
    scores = compatibility_data.calculate_synastry_scores(mock_aspects, "Овен", "Лев")
    print("\nSynastry Scoring (Овен + Лев with mock aspects):")
    print(f"  Love score:       {scores['love']}%")
    print(f"  Friendship score: {scores['friendship']}%")
    print(f"  Business score:   {scores['work']}%")
    print(f"  Overall score:    {scores['overall']}%")
    
    # Base for Aries+Leo love is 95, Venus-Mars conjunction adds +12, Sun-Moon trine adds +15, Venus-Saturn square subtracts -10. Total: 95+12+15-10 = 112, clamped to 99.
    assert scores['love'] == 99, f"Love score should be clamped to 99, got {scores['love']}"
    
    # 3. Test high latitude fallback (Dudinka: lat=69.4, lon=86.18)
    print("\n--- Testing High Latitude Fallback (Dudinka, lat=69.4) ---")
    try:
        dudinka_res = calculator.calculate_chart(1980, 11, 6, 12.5, 69.4, 86.18)
        print("  Dudinka calculation: SUCCESS")
        print(f"  First house cusp: {dudinka_res['houses'][0]['formatted']['formatted']}")
        assert len(dudinka_res["houses"]) == 12, "Should return exactly 12 houses!"
    except Exception as e:
        print(f"  Dudinka calculation failed: {e}")
        raise e
        
    print("\nAll tests passed successfully!")

if __name__ == "__main__":
    run_test()

