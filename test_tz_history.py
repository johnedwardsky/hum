import pytz
from datetime import datetime

tz = pytz.timezone('Asia/Krasnoyarsk')
for transition in tz._utc_transition_times:
    if transition.year == 1986:
        print(transition)

for dt, info in zip(tz._utc_transition_times, tz._transition_info):
    if dt.year == 1986:
        print(dt, info)
