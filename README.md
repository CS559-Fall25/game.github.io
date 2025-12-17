# Human vs Cows - Three.js Game

A simple browser-based game built with Three.js.

## How to Run

Because this project uses ES Modules, you must serve it with a local web server. You cannot simply open `index.html` in your browser directly from the file system.

### Using VS Code Live Server
1. Install the "Live Server" extension for VS Code.
2. Right-click `index.html` and select "Open with Live Server".

### Using Python
If you have Python installed, run this in the project directory:
```bash
python -m http.server
```
Then open `http://localhost:8000` in your browser.

## Controls

### Keyboard
- **Arrow Left / A**: Rotate Left
- **Arrow Right / D**: Rotate Right
- **Arrow Up / W**: Thrust
- **Space**: Shoot

### Touch / Mouse
- Use the on-screen buttons at the bottom of the screen.

## Modes
Use the dropdown in the top-left corner to switch between:
- **Prototype**: Uses simple geometric shapes (Cones, Spheres) with solid colors.
- **Full**: Uses textured boxes representing the Human and Cows.

