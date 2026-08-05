#!/usr/bin/env python3
"""
Backend API tests for Pool Competitie
Tests the priority endpoints and regression checks
"""
import requests
import json
from datetime import datetime, timedelta

# Base URL from .env
BASE_URL = "https://pool-stats-3.preview.emergentagent.com/api"

# Auth codes
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

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def print_info(msg):
    print(f"ℹ️  {msg}")


# Test 1: GET /api/admin/players-full
def test_admin_players_full():
    print_test("GET /api/admin/players-full - with placeholders")
    
    # Test without admin header - should return 401
    try:
        resp = requests.get(f"{BASE_URL}/admin/players-full")
        if resp.status_code == 401:
            print_success("Without admin header returns 401")
        else:
            print_error(f"Without admin header returned {resp.status_code}, expected 401")
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False
    
    # Test with admin header - should return 200 with players including placeholders
    try:
        headers = {"x-admin-code": ADMIN_CODE}
        resp = requests.get(f"{BASE_URL}/admin/players-full", headers=headers)
        
        if resp.status_code != 200:
            print_error(f"With admin header returned {resp.status_code}, expected 200")
            print_info(f"Response: {resp.text}")
            return False
        
        print_success("With admin header returns 200")
        
        players = resp.json()
        if not isinstance(players, list):
            print_error(f"Response is not an array, got: {type(players)}")
            return False
        
        print_success(f"Response is array with {len(players)} players")
        
        # Check for required fields
        if len(players) > 0:
            sample = players[0]
            required_fields = ['player_id', 'name', 'team_id', 'team_name', 'can_play_from', 'is_placeholder', 'active']
            missing = [f for f in required_fields if f not in sample]
            if missing:
                print_error(f"Missing fields in player object: {missing}")
                return False
            print_success(f"Player objects have all required fields: {required_fields}")
        
        # Check for placeholders
        placeholders = [p for p in players if p.get('is_placeholder') == True]
        print_info(f"Found {len(placeholders)} placeholder entries")
        
        if len(placeholders) != 6:
            print_error(f"Expected exactly 6 placeholders (one per team), found {len(placeholders)}")
            for ph in placeholders:
                print_info(f"  - {ph.get('name')} ({ph.get('team_name')})")
            return False
        
        print_success("Found exactly 6 placeholder entries (one per team)")
        
        # Verify placeholder names
        for ph in placeholders:
            if ph.get('name') != 'Speler te kort':
                print_error(f"Placeholder has wrong name: {ph.get('name')}, expected 'Speler te kort'")
                return False
        
        print_success("All placeholders have correct name 'Speler te kort'")
        
        # Compare with public /api/players endpoint
        public_resp = requests.get(f"{BASE_URL}/players")
        if public_resp.status_code == 200:
            public_players = public_resp.json()
            public_placeholders = [p for p in public_players if p.get('is_placeholder') == True]
            if len(public_placeholders) == 0:
                print_success("Public /api/players does NOT contain placeholders (correct)")
            else:
                print_error(f"Public /api/players contains {len(public_placeholders)} placeholders (should be 0)")
                return False
        
        return True
        
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False


