#!/usr/bin/env python3
"""
Session-4 Backend Testing for Pool Competitie webapp
Tests separation of ploegpunten (team points, fixed) from persoonlijke punten (player points, configurable)

Fixed rules to verify:
- Ploegpunten (team standings, match.points_home/away): 2-0 → 2/0, 2-1 → 2/1, max 20 per match
- Persoonlijke punten (player stats): default 2-0 → 3/0, 2-1 → 2/1, configurable via /admin/settings
"""

import requests
import json
from datetime import datetime

# Base URL from .env
BASE_URL = "https://pool-stats-3.preview.emergentagent.com/api"

# Auth credentials
ADMIN_CODE = "ADMIN-9999"
TEAM_CODES = {
    "Den Telstar": "TEL-4928",
    "Canada": "CAN-7281",
    "Arena": "ARE-1954",
    "De Sportwereld": "SPO-3672",
    "Silver Balls": "SIL-8340",
    "De Kroon": "KRO-6135"
}

def print_test(name):
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_result(passed, message):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")

def get_scheduled_match():
    """Get a scheduled match with home team and players"""
    resp = requests.get(f"{BASE_URL}/matches")
    if resp.status_code != 200:
        print(f"Failed to get matches: {resp.status_code}")
        return None
    
    matches = resp.json()
    scheduled = [m for m in matches if m['status'] == 'scheduled']
    if not scheduled:
        print("No scheduled matches found")
        return None
    
    match = scheduled[0]
    
    # Get match details with players
    resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
    if resp.status_code != 200:
        print(f"Failed to get match details: {resp.status_code}")
        return None
    
    return resp.json()

def create_game_data(home_player_ids, away_player_ids, home_frames, away_frames, game_type='enkel'):
    """Create a game object with proper structure"""
    return {
        "type": game_type,
        "home_players": home_player_ids if isinstance(home_player_ids, list) else [home_player_ids],
        "away_players": away_player_ids if isinstance(away_player_ids, list) else [away_player_ids],
        "home_frames": home_frames,
        "away_frames": away_frames
    }

def ensure_enough_players(match, min_home=10, min_away=10):
    """Ensure match has enough non-placeholder players, create temp players if needed"""
    temp_players = []
    
    match_date = match['date']
    match_date_obj = datetime.fromisoformat(match_date.replace('Z', '+00:00'))
    
    # Filter out placeholders AND players with future can_play_from dates
    home_players = [p for p in match['home_players'] 
                    if not p.get('is_placeholder') 
                    and (not p.get('can_play_from') or datetime.fromisoformat(p['can_play_from'].replace('Z', '+00:00')) <= match_date_obj)]
    away_players = [p for p in match['away_players'] 
                    if not p.get('is_placeholder') 
                    and (not p.get('can_play_from') or datetime.fromisoformat(p['can_play_from'].replace('Z', '+00:00')) <= match_date_obj)]
    
    while len(home_players) < min_home:
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": f"Temp Home Player {len(temp_players) + 1}",
                "team_id": match['home_team_id'],
                "can_play_from": match_date
            }
        )
        if resp.status_code == 200:
            new_player = resp.json()
            home_players.append(new_player)
            temp_players.append(new_player['id'])
            print(f"Added temp home player: {new_player['id']}")
    
    while len(away_players) < min_away:
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": f"Temp Away Player {len(temp_players) + 1}",
                "team_id": match['away_team_id'],
                "can_play_from": match_date
            }
        )
        if resp.status_code == 200:
            new_player = resp.json()
            away_players.append(new_player)
            temp_players.append(new_player['id'])
            print(f"Added temp away player: {new_player['id']}")
    
    return home_players, away_players, temp_players

def cleanup_temp_players(temp_players):
    """Delete temporary players"""
    for player_id in temp_players:
        requests.delete(
            f"{BASE_URL}/admin/players/{player_id}",
            headers={"x-admin-code": ADMIN_CODE}
        )
        print(f"Cleaned up temp player: {player_id}")

