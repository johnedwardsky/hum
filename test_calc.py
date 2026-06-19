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

if __name__ == "__main__":
    run_test()
