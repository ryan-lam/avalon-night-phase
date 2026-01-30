# Avalon Night Phase Helper

A web application to automate the "Night Phase" of the board game Avalon. It handles lobby creation, role distribution, and private information revealing (e.g. Merlin seeing Evil) on mobile devices.

## Features
- **Mobile-First Design**: Optimized for phones with dark mode.
- **Privacy**: "Hold to Reveal" prevents accidental role leaks.
- **Custom Roles**: Supports Cleric, Messengers, and standard Avalon roles.
- **Real-time**: Socket.io powered lobby and state updates.

## Setup & Run

### Prerequisites
- Node.js installed.

### Quick Start
1.  **Install Dependencies** (Root, Client, and Server):
    ```bash
    npm install
    npm run install-all
    ```

2.  **Start the App**:
    ```bash
    npm start
    ```
    This will launch:
    - **Server** on `http://localhost:3001`
    - **Client** on `http://localhost:3000` (Browser should open automatically)

## Development
- **Server**: Located in `/server`. Uses Express + Socket.io.
    - Roles are defined in `/server/roles/impl`.
- **Client**: Located in `/client`. Built with React + TailwindCSS.

## Troubleshooting
- If the browser doesn't connect, ensure port 3001 is free for the server.
- If "Hold to Reveal" doesn't work on mobile, check your network connection to the host computer (must be on same Wi-Fi).