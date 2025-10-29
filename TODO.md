# TODO: Fix Maintenance Issues

## 1. Update PrivateRoute for Real-time Maintenance Check ✅
- Replace getDoc with onSnapshot in PrivateRoute to listen for maintenance changes in real-time.
- Ensure users are redirected immediately when maintenance is enabled.

## 2. Update Login Component for Real-time Check ✅
- After login, use onSnapshot to check maintenance status before redirecting.
- Redirect to /maintenance if maintenance is on and user is not admin/moderator.

## 3. Enhance MaintenancePage ✅
- Add useEffect to redirect to "/" if maintenance is turned off while on the page.
- Add logic to automatically turn off maintenance if expectedResume time has passed.
- Improve error handling for Firestore.

## 4. Add Validation in AdminSettings ✅
- Prevent setting expectedResume to a past date.
- Show warning if expectedResume is in the past.

## 5. Test the Changes
- Run the app and test maintenance toggle, real-time updates, and auto-redirects.
