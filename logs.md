# Changelog and Logs

## 2026-08-17
- Added `logs.md`, `guidelines.md`, `workflows.md`, `file_structure.md`, and `agents.md` as requested.
- Redesigned backend QR logic: Instead of generating QR codes per member, a global Gym QR code is generated per year.
- Added API endpoint for React Native customer app to scan QR and log attendance.
- Added Admin dashboard support for Viewing Attendance.
- Added Edit and Delete functionality for Members and Packages in the Admin dashboard.
- Constrained Admin UI layout to have a mobile-first, app-like feel.
- Removed mobile-first 500px width constraint from Admin dashboard to take up the full available width.
- Initialized React Native customer app (customer_app) with Expo and expo-camera.
- Configured App.js with camera scanning and API integration to log attendance via /api/scan_qr.
- Added Flask-Cors to prevent Cross-Origin request issues from the React Native app.
- Updated Expo App.js to include dynamic Server IP address selection UI.
- Created `start_servers.sh` bash script to easily launch both the Flask backend and the Expo frontend in separate terminal windows.
- Converted customer app to use an Email and Password Login system instead of raw Customer IDs.
- Added `/api/login` endpoint to Flask and updated the Admin Dashboard modals to include a Password assignment field.
- Built a First-Time Login workflow where users are forced to change their default password to a new one upon initial sign-in, utilizing the new `/api/set_password` endpoint.
- Implemented Payment tracking system. Admin can toggle "Paid / Unpaid" statuses on the dashboard, which sends a WhatsApp confirmation. The mobile app blocks scanning if payment is pending.
- Upgraded Customer App with a Bottom Navigation Bar and a comprehensive Profile Section containing WhatsApp verification for password changes.
