#!/usr/bin/env python3
"""
Session-3 Backend Validation Testing for Pool Competitie webapp
Tests new validation rules:
1. Speelgerechtigd: player can only play if can_play_from <= match date
2. Geen dubbele inzet: player can only appear once across all 10 games
3. Admin override via allow_reuse bypasses ONLY dubbele-inzet, NOT speelgerechtigd
"""

import requests
import json
from datetime import datetime, timedelta

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

def create_game_data(home_player_ids, away_player_ids, game_type='enkel'):
    """Create a game object with proper structure"""
    return {
        "type": game_type,
        "home_players": home_player_ids if isinstance(home_player_ids, list) else [home_player_ids],
        "away_players": away_player_ids if isinstance(away_player_ids, list) else [away_player_ids],
        "home_frames": 2,
        "away_frames": 0
    }

def test_1_duplicate_player_submit():
    """Test 1: Team submit with duplicate player (should fail)"""
    print_test("Test 1: Team submit with duplicate player across games")
    
    try:
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        home_players = [p for p in match['home_players'] if not p.get('is_placeholder')]
        if len(home_players) < 1:
            print_result(False, "Not enough home players")
            return False
        
        # Use same player in multiple games
        duplicate_player = home_players[0]['id']
        away_players = [p for p in match['away_players'] if not p.get('is_placeholder')][:10]
        
        games = []
        for i in range(10):
            away_id = away_players[i % len(away_players)]['id']
            games.append(create_game_data([duplicate_player], [away_id]))
        
        # Try to submit with duplicate player
        home_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
                break
        
        if not home_code:
            print_result(False, f"Could not find team code for {match['home_team_name']}")
            return False
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games}
        )
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        if resp.status_code == 400:
            data = resp.json()
            if data.get('error') == 'Validatiefouten' and 'errors' in data:
                errors = data['errors']
                has_duplicate_error = any('is al ingezet in partij' in str(e) for e in errors)
                if has_duplicate_error:
                    print_result(True, f"Correctly rejected duplicate player with errors: {errors}")
                    return True
                else:
                    print_result(False, f"Got validation errors but not for duplicate: {errors}")
                    return False
            else:
                print_result(False, f"Wrong error format: {data}")
                return False
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_2_future_player_submit():
    """Test 2: Team submit with future can_play_from player (should fail)"""
    print_test("Test 2: Team submit with non-speelgerechtigd player")
    
    try:
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        # Create a player with future can_play_from date
        future_date = "2099-01-01T00:00:00Z"
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Toekomst Test Speler Session3",
                "team_id": match['home_team_id'],
                "can_play_from": future_date
            }
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to create test player: {resp.status_code} - {resp.text}")
            return False
        
        future_player = resp.json()
        future_player_id = future_player['id']
        print(f"Created test player: {future_player_id}")
        
        # Get updated match details
        resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
        match = resp.json()
        
        # Create games with future player
        home_players = [p for p in match['home_players'] if not p.get('is_placeholder') and p['id'] != future_player_id]
        away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]
        
        games = []
        # First game with future player
        games.append(create_game_data([future_player_id], [away_players[0]['id']]))
        # Rest with valid players
        for i in range(1, 10):
            home_id = home_players[i % len(home_players)]['id']
            away_id = away_players[i % len(away_players)]['id']
            games.append(create_game_data([home_id], [away_id]))
        
        # Try to submit
        home_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
                break
        
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games}
        )
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/admin/players/{future_player_id}",
            headers={"x-admin-code": ADMIN_CODE}
        )
        print(f"Cleaned up test player: {future_player_id}")
        
        if resp.status_code == 400:
            data = resp.json()
            if data.get('error') == 'Validatiefouten' and 'errors' in data:
                errors = data['errors']
                has_speelgerechtigd_error = any('nog niet speelgerechtigd' in str(e) for e in errors)
                if has_speelgerechtigd_error:
                    print_result(True, f"Correctly rejected non-speelgerechtigd player: {errors}")
                    return True
                else:
                    print_result(False, f"Got validation errors but not for speelgerechtigd: {errors}")
                    return False
            else:
                print_result(False, f"Wrong error format: {data}")
                return False
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_3_valid_submit():
    """Test 3: Team submit with valid game data (should succeed)"""
    print_test("Test 3: Valid team submit with unique players")
    
    temp_players = []
    
    try:
        match = get_scheduled_match()
        if not match:
            print_result(False, "Could not find scheduled match")
            return False
        
        home_players = [p for p in match['home_players'] if not p.get('is_placeholder')]
        away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]
        
        print(f"Available players: home={len(home_players)}, away={len(away_players)}")
        
        # Add temporary players if needed to reach 12 per team
        # Set can_play_from to match date or earlier to avoid speelgerechtigd issues
        match_date = match['date']
        
        while len(home_players) < 12:
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
        
        while len(away_players) < 12:
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
        
        # Create 10 games: 8 enkel + 2 dubbel = 12 unique players needed
        games = []
        
        # 8 enkel games
        for i in range(8):
            home_id = home_players[i]['id']
            away_id = away_players[i]['id']
            games.append(create_game_data([home_id], [away_id], 'enkel'))
        
        # 2 dubbel games using players 8-11 (4 players)
        home_ids = [home_players[8]['id'], home_players[9]['id']]
        away_ids = [away_players[8]['id'], away_players[9]['id']]
        games.append(create_game_data(home_ids, away_ids, 'dubbel'))
        
        home_ids = [home_players[10]['id'], home_players[11]['id']]
        away_ids = [away_players[10]['id'], away_players[11]['id']]
        games.append(create_game_data(home_ids, away_ids, 'dubbel'))
        
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
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        if resp.status_code != 200:
            print_result(False, f"Submit failed: {resp.status_code} - {resp.text}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print_result(False, f"Submit returned ok=false: {data}")
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
        
        print(f"Confirm response status: {resp.status_code}")
        print(f"Confirm response body: {resp.text}")
        
        if resp.status_code != 200:
            print_result(False, f"Confirm failed: {resp.status_code} - {resp.text}")
            return False
        
        confirm_data = resp.json()
        if confirm_data.get('status') != 'confirmed':
            print_result(False, f"Match not confirmed: {confirm_data}")
            return False
        
        # Verify standings updated
        resp = requests.get(f"{BASE_URL}/standings")
        if resp.status_code != 200:
            print_result(False, f"Failed to get standings: {resp.status_code}")
            return False
        
        standings = resp.json()
        if len(standings) != 6:
            print_result(False, f"Expected 6 teams in standings, got {len(standings)}")
            return False
        
        print_result(True, f"Valid submit succeeded, match confirmed, standings updated")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False
    finally:
        # Cleanup temp players
        for player_id in temp_players:
            requests.delete(
                f"{BASE_URL}/admin/players/{player_id}",
                headers={"x-admin-code": ADMIN_CODE}
            )
            print(f"Cleaned up temp player: {player_id}")

def test_4_admin_override_allow_reuse():
    """Test 4: Admin approve with allow_reuse=true and duplicate players (should succeed)"""
    print_test("Test 4: Admin approve with allow_reuse=true and duplicate players")
    
    try:
        # Find any match (preferably confirmed)
        resp = requests.get(f"{BASE_URL}/matches")
        if resp.status_code != 200:
            print_result(False, f"Failed to get matches: {resp.status_code}")
            return False
        
        matches = resp.json()
        target_match = None
        for m in matches:
            if m['status'] in ['confirmed', 'admin_approved']:
                target_match = m
                break
        
        if not target_match:
            # Use a scheduled match
            for m in matches:
                if m['status'] == 'scheduled':
                    target_match = m
                    break
        
        if not target_match:
            print_result(False, "No suitable match found")
            return False
        
        # Get match details
        resp = requests.get(f"{BASE_URL}/matches/{target_match['id']}")
        if resp.status_code != 200:
            print_result(False, f"Failed to get match details: {resp.status_code}")
            return False
        
        match = resp.json()
        home_players = [p for p in match['home_players'] if not p.get('is_placeholder')]
        away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]
        
        if len(home_players) < 1 or len(away_players) < 1:
            print_result(False, "Not enough players")
            return False
        
        # Create games with duplicate home player
        duplicate_player = home_players[0]['id']
        games = []
        for i in range(10):
            away_id = away_players[i % len(away_players)]['id']
            games.append(create_game_data([duplicate_player], [away_id]))
        
        # Admin approve with allow_reuse=true
        resp = requests.post(
            f"{BASE_URL}/admin/matches/{match['id']}/approve",
            headers={"x-admin-code": ADMIN_CODE},
            json={"games": games, "allow_reuse": True}
        )
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok'):
                print_result(True, f"Admin override with allow_reuse=true succeeded: points_home={data.get('points_home')}, points_away={data.get('points_away')}")
                return True
            else:
                print_result(False, f"Response ok=false: {data}")
                return False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return False
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_5_admin_override_cannot_bypass_speelgerechtigd():
    """Test 5: Admin approve with allow_reuse=true BUT non-speelgerechtigd player (should STILL fail)"""
    print_test("Test 5: Admin override cannot bypass speelgerechtigd check")
    
    try:
        # Find a match
        resp = requests.get(f"{BASE_URL}/matches")
        if resp.status_code != 200:
            print_result(False, f"Failed to get matches: {resp.status_code}")
            return False
        
        matches = resp.json()
        target_match = None
        for m in matches:
            if m['status'] in ['scheduled', 'confirmed', 'admin_approved']:
                target_match = m
                break
        
        if not target_match:
            print_result(False, "No suitable match found")
            return False
        
        # Get match details
        resp = requests.get(f"{BASE_URL}/matches/{target_match['id']}")
        if resp.status_code != 200:
            print_result(False, f"Failed to get match details: {resp.status_code}")
            return False
        
        match = resp.json()
        
        # Create a player with future can_play_from date
        future_date = "2099-01-01T00:00:00Z"
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Toekomst Admin Test Speler",
                "team_id": match['home_team_id'],
                "can_play_from": future_date
            }
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to create test player: {resp.status_code} - {resp.text}")
            return False
        
        future_player = resp.json()
        future_player_id = future_player['id']
        print(f"Created test player: {future_player_id}")
        
        # Get updated match details
        resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
        match = resp.json()
        
        home_players = [p for p in match['home_players'] if not p.get('is_placeholder') and p['id'] != future_player_id]
        away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]
        
        # Create games with future player
        games = []
        games.append(create_game_data([future_player_id], [away_players[0]['id']]))
        for i in range(1, 10):
            home_id = home_players[i % len(home_players)]['id']
            away_id = away_players[i % len(away_players)]['id']
            games.append(create_game_data([home_id], [away_id]))
        
        # Try admin approve with allow_reuse=true
        resp = requests.post(
            f"{BASE_URL}/admin/matches/{match['id']}/approve",
            headers={"x-admin-code": ADMIN_CODE},
            json={"games": games, "allow_reuse": True}
        )
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/admin/players/{future_player_id}",
            headers={"x-admin-code": ADMIN_CODE}
        )
        print(f"Cleaned up test player: {future_player_id}")
        
        if resp.status_code == 400:
            data = resp.json()
            if data.get('error') == 'Validatiefouten' and 'errors' in data:
                errors = data['errors']
                has_speelgerechtigd_error = any('nog niet speelgerechtigd' in str(e) for e in errors)
                if has_speelgerechtigd_error:
                    print_result(True, f"Correctly rejected non-speelgerechtigd player even with allow_reuse: {errors}")
                    return True
                else:
                    print_result(False, f"Got validation errors but not for speelgerechtigd: {errors}")
                    return False
            else:
                print_result(False, f"Wrong error format: {data}")
                return False
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_6_admin_approve_without_override():
    """Test 6: Admin approve with allow_reuse=false (default) and duplicate players (should fail)"""
    print_test("Test 6: Admin approve without allow_reuse and duplicate players")
    
    try:
        # Find a match
        resp = requests.get(f"{BASE_URL}/matches")
        if resp.status_code != 200:
            print_result(False, f"Failed to get matches: {resp.status_code}")
            return False
        
        matches = resp.json()
        target_match = None
        for m in matches:
            if m['status'] in ['scheduled', 'confirmed', 'admin_approved']:
                target_match = m
                break
        
        if not target_match:
            print_result(False, "No suitable match found")
            return False
        
        # Get match details
        resp = requests.get(f"{BASE_URL}/matches/{target_match['id']}")
        if resp.status_code != 200:
            print_result(False, f"Failed to get match details: {resp.status_code}")
            return False
        
        match = resp.json()
        home_players = [p for p in match['home_players'] if not p.get('is_placeholder')]
        away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]
        
        if len(home_players) < 1 or len(away_players) < 1:
            print_result(False, "Not enough players")
            return False
        
        # Create games with duplicate home player
        duplicate_player = home_players[0]['id']
        games = []
        for i in range(10):
            away_id = away_players[i % len(away_players)]['id']
            games.append(create_game_data([duplicate_player], [away_id]))
        
        # Admin approve WITHOUT allow_reuse (or explicitly false)
        resp = requests.post(
            f"{BASE_URL}/admin/matches/{match['id']}/approve",
            headers={"x-admin-code": ADMIN_CODE},
            json={"games": games, "allow_reuse": False}
        )
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        if resp.status_code == 400:
            data = resp.json()
            if data.get('error') == 'Validatiefouten' and 'errors' in data:
                errors = data['errors']
                has_duplicate_error = any('is al ingezet in partij' in str(e) for e in errors)
                if has_duplicate_error:
                    print_result(True, f"Correctly rejected duplicate player without override: {errors}")
                    return True
                else:
                    print_result(False, f"Got validation errors but not for duplicate: {errors}")
                    return False
            else:
                print_result(False, f"Wrong error format: {data}")
                return False
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_7_regression_checks():
    """Test 7: Regression checks for existing endpoints"""
    print_test("Test 7: Regression checks")
    
    all_passed = True
    
    try:
        # GET /api/standings
        resp = requests.get(f"{BASE_URL}/standings")
        if resp.status_code == 200:
            standings = resp.json()
            if len(standings) == 6:
                required_fields = ['team_name', 'played', 'won', 'drawn', 'lost', 'points_for', 
                                 'points_against', 'saldo', 'frames_won', 'frames_lost', 
                                 'framebalans', 'comp_points']
                if all(field in standings[0] for field in required_fields):
                    print_result(True, "GET /api/standings returns 6 teams with all required fields")
                else:
                    print_result(False, f"Standings missing fields: {standings[0].keys()}")
                    all_passed = False
            else:
                print_result(False, f"Expected 6 teams, got {len(standings)}")
                all_passed = False
        else:
            print_result(False, f"GET /api/standings failed: {resp.status_code}")
            all_passed = False
        
        # GET /api/players
        resp = requests.get(f"{BASE_URL}/players")
        if resp.status_code == 200:
            players = resp.json()
            has_placeholder = any(p.get('is_placeholder') for p in players)
            if not has_placeholder:
                print_result(True, f"GET /api/players returns {len(players)} players without placeholders")
            else:
                print_result(False, "Players list contains placeholders")
                all_passed = False
        else:
            print_result(False, f"GET /api/players failed: {resp.status_code}")
            all_passed = False
        
        # POST /api/auth/team
        resp = requests.post(f"{BASE_URL}/auth/team", json={"code": "TEL-4928"})
        if resp.status_code == 200:
            data = resp.json()
            if 'team' in data and 'players' in data and 'matches' in data:
                print_result(True, "POST /api/auth/team returns team session")
            else:
                print_result(False, f"Team auth missing fields: {data.keys()}")
                all_passed = False
        else:
            print_result(False, f"POST /api/auth/team failed: {resp.status_code}")
            all_passed = False
        
        # POST /api/auth/admin
        resp = requests.post(f"{BASE_URL}/auth/admin", json={"code": ADMIN_CODE})
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('token') == ADMIN_CODE:
                print_result(True, "POST /api/auth/admin returns admin token")
            else:
                print_result(False, f"Admin auth response: {data}")
                all_passed = False
        else:
            print_result(False, f"POST /api/auth/admin failed: {resp.status_code}")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print("SESSION-3 BACKEND VALIDATION TESTING")
    print("Pool Competitie Webapp - New Validation Rules")
    print("="*80)
    
    results = {}
    
    # Run all tests
    results['Test 1: Duplicate player submit'] = test_1_duplicate_player_submit()
    results['Test 2: Future player submit'] = test_2_future_player_submit()
    results['Test 3: Valid submit'] = test_3_valid_submit()
    results['Test 4: Admin override allow_reuse'] = test_4_admin_override_allow_reuse()
    results['Test 5: Admin override cannot bypass speelgerechtigd'] = test_5_admin_override_cannot_bypass_speelgerechtigd()
    results['Test 6: Admin approve without override'] = test_6_admin_approve_without_override()
    results['Test 7: Regression checks'] = test_7_regression_checks()
    
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
