#!/usr/bin/env python3
"""
Session-5 Backend Testing for Pool Competitie webapp
Tests full admin player management:
1. GET /api/admin/players-full - all players with match_count
2. POST /api/admin/players - create with validations
3. GET /api/admin/players/:id - single player fetch
4. PATCH/PUT /api/admin/players/:id - update with validations
5. Deactivated player validation in match submit
6. DELETE /api/admin/players/:id - with match usage check
7. Auth checks (401 without header)
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

def test_1_get_players_full():
    """Test 1: GET /api/admin/players-full returns all required fields"""
    print_test("Test 1: GET /api/admin/players-full - all players with match_count")
    
    try:
        # Test with admin header
        resp = requests.get(
            f"{BASE_URL}/admin/players-full",
            headers={"x-admin-code": ADMIN_CODE}
        )
        
        print(f"Response status: {resp.status_code}")
        
        if resp.status_code != 200:
            print_result(False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return False
        
        players = resp.json()
        print(f"Total players returned: {len(players)}")
        
        if len(players) == 0:
            print_result(False, "No players returned")
            return False
        
        # Check required fields
        required_fields = ['player_id', 'name', 'team_id', 'team_name', 'active', 
                          'locked', 'is_placeholder', 'match_count', 'can_play_from', 'joined_at']
        
        first_player = players[0]
        missing_fields = [f for f in required_fields if f not in first_player]
        
        if missing_fields:
            print_result(False, f"Missing fields: {missing_fields}. Player: {first_player}")
            return False
        
        # Check match_count is a number
        if not isinstance(first_player['match_count'], int):
            print_result(False, f"match_count should be int, got {type(first_player['match_count'])}")
            return False
        
        # Count placeholders
        placeholders = [p for p in players if p.get('is_placeholder')]
        print(f"Found {len(placeholders)} placeholders")
        
        print_result(True, f"Returns {len(players)} players with all required fields including match_count")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_2_post_players_validations():
    """Test 2: POST /api/admin/players with various validations"""
    print_test("Test 2: POST /api/admin/players - create with validations")
    
    all_passed = True
    created_players = []
    
    try:
        # Get a team ID
        resp = requests.get(f"{BASE_URL}/teams")
        teams = resp.json()
        if not teams:
            print_result(False, "No teams found")
            return False
        
        test_team_id = teams[0]['id']
        print(f"Using team: {teams[0]['name']} ({test_team_id})")
        
        # Test 2a: Create valid player
        print("\n2a: Create valid player 'Test Speler Zeta'")
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Test Speler Zeta",
                "team_id": test_team_id
            }
        )
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        if resp.status_code == 200:
            player = resp.json()
            created_players.append(player['id'])
            
            # Verify defaults
            if player.get('active') != True:
                print_result(False, f"Expected active=true, got {player.get('active')}")
                all_passed = False
            elif player.get('locked') != True:
                print_result(False, f"Expected locked=true, got {player.get('locked')}")
                all_passed = False
            else:
                # Check can_play_from is joined_at + 2 months
                # Simple check: can_play_from should be roughly 2 months after joined_at
                joined_str = player['joined_at'].replace('Z', '').replace('+00:00', '')
                can_play_str = player['can_play_from'].replace('Z', '').replace('+00:00', '')
                
                joined = datetime.fromisoformat(joined_str)
                can_play = datetime.fromisoformat(can_play_str)
                
                # Calculate expected (joined + 2 months) - handle month overflow
                expected_month = joined.month + 2
                expected_year = joined.year
                if expected_month > 12:
                    expected_month -= 12
                    expected_year += 1
                
                # Allow some tolerance for month-end edge cases
                diff_months = (can_play.year - joined.year) * 12 + (can_play.month - joined.month)
                if diff_months >= 2 and diff_months <= 3:
                    print_result(True, f"Created player with id={player['id']}, active=true, locked=true, can_play_from=joined+2months")
                else:
                    print_result(False, f"can_play_from not joined+2months: joined={joined}, can_play={can_play}, diff_months={diff_months}")
                    all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        # Test 2b: Missing name
        print("\n2b: Missing name -> 400")
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={"team_id": test_team_id}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 400:
            print_result(True, "Correctly rejected missing name with 400")
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            all_passed = False
        
        # Test 2c: Unknown team_id
        print("\n2c: Unknown team_id -> 400")
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Test Player Unknown Team",
                "team_id": "bogus-team-id-12345"
            }
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 400:
            print_result(True, "Correctly rejected unknown team_id with 400")
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            all_passed = False
        
        # Test 2d: Duplicate name (case-insensitive)
        print("\n2d: Duplicate name same team -> 409")
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "test speler ZETA",  # Different case
                "team_id": test_team_id
            }
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 409:
            print_result(True, "Correctly rejected duplicate name (case-insensitive) with 409")
        else:
            print_result(False, f"Expected 409, got {resp.status_code}")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False
    finally:
        # Cleanup
        for player_id in created_players:
            requests.delete(
                f"{BASE_URL}/admin/players/{player_id}",
                headers={"x-admin-code": ADMIN_CODE}
            )
            print(f"Cleaned up player: {player_id}")

def test_3_get_single_player():
    """Test 3: GET /api/admin/players/:id"""
    print_test("Test 3: GET /api/admin/players/:id - single player fetch")
    
    all_passed = True
    created_player_id = None
    
    try:
        # Create a test player
        resp = requests.get(f"{BASE_URL}/teams")
        teams = resp.json()
        test_team_id = teams[0]['id']
        
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Test Single Fetch Player",
                "team_id": test_team_id
            }
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to create test player: {resp.status_code}")
            return False
        
        created_player_id = resp.json()['id']
        print(f"Created test player: {created_player_id}")
        
        # Test 3a: Fetch existing player
        print("\n3a: Fetch existing player -> 200 with match_count")
        resp = requests.get(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE}
        )
        
        print(f"Response status: {resp.status_code}")
        
        if resp.status_code == 200:
            player = resp.json()
            if 'match_count' in player:
                print_result(True, f"Returns player with match_count={player['match_count']}")
            else:
                print_result(False, f"Missing match_count field: {player.keys()}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        # Test 3b: Unknown player ID
        print("\n3b: Unknown player ID -> 404")
        resp = requests.get(
            f"{BASE_URL}/admin/players/bogus-player-id-12345",
            headers={"x-admin-code": ADMIN_CODE}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 404:
            print_result(True, "Correctly returned 404 for unknown player")
        else:
            print_result(False, f"Expected 404, got {resp.status_code}")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False
    finally:
        if created_player_id:
            requests.delete(
                f"{BASE_URL}/admin/players/{created_player_id}",
                headers={"x-admin-code": ADMIN_CODE}
            )
            print(f"Cleaned up player: {created_player_id}")

def test_4_patch_put_players():
    """Test 4: PATCH/PUT /api/admin/players/:id with validations"""
    print_test("Test 4: PATCH/PUT /api/admin/players/:id - update with validations")
    
    all_passed = True
    created_player_id = None
    
    try:
        # Create a test player
        resp = requests.get(f"{BASE_URL}/teams")
        teams = resp.json()
        if len(teams) < 2:
            print_result(False, "Need at least 2 teams for testing")
            return False
        
        test_team_id = teams[0]['id']
        other_team_id = teams[1]['id']
        
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Test Speler Zeta",
                "team_id": test_team_id
            }
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to create test player: {resp.status_code}")
            return False
        
        created_player_id = resp.json()['id']
        print(f"Created test player: {created_player_id}")
        
        # Test 4a: Update name with PATCH
        print("\n4a: PATCH name -> 200 with updated player")
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"name": "Test Speler Zeta 2"}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('player', {}).get('name') == "Test Speler Zeta 2":
                print_result(True, "PATCH name successful")
            else:
                print_result(False, f"Unexpected response: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        # Test 4b: Update team_id with PATCH
        print("\n4b: PATCH team_id -> 200 and team changes")
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"team_id": other_team_id}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('player', {}).get('team_id') == other_team_id:
                print_result(True, "PATCH team_id successful")
            else:
                print_result(False, f"Team not changed: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        # Test 4c: Update active to false
        print("\n4c: PATCH active:false -> 200")
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"active": False}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('player', {}).get('active') == False:
                print_result(True, "PATCH active:false successful")
            else:
                print_result(False, f"Active not changed: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        # Test 4d: Update can_play_from
        print("\n4d: PATCH can_play_from -> 200")
        new_date = "2026-12-01T00:00:00.000Z"
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"can_play_from": new_date}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok'):
                print_result(True, "PATCH can_play_from successful")
            else:
                print_result(False, f"Unexpected response: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        # Test 4e: Update locked to false
        print("\n4e: PATCH locked:false -> 200")
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"locked": False}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('player', {}).get('locked') == False:
                print_result(True, "PATCH locked:false successful")
            else:
                print_result(False, f"Locked not changed: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        # Test 4f: Empty body
        print("\n4f: PATCH with empty body -> 400")
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 400:
            print_result(True, "Correctly rejected empty body with 400")
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            all_passed = False
        
        # Test 4g: Bogus team_id
        print("\n4g: PATCH with bogus team_id -> 400")
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"team_id": "bogus-team-id"}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 400:
            print_result(True, "Correctly rejected bogus team_id with 400")
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            all_passed = False
        
        # Test 4h: Empty name
        print("\n4h: PATCH with empty name -> 400")
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"name": ""}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 400:
            print_result(True, "Correctly rejected empty name with 400")
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            all_passed = False
        
        # Test 4i: Verify PUT works the same as PATCH
        print("\n4i: PUT works same as PATCH")
        resp = requests.put(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"name": "Test Speler Zeta PUT"}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('player', {}).get('name') == "Test Speler Zeta PUT":
                print_result(True, "PUT works same as PATCH")
            else:
                print_result(False, f"PUT response unexpected: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False
    finally:
        if created_player_id:
            requests.delete(
                f"{BASE_URL}/admin/players/{created_player_id}",
                headers={"x-admin-code": ADMIN_CODE}
            )
            print(f"Cleaned up player: {created_player_id}")

def test_5_deactivated_player_validation():
    """Test 5: Deactivated player cannot be used in match submit"""
    print_test("Test 5: Deactivated player validation in match submit")
    
    all_passed = True
    created_player_id = None
    
    try:
        # Get a scheduled match
        resp = requests.get(f"{BASE_URL}/matches")
        matches = resp.json()
        scheduled = [m for m in matches if m['status'] == 'scheduled']
        
        if not scheduled:
            print_result(False, "No scheduled matches found")
            return False
        
        match = scheduled[0]
        
        # Get match details
        resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
        match = resp.json()
        
        # Create a test player for home team
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Test Deactivated Player",
                "team_id": match['home_team_id'],
                "can_play_from": "2020-01-01T00:00:00.000Z"  # Past date
            }
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to create test player: {resp.status_code}")
            return False
        
        created_player_id = resp.json()['id']
        print(f"Created test player: {created_player_id}")
        
        # Deactivate the player
        resp = requests.patch(
            f"{BASE_URL}/admin/players/{created_player_id}",
            headers={"x-admin-code": ADMIN_CODE},
            json={"active": False}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to deactivate player: {resp.status_code}")
            return False
        
        print(f"Deactivated player: {created_player_id}")
        
        # Get updated match details
        resp = requests.get(f"{BASE_URL}/matches/{match['id']}")
        match = resp.json()
        
        home_players = [p for p in match['home_players'] if not p.get('is_placeholder') and p['id'] != created_player_id]
        away_players = [p for p in match['away_players'] if not p.get('is_placeholder')]
        
        if not home_players or not away_players:
            print_result(False, "Not enough players for test")
            return False
        
        # Create games with deactivated player in game 1
        games = []
        games.append(create_game_data([created_player_id], [away_players[0]['id']]))
        
        for i in range(1, 10):
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
            print_result(False, f"Could not find team code for {match['home_team_name']}")
            return False
        
        # Test 5a: Try to submit with deactivated player
        print("\n5a: Submit with deactivated player -> 400 with 'gedeactiveerd' error")
        resp = requests.post(
            f"{BASE_URL}/matches/{match['id']}/submit",
            json={"team_code": home_code, "games": games, "remarks": "Test"}
        )
        
        print(f"Response status: {resp.status_code}")
        print(f"Response body: {resp.text}")
        
        if resp.status_code == 400:
            data = resp.json()
            error_text = json.dumps(data).lower()
            if 'gedeactiveerd' in error_text:
                print_result(True, "Correctly rejected deactivated player with 'gedeactiveerd' error")
            else:
                print_result(False, f"Got 400 but no 'gedeactiveerd' in error: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 400, got {resp.status_code}")
            all_passed = False
        
        # Test 5b: Deactivated player not in GET /api/teams/:teamId
        print("\n5b: Deactivated player not in GET /api/teams/:teamId")
        resp = requests.get(f"{BASE_URL}/teams/{match['home_team_id']}")
        
        if resp.status_code == 200:
            team_data = resp.json()
            player_ids = [p['id'] for p in team_data.get('players', [])]
            if created_player_id not in player_ids:
                print_result(True, "Deactivated player correctly hidden from team players list")
            else:
                print_result(False, "Deactivated player still appears in team players list")
                all_passed = False
        else:
            print_result(False, f"Failed to get team: {resp.status_code}")
            all_passed = False
        
        # Test 5c: Deactivated player not in GET /api/players (if 0 games)
        print("\n5c: Deactivated player not in GET /api/players")
        resp = requests.get(f"{BASE_URL}/players")
        
        if resp.status_code == 200:
            players = resp.json()
            player_ids = [p['player_id'] for p in players]
            if created_player_id not in player_ids:
                print_result(True, "Deactivated player correctly hidden from public players list")
            else:
                print_result(False, "Deactivated player still appears in public players list")
                all_passed = False
        else:
            print_result(False, f"Failed to get players: {resp.status_code}")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False
    finally:
        if created_player_id:
            requests.delete(
                f"{BASE_URL}/admin/players/{created_player_id}",
                headers={"x-admin-code": ADMIN_CODE}
            )
            print(f"Cleaned up player: {created_player_id}")

def test_6_delete_players():
    """Test 6: DELETE /api/admin/players/:id with match usage check"""
    print_test("Test 6: DELETE /api/admin/players/:id - with match usage check")
    
    all_passed = True
    fresh_player_id = None
    
    try:
        # Create a fresh test player
        resp = requests.get(f"{BASE_URL}/teams")
        teams = resp.json()
        test_team_id = teams[0]['id']
        
        resp = requests.post(
            f"{BASE_URL}/admin/players",
            headers={"x-admin-code": ADMIN_CODE},
            json={
                "name": "Test Fresh Delete Player",
                "team_id": test_team_id
            }
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to create test player: {resp.status_code}")
            return False
        
        fresh_player_id = resp.json()['id']
        print(f"Created fresh test player: {fresh_player_id}")
        
        # Test 6a: Delete fresh player (no matches) -> 200
        print("\n6a: DELETE fresh player (no matches) -> 200")
        resp = requests.delete(
            f"{BASE_URL}/admin/players/{fresh_player_id}",
            headers={"x-admin-code": ADMIN_CODE}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok'):
                print_result(True, "Fresh player deleted successfully")
                fresh_player_id = None  # Don't try to delete again
            else:
                print_result(False, f"Unexpected response: {data}")
                all_passed = False
        else:
            print_result(False, f"Expected 200, got {resp.status_code}: {resp.text}")
            all_passed = False
        
        # Test 6b: Find player with match history
        print("\n6b: DELETE player with match history -> 409 with can_deactivate:true")
        resp = requests.get(
            f"{BASE_URL}/admin/players-full",
            headers={"x-admin-code": ADMIN_CODE}
        )
        
        if resp.status_code != 200:
            print_result(False, f"Failed to get players: {resp.status_code}")
            return False
        
        players = resp.json()
        player_with_matches = None
        for p in players:
            if p.get('match_count', 0) > 0 and not p.get('is_placeholder'):
                player_with_matches = p
                break
        
        if not player_with_matches:
            print("No player with match history found, skipping this test")
            print_result(True, "Skipped (no player with match history)")
        else:
            print(f"Found player with {player_with_matches['match_count']} matches: {player_with_matches['name']}")
            
            resp = requests.delete(
                f"{BASE_URL}/admin/players/{player_with_matches['player_id']}",
                headers={"x-admin-code": ADMIN_CODE}
            )
            
            print(f"Response status: {resp.status_code}")
            print(f"Response body: {resp.text}")
            
            if resp.status_code == 409:
                data = resp.json()
                if data.get('can_deactivate') == True:
                    print_result(True, f"Correctly returned 409 with can_deactivate:true for player with {player_with_matches['match_count']} matches")
                else:
                    print_result(False, f"Got 409 but can_deactivate not true: {data}")
                    all_passed = False
            else:
                print_result(False, f"Expected 409, got {resp.status_code}")
                all_passed = False
        
        # Test 6c: Unknown player ID
        print("\n6c: DELETE unknown player ID -> 404")
        resp = requests.delete(
            f"{BASE_URL}/admin/players/bogus-player-id-12345",
            headers={"x-admin-code": ADMIN_CODE}
        )
        
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 404:
            print_result(True, "Correctly returned 404 for unknown player")
        else:
            print_result(False, f"Expected 404, got {resp.status_code}")
            all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False
    finally:
        if fresh_player_id:
            # Try to clean up if not already deleted
            requests.delete(
                f"{BASE_URL}/admin/players/{fresh_player_id}",
                headers={"x-admin-code": ADMIN_CODE}
            )
            print(f"Cleaned up player: {fresh_player_id}")

def test_7_auth_checks():
    """Test 7: All admin endpoints require x-admin-code header"""
    print_test("Test 7: Auth checks - all admin endpoints require header")
    
    all_passed = True
    
    try:
        # Test various admin endpoints without header
        endpoints = [
            ("GET", "/admin/players-full"),
            ("GET", "/admin/players/some-id"),
            ("POST", "/admin/players"),
            ("PATCH", "/admin/players/some-id"),
            ("DELETE", "/admin/players/some-id")
        ]
        
        for method, endpoint in endpoints:
            print(f"\n{method} {endpoint} without header -> 401")
            
            if method == "GET":
                resp = requests.get(f"{BASE_URL}{endpoint}")
            elif method == "POST":
                resp = requests.post(f"{BASE_URL}{endpoint}", json={})
            elif method == "PATCH":
                resp = requests.patch(f"{BASE_URL}{endpoint}", json={})
            elif method == "DELETE":
                resp = requests.delete(f"{BASE_URL}{endpoint}")
            
            print(f"Response status: {resp.status_code}")
            
            if resp.status_code == 401:
                print_result(True, f"{method} {endpoint} correctly returns 401")
            else:
                print_result(False, f"Expected 401, got {resp.status_code}")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print("SESSION-5 BACKEND TESTING")
    print("Pool Competitie Webapp - Full Admin Player Management")
    print("="*80)
    
    results = {}
    
    # Run all tests
    results['Test 1: GET /api/admin/players-full'] = test_1_get_players_full()
    results['Test 2: POST /api/admin/players validations'] = test_2_post_players_validations()
    results['Test 3: GET /api/admin/players/:id'] = test_3_get_single_player()
    results['Test 4: PATCH/PUT /api/admin/players/:id'] = test_4_patch_put_players()
    results['Test 5: Deactivated player validation'] = test_5_deactivated_player_validation()
    results['Test 6: DELETE /api/admin/players/:id'] = test_6_delete_players()
    results['Test 7: Auth checks'] = test_7_auth_checks()
    
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