def test_1_team_points_max_20():
    """Test 1: Team points on match submit - verify max 20 for 10×2-0"""
    print_test("Test 1: Team points max 20 for 10 games all 2-0 home wins")
    
    temp_players = []
    
    try:
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        print(f"Match: {match['home_team_name']} vs {match['away_team_name']}")
        
        # Ensure enough players
        home_players, away_players, temp_players = ensure_enough_players(match, 10, 10)
        
        # Get standings before
        resp = requests.get(f"{BASE_URL}/standings")
        standings_before = resp.json()
        home_team_before = next((t for t in standings_before if t['team_name'] == match['home_team_name']), None)
        away_team_before = next((t for t in standings_before if t['team_name'] == match['away_team_name']), None)
        
        print(f"Home team before: points_for={home_team_before['points_for']}, frames_won={home_team_before['frames_won']}")
        print(f"Away team before: points_against={away_team_before['points_against']}, frames_lost={away_team_before['frames_lost']}")
        
        # Create 10 games all 2-0 home wins (use unique players per game)
        games = []
        for i in range(10):
            home_id = home_players[i]['id']
            away_id = away_players[i]['id']
            games.append(create_game_data([home_id], [away_id], 2, 0, 'enkel'))
        
        # Submit as home team
        home_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games}
        )
        
        print(f"Submit response: {resp.status_code}")
        if resp.status_code != 200:
            print_result(False, f"Submit failed: {resp.status_code} - {resp.text}")
            return False
        
        submit_data = resp.json()
        print(f"Submit data: {submit_data}")
        
        # Confirm as away team
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['away_team_name']:
                away_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/confirm",
            json={"team_code": away_code, "agree": True}
        )
        
        print(f"Confirm response: {resp.status_code}")
        if resp.status_code != 200:
            print_result(False, f"Confirm failed: {resp.status_code} - {resp.text}")
            return False
        
        # Get match details to verify points
        resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
        confirmed_match = resp.json()
        
        points_home = confirmed_match['points_home']
        points_away = confirmed_match['points_away']
        
        print(f"Match points: home={points_home}, away={points_away}")
        
        # Calculate frames
        total_home_frames = sum(g['home_frames'] for g in confirmed_match['games'])
        total_away_frames = sum(g['away_frames'] for g in confirmed_match['games'])
        
        print(f"Match frames: home={total_home_frames}, away={total_away_frames}")
        
        # Verify team points are 20/0 (NOT 30/0)
        if points_home != 20:
            print_result(False, f"Expected points_home=20 (team points), got {points_home}")
            return False
        
        if points_away != 0:
            print_result(False, f"Expected points_away=0, got {points_away}")
            return False
        
        # Verify frames are 20/0 (actual sets won)
        if total_home_frames != 20:
            print_result(False, f"Expected home_frames=20, got {total_home_frames}")
            return False
        
        if total_away_frames != 0:
            print_result(False, f"Expected away_frames=0, got {total_away_frames}")
            return False
        
        # Verify standings updated with team points (20, not 30)
        resp = requests.get(f"{BASE_URL}/standings")
        standings_after = resp.json()
        home_team_after = next((t for t in standings_after if t['team_name'] == match['home_team_name']), None)
        
        points_for_increase = home_team_after['points_for'] - home_team_before['points_for']
        frames_won_increase = home_team_after['frames_won'] - home_team_before['frames_won']
        
        print(f"Home team after: points_for={home_team_after['points_for']} (+{points_for_increase}), frames_won={home_team_after['frames_won']} (+{frames_won_increase})")
        
        if points_for_increase != 20:
            print_result(False, f"Expected points_for increase of 20 (team points), got {points_for_increase}")
            return False
        
        if frames_won_increase != 20:
            print_result(False, f"Expected frames_won increase of 20, got {frames_won_increase}")
            return False
        
        print_result(True, f"Team points correctly calculated: 20/0 (NOT 30/0), frames 20/0, standings updated correctly")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cleanup_temp_players(temp_players)

def test_2_team_points_2_1_wins():
    """Test 2: Team points 2-1 wins - verify 20/10 for 10×2-1"""
    print_test("Test 2: Team points for 10 games all 2-1 home wins")
    
    temp_players = []
    
    try:
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        print(f"Match: {match['home_team_name']} vs {match['away_team_name']}")
        
        # Ensure enough players
        home_players, away_players, temp_players = ensure_enough_players(match, 10, 10)
        
        # Create 10 games all 2-1 home wins
        games = []
        for i in range(10):
            home_id = home_players[i]['id']
            away_id = away_players[i]['id']
            games.append(create_game_data([home_id], [away_id], 2, 1, 'enkel'))
        
        # Submit as home team
        home_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Submit failed: {resp.status_code} - {resp.text}")
            return False
        
        # Confirm as away team
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['away_team_name']:
                away_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/confirm",
            json={"team_code": away_code, "agree": True}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Confirm failed: {resp.status_code} - {resp.text}")
            return False
        
        # Get match details
        resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
        confirmed_match = resp.json()
        
        points_home = confirmed_match['points_home']
        points_away = confirmed_match['points_away']
        
        print(f"Match points: home={points_home}, away={points_away}")
        
        # Verify team points are 20/10 (10 games × 2/1)
        if points_home != 20:
            print_result(False, f"Expected points_home=20 (10×2), got {points_home}")
            return False
        
        if points_away != 10:
            print_result(False, f"Expected points_away=10 (10×1), got {points_away}")
            return False
        
        print_result(True, f"Team points correctly calculated: 20/10 for 10×2-1 wins")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cleanup_temp_players(temp_players)

