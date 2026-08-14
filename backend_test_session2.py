#!/usr/bin/env python3
"""
Backend API tests for Pool Competitie - Session 2 Bug Fixes
Focus on defensive recompute, player filtering, and end-to-end scoring
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


# Test 1: GET /api/standings - verify defensive recompute from games
def test_standings_defensive_recompute():
    print_test("GET /api/standings - verify defensive recompute from games")
    
    try:
        resp = requests.get(f"{BASE_URL}/standings")
        if resp.status_code != 200:
            print_error(f"Failed to get standings: {resp.status_code}")
            return False
        
        standings = resp.json()
        
        # Should return array of 6 teams
        if not isinstance(standings, list):
            print_error(f"Response is not an array, got: {type(standings)}")
            return False
        
        if len(standings) != 6:
            print_error(f"Expected 6 teams, got {len(standings)}")
            return False
        
        print_success(f"Returns array of 6 teams")
        
        # Check required fields for each team
        required_fields = ['team_name', 'played', 'won', 'drawn', 'lost', 'points_for', 
                          'points_against', 'saldo', 'frames_won', 'frames_lost', 
                          'framebalans', 'comp_points']
        
        all_fields_present = True
        for team in standings:
            missing = [f for f in required_fields if f not in team]
            if missing:
                print_error(f"Team {team.get('team_name')} missing fields: {missing}")
                all_fields_present = False
        
        if not all_fields_present:
            return False
        
        print_success(f"All teams have required fields: {', '.join(required_fields)}")
        
        # Verify calculations for each team
        all_calculations_correct = True
        for team in standings:
            # Framebalans should equal frames_won - frames_lost
            expected_framebalans = team['frames_won'] - team['frames_lost']
            if team['framebalans'] != expected_framebalans:
                print_error(f"Team {team['team_name']}: framebalans={team['framebalans']}, expected {expected_framebalans} (frames_won - frames_lost)")
                all_calculations_correct = False
            
            # Saldo should equal points_for - points_against
            expected_saldo = team['points_for'] - team['points_against']
            if team['saldo'] != expected_saldo:
                print_error(f"Team {team['team_name']}: saldo={team['saldo']}, expected {expected_saldo} (points_for - points_against)")
                all_calculations_correct = False
        
        if not all_calculations_correct:
            return False
        
        print_success("All teams have correct framebalans and saldo calculations")
        
        # Verify internal consistency: points_for should match sum of match points
        # Get all confirmed/admin_approved matches
        matches_resp = requests.get(f"{BASE_URL}/matches")
        if matches_resp.status_code != 200:
            print_error(f"Failed to get matches: {matches_resp.status_code}")
            return False
        
        matches = matches_resp.json()
        confirmed_matches = [m for m in matches if m.get('status') in ['confirmed', 'admin_approved']]
        
        print_info(f"Checking {len(confirmed_matches)} confirmed/admin_approved matches for consistency")
        
        # Calculate expected points_for for each team from matches
        team_points_from_matches = {}
        for team in standings:
            team_points_from_matches[team['team_id']] = 0
        
        for match in confirmed_matches:
            if not match.get('games'):
                continue
            
            # Recompute points from games (defensive check)
            home_points = 0
            away_points = 0
            for game in match['games']:
                hf = game.get('home_frames', 0)
                af = game.get('away_frames', 0)
                
                # Scoring rules: 2-0 = 3-0, 2-1 = 2-1, 1-2 = 1-2, 0-2 = 0-3
                if hf == 2 and af == 0:
                    home_points += 3
                    away_points += 0
                elif hf == 0 and af == 2:
                    home_points += 0
                    away_points += 3
                elif hf == 2 and af == 1:
                    home_points += 2
                    away_points += 1
                elif hf == 1 and af == 2:
                    home_points += 1
                    away_points += 2
            
            home_team_id = match['home_team_id']
            away_team_id = match['away_team_id']
            
            if home_team_id in team_points_from_matches:
                team_points_from_matches[home_team_id] += home_points
            if away_team_id in team_points_from_matches:
                team_points_from_matches[away_team_id] += away_points
        
        # Compare with standings
        consistency_check = True
        for team in standings:
            expected_points = team_points_from_matches.get(team['team_id'], 0)
            if team['points_for'] != expected_points:
                print_error(f"Team {team['team_name']}: points_for={team['points_for']}, expected {expected_points} from match games")
                consistency_check = False
            else:
                print_info(f"Team {team['team_name']}: points_for={team['points_for']} ✓")
        
        if not consistency_check:
            return False
        
        print_success("All teams' points_for are internally consistent with match games (defensive recompute working)")
        
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test 2: GET /api/players - verify filtering of non-speelgerechtigd players
def test_players_filtering():
    print_test("GET /api/players - verify filtering of non-speelgerechtigd players")
    
    try:
        resp = requests.get(f"{BASE_URL}/players")
        if resp.status_code != 200:
            print_error(f"Failed to get players: {resp.status_code}")
            return False
        
        players = resp.json()
        
        if not isinstance(players, list):
            print_error(f"Response is not an array, got: {type(players)}")
            return False
        
        print_success(f"Returns array of {len(players)} players")
        
        # No player should have is_placeholder=true
        placeholders = [p for p in players if p.get('is_placeholder') == True]
        if len(placeholders) > 0:
            print_error(f"Found {len(placeholders)} placeholders in public players list (should be 0)")
            for ph in placeholders:
                print_info(f"  - {ph.get('name')} ({ph.get('team_name')})")
            return False
        
        print_success("No placeholders in public players list (is_placeholder=true filtered out)")
        
        # Check for players with future can_play_from and 0 games
        now = datetime.now()
        future_players_with_zero_games = []
        
        for player in players:
            can_play_from = player.get('can_play_from')
            played = player.get('played', 0)
            
            if can_play_from:
                try:
                    can_play_date = datetime.fromisoformat(can_play_from.replace('Z', '+00:00'))
                    if can_play_date > now and played == 0:
                        future_players_with_zero_games.append(player)
                except:
                    pass
        
        if len(future_players_with_zero_games) > 0:
            print_error(f"Found {len(future_players_with_zero_games)} players with future can_play_from and 0 games (should be filtered)")
            for p in future_players_with_zero_games:
                print_info(f"  - {p.get('name')} (can_play_from: {p.get('can_play_from')}, played: {p.get('played')})")
            return False
        
        print_success("No players with future can_play_from and 0 games (correctly filtered)")
        
        # Verify that players with future can_play_from but with games ARE included
        # (This would require creating test data, so we'll just check the logic is sound)
        print_info("Note: Players with future can_play_from but with legitimate games would still appear")
        
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test 3: Simulate full end-to-end scoring test
def test_end_to_end_scoring():
    print_test("Simulate full end-to-end scoring test")
    
    try:
        # Find a scheduled match
        resp = requests.get(f"{BASE_URL}/matches")
        if resp.status_code != 200:
            print_error(f"Failed to get matches: {resp.status_code}")
            return False
        
        matches = resp.json()
        scheduled = [m for m in matches if m.get('status') == 'scheduled']
        
        if len(scheduled) == 0:
            print_error("No scheduled matches found")
            return False
        
        match = scheduled[0]
        match_id = match['id']
        home_team_name = match['home_team_name']
        away_team_name = match['away_team_name']
        home_team_id = match['home_team_id']
        away_team_id = match['away_team_id']
        
        print_info(f"Using match: {home_team_name} vs {away_team_name}")
        
        # Get actual player IDs
        match_detail_resp = requests.get(f"{BASE_URL}/matches/{match_id}")
        if match_detail_resp.status_code != 200:
            print_error(f"Failed to get match details: {match_detail_resp.status_code}")
            return False
        
        match_detail = match_detail_resp.json()
        home_players_list = match_detail.get('home_players', [])
        away_players_list = match_detail.get('away_players', [])
        
        # Filter out placeholders
        home_players = [p for p in home_players_list if not p.get('is_placeholder')]
        away_players = [p for p in away_players_list if not p.get('is_placeholder')]
        
        if len(home_players) < 4 or len(away_players) < 4:
            print_error(f"Not enough players: home={len(home_players)}, away={len(away_players)}")
            return False
        
        print_info(f"Home players: {len(home_players)}, Away players: {len(away_players)}")
        
        # Find team codes
        home_code = None
        away_code = None
        for team_name, code in TEAM_CODES.items():
            if team_name in home_team_name or home_team_name in team_name:
                home_code = code
            if team_name in away_team_name or away_team_name in team_name:
                away_code = code
        
        if not home_code or not away_code:
            print_error(f"Could not find team codes for {home_team_name} and {away_team_name}")
            return False
        
        print_info(f"Home code: {home_code}, Away code: {away_code}")
        
        # Get standings before match
        standings_before = requests.get(f"{BASE_URL}/standings").json()
        home_before = [s for s in standings_before if s['team_id'] == home_team_id][0]
        away_before = [s for s in standings_before if s['team_id'] == away_team_id][0]
        
        print_info(f"Before - Home: points_for={home_before['points_for']}, frames_won={home_before['frames_won']}, comp_points={home_before['comp_points']}")
        print_info(f"Before - Away: frames_lost={away_before['frames_lost']}")
        
        # Create 10 games all 2-0 home wins
        games = []
        
        # 4 enkel
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
                "home_players": [
                    home_players[i % len(home_players)]['id'],
                    home_players[(i+1) % len(home_players)]['id']
                ],
                "away_players": [
                    away_players[i % len(away_players)]['id'],
                    away_players[(i+1) % len(away_players)]['id']
                ],
                "home_frames": 2,
                "away_frames": 0
            })
        
        # 4 enkel
        for i in range(4):
            games.append({
                "type": "enkel",
                "home_players": [home_players[(i+2) % len(home_players)]['id']],
                "away_players": [away_players[(i+2) % len(away_players)]['id']],
                "home_frames": 2,
                "away_frames": 0
            })
        
        print_info(f"Created {len(games)} games (all 2-0 home wins)")
        
        # Submit as home team
        submit_data = {
            "team_code": home_code,
            "games": games,
            "remarks": "End-to-end test"
        }
        
        submit_resp = requests.post(f"{BASE_URL}/matches/{match_id}/submit", json=submit_data)
        if submit_resp.status_code != 200:
            print_error(f"Failed to submit: {submit_resp.status_code} - {submit_resp.text}")
            return False
        
        print_success("Home team submitted match")
        
        # Confirm as away team
        confirm_data = {
            "team_code": away_code,
            "agree": True
        }
        
        confirm_resp = requests.post(f"{BASE_URL}/matches/{match_id}/confirm", json=confirm_data)
        if confirm_resp.status_code != 200:
            print_error(f"Failed to confirm: {confirm_resp.status_code} - {confirm_resp.text}")
            return False
        
        print_success("Away team confirmed match")
        
        # Verify match details
        verify_resp = requests.get(f"{BASE_URL}/matches/{match_id}")
        if verify_resp.status_code != 200:
            print_error(f"Failed to verify match: {verify_resp.status_code}")
            return False
        
        verified_match = verify_resp.json()
        
        # Verify points_home=30, points_away=0 (comp punten)
        if verified_match['points_home'] != 30:
            print_error(f"points_home={verified_match['points_home']}, expected 30")
            return False
        
        if verified_match['points_away'] != 0:
            print_error(f"points_away={verified_match['points_away']}, expected 0")
            return False
        
        print_success(f"Match points correct: {verified_match['points_home']}-{verified_match['points_away']} (comp punten)")
        
        # Verify sum of home_frames = 20, sum of away_frames = 0 (frames = sets)
        total_home_frames = sum(g['home_frames'] for g in verified_match['games'])
        total_away_frames = sum(g['away_frames'] for g in verified_match['games'])
        
        if total_home_frames != 20:
            print_error(f"Sum of home_frames={total_home_frames}, expected 20")
            return False
        
        if total_away_frames != 0:
            print_error(f"Sum of away_frames={total_away_frames}, expected 0")
            return False
        
        print_success(f"Frames correct: {total_home_frames}-{total_away_frames} (frames = sets)")
        
        # Verify standings updated correctly
        standings_after = requests.get(f"{BASE_URL}/standings").json()
        home_after = [s for s in standings_after if s['team_id'] == home_team_id][0]
        away_after = [s for s in standings_after if s['team_id'] == away_team_id][0]
        
        # Home team's points_for should increase by 30
        expected_home_points_for = home_before['points_for'] + 30
        if home_after['points_for'] != expected_home_points_for:
            print_error(f"Home points_for={home_after['points_for']}, expected {expected_home_points_for}")
            return False
        
        print_success(f"Home team's points_for increased by 30: {home_before['points_for']} → {home_after['points_for']}")
        
        # Home team's frames_won should increase by 20
        expected_home_frames_won = home_before['frames_won'] + 20
        if home_after['frames_won'] != expected_home_frames_won:
            print_error(f"Home frames_won={home_after['frames_won']}, expected {expected_home_frames_won}")
            return False
        
        print_success(f"Home team's frames_won increased by 20: {home_before['frames_won']} → {home_after['frames_won']}")
        
        # Away team's frames_lost should increase by 20
        expected_away_frames_lost = away_before['frames_lost'] + 20
        if away_after['frames_lost'] != expected_away_frames_lost:
            print_error(f"Away frames_lost={away_after['frames_lost']}, expected {expected_away_frames_lost}")
            return False
        
        print_success(f"Away team's frames_lost increased by 20: {away_before['frames_lost']} → {away_after['frames_lost']}")
        
        # Home team's comp_points should increase by 3 (win)
        expected_home_comp_points = home_before['comp_points'] + 3
        if home_after['comp_points'] != expected_home_comp_points:
            print_error(f"Home comp_points={home_after['comp_points']}, expected {expected_home_comp_points}")
            return False
        
        print_success(f"Home team's comp_points increased by 3: {home_before['comp_points']} → {home_after['comp_points']}")
        
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test 4: POST /api/admin/players with can_play_from = future date
def test_future_player_filtering():
    print_test("POST /api/admin/players with can_play_from = future date")
    
    try:
        # Get teams
        resp = requests.get(f"{BASE_URL}/teams")
        if resp.status_code != 200:
            print_error(f"Failed to get teams: {resp.status_code}")
            return False
        
        teams = resp.json()
        team_id = teams[0]['id']
        team_name = teams[0]['name']
        
        print_info(f"Using team: {team_name}")
        
        # Add player with can_play_from = "2030-01-01T00:00:00Z"
        future_date = "2030-01-01T00:00:00Z"
        player_data = {
            "team_id": team_id,
            "name": "Toekomst Test Speler",
            "can_play_from": future_date
        }
        
        headers = {"x-admin-code": ADMIN_CODE}
        create_resp = requests.post(f"{BASE_URL}/admin/players", json=player_data, headers=headers)
        
        if create_resp.status_code != 200:
            print_error(f"Failed to create player: {create_resp.status_code} - {create_resp.text}")
            return False
        
        created_player = create_resp.json()
        player_id = created_player['id']
        
        print_success(f"Created player with future can_play_from: {created_player['name']}")
        
        # GET /api/players → should NOT include this player (future date, 0 games)
        public_resp = requests.get(f"{BASE_URL}/players")
        if public_resp.status_code != 200:
            print_error(f"Failed to get public players: {public_resp.status_code}")
            return False
        
        public_players = public_resp.json()
        found_in_public = any(p['player_id'] == player_id for p in public_players)
        
        if found_in_public:
            print_error("Player with future can_play_from and 0 games found in public /api/players (should be filtered)")
            return False
        
        print_success("Player NOT in public /api/players (correctly filtered)")
        
        # GET /api/admin/players-full → SHOULD include this player
        admin_resp = requests.get(f"{BASE_URL}/admin/players-full", headers=headers)
        if admin_resp.status_code != 200:
            print_error(f"Failed to get admin players: {admin_resp.status_code}")
            return False
        
        admin_players = admin_resp.json()
        found_in_admin = any(p['player_id'] == player_id for p in admin_players)
        
        if not found_in_admin:
            print_error("Player not found in admin /api/admin/players-full (should be included)")
            return False
        
        print_success("Player found in admin /api/admin/players-full (correctly included)")
        
        # DELETE to cleanup
        delete_resp = requests.delete(f"{BASE_URL}/admin/players/{player_id}", headers=headers)
        if delete_resp.status_code != 200:
            print_error(f"Failed to delete player: {delete_resp.status_code}")
            return False
        
        print_success("Test player deleted (cleanup)")
        
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test 5: Regression checks
def test_regression_checks():
    print_test("Regression checks")
    
    all_passed = True
    
    try:
        # GET /api/teams returns 6 teams
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
        
        # POST /api/auth/admin
        resp = requests.post(f"{BASE_URL}/auth/admin", json={"code": "ADMIN-9999"})
        if resp.status_code != 200:
            print_error(f"POST /api/auth/admin failed: {resp.status_code}")
            all_passed = False
        else:
            data = resp.json()
            if data.get('ok') == True and data.get('token') == 'ADMIN-9999':
                print_success("POST /api/auth/admin returns ok:true, token:ADMIN-9999")
            else:
                print_error(f"POST /api/auth/admin unexpected response: {data}")
                all_passed = False
        
        # POST /api/auth/team with TEL-4928
        resp = requests.post(f"{BASE_URL}/auth/team", json={"code": "TEL-4928"})
        if resp.status_code != 200:
            print_error(f"POST /api/auth/team failed: {resp.status_code}")
            all_passed = False
        else:
            data = resp.json()
            required_fields = ['team', 'players', 'matches', 'change_requests', 
                             'date_change_requests', 'incoming_date_requests']
            missing = [f for f in required_fields if f not in data]
            if missing:
                print_error(f"POST /api/auth/team missing fields: {missing}")
                all_passed = False
            else:
                print_success(f"POST /api/auth/team returns all required fields")
        
        # GET /api/admin/dashboard
        headers = {"x-admin-code": ADMIN_CODE}
        resp = requests.get(f"{BASE_URL}/admin/dashboard", headers=headers)
        if resp.status_code != 200:
            print_error(f"GET /api/admin/dashboard failed: {resp.status_code}")
            all_passed = False
        else:
            data = resp.json()
            required_fields = ['submitted', 'disputed', 'pending_change_requests', 
                             'pending_date_requests', 'recent_logs']
            missing = [f for f in required_fields if f not in data]
            if missing:
                print_error(f"GET /api/admin/dashboard missing fields: {missing}")
                all_passed = False
            else:
                print_success(f"GET /api/admin/dashboard returns all required fields")
        
        # POST /api/admin/setup-2026-2027 (idempotent)
        resp = requests.post(f"{BASE_URL}/admin/setup-2026-2027", headers=headers)
        if resp.status_code != 200:
            print_error(f"POST /api/admin/setup-2026-2027 failed: {resp.status_code}")
            all_passed = False
        else:
            data = resp.json()
            if data.get('ok') == True:
                print_success(f"POST /api/admin/setup-2026-2027 returns ok:true (idempotent)")
            else:
                print_error(f"POST /api/admin/setup-2026-2027 unexpected response: {data}")
                all_passed = False
        
        # GET /api/admin/audit-logs
        resp = requests.get(f"{BASE_URL}/admin/audit-logs", headers=headers)
        if resp.status_code != 200:
            print_error(f"GET /api/admin/audit-logs failed: {resp.status_code}")
            all_passed = False
        else:
            logs = resp.json()
            if isinstance(logs, list):
                print_success(f"GET /api/admin/audit-logs returns array of {len(logs)} log entries")
            else:
                print_error(f"GET /api/admin/audit-logs did not return array")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*80)
    print("POOL COMPETITIE BACKEND API TESTS - SESSION 2 BUG FIXES")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Code: {ADMIN_CODE}")
    print("="*80)
    
    results = {}
    
    # Run all tests in order
    results['1_standings_defensive_recompute'] = test_standings_defensive_recompute()
    results['2_players_filtering'] = test_players_filtering()
    results['3_end_to_end_scoring'] = test_end_to_end_scoring()
    results['4_future_player_filtering'] = test_future_player_filtering()
    results['5_regression_checks'] = test_regression_checks()
    
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
