#!/bin/bash

echo "Cleaning up any old invisible server instances..."
pkill -f "python3 app.py" || true
pkill -f "expo start" || true

echo "Configuring firewall to allow the phone to connect..."
sudo ufw allow 8081/tcp
sudo ufw allow 8082/tcp
sudo ufw allow 5000/tcp

echo "Installing/checking required Python packages..."
source venv/bin/activate 2>/dev/null || true
pip3 install -r requirements.txt -q

# Function to launch a new terminal depending on the user's desktop environment
launch_terminal() {
    local title=$1
    local cmd=$2
    
    if command -v xfce4-terminal &> /dev/null; then
        xfce4-terminal --title="$title" --hold --command="bash -c '$cmd'" &
    elif command -v x-terminal-emulator &> /dev/null; then
        x-terminal-emulator -T "$title" -e bash -c "$cmd; exec bash" &
    elif command -v gnome-terminal &> /dev/null; then
        gnome-terminal --title="$title" -- bash -c "$cmd; exec bash" &
    elif command -v konsole &> /dev/null; then
        konsole --title "$title" -e bash -c "$cmd; exec bash" &
    else
        echo "Could not find a GUI terminal emulator. Running '$title' in the background instead..."
        bash -c "$cmd" &
    fi
}

echo "Starting Syncravix Gym App..."

# Launch the Flask backend
launch_terminal "Flask Backend" "source venv/bin/activate 2>/dev/null || true; python3 app.py"

# Launch the React Native Expo app with a fresh cache
launch_terminal "Expo App" "cd customer_app && npx expo start --clear"

echo "Done! Two terminal windows should now be opening."
