import sys, os
from datetime import datetime
import pytz
sys.path.append(os.getcwd())
import app
import calculator

lat = 56.0153
lon = 92.8932
tz_name = app.get_timezone_by_coords(lat, lon)
local_tz = pytz.timezone(tz_name)
dt_local = datetime(1986, 7, 18, 4, 20)
dt_localized = local_tz.localize(dt_local, is_dst=None)
dt_gmt = dt_localized.astimezone(pytz.UTC)

gmt_year = dt_gmt.year
gmt_month = dt_gmt.month
gmt_day = dt_gmt.day
gmt_hour_dec = dt_gmt.hour + dt_gmt.minute / 60.0 + dt_gmt.second / 3600.0

print(f"GMT time: {gmt_year}-{gmt_month}-{gmt_day} {gmt_hour_dec} ({dt_gmt})")

chart_data = calculator.calculate_chart(
    gmt_year, gmt_month, gmt_day, gmt_hour_dec, lat, lon
)

print("Personality:")
for p in chart_data["planets"]:
    print(f"{p['name']}: {p['formatted']} - Gate {p['hexagram']['gate']}.{p['hexagram']['line']}")

print("\nDesign:")
for p in chart_data["design_planets"]:
    print(f"{p['name']}: {p['formatted']} - Gate {p['hexagram']['gate']}.{p['hexagram']['line']}")

