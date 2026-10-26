#!/usr/bin/env python3
"""
Additional test for DELETE player with match history
"""

import requests
import json

BASE_URL = "https://pool-stats-3.preview.emergentagent.com/api"
ADMIN_CODE = "ADMIN-9999"
TEAM_CODES = {
    "Den Telstar": "TEL-4928",
    "Canada": "CAN-7281",
    "Arena": "ARE-1954",
    "De Sportwereld": "SPO-3672",
    "Silver Balls": "SIL-8340",
    "De Kroon": "KRO-6135"
}

def create_game_data(home_player_ids, away_player_ids, game_type='enkel'):
    """Create a game object with proper structure"""
    return {
        "type": game_type,
        "home_players": home_player_ids if isinstance(home_player_ids, list) else [home_player_ids],
        "away_players": away_player_ids if isinstance(away_player_ids, list) else [away_player_ids],
        "home_frames": 2,
        "away_frames": 0,
        "forfait_home": False,
        "forfait_away": False
    }

print("Testing DELETE player with match history...")

# Get a scheduled match
resp = requests.get(f"{BASE_URL}/matches")
matches = resp.json()
scheduled = [m for m in matches if m['status'] == 'scheduled']

if not scheduled:
    print("❌ No scheduled matches found")
    exit(1)

match = scheduled[0]
print(f"Using match: {match['home_team_name']} vs {match['away_team_name']}")

# Get match details
resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
match = resp.json()

home_players = [p for p in match['home_players'] if not p.get('is_placeholder')]
away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]

if len(home_players) < 10 or len(away_players) < 10:
    print(f"❌ Not enough players (home: {len(home_players)}, away: {len(away_players)})")
    exit(1)

# Create 10 games with valid players
games = []
for i in range(10):
    home_id = home_players[i % len(home_players)]['id']
    away_id = away_players[i % len(away_players)]['id']
    games.append(create_game_data([home_id], [away_id]))

# Find home team code
home_code = None
for team_name, code in TEAM_CODES.items():
    if team_name in match['home_team_name']:
        home_code = code
        break

if not home_code:
    print(f"❌ Could not find team code for {match['home_team_name']}")
    exit(1)

# Submit match
print(f"Submitting match as {match['home_team_name']}...")
resp = requests.post(
    f"{BASE_URL}/matches/{match['id']}/submit",
    json={"team_code": home_code, "games": games, "remarks": "Test"}
)

if resp.status_code != 200:
    print(f"❌ Submit failed: {resp.status_code} - {resp.text}")
    exit(1)

print(f"✅ Match submitted")

# Confirm as away team
away_code = None
for team_name, code in TEAM_CODES.items():
    if team_name in match['away_team_name']:
        away_code = code
        break

print(f"Confirming match as {match['away_team_name']}...")
resp = requests.post(
    f"{BASE_URL}/matches/{match['id']}/confirm",
    json={"team_code": away_code, "agree": True}
)

if resp.status_code != 200:
    print(f"❌ Confirm failed: {resp.status_code} - {resp.text}")
    exit(1)

print(f"✅ Match confirmed")

# Now try to delete one of the players who appeared in the match
test_player_id = home_players[0]['id']
test_player_name = home_players[0]['name']

print(f"\nTrying to delete player '{test_player_name}' who appeared in the match...")
resp = requests.delete(
    f"{BASE_URL}/admin/players/{test_player_id}",
    headers={"x-admin-code": ADMIN_CODE}
)

print(f"Response status: {resp.status_code}")
print(f"Response body: {resp.text}")

if resp.status_code == 409:
    data = resp.json()
    if data.get('can_deactivate') == True and data.get('match_count', 0) > 0:
        print(f"✅ PASS: Correctly returned 409 with can_deactivate:true and match_count={data.get('match_count')}")
        exit(0)
    else:
        print(f"❌ FAIL: Got 409 but response incorrect: {data}")
        exit(1)
else:
    print(f"❌ FAIL: Expected 409, got {resp.status_code}")
    exit(1)
