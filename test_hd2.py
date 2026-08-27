import sys, os
from datetime import datetime
import pytz
sys.path.append(os.getcwd())
import app
import calculator

lat = 56.0153
lon = 92.8932

# Manual test for UTC+7 (21:20 UTC)
gmt_year, gmt_month, gmt_day = 1986, 7, 17
gmt_hour_dec = 21.333333333333332

chart_data = calculator.calculate_chart(
    gmt_year, gmt_month, gmt_day, gmt_hour_dec, lat, lon
)

for p in chart_data["planets"]:
    if p["name"] == "Луна":
        print(f"Moon at 21:20 UTC: {p['formatted']}")

# Manual test for UTC+4 (00:20 UTC) (if MSK+0)
gmt_hour_dec = 0.3333333333
gmt_day = 18
chart_data = calculator.calculate_chart(
    gmt_year, gmt_month, gmt_day, gmt_hour_dec, lat, lon
)
for p in chart_data["planets"]:
    if p["name"] == "Луна":
        print(f"Moon at 00:20 UTC: {p['formatted']}")
