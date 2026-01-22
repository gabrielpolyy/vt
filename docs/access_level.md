# Exercise Access Level Implementation Plan

## Overview
Add access levels to exercises to gate content based on user tier (guest/registered/premium).

## Access Level Requirements
| Access Level | Who Can Access | Content |
|--------------|----------------|---------|
| `guest` | Everyone | Level 1: exercises 1-2 only (`single_note_hold`, `three_note_intro`) |
| `registered` | Registered users (free + premium) | All Level 1 + 1 free audio song |
| `premium` | Premium subscribers only | Everything else (Levels 2-5, all other audio) |

## Implementation Steps

### 1. Modify Existing Migration (`src/migrations/sql/002_create_exercise_tables.sql`)
Add `access_level` column to the CREATE TABLE statement:
```sql
access_level VARCHAR(15) NOT NULL DEFAULT 'premium'
  CHECK (access_level IN ('guest', 'registered', 'premium')),
```
Add index:
```sql
CREATE INDEX idx_exercises_access_level ON exercises(access_level) WHERE user_id IS NULL;
```

### 2. Update Seed Data (`src/seed/exercises.sql`)
Add `access_level` column to all INSERT statements:
- `single_note_hold` (sort 100) -> `'guest'`
- `three_note_intro` (sort 101) -> `'guest'`
- All other Level 1 pitch exercises (sort 102-202) -> `'registered'`
- Level 1 highway exercises (sort 1000-1001) -> `'registered'`
- All Level 2-5 exercises -> `'premium'`
- Audio exercises: handled dynamically (first by sort_order = 'registered', rest = 'premium')

### 3. Add Access Helper in Handlers (`src/exercises/handlers.js`)
```javascript
function getUserAccessLevel(user) {
  if (user.isGuest) return 'guest';
  if (user.tier === 'premium') return 'premium';
  return 'registered';
}

function hasAccess(userLevel, exerciseLevel) {
  const hierarchy = { guest: 0, registered: 1, premium: 2 };
  return hierarchy[userLevel] >= hierarchy[exerciseLevel];
}

function getUpgradeReason(user, requiredLevel) {
  if (user.isGuest) return 'account_required';
  return 'premium_required';
}
```

### 4. Update Repository (`src/exercises/repository.js`)
- Add `access_level` to SELECT queries
- Add filtering by access level in `getExercises()`
- **For audio exercises**: Compute access_level dynamically - first by sort_order is 'registered', rest are 'premium':
```sql
CASE
  WHEN category = 'audio' AND sort_order = (
    SELECT MIN(sort_order) FROM exercises
    WHERE category = 'audio' AND user_id IS NULL AND is_active = TRUE
  ) THEN 'registered'
  WHEN category = 'audio' THEN 'premium'
  ELSE access_level
END AS effective_access_level
```

### 5. Update Handlers (`src/exercises/handlers.js`)
- `listExercises`: Filter by user access level
- `getExercise`: Check access, return 403 if denied
- `createAttempt`: Check access before recording
- `getExerciseAudio`: Check access for audio endpoints
- `listProgress`: Include `accessLevel` and `isLocked` in response

### 6. 403 Response Format
```json
{
  "error": "Upgrade required to access this exercise",
  "reason": "account_required" | "premium_required",
  "requiredLevel": "registered" | "premium"
}
```

## Files to Modify
- `src/migrations/sql/002_create_exercise_tables.sql` (add access_level column)
- `src/seed/exercises.sql` (add access_level to INSERT statements)
- `src/exercises/repository.js`
- `src/exercises/handlers.js`

## Verification
1. Reset database and run migrations: `npm run db:reset` (or manually add column to existing DB)
2. Seed exercises: `npm run seed`
3. Test as guest: Should only see 2 exercises (`single_note_hold`, `three_note_intro`)
4. Test as registered free: Should see all Level 1 + first audio song
5. Test as premium: Should see everything
6. Test 403 responses with `reason: 'account_required'` or `'premium_required'` when accessing locked content
