import sys
import os
from datetime import datetime
import pytz
sys.path.append(os.getcwd())
import app
import cities_data
import calculator

lat = 56.0153
lon = 92.8932
tz_name = app.get_timezone_by_coords(lat, lon)
print("TZ from app:", tz_name)

local_tz = pytz.timezone(tz_name)
dt_local = datetime(1986, 7, 18, 4, 20)
dt_localized = local_tz.localize(dt_local, is_dst=None)
dt_gmt = dt_localized.astimezone(pytz.UTC)

print("Local time:", dt_localized)
print("GMT time:", dt_gmt)

gmt_year = dt_gmt.year
gmt_month = dt_gmt.month
gmt_day = dt_gmt.day
gmt_hour_dec = dt_gmt.hour + dt_gmt.minute / 60.0 + dt_gmt.second / 3600.0

chart_data = calculator.calculate_chart(
    gmt_year, gmt_month, gmt_day, gmt_hour_dec, lat, lon
)
for p in chart_data["planets"]:
    if p["name"] == "Солнце":
        print("Personality Sun:", p["formatted"])
for p in chart_data["design_planets"]:
    if p["name"] == "Солнце":
        print("Design Sun:", p["formatted"])