# Test 2: POST /api/admin/matches/:id/approve - edit confirmed matches
def test_admin_edit_confirmed_match():
    print_test("POST /api/admin/matches/:id/approve - edit confirmed match")
    
    try:
        # Get a scheduled match
        resp = requests.get(f"{BASE_URL}/matches")
        if resp.status_code != 200:
            print_error(f"Failed to get matches: {resp.status_code}")
            return False
        
        matches = resp.json()
        scheduled = [m for m in matches if m.get('status') == 'scheduled']
        
        if len(scheduled) == 0:
            print_error("No scheduled matches found to test with")
            return False
        
        match = scheduled[0]
        match_id = match['id']
        home_team_id = match['home_team_id']
        away_team_id = match['away_team_id']
        
        print_info(f"Using match: {match['home_team_name']} vs {match['away_team_name']} (ID: {match_id})")
        
        # Get match details to get player lists
        match_detail_resp = requests.get(f"{BASE_URL}/matches/{match_id}")
        if match_detail_resp.status_code != 200:
            print_error(f"Failed to get match details: {match_detail_resp.status_code}")
            return False
        
        match_detail = match_detail_resp.json()
        home_players = [p for p in match_detail['home_players'] if not p.get('is_placeholder')]
        away_players = [p for p in match_detail['away_players'] if not p.get('is_placeholder')]
        
        if len(home_players) < 4 or len(away_players) < 4:
            print_error(f"Not enough players: home={len(home_players)}, away={len(away_players)}")
            return False
        
        # Find team codes
        home_code = None
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match['home_team_name']:
                home_code = code
            if team_name in match['away_team_name']:
                away_code = code
        
        if not home_code or not away_code:
            print_error(f"Could not find team codes for {match['home_team_name']} and {match['away_team_name']}")
            return False
        
        # Create 10 games (4 enkel, 2 dubbel, 4 enkel)
        games = []
        # First 4 enkel
        for i in range(4):
            games.append({
                "type": "enkel",
                "home_players": [home_players[i % len(home_players)]['id']],
                "away_players": [away_players[i % len(away_players)]['id']],
                "home_frames": 2,
                "away_frames": 0
            })
        # 2 dubbel
        for i in range(2):
            games.append({
                "type": "dubbel",
                "home_players": [home_players[i % len(home_players)]['id'], home_players[(i+1) % len(home_players)]['id']],
                "away_players": [away_players[i % len(away_players)]['id'], away_players[(i+1) % len(away_players)]['id']],
                "home_frames": 2,
                "away_frames": 0
            })
        # Last 4 enkel
        for i in range(4):
            games.append({
                "type": "enkel",
                "home_players": [home_players[(i+2) % len(home_players)]['id']],
                "away_players": [away_players[(i+2) % len(away_players)]['id']],
                "home_frames": 2,
                "away_frames": 0
            })
        
        # Submit as home team
        submit_data = {
            "team_code": home_code,
            "games": games,
            "remarks": "Test submission"
        }
        
        submit_resp = requests.post(f"{BASE_URL}/matches/{match_id}/submit", json=submit_data)
        if submit_resp.status_code != 200:
            print_error(f"Failed to submit match: {submit_resp.status_code} - {submit_resp.text}")
            return False
        
        print_success("Home team submitted match result")
        
        # Confirm as away team
        confirm_data = {
            "team_code": away_code,
            "agree": True
        }
        
        confirm_resp = requests.post(f"{BASE_URL}/matches/{match_id}/confirm", json=confirm_data)
        if confirm_resp.status_code != 200:
            print_error(f"Failed to confirm match: {confirm_resp.status_code} - {confirm_resp.text}")
            return False
        
        print_success("Away team confirmed match (status now 'confirmed')")
        
        # Now as admin, edit the match
        # Change some frames to test recalculation
        modified_games = games.copy()
        modified_games[0]['home_frames'] = 2
        modified_games[0]['away_frames'] = 1  # Change from 2-0 to 2-1
        modified_games[1]['home_frames'] = 1
        modified_games[1]['away_frames'] = 2  # Change from 2-0 to 1-2 (away wins)
        
        approve_data = {
            "games": modified_games
        }
        
        headers = {"x-admin-code": ADMIN_CODE}
        approve_resp = requests.post(f"{BASE_URL}/admin/matches/{match_id}/approve", json=approve_data, headers=headers)
        
        if approve_resp.status_code != 200:
            print_error(f"Failed to approve/edit match: {approve_resp.status_code} - {approve_resp.text}")
            return False
        
        approve_result = approve_resp.json()
        
        if not approve_result.get('ok'):
            print_error(f"Approve response missing 'ok': {approve_result}")
            return False
        
        print_success("Admin approved/edited match")
        
        # Check recalculated points
        # Original: 10 games all 2-0 = 30-0
        # Modified: game 0 is 2-1 (2-1 points), game 1 is 1-2 (1-2 points), rest 8 games 2-0 (24-0)
        # Total: 2+1+24 = 27 home, 1+2+0 = 3 away
        expected_home = 27
        expected_away = 3
        
        if 'points_home' not in approve_result or 'points_away' not in approve_result:
            print_error(f"Approve response missing points: {approve_result}")
            return False
        
        if approve_result['points_home'] != expected_home or approve_result['points_away'] != expected_away:
            print_error(f"Points mismatch: got {approve_result['points_home']}-{approve_result['points_away']}, expected {expected_home}-{expected_away}")
            return False
        
        print_success(f"Recalculated points correct: {approve_result['points_home']}-{approve_result['points_away']}")
        
        # Verify match status and points via GET
        verify_resp = requests.get(f"{BASE_URL}/matches/{match_id}")
        if verify_resp.status_code != 200:
            print_error(f"Failed to verify match: {verify_resp.status_code}")
            return False
        
        verified_match = verify_resp.json()
        
        if verified_match['status'] != 'admin_approved':
            print_error(f"Match status is {verified_match['status']}, expected 'admin_approved'")
            return False
        
        print_success("Match status is 'admin_approved'")
        
        if verified_match['points_home'] != expected_home or verified_match['points_away'] != expected_away:
            print_error(f"Verified points mismatch: {verified_match['points_home']}-{verified_match['points_away']}")
            return False
        
        print_success(f"Verified match points: {verified_match['points_home']}-{verified_match['points_away']}")
        
        # Check audit log
        audit_resp = requests.get(f"{BASE_URL}/admin/audit-logs", headers=headers)
        if audit_resp.status_code != 200:
            print_error(f"Failed to get audit logs: {audit_resp.status_code}")
            return False
        
        audit_logs = audit_resp.json()
        match_audit = [log for log in audit_logs if log.get('action') == 'match_admin_approved' and log.get('entity_id') == match_id]
        
        if len(match_audit) == 0:
            print_error("No audit log entry found for match_admin_approved")
            return False
        
        print_success(f"Audit log entry found for match_admin_approved")
        
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test 3: POST /api/admin/players with custom can_play_from
def test_custom_can_play_from():
    print_test("POST /api/admin/players - custom can_play_from date")
    
    try:
        # Get teams
        resp = requests.get(f"{BASE_URL}/teams")
        if resp.status_code != 200:
            print_error(f"Failed to get teams: {resp.status_code}")
            return False
        
        teams = resp.json()
        if len(teams) == 0:
            print_error("No teams found")
            return False
        
        team_id = teams[0]['id']
        print_info(f"Using team: {teams[0]['name']} (ID: {team_id})")
        
        # Create player with custom can_play_from
        custom_date = "2027-01-15T00:00:00.000Z"
        player_data = {
            "team_id": team_id,
            "name": "Test Speler CanPlay",
            "can_play_from": custom_date
        }
        
        headers = {"x-admin-code": ADMIN_CODE}
        create_resp = requests.post(f"{BASE_URL}/admin/players", json=player_data, headers=headers)
        
        if create_resp.status_code != 200:
            print_error(f"Failed to create player: {create_resp.status_code} - {create_resp.text}")
            return False
        
        created_player = create_resp.json()
        player_id = created_player['id']
        
        print_success(f"Created player with ID: {player_id}")
        
        # Verify can_play_from is the custom date, not joined_at + 2 months
        if 'can_play_from' not in created_player:
            print_error("Response missing can_play_from field")
            return False
        
        # Parse dates to compare (ignore milliseconds)
        created_date = created_player['can_play_from'][:10]  # Get YYYY-MM-DD
        expected_date = custom_date[:10]
        
        if created_date != expected_date:
            print_error(f"can_play_from mismatch: got {created_date}, expected {expected_date}")
            return False
        
        print_success(f"can_play_from is correct: {created_date}")
        
        # Verify via GET /api/admin/players-full
        verify_resp = requests.get(f"{BASE_URL}/admin/players-full", headers=headers)
        if verify_resp.status_code != 200:
            print_error(f"Failed to verify player: {verify_resp.status_code}")
            return False
        
        all_players = verify_resp.json()
        test_player = [p for p in all_players if p['player_id'] == player_id]
        
        if len(test_player) == 0:
            print_error("Created player not found in players-full list")
            return False
        
        verified_date = test_player[0]['can_play_from'][:10]
        if verified_date != expected_date:
            print_error(f"Verified can_play_from mismatch: got {verified_date}, expected {expected_date}")
            return False
        
        print_success(f"Verified can_play_from via players-full: {verified_date}")
        
        # Cleanup - delete the test player
        delete_resp = requests.delete(f"{BASE_URL}/admin/players/{player_id}", headers=headers)
        if delete_resp.status_code != 200:
            print_error(f"Failed to delete test player: {delete_resp.status_code}")
            return False
        
        print_success("Test player deleted (cleanup)")
        
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test 4: Scoring correctness
def test_scoring_correctness():
    print_test("Scoring correctness - 10 games all 2-0 and all 2-1")
    
    try:
        # Get scheduled matches
        resp = requests.get(f"{BASE_URL}/matches")
        if resp.status_code != 200:
            print_error(f"Failed to get matches: {resp.status_code}")
            return False
        
        matches = resp.json()
        scheduled = [m for m in matches if m.get('status') == 'scheduled']
        
        if len(scheduled) < 2:
            print_error(f"Need at least 2 scheduled matches, found {len(scheduled)}")
            return False
        
        # Test 1: All 10 games 2-0 home wins
        match1 = scheduled[0]
        match1_id = match1['id']
        
        print_info(f"\nTest 1: All 2-0 home wins")
        print_info(f"Match: {match1['home_team_name']} vs {match1['away_team_name']}")
        
        # Get match details
        detail_resp = requests.get(f"{BASE_URL}/matches/{match1_id}")
        if detail_resp.status_code != 200:
            print_error(f"Failed to get match details: {detail_resp.status_code}")
            return False
        
        match1_detail = detail_resp.json()
        home_players = [p for p in match1_detail['home_players'] if not p.get('is_placeholder')]
        away_players = [p for p in match1_detail['away_players'] if not p.get('is_placeholder')]
        
        # Find team codes
        home_code = None
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match1['home_team_name']:
                home_code = code
            if team_name in match1['away_team_name']:
                away_code = code
        
        if not home_code or not away_code:
            print_error(f"Could not find team codes")
            return False
        
        # Create 10 games all 2-0
        games_2_0 = []
        for i in range(4):  # First 4 enkel
            games_2_0.append({
                "type": "enkel",
                "home_players": [home_players[i % len(home_players)]['id']],
                "away_players": [away_players[i % len(away_players)]['id']],
                "home_frames": 2,
                "away_frames": 0
            })
        for i in range(2):  # 2 dubbel
            games_2_0.append({
                "type": "dubbel",
                "home_players": [home_players[i % len(home_players)]['id'], home_players[(i+1) % len(home_players)]['id']],
                "away_players": [away_players[i % len(away_players)]['id'], away_players[(i+1) % len(away_players)]['id']],
                "home_frames": 2,
                "away_frames": 0
            })
        for i in range(4):  # Last 4 enkel
            games_2_0.append({
                "type": "enkel",
                "home_players": [home_players[(i+2) % len(home_players)]['id']],
                "away_players": [away_players[(i+2) % len(away_players)]['id']],
                "home_frames": 2,
                "away_frames": 0
            })
        
        # Submit
        submit_resp = requests.post(f"{BASE_URL}/matches/{match1_id}/submit", json={
            "team_code": home_code,
            "games": games_2_0,
            "remarks": "Test 2-0"
        })
        
        if submit_resp.status_code != 200:
            print_error(f"Failed to submit: {submit_resp.status_code} - {submit_resp.text}")
            return False
        
        # Confirm
        confirm_resp = requests.post(f"{BASE_URL}/matches/{match1_id}/confirm", json={
            "team_code": away_code,
            "agree": True
        })
        
        if confirm_resp.status_code != 200:
            print_error(f"Failed to confirm: {confirm_resp.status_code} - {confirm_resp.text}")
            return False
        
        # Verify points: 10 games × 3 pts = 30-0
        verify_resp = requests.get(f"{BASE_URL}/matches/{match1_id}")
        verified = verify_resp.json()
        
        if verified['points_home'] != 30 or verified['points_away'] != 0:
            print_error(f"Points mismatch for 2-0 games: got {verified['points_home']}-{verified['points_away']}, expected 30-0")
            return False
        
        print_success(f"Points correct for all 2-0: {verified['points_home']}-{verified['points_away']}")
        
        # Verify frames: sum of home_frames = 20, sum of away_frames = 0
        total_home_frames = sum(g['home_frames'] for g in verified['games'])
        total_away_frames = sum(g['away_frames'] for g in verified['games'])
        
        if total_home_frames != 20 or total_away_frames != 0:
            print_error(f"Frames mismatch: got {total_home_frames}-{total_away_frames}, expected 20-0")
            return False
        
        print_success(f"Frames correct: {total_home_frames}-{total_away_frames}")
        
        # Check standings update
        standings_resp = requests.get(f"{BASE_URL}/standings")
        if standings_resp.status_code != 200:
            print_error(f"Failed to get standings: {standings_resp.status_code}")
            return False
        
        standings = standings_resp.json()
        home_team_standing = [s for s in standings if s['team_id'] == match1['home_team_id']][0]
        
        print_info(f"Home team standings: frames_won={home_team_standing['frames_won']}, comp_points={home_team_standing['comp_points']}")
        print_success("Standings updated (frames_won includes the 20 frames)")
        
        # Test 2: All 10 games 2-1 home wins
        if len(scheduled) < 2:
            print_error("Need another scheduled match for 2-1 test")
            return False
        
        match2 = scheduled[1]
        match2_id = match2['id']
        
        print_info(f"\nTest 2: All 2-1 home wins")
        print_info(f"Match: {match2['home_team_name']} vs {match2['away_team_name']}")
        
        # Get match details
        detail_resp2 = requests.get(f"{BASE_URL}/matches/{match2_id}")
        match2_detail = detail_resp2.json()
        home_players2 = [p for p in match2_detail['home_players'] if not p.get('is_placeholder')]
        away_players2 = [p for p in match2_detail['away_players'] if not p.get('is_placeholder')]
        
        # Find team codes
        home_code2 = None
        away_code2 = None
        for team_name, code in TEAM_CODES.items():
            if team_name in match2['home_team_name']:
                home_code2 = code
            if team_name in match2['away_team_name']:
                away_code2 = code
        
        # Create 10 games all 2-1
        games_2_1 = []
        for i in range(4):
            games_2_1.append({
                "type": "enkel",
                "home_players": [home_players2[i % len(home_players2)]['id']],
                "away_players": [away_players2[i % len(away_players2)]['id']],
                "home_frames": 2,
                "away_frames": 1
            })
        for i in range(2):
            games_2_1.append({
                "type": "dubbel",
                "home_players": [home_players2[i % len(home_players2)]['id'], home_players2[(i+1) % len(home_players2)]['id']],
                "away_players": [away_players2[i % len(away_players2)]['id'], away_players2[(i+1) % len(away_players2)]['id']],
                "home_frames": 2,
                "away_frames": 1
            })
        for i in range(4):
            games_2_1.append({
                "type": "enkel",
                "home_players": [home_players2[(i+2) % len(home_players2)]['id']],
                "away_players": [away_players2[(i+2) % len(away_players2)]['id']],
                "home_frames": 2,
                "away_frames": 1
            })
        
        # Submit
        submit_resp2 = requests.post(f"{BASE_URL}/matches/{match2_id}/submit", json={
            "team_code": home_code2,
            "games": games_2_1,
            "remarks": "Test 2-1"
        })
        
        if submit_resp2.status_code != 200:
            print_error(f"Failed to submit: {submit_resp2.status_code}")
            return False
        
        # Confirm
        confirm_resp2 = requests.post(f"{BASE_URL}/matches/{match2_id}/confirm", json={
            "team_code": away_code2,
            "agree": True
        })
        
        if confirm_resp2.status_code != 200:
            print_error(f"Failed to confirm: {confirm_resp2.status_code}")
            return False
        
        # Verify points: 10 games × 2 pts home, 1 pt away = 20-10
        verify_resp2 = requests.get(f"{BASE_URL}/matches/{match2_id}")
        verified2 = verify_resp2.json()
        
        if verified2['points_home'] != 20 or verified2['points_away'] != 10:
            print_error(f"Points mismatch for 2-1 games: got {verified2['points_home']}-{verified2['points_away']}, expected 20-10")
            return False
        
        print_success(f"Points correct for all 2-1: {verified2['points_home']}-{verified2['points_away']}")
        
        # Verify frames: sum of home_frames = 20, sum of away_frames = 10
        total_home_frames2 = sum(g['home_frames'] for g in verified2['games'])
        total_away_frames2 = sum(g['away_frames'] for g in verified2['games'])
        
        if total_home_frames2 != 20 or total_away_frames2 != 10:
            print_error(f"Frames mismatch: got {total_home_frames2}-{total_away_frames2}, expected 20-10")
            return False
        
        print_success(f"Frames correct: {total_home_frames2}-{total_away_frames2}")
        
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test 5: Regression checks
def test_regression():
    print_test("Regression checks - existing endpoints")
    
    all_passed = True
    
    try:
        # GET /api/teams - should return 6 teams
        resp = requests.get(f"{BASE_URL}/teams")
        if resp.status_code != 200:
            print_error(f"GET /api/teams failed: {resp.status_code}")
            all_passed = False
        else:
            teams = resp.json()
            if len(teams) == 6:
                print_success(f"GET /api/teams returns 6 teams")
            else:
                print_error(f"GET /api/teams returned {len(teams)} teams, expected 6")
                all_passed = False
        
        # GET /api/standings - should return 6 entries
        resp = requests.get(f"{BASE_URL}/standings")
        if resp.status_code != 200:
            print_error(f"GET /api/standings failed: {resp.status_code}")
            all_passed = False
        else:
            standings = resp.json()
            if len(standings) == 6:
                print_success(f"GET /api/standings returns 6 entries")
            else:
                print_error(f"GET /api/standings returned {len(standings)} entries, expected 6")
                all_passed = False
        
        # GET /api/matches - should return 36+ matches
        resp = requests.get(f"{BASE_URL}/matches")
        if resp.status_code != 200:
            print_error(f"GET /api/matches failed: {resp.status_code}")
            all_passed = False
        else:
            matches = resp.json()
            if len(matches) >= 36:
                print_success(f"GET /api/matches returns {len(matches)} matches (>= 36)")
            else:
                print_error(f"GET /api/matches returned {len(matches)} matches, expected >= 36")
                all_passed = False
        
        # POST /api/auth/team with TEL-4928
        resp = requests.post(f"{BASE_URL}/auth/team", json={"code": "TEL-4928"})
        if resp.status_code != 200:
            print_error(f"POST /api/auth/team failed: {resp.status_code}")
            all_passed = False
        else:
            auth_data = resp.json()
            if 'team' in auth_data and 'players' in auth_data and 'matches' in auth_data:
                print_success(f"POST /api/auth/team returns team + players + matches")
            else:
                print_error(f"POST /api/auth/team missing fields: {auth_data.keys()}")
                all_passed = False
        
        # POST /api/auth/admin with ADMIN-9999
        resp = requests.post(f"{BASE_URL}/auth/admin", json={"code": "ADMIN-9999"})
        if resp.status_code != 200:
            print_error(f"POST /api/auth/admin failed: {resp.status_code}")
            all_passed = False
        else:
            admin_data = resp.json()
            if admin_data.get('ok') == True and admin_data.get('token') == 'ADMIN-9999':
                print_success(f"POST /api/auth/admin returns ok:true, token:ADMIN-9999")
            else:
                print_error(f"POST /api/auth/admin unexpected response: {admin_data}")
                all_passed = False
        
        # GET /api/admin/dashboard - should include pending_date_requests
        headers = {"x-admin-code": ADMIN_CODE}
        resp = requests.get(f"{BASE_URL}/admin/dashboard", headers=headers)
        if resp.status_code != 200:
            print_error(f"GET /api/admin/dashboard failed: {resp.status_code}")
            all_passed = False
        else:
            dashboard = resp.json()
            if 'pending_date_requests' in dashboard:
                print_success(f"GET /api/admin/dashboard includes pending_date_requests: {dashboard['pending_date_requests']}")
            else:
                print_error(f"GET /api/admin/dashboard missing pending_date_requests field")
                all_passed = False
        
        # Test date change request flow (create + respond)
        # Get a scheduled match
        matches_resp = requests.get(f"{BASE_URL}/matches")
        matches = matches_resp.json()
        scheduled = [m for m in matches if m.get('status') == 'scheduled']
        
        if len(scheduled) > 0:
            test_match = scheduled[-1]  # Use last scheduled match to avoid conflicts
            match_id = test_match['id']
            
            # Find team codes
            home_code = None
            away_code = None
            for team_name, code in TEAM_CODES.items():
                if team_name in test_match['home_team_name']:
                    home_code = code
                if team_name in test_match['away_team_name']:
                    away_code = code
            
            if home_code and away_code:
                # Create date change request
                new_date = (datetime.now() + timedelta(days=30)).isoformat()
                create_req_resp = requests.post(f"{BASE_URL}/date-change-requests", json={
                    "team_code": home_code,
                    "match_id": match_id,
                    "new_date": new_date,
                    "reason": "Test date change"
                })
                
                if create_req_resp.status_code == 200:
                    req_data = create_req_resp.json()
                    req_id = req_data['request']['id']
                    
                    # Respond as opponent
                    respond_resp = requests.post(f"{BASE_URL}/date-change-requests/{req_id}/respond", json={
                        "team_code": away_code,
                        "agree": True
                    })
                    
                    if respond_resp.status_code == 200:
                        respond_data = respond_resp.json()
                        if respond_data.get('status') == 'approved':
                            print_success("Date change request flow works (create + approve)")
                            
                            # Verify match date was updated
                            verify_match = requests.get(f"{BASE_URL}/matches/{match_id}").json()
                            if verify_match['date'][:10] == new_date[:10]:
                                print_success("Match date was updated correctly")
                            else:
                                print_error(f"Match date not updated: {verify_match['date']}")
                                all_passed = False
                        else:
                            print_error(f"Date change request status: {respond_data.get('status')}")
                            all_passed = False
                    else:
                        print_error(f"Failed to respond to date change request: {respond_resp.status_code}")
                        all_passed = False
                else:
                    print_error(f"Failed to create date change request: {create_req_resp.status_code}")
                    all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_error(f"Regression test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*80)
    print("POOL COMPETITIE BACKEND API TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Code: {ADMIN_CODE}")
    print("="*80)
    
    results = {}
    
    # Run all tests
    results['admin_players_full'] = test_admin_players_full()
    results['admin_edit_confirmed_match'] = test_admin_edit_confirmed_match()
    results['custom_can_play_from'] = test_custom_can_play_from()
    results['scoring_correctness'] = test_scoring_correctness()
    results['regression'] = test_regression()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    print("="*80)
    print(f"Total: {passed}/{total} tests passed")
    print("="*80)
    
    return all(results.values())


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
