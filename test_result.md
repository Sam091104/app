#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Pool competitie webapp. Recent user reported 6 bugs/requests:
  1. Remove Scorebord page from nav
  2. Player selection lists must show alphabetical order (by first name)
  3. Admin must be able to edit already-confirmed match forms
  4. Klassement "frames" column didn't match wedstrijdblad → clarified: klassement Fr+/- = sets won across all games; wedstrijd detail now shows BOTH Points (2-0→3, 2-1→2) AND Frames (sets)
  5. Admin players list must be sortable by name / team / speelgerechtigd date
  6. Placeholder "Speler te kort" was visible in Ploegen dialog but missing from admin players list → could not be deleted

backend:
  - task: "GET /api/admin/players-full - new endpoint returning all players incl. placeholders for admin view"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "New endpoint added at /api/admin/players-full that returns all players including is_placeholder=true entries. Requires x-admin-code header. Returns array with player_id, name, team_id, team_name, can_play_from, joined_at, is_placeholder, active."
      - working: true
        agent: "testing"
        comment: "Minor: Endpoint works correctly. Returns 200 with admin header, 401 without. Returns 70 players with all required fields. Found exactly 6 placeholders (one per team) with is_placeholder=true. Public /api/players correctly excludes placeholders. Data issue: One placeholder for team 'Canada' has name 'sammeke' instead of 'Speler te kort' (player_id: e1b8cad7-b35d-4d56-8926-fd37e1285f28). Core functionality working."

  - task: "POST /api/admin/matches/:id/approve - allows admin to edit confirmed matches"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Existing endpoint. Verify it accepts new 'games' body for a match already in status 'confirmed' or 'admin_approved', recalculates points_home/points_away using scoring rules and sets status to 'admin_approved'. Should log to audit_logs with old + new values."
      - working: true
        agent: "testing"
        comment: "Endpoint works correctly. Successfully edited a confirmed match (Arena vs De Sportwereld). Modified games array with different frame results. Points correctly recalculated (27-3 for modified games). Match status updated to 'admin_approved'. Audit log entry created with action='match_admin_approved'. All functionality verified."

  - task: "POST /api/admin/players - custom can_play_from date"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Endpoint works correctly. Created test player with custom can_play_from date (2027-01-15). Date stored exactly as provided, not joined_at + 2 months. Verified via /api/admin/players-full. Test player successfully deleted (cleanup)."

  - task: "Scoring correctness - match points and frames calculation"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Scoring logic verified correct. Test 1: 10 games all 2-0 home wins = 30-0 points, 20-0 frames. Test 2: 10 games all 2-1 home wins = 20-10 points, 20-10 frames. Standings correctly updated with frames_won increments. All calculations accurate."

  - task: "Existing endpoints regression check"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "All existing endpoints working. GET /api/teams returns 6 teams. GET /api/standings returns 6 entries. GET /api/matches returns 38 matches. POST /api/auth/team with TEL-4928 returns team+players+matches. POST /api/auth/admin returns ok:true. GET /api/admin/dashboard includes pending_date_requests field. Date change request flow (create + approve) works correctly and updates match date."

  - task: "Session-2 Fix: GET /api/standings defensive recompute from games"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Modified computeStandings to defensively recompute points_for and points_against from match games instead of using stored points_home/points_away. Added points_for, points_against, saldo columns to standings. Framebalans = frames_won - frames_lost, saldo = points_for - points_against."
      - working: true
        agent: "testing"
        comment: "Defensive recompute working correctly. All 6 teams returned with required fields (team_name, played, won, drawn, lost, points_for, points_against, saldo, frames_won, frames_lost, framebalans, comp_points). Framebalans and saldo calculations verified correct. Points_for internally consistent with match games - tested 4 confirmed matches, all teams' points_for match sum of game points."

  - task: "Session-2 Fix: GET /api/players filtering non-speelgerechtigd players"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Modified computePlayerStats to: 1) Skip stats for matches before player.can_play_from date, 2) Filter out players with is_placeholder=true, 3) Filter out players with future can_play_from AND played=0 games. Players with future can_play_from but with legitimate games (played before can_play_from) still appear with only those games counted."
      - working: true
        agent: "testing"
        comment: "Player filtering working correctly. Returns 62 players. No placeholders in public /api/players list (is_placeholder=true filtered out). No players with future can_play_from and 0 games (correctly filtered). Players with future can_play_from but with legitimate games would still appear as expected."


  - agent: "user"
    message: |
      NEW REQUEST (session 3): Add 2 rules to match submit and admin edit forms without breaking existing scoring:
      1. Speelgerechtigd check based on MATCH DATE (not today) - block in dropdowns AND on save.
      2. Player only ONCE on entire wedstrijdblad - exclude from other pickers when selected; re-appear when unselected.
      Only admin has clear override (default OFF). Backend validation must prevent bypass.

  - agent: "main"
    message: |
      Session-3 fixes applied. Key changes:
      - PlayerPicker now accepts `usedIds` + `allowReuse` props. Filters out already-used players (unless allowReuse) and enforces can_play_from <= matchDate.
      - MatchFormDialog (team submit) computes usedIds per side per game, passes to each PlayerPicker; team submits are ALWAYS strict (no override).
      - AdminMatchEditDialog has a checkbox "Admin-override: dezelfde speler mag meermaals ingezet worden" (default off), sends allow_reuse in body.
      - Backend has new `validateMatchGames(db, matchDate, games, homeTeamId, awayTeamId, allowReuse)` helper.
      - POST /api/matches/:id/submit → always validates strict (returns 400 with { error: 'Validatiefouten', errors: [] } on failure).
      - POST /api/admin/matches/:id/approve → accepts `allow_reuse` flag; when true, dubbele-inzet errors are ignored but speelgerechtigd/team/placeholder errors are STILL blockers.
      
      Please test:
      1. Team submit with duplicate player across two games → should return 400 with clear errors like "partij 2: <naam> is al ingezet in partij 1".
      2. Team submit with player who has can_play_from > match.date → 400 with "nog niet speelgerechtigd" error.
      3. Admin approve with allow_reuse=true and duplicate players → 200 ok.

  - agent: "user"
    message: |
      SESSION-4: Split ploegpunten (team points) from persoonlijke punten (player points).
      - Ploegpunten (team standings): fixed rule 2-0 → 2/0, 2-1 → 2/1 (max 20 per match, cannot be changed in settings)
      - Persoonlijke punten (player stats): configurable via Admin settings (defaults 2-0 → 3/0, 2-1 → 2/1)
      - Frames blijven altijd werkelijke gewonnen/verloren sets.

  - agent: "main"
    message: |
      Implemented session-4 split. Changes:
      - Added new backend function teamPointsForFrames(hf, af) with FIXED rules: 2-0→2/0, 2-1→2/1
      - computeMatchTotals(games) now uses teamPointsForFrames (was: pointsForFrames with rules)
      - computeStandings now uses teamPointsForFrames for points_for / points_against
      - computePlayerStats still uses pointsForFrames (configurable rules) — unchanged, player rankings unaffected
      - Match submit and admin approve store team points as points_home/points_away
      - Match detail UI: label changed to "Ploegpunten (2-0→2, 2-1→2/1)"
      - Klassement description updated
      - Live tussenstand in match forms now shows team points total
      
      Please test:
      1. GET /api/standings — points_for/points_against should now use team scoring. For 10 games all 2-0 home wins: points_home=20 (not 30).
      2. Submit a fresh match with 5×2-0 home + 5×2-1 home wins: team points = 5×2 + 5×2 = 20 for home, 0 + 5×1 = 5 for away.
      3. Player stats via GET /api/players still use configurable scoring (should be 3 for 2-0 by default).
      4. Verify admin settings scoring.frames_2_0 still ONLY affects player stats, NOT team standings.

      4. Admin approve with allow_reuse=true but non-speelgerechtigd player → still 400 (override does NOT bypass speelgerechtigd).
      5. Regression: normal valid submit still works and produces confirmed match with correct standings.
      6. Regression: existing GET /api/standings and /api/players still work.
  - agent: "testing"
    message: |
      Session-3 backend validation testing completed. All 7 tests PASSED:
      ✅ Test 1: Team submit with duplicate player correctly rejected with validation errors
      ✅ Test 2: Team submit with non-speelgerechtigd player correctly rejected
      ✅ Test 3: Valid team submit with unique players succeeded, match confirmed, standings updated
      ✅ Test 4: Admin override with allow_reuse=true bypasses duplicate player check
      ✅ Test 5: Admin override with allow_reuse=true CANNOT bypass speelgerechtigd check (correctly rejected)
      ✅ Test 6: Admin approve without allow_reuse correctly rejects duplicate players
      ✅ Test 7: All regression checks passed (standings, players, auth endpoints)
      
      Backend validation rules working correctly:
      - Speelgerechtigd check based on match date (not today) is enforced
      - Player can only appear once across all 10 games on one team-side
      - Admin override via allow_reuse bypasses ONLY dubbele-inzet rule, NOT speelgerechtigd
      
      No major issues found. Backend is fully functional.

  - task: "Session-2 Fix: End-to-end scoring verification"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Verified scoring logic: 2-0 → 3-0 points, 2-1 → 2-1 points. Match submission and confirmation flow. Standings update with correct points_for, frames_won, comp_points."
      - working: true
        agent: "testing"
        comment: "End-to-end scoring test passed. Match De Sportwereld vs Den Telstar: submitted 10 games all 2-0 home wins, confirmed by away team. Match points correct: 30-0 (comp punten). Frames correct: 20-0 (sets). Standings updated correctly: home points_for +30 (3→33), frames_won +20 (3→23), comp_points +3 (0→3); away frames_lost +20 (4→24)."

  - task: "Session-2 Fix: POST /api/admin/players with future can_play_from"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/admin/players accepts custom can_play_from date. If provided, uses that date exactly; otherwise defaults to joined_at + 2 months."
      - working: true
        agent: "testing"
        comment: "Future player filtering working correctly. Created test player 'Toekomst Test Speler' with can_play_from=2030-01-01. Player NOT in public /api/players (correctly filtered due to future date + 0 games). Player found in admin /api/admin/players-full (correctly included). Test player deleted (cleanup)."

  - task: "Session-2 Fix: Regression checks"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Verified all existing endpoints still working after session-2 fixes."
      - working: true
        agent: "testing"
        comment: "All regression checks passed. GET /api/teams returns 6 teams. POST /api/auth/admin returns ok:true, token:ADMIN-9999. POST /api/auth/team returns all required fields (team, players, matches, change_requests, date_change_requests, incoming_date_requests). GET /api/admin/dashboard returns all required fields (submitted, disputed, pending_change_requests, pending_date_requests, recent_logs). POST /api/admin/setup-2026-2027 returns ok:true (idempotent). GET /api/admin/audit-logs returns array of 76 log entries."

  - task: "Session-3: POST /api/matches/:id/submit - validation for duplicate player usage"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Modified to call validateMatchGames with allowReuse=false. Returns 400 with {error: 'Validatiefouten', errors: [...]} if player appears multiple times across all 10 games."
      - working: true
        agent: "testing"
        comment: "Validation working correctly. Team submit with duplicate player across games returns 400 with clear error messages like 'partij 2: Wim De Coster is al ingezet in partij 1'. Each player can only appear once across all 10 games on one team-side."

  - task: "Session-3: POST /api/matches/:id/submit - validation for speelgerechtigd based on match date"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Modified validateMatchGames to check player.can_play_from <= match.date (not today). Returns 400 with error 'nog niet speelgerechtigd' if player's can_play_from is after match date."
      - working: true
        agent: "testing"
        comment: "Speelgerechtigd validation working correctly. Team submit with player having future can_play_from date returns 400 with error 'partij 1: Toekomst Test Speler Session3 is nog niet speelgerechtigd (vanaf 1/1/2099)'. Validation based on match date, not current date."

  - task: "Session-3: POST /api/admin/matches/:id/approve - allow_reuse flag for admin override"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Modified to accept allow_reuse flag in request body. When true, filters out dubbele-inzet errors but still enforces speelgerechtigd, team, and placeholder validations. Hard errors always block, soft errors (dubbele-inzet) only block if allowReuse is false."
      - working: true
        agent: "testing"
        comment: "Admin override working correctly. With allow_reuse=true, duplicate players are allowed (returns 200). With allow_reuse=false or omitted, duplicate players are rejected (returns 400). Speelgerechtigd validation CANNOT be bypassed even with allow_reuse=true (correctly returns 400 for non-speelgerechtigd players)."

  - task: "Session-3: Valid match submission end-to-end flow"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Verified that valid match submission with unique players still works correctly with new validation rules."
      - working: true
        agent: "testing"
        comment: "End-to-end flow working correctly. Valid team submit with 10 unique players (8 enkel + 2 dubbel = 12 unique players) succeeded. Match confirmed by away team. Standings updated correctly. All validation rules enforced without breaking valid submissions."

  - task: "Session-3: Regression checks for existing endpoints"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Verified all existing endpoints still working after session-3 validation changes."
      - working: true
        agent: "testing"
        comment: "All regression checks passed. GET /api/standings returns 6 teams with all required fields. GET /api/players returns 62 players without placeholders. POST /api/auth/team returns team session. POST /api/auth/admin returns admin token."


  - agent: "user"
    message: |
      NEW BUG REPORT (session 2):
      1. Wedstrijdblad totalen (30-0 max) verward: gebruiker denkt max 20; feitelijk zijn dit COMP PUNTEN (2-0→3, 2-1→2/1) niet frames.
      2. Klassement: gebruiker verwachtte "Arena +57 -3" wat de PUNTEN VOOR/TEGEN som is (57 vs 3), maar klassement toonde alleen Fr+/Fr- (39/3). => Fix: kolommen Pt+/Pt-/Saldo TOEGEVOEGD naast Fr+/Fr-.
      3. Admin match edit dialog toont geen spelers geselecteerd voor confirmed matches wanneer die spelers placeholder of niet-speelgerechtigd zijn. => Fix: PlayerPicker toont nu ook already-selected spelers ongeacht filter.
      4. Bij spelersklassement stonden 2 spelers met punten die niet speelgerechtigd zijn. => Fix: computePlayerStats slaat stats over voor matches vóór player.can_play_from; en filtert niet-speelgerechtigde spelers met 0 games uit lijst.
      5. computeStandings herrekent nu points_for uit games (defensief) i.p.v. gestorde m.points_home.

  - agent: "main"
    message: |
      Applied 5 targeted fixes for session-2 bug report. Please re-run backend tests:
      1. GET /api/standings — verify Arena has points_for=57, points_against=3, frames_won=39, frames_lost=3, comp_points=6, played=2 (given existing test data)
      2. Simulate: submit match where all 10 games are 2-0 home wins → verify points_home=30 (comp punten) and sum(home_frames)=20 (frames)
      3. PlayerPicker fix is frontend-only, no backend impact
      4. GET /api/players — verify that no player with can_play_from > NOW appears in list (unless they played matches before their can_play_from, in which case stats are only from those matches — the future can_play_from should not add points from matches that happened after but were mis-recorded)
      5. Regression: /api/admin/players-full still returns all incl. placeholders
  - agent: "testing"
    message: |
      Session-2 backend testing completed. All 5 tests PASSED:
      ✅ GET /api/standings - defensive recompute from games working correctly (all 6 teams, correct calculations, points_for internally consistent)
      ✅ GET /api/players - filtering working (no placeholders, no future can_play_from with 0 games)
      ✅ End-to-end scoring - match submitted/confirmed, points 30-0, frames 20-0, standings updated correctly
      ✅ Future player filtering - correctly filtered from public API, visible in admin API
      ✅ All regression checks passed (teams, auth, dashboard, setup-2026-2027, audit-logs)
      
      Backend is fully functional with no major issues found.

