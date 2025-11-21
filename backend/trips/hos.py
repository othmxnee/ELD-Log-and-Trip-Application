from datetime import datetime, timedelta, time
from typing import List, Dict, Any
import pytz

DAY_SECONDS = 24 * 3600

def _split_segment_by_midnight(start_dt: datetime, end_dt: datetime, status: str, violation: bool=False):
    """Yield segments split so each lies within a calendar day (00:00-24:00)."""
    segments = []
    cur_start = start_dt
    while cur_start < end_dt:
        # midnight after cur_start
        next_midnight = (cur_start + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        seg_end = min(end_dt, next_midnight)
        segments.append({
            'start': cur_start.isoformat(),
            'end': seg_end.isoformat(),
            'status': status,
            'violation': violation,
            'violation_reason': None,
        })
        cur_start = seg_end
    return segments

def simulate_trip(start_datetime: datetime, legs: List[Dict[str, Any]], current_cycle_hours: float=0.0):
    """
    Simulate HOS for a sequence of legs.

    legs: list of {'duration_s': int, 'distance_m': int, 'start_coords':[], 'end_coords':[]}

    Returns pages: [{'date': 'YYYY-MM-DD', 'segments': [...]}, ...], cycle_hours_remaining
    """
    # configuration
    MAX_CYCLE_HOURS = 70
    MAX_DAILY_DRIVE_HOURS = 11
    BREAK_AFTER_DRIVING_S = 8 * 3600
    BREAK_DURATION_S = 30 * 60

    tz = start_datetime.tzinfo or pytz.UTC
    current_time = start_datetime

    pages = {}
    daily_driven = {}  # date_str -> seconds driven that calendar day
    driving_since_break = 0
    cycle_seconds_used = current_cycle_hours * 3600

    def _add_segment(s_start, s_end, status, violation=False, reason=None):
        segs = _split_segment_by_midnight(s_start, s_end, status, violation)
        for s in segs:
            if violation:
                s['violation'] = True
                s['violation_reason'] = reason
            date = s['start'][:10]
            pages.setdefault(date, []).append(s)

    for leg in legs:
        remaining = int(leg.get('duration_s', 0))
        # If a single leg's total duration exceeds daily driving limit, mark as a leg-level violation
        leg_violation = False
        leg_violation_reason = None
        if remaining > int(MAX_DAILY_DRIVE_HOURS * 3600):
            leg_violation = True
            leg_violation_reason = '11h_daily_drive_exceeded'
        while remaining > 0:
            date_str = current_time.date().isoformat()
            day_start = datetime.combine(current_time.date(), time(0,0,0)).replace(tzinfo=tz)
            # driven today so far
            driven_today = daily_driven.get(date_str, 0)
            daily_remaining = max(0, int(MAX_DAILY_DRIVE_HOURS * 3600) - driven_today)
            before_break_remaining = max(0, int(BREAK_AFTER_DRIVING_S) - driving_since_break)

            # allowed contiguous drive time
            allowed = min(daily_remaining, before_break_remaining, remaining)

            # determine violation reasons
            violation = False
            reason = None
            if cycle_seconds_used + allowed > MAX_CYCLE_HOURS * 3600:
                violation = True
                reason = '70h_cycle_exceeded'
            if allowed > int(MAX_DAILY_DRIVE_HOURS * 3600):
                violation = True
                reason = '11h_daily_drive_exceeded'

            if allowed > 0:
                seg_end = current_time + timedelta(seconds=allowed)
                # if there is a leg-level violation, propagate it to all segments for this leg
                if leg_violation:
                    _add_segment(current_time, seg_end, 'driving', True, leg_violation_reason)
                else:
                    _add_segment(current_time, seg_end, 'driving', violation, reason)
                # update counters
                daily_driven[date_str] = daily_driven.get(date_str, 0) + allowed
                driving_since_break += allowed
                cycle_seconds_used += allowed
                current_time = seg_end
                remaining -= allowed
            else:
                # cannot drive now: either need break or end of daily drive reached
                if before_break_remaining <= 0:
                    # insert required 30-min break (onDuty)
                    b_end = current_time + timedelta(seconds=BREAK_DURATION_S)
                    _add_segment(current_time, b_end, 'onDuty')
                    driving_since_break = 0
                    current_time = b_end
                elif daily_remaining <= 0:
                    # end of daily driving: go off or sleeper until next day start
                    next_day = (current_time + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                    _add_segment(current_time, next_day, 'off')
                    driving_since_break = 0
                    current_time = next_day
                else:
                    # fallback: small rest
                    r_end = current_time + timedelta(minutes=15)
                    _add_segment(current_time, r_end, 'onDuty')
                    current_time = r_end

    # After legs, fill the rest of the last day with off until midnight
    last_date = current_time.date().isoformat()
    day_end = (current_time + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    _add_segment(current_time, day_end, 'off')

    # Build pages list sorted
    pages_list = []
    for date in sorted(pages.keys()):
        pages_list.append({'date': date, 'segments': pages[date]})

    cycle_hours_remaining = max(0.0, MAX_CYCLE_HOURS - (cycle_seconds_used / 3600.0))

    return {'pages': pages_list, 'cycle_hours_remaining': cycle_hours_remaining}


if __name__ == '__main__':
    # quick sanity test
    import pytz
    s = datetime(2025,11,20,8,0,0,tzinfo=pytz.UTC)
    legs = [{'duration_s': 4*3600}, {'duration_s': 4*3600}]
    print(simulate_trip(s, legs, 24.5))