def test_3_mixed_match():
    """Test 3: Mixed match - 5 games 2-0 + 5 games 2-1"""
    print_test("Test 3: Mixed match - 5×2-0 + 5×2-1 home wins")
    
    temp_players = []
    
    try:
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        print(f"Match: {match['home_team_name']} vs {match['away_team_name']}")
        
        # Ensure enough players
        home_players, away_players, temp_players = ensure_enough_players(match, 10, 10)
        
        # Create 5 games 2-0 + 5 games 2-1
        games = []
        for i in range(5):
            home_id = home_players[i]['id']
            away_id = away_players[i]['id']
            games.append(create_game_data([home_id], [away_id], 2, 0, 'enkel'))
        
        for i in range(5, 10):
            home_id = home_players[i]['id']
            away_id = away_players[i]['id']
            games.append(create_game_data([home_id], [away_id], 2, 1, 'enkel'))
        
        # Submit as home team
        home_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Submit failed: {resp.status_code} - {resp.text}")
            return False
        
        # Confirm as away team
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['away_team_name']:
                away_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/confirm",
            json={"team_code": away_code, "agree": True}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Confirm failed: {resp.status_code} - {resp.text}")
            return False
        
        # Get match details
        resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
        confirmed_match = resp.json()
        
        points_home = confirmed_match['points_home']
        points_away = confirmed_match['points_away']
        
        print(f"Match points: home={points_home}, away={points_away}")
        
        # Verify team points: 5×2 + 5×2 = 20 for home, 0 + 5×1 = 5 for away
        if points_home != 20:
            print_result(False, f"Expected points_home=20 (5×2 + 5×2), got {points_home}")
            return False
        
        if points_away != 5:
            print_result(False, f"Expected points_away=5 (5×1), got {points_away}")
            return False
        
        print_result(True, f"Mixed match team points correctly calculated: 20/5")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cleanup_temp_players(temp_players)

def test_4_player_stats_configurable():
    """Test 4: Player stats still use configurable rules (3 for 2-0 by default)"""
    print_test("Test 4: Player stats use configurable rules (default 2-0 → 3 points)")
    
    temp_players = []
    
    try:
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        print(f"Match: {match['home_team_name']} vs {match['away_team_name']}")
        
        # Ensure enough players
        home_players, away_players, temp_players = ensure_enough_players(match, 10, 10)
        
        # Track specific home player who will play 1 game
        test_player_id = home_players[0]['id']
        test_player_name = home_players[0]['name']
        
        # Get player stats before
        resp = requests.get(f"{BASE_URL}/players")
        players_before = resp.json()
        player_before = next((p for p in players_before if p['player_id'] == test_player_id), None)
        enkel_points_before = player_before['enkel_points'] if player_before else 0
        
        print(f"Test player: {test_player_name} (id: {test_player_id})")
        print(f"Player enkel_points before: {enkel_points_before}")
        
        # Create 10 games all 2-0 home wins
        # First game with test player, rest with other players (unique)
        games = []
        games.append(create_game_data([test_player_id], [away_players[0]['id']], 2, 0, 'enkel'))
        
        for i in range(1, 10):
            home_id = home_players[i]['id']
            away_id = away_players[i]['id']
            games.append(create_game_data([home_id], [away_id], 2, 0, 'enkel'))
        
        # Submit and confirm
        home_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Submit failed: {resp.status_code} - {resp.text}")
            return False
        
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['away_team_name']:
                away_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/confirm",
            json={"team_code": away_code, "agree": True}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Confirm failed: {resp.status_code} - {resp.text}")
            return False
        
        # Get player stats after
        resp = requests.get(f"{BASE_URL}/players")
        players_after = resp.json()
        player_after = next((p for p in players_after if p['player_id'] == test_player_id), None)
        
        if not player_after:
            print_result(False, f"Player {test_player_name} not found in stats")
            return False
        
        enkel_points_after = player_after['enkel_points']
        enkel_points_increase = enkel_points_after - enkel_points_before
        
        print(f"Player enkel_points after: {enkel_points_after} (+{enkel_points_increase})")
        
        # Verify player got 3 points (1 game × 3 points for 2-0), NOT 2 (1 game × 2)
        if enkel_points_increase != 3:
            print_result(False, f"Expected enkel_points increase of 3 (1×3 for 2-0), got {enkel_points_increase}")
            return False
        
        print_result(True, f"Player stats correctly use configurable rules: 1 game 2-0 = 3 points, NOT 2")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cleanup_temp_players(temp_players)

