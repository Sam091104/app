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
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "GET /api/admin/players-full - new endpoint returning all players incl. placeholders for admin view"
    - "POST /api/admin/matches/:id/approve - allows admin to edit confirmed matches"
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
