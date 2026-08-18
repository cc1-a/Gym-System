# Guidelines

This file contains the rules and core business logic in simple human terms.

## Core Rules
1. **Admin Role**: 
   - The Admin creates membership packages (e.g., 3-month plan, 1-year plan).
   - The Admin registers new customers (members) and assigns them a package.
   - The Admin can edit or delete members and packages.
   - The Admin views the logged attendance.

2. **Customer Role (React Native App)**:
   - Customers log in or are identified via the mobile app.
   - Customers scan the Gym's Yearly QR code to mark their attendance.

3. **QR Code & Attendance**:
   - The Gym generates a Primary and Secondary QR code for the current year.
   - Customers scan this QR code.
   - When scanned, an attendance record is created for that customer, logging the date and time.

4. **Notifications (Wabot)**:
   - Customers get a WhatsApp message when they are registered.
   - Customers get a WhatsApp message when their package is updated.
   - Customers get a WhatsApp message when their package expires.