def test_5_admin_settings_only_affect_player_stats():
    """Test 5: Admin settings only affect player stats, not team standings"""
    print_test("Test 5: Admin settings only affect player stats, not team standings")
    
    temp_players = []
    
    try:
        # Get current settings
        resp = requests.get(f"{BASE_URL}/admin/settings", headers={"x-admin-code": ADMIN_CODE})
        if resp.status_code != 200:
            print_result(False, f"Failed to get settings: {resp.status_code}")
            return False
        
        settings = resp.json()
        original_scoring = settings['scoring']['rules']
        print(f"Original scoring: {original_scoring}")
        
        # Change settings to new scoring: 2-0 → 5/0, 2-1 → 3/2
        new_scoring = {
            "frames_2_0": [5, 0],
            "frames_2_1": [3, 2],
            "games_per_match": 10,
            "enkel_games": 8,
            "dubbel_games": 2
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/settings",
            headers={"x-admin-code": ADMIN_CODE},
            json={"scoring": new_scoring}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to update settings: {resp.status_code} - {resp.text}")
            return False
        
        print(f"Updated scoring to: {new_scoring}")
        
        # Submit a new match with 10×2-0 home wins
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        print(f"Match: {match['home_team_name']} vs {match['away_team_name']}")
        
        # Ensure enough players
        home_players, away_players, temp_players = ensure_enough_players(match, 10, 10)
        
        # Track test player
        test_player_id = home_players[0]['id']
        test_player_name = home_players[0]['name']
        
        # Get player stats before
        resp = requests.get(f"{BASE_URL}/players")
        players_before = resp.json()
        player_before = next((p for p in players_before if p['player_id'] == test_player_id), None)
        enkel_points_before = player_before['enkel_points'] if player_before else 0
        
        # Get standings before
        resp = requests.get(f"{BASE_URL}/standings")
        standings_before = resp.json()
        home_team_before = next((t for t in standings_before if t['team_name'] == match['home_team_name']), None)
        points_for_before = home_team_before['points_for']
        
        print(f"Before: player enkel_points={enkel_points_before}, team points_for={points_for_before}")
        
        # Create 10 games all 2-0 home wins, first game with test player
        games = []
        games.append(create_game_data([test_player_id], [away_players[0]['id']], 2, 0, 'enkel'))
        
        for i in range(1, 10):
            home_id = home_players[i]['id']
            away_id = away_players[i]['id']
            games.append(create_game_data([home_id], [away_id], 2, 0, 'enkel'))
        
        # Submit and confirm
        home_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Submit failed: {resp.status_code} - {resp.text}")
            return False
        
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['away_team_name']:
                away_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/confirm",
            json={"team_code": away_code, "agree": True}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Confirm failed: {resp.status_code} - {resp.text}")
            return False
        
        # Get player stats after
        resp = requests.get(f"{BASE_URL}/players")
        players_after = resp.json()
        player_after = next((p for p in players_after if p['player_id'] == test_player_id), None)
        enkel_points_after = player_after['enkel_points'] if player_after else 0
        enkel_points_increase = enkel_points_after - enkel_points_before
        
        # Get standings after
        resp = requests.get(f"{BASE_URL}/standings")
        standings_after = resp.json()
        home_team_after = next((t for t in standings_after if t['team_name'] == match['home_team_name']), None)
        points_for_after = home_team_after['points_for']
        points_for_increase = points_for_after - points_for_before
        
        print(f"After: player enkel_points={enkel_points_after} (+{enkel_points_increase}), team points_for={points_for_after} (+{points_for_increase})")
        
        # Verify player got 5 points (new scoring for 2-0)
        if enkel_points_increase != 5:
            print_result(False, f"Expected player enkel_points increase of 5 (new scoring), got {enkel_points_increase}")
            return False
        
        # Verify team still got 20 points (fixed team scoring, NOT affected by settings)
        if points_for_increase != 20:
            print_result(False, f"Expected team points_for increase of 20 (fixed team scoring), got {points_for_increase}")
            return False
        
        # Restore original settings (always restore to default)
        default_scoring = {
            "frames_2_0": [3, 0],
            "frames_2_1": [2, 1],
            "games_per_match": 10,
            "enkel_games": 8,
            "dubbel_games": 2
        }
        resp = requests.post(
            f"{BASE_URL}/admin/settings",
            headers={"x-admin-code": ADMIN_CODE},
            json={"scoring": default_scoring}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to restore settings: {resp.status_code}")
            return False
        
        print(f"Restored default scoring: {default_scoring}")
        
        print_result(True, f"Admin settings correctly affect ONLY player stats (5 points), NOT team standings (still 20)")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cleanup_temp_players(temp_players)

def test_6_regression_checks():
    """Test 6: Regression checks"""
    print_test("Test 6: Regression checks")
    
    all_passed = True
    
    try:
        # GET /api/teams returns 6 teams
        resp = requests.get(f"{BASE_URL}/teams")
        if resp.status_code == 200:
            teams = resp.json()
            if len(teams) == 6:
                print_result(True, f"GET /api/teams returns 6 teams")
            else:
                print_result(False, f"Expected 6 teams, got {len(teams)}")
                all_passed = False
        else:
            print_result(False, f"GET /api/teams failed: {resp.status_code}")
            all_passed = False
        
        # GET /api/admin/players-full returns array with placeholders
        resp = requests.get(f"{BASE_URL}/admin/players-full", headers={"x-admin-code": ADMIN_CODE})
        if resp.status_code == 200:
            players = resp.json()
            placeholders = [p for p in players if p.get('is_placeholder')]
            if len(placeholders) > 0:
                print_result(True, f"GET /api/admin/players-full returns {len(players)} players with {len(placeholders)} placeholders")
            else:
                print_result(False, f"Expected placeholders in admin players list, got 0")
                all_passed = False
        else:
            print_result(False, f"GET /api/admin/players-full failed: {resp.status_code}")
            all_passed = False
        
        # Validation rules still work: submit with duplicate player → 400
        match = get_scheduled_match()
        if match:
            home_players = [p for p in match['home_players'] if not p.get('is_placeholder')]
            away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]
            
            if len(home_players) > 0 and len(away_players) > 0:
                # Create games with duplicate player
                duplicate_player = home_players[0]['id']
                games = []
                for i in range(10):
                    away_id = away_players[i % len(away_players)]['id']
                    games.append(create_game_data([duplicate_player], [away_id], 2, 0))
                
                home_code = None
                for team_name, code in TEAM_CODES.items():
                    if team_name in match['home_team_name']:
                        home_code = code
                        break
                
                resp = requests.post(
                    f"{BASE_URL}/matches/{match['id']}/submit",
                    json={"team_code": home_code, "games": games}
                )
                
                if resp.status_code == 400:
                    data = resp.json()
                    if data.get('error') == 'Validatiefouten':
                        print_result(True, f"Validation rules still work: duplicate player rejected")
                    else:
                        print_result(False, f"Wrong error format: {data}")
                        all_passed = False
                else:
                    print_result(False, f"Expected 400 for duplicate player, got {resp.status_code}")
                    all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*80)
    print("SESSION-4 BACKEND TESTING")
    print("Pool Competitie Webapp - Team Points vs Player Points Split")
    print("="*80)
    
    # Ensure default settings before running tests
    print("\nRestoring default settings...")
    default_scoring = {
        "frames_2_0": [3, 0],
        "frames_2_1": [2, 1],
        "games_per_match": 10,
        "enkel_games": 8,
        "dubbel_games": 2
    }
    resp = requests.post(
        f"{BASE_URL}/admin/settings",
        headers={"x-admin-code": ADMIN_CODE},
        json={"scoring": default_scoring}
    )
    if resp.status_code == 200:
        print("✅ Default settings restored")
    else:
        print(f"⚠️  Failed to restore default settings: {resp.status_code}")
    
    results = {}
    
    # Run all tests
    results['Test 1: Team points max 20 for 10×2-0'] = test_1_team_points_max_20()
    results['Test 2: Team points 20/10 for 10×2-1'] = test_2_team_points_2_1_wins()
    results['Test 3: Mixed match 5×2-0 + 5×2-1'] = test_3_mixed_match()
    results['Test 4: Player stats use configurable rules'] = test_4_player_stats_configurable()
    results['Test 5: Admin settings only affect player stats'] = test_5_admin_settings_only_affect_player_stats()
    results['Test 6: Regression checks'] = test_6_regression_checks()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit(main())
