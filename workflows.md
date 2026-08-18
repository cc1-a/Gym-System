# Workflows

This document outlines the standard operational workflows for the Gym Application.

## 1. Package Management
- **Create**: Admin enters Name, Price, and Duration (in months). The system saves it to the local JSON database.
- **Edit**: Admin can modify existing package details.
- **Delete**: Admin can remove a package (ensure no members are actively tied to it, or handle it gracefully).

## 2. Member Management
- **Registration**: Admin enters Name, Email, WhatsApp Phone, and selects a Package. System calculates `end_date` dynamically. Wabot sends a welcome message.
- **Edit**: Admin can fix typos in the user's name or contact info.
- **Update Package**: Admin can renew or change a member's package, which recalculates the `end_date` and sends a Wabot notification.

## 3. Attendance Logging (Customer side via React Native)
1. Gym displays the Annual QR Code on the wall or front desk.
2. Customer opens their React Native app and scans the QR code.
3. The app makes an API request to the backend with the Customer's ID and the QR Code's data.
4. Backend verifies the QR code is valid for the current year.
5. Backend logs the attendance in `data.json`.
