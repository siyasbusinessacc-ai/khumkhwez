

# Test Coverage Plan

## What exists
- A trivial example test and a unit test for the profile data flow (fetch, update, trigger delay). These cover the Supabase query layer but not the UI components or routing logic.

## Tests to add

### 1. AuthContext tests (`src/test/auth-context.test.tsx`)
- Provides `user` and `session` after sign-in
- Starts in `loading: true`, transitions to `false`
- `signOut` clears the session
- Handles `onAuthStateChange` events correctly

### 2. AuthPage tests (`src/test/auth-page.test.tsx`)
- Renders email form by default
- Toggles between email and phone methods
- Toggles between login and signup modes
- Calls `signUp` with email and password on signup submit
- Calls `signInWithPassword` on login submit
- Shows toast on error
- Phone flow: sends OTP, then verifies OTP

### 3. ProfilePage tests (`src/test/profile-page.test.tsx`)
- Renders loading state while fetching
- Populates form fields from fetched profile data
- Calls `update` with correct payload on save
- Shows success toast after save
- Shows error toast on failure
- Sign Out button calls `signOut` and navigates to `/auth`

### 4. Route guard tests (`src/test/route-guards.test.tsx`)
- `ProtectedRoute` redirects to `/auth` when no user
- `ProtectedRoute` renders children when authenticated
- `PublicRoute` redirects to `/` when authenticated
- `PublicRoute` renders children when no user

### 5. StudentDashboard tests (`src/test/student-dashboard.test.tsx`)
- Renders personalized greeting with user's name
- Falls back to "Student" when profile has no name
- Displays correct initials in avatar

## Technical approach
- All tests use Vitest with `vi.mock` for the Supabase client and AuthContext
- Component tests use `@testing-library/react` with `render` and `screen`
- Router-dependent tests wrap components in `MemoryRouter`
- No changes to production code required
- Remove or keep the trivial `example.test.ts` (optional cleanup)