frontend:
  - task: "Remove Scorebord page/nav"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Removed from PAGES array and from render switch. ScorebordPage component still exists but is unreachable."

  - task: "PlayerPicker alphabetical sort by name"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PlayerPicker component now sorts availablePlayers via localeCompare('nl', {sensitivity:'base'}) alphabetically."

  - task: "AdminMatches sortable player list + edit approved matches"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "AdminMatches now shows two sections: 'Actie vereist' (pending/disputed) and 'Gespeelde wedstrijden' (confirmed/admin_approved) with 'Bewerk uitslag' button that opens AdminMatchEditDialog. AdminMatchEditDialog reuses match form to edit games and calls POST /admin/matches/:id/approve. AdminTeams player list has sortable columns via toggleSort for name/team/can_play, and includes placeholders (fetched via /admin/players-full)."

  - task: "Match detail dialog shows both Points and Frames totals"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "MatchDetailDialog now shows a 2-column summary at top: emerald box with match.points_home - match.points_away (competition points), and blue box with sum of home_frames and away_frames across all games (Frames = sets won). This clarifies why klassement Fr+/Fr- differs from Punten."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 4
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Bug fixes applied for 6 user-reported issues in pool competition webapp. Please test the backend endpoints:
      1. GET /api/admin/players-full with header x-admin-code: ADMIN-9999 → should return array of ~70 players including 6 placeholder entries where is_placeholder=true (one per team).
      2. POST /api/admin/matches/:id/approve with body {games: [...]} for a match in status='confirmed' → should update points_home, points_away, set status='admin_approved', return {ok:true, points_home, points_away}. Verify audit_logs has entry with action='match_admin_approved'.
      3. Also verify: POST /api/admin/players with body containing can_play_from ISO date → should store that date exactly (not add 2 months).
      4. Verify the existing scoring logic: for a match with 10 games all resulting in 2-0 home wins, points should be 30-0 and frames should be 20-0. For 10 games all 2-1 home wins, points should be 20-10 and frames should be 20-10.
      Admin code for auth: ADMIN-9999
      Team codes: TEL-4928, CAN-7281, ARE-1954, SPO-3672, SIL-8340, KRO-6135
  - agent: "testing"
    message: |
      Backend testing completed. All priority endpoints working correctly:
      ✅ GET /api/admin/players-full - returns all players including 6 placeholders (minor data issue: one placeholder named 'sammeke' instead of 'Speler te kort')
      ✅ POST /api/admin/matches/:id/approve - successfully edits confirmed matches, recalculates points, updates status, logs to audit
      ✅ POST /api/admin/players - custom can_play_from date stored correctly
      ✅ Scoring correctness - all calculations accurate (30-0 for 10x2-0, 20-10 for 10x2-1)
      ✅ All existing endpoints regression tests passed
      
      Minor issue found: One placeholder for team 'Canada' has name 'sammeke' (player_id: e1b8cad7-b35d-4d56-8926-fd37e1285f28) instead of 'Speler te kort'. This is a data inconsistency but does not affect functionality.

  - task: "Session-4: Team points (ploegpunten) use fixed rules 2-0→2/0, 2-1→2/1"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added teamPointsForFrames() function with fixed rules. computeMatchTotals() now uses teamPointsForFrames for match.points_home/points_away. Max 20 points per match (10 games × 2 points max)."
      - working: true
        agent: "testing"
        comment: "Team points correctly calculated. Test 1: 10×2-0 home wins = 20/0 points (NOT 30/0), 20/0 frames. Test 2: 10×2-1 home wins = 20/10 points. Test 3: 5×2-0 + 5×2-1 = 20/5 points. Standings correctly updated with team points (points_for increased by 20, not 30)."

  - task: "Session-4: Player stats (persoonlijke punten) use configurable rules"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "computePlayerStats() still uses pointsForFrames() with configurable rules from settings. Default: 2-0→3/0, 2-1→2/1. Player enkel_points and dubbel_points reflect configurable scoring."
      - working: true
        agent: "testing"
        comment: "Player stats correctly use configurable rules. Test 4: Player who won 1 game 2-0 got 3 enkel_points (NOT 2). Default scoring verified: frames_2_0=[3,0], frames_2_1=[2,1]."

  - task: "Session-4: Admin settings only affect player stats, not team standings"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/admin/settings updates scoring rules in settings collection. computePlayerStats uses these rules. computeStandings and computeMatchTotals use fixed teamPointsForFrames, NOT affected by settings."
      - working: true
        agent: "testing"
        comment: "Admin settings correctly affect ONLY player stats. Test 5: Changed scoring to frames_2_0=[5,0]. Player got 5 points for 2-0 win. Team standings still got 20 points (fixed team rules), NOT affected by settings change. Settings restored to default after test."

  - task: "Session-4: Regression checks"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "All regression checks passed. GET /api/teams returns 6 teams. GET /api/admin/players-full returns 70 players with 6 placeholders. Validation rules still work: duplicate player submit correctly rejected with 400."

  - agent: "testing"
    message: |
      Session-4 backend testing completed. All 6 tests PASSED:
      ✅ Test 1: Team points max 20 for 10×2-0 (verified 20/0, NOT 30/0)
      ✅ Test 2: Team points 20/10 for 10×2-1
      ✅ Test 3: Mixed match 5×2-0 + 5×2-1 = 20/5
      ✅ Test 4: Player stats use configurable rules (3 for 2-0, NOT 2)
      ✅ Test 5: Admin settings only affect player stats, NOT team standings
      ✅ Test 6: Regression checks (teams, players-full, validation)
      
      Key findings:
      - Ploegpunten (team standings): Fixed rules 2-0→2/0, 2-1→2/1, max 20 per match ✅
      - Persoonlijke punten (player stats): Configurable via /api/admin/settings (default 2-0→3/0, 2-1→2/1) ✅
      - Frames blijven altijd werkelijke gewonnen/verloren sets ✅
      - Settings changes affect ONLY player stats, NOT team standings ✅
      
      Backend is fully functional with no major issues found.
