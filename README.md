# SuperGym Pro: Gym Management System

A comprehensive gym management system built with Electron as a desktop app. It includes features like member management, payment tracking, attendance check-in, workout management, and monthly reporting.

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Building the Application](#building-the-application)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Introduction
SuperGym Pro is a desktop application designed to help gyms manage their operations efficiently. It provides an intuitive interface for managing members, tracking payments, logging attendance, and generating reports. Built with Electron, it offers a robust, cross-platform solution that works on Windows, macOS, and Linux.

## Features
- **Member Management:**
  - Add, edit, and delete members.
  - Track member details including name, phone, email, membership type, and membership dates.
  
- **Payment Tracking:**
  - Record payments made by members.
  - View payment history and total payments.
  
- **Attendance Tracking:**
  - Record member check-ins with timestamps.
  - View attendance logs to monitor member activity.
  
- **Workout Management:**
  - Create, edit, and delete workout plans.
  - Specify workout duration and difficulty levels.
  
- **Dashboards & Reports:**
  - Dashboard with real-time statistics (total members, workouts, payments, active members).
  - Monthly reports including total payments, average attendance, and active members.
  
- **Search & Filters:**
  - Search members by name, email, phone, or membership type.
  - Filter workouts by name, duration, and difficulty.

## Installation
1. Clone the repository:
```bash
git clone https://github.com/your-username/supergym-pro.git
cd supergym-pro
```

2. Install dependencies:
```bash
npm install
```

3. Start the application (development mode):
```bash
npm start
```

## Usage
- **Add a New Member:**
  1. Navigate to the **Members** page from the navigation sidebar.
  2. Fill in the member details and click **"Add Member"**.
  3. Members are automatically saved to the database.

- **Record a Payment:**
  1. Go to the **Payments** page.
  2. Select a member from the dropdown and enter the payment amount.
  3. Click **"Record Payment"**.

- **Track Attendance:**
  1. Visit the **Attendance** page.
  2. Select a member and click **"Record Check-in"**.
  3. Check-in times are logged in the attendance table.

- **Generate Reports:**
  1. Go to the **Reports** page.
  2. Select a month from the date picker and click **"Generate Report"**.
  3. The report will display statistics for the selected month.

## Building the Application
To build the application for distribution, run the build command. This will generate platform-specific executable files (Windows, macOS, Linux) in the `dist` folder.
```bash
npm run build
```

**Build Options:**
- The build process uses Electron Builder and will produce executables tailored for each platform.
- You can customize build settings in the `package.json` file under the `build` section.

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch:
```bash
git checkout -b feature/your-feature
```
3. Make your changes and commit them:
```bash
git commit -am 'Add new feature'
```
4. Push to the branch:
```bash
git push origin feature/your-feature
```
5. Submit a pull request.

## License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## Acknowledgments
- **Electron** for the cross-platform framework.
- **SQLite.js** for the in-memory SQLite database.
- **Font Awesome** for the icons used in the UI.

For further assistance or questions, contact the project maintainer.  
*The SuperGym Pro team*