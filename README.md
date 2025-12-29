![Icon](android-chrome-192x192.png)

# Design Assistant

**Live Demo:** [https://truegeometry.github.io/YCAD/](https://truegeometry.github.io/YCAD/)

**Main Site:** [https://www.truegeometry.com/](https://www.truegeometry.com/)

**Blog:** [https://blog.truegeometry.com/](https://blog.truegeometry.com/)

A powerful, browser-based 3D design and engineering assistant built with **Three.js** and **Vanilla JavaScript**. This application enables users to visualize 3D models (GLB/GLTF), interact with an AI agent (simulated interface), perform engineering analysis, and manipulate geometry using natural language commands or UI controls.

## Features

*   **3D Visualization**: High-quality rendering using Three.js with shadows, environment mapping, and post-processing.
*   **AI Chat Interface**: A chat panel to issue commands, ask questions, and interact with the design context.
*   **Knowledge Based Engineering (KBE)**: Access a catalog of standard engineering parts (Gears, Pipes, etc.) via the `/kbe_model` command.
*   **Advanced Sketching & Modeling**:
    *   **2D Sketching**: Draw on standard or custom work planes using Lines, Rectangles, Circles, Polylines, and Parametric Equations ($x(t), y(t)$).
    *   **Extrusion**: Convert 2D sketches into 3D solids.
    *   **CSG Operations**: Perform Boolean Union, Subtraction, and Intersection on meshes.
    *   **Parametric Primitives**: Create adjustable Cubes, Cylinders, Cones, Torus, and more.
*   **Geometry Tools**:
    *   **Measurement**: Measure distances and angles between points.
    *   **Sectioning**: Real-time cross-section slicing on X, Y, or Z axes.
    *   **Physical Properties**: Estimate volume, mass, and center of mass based on material density.
    *   **Collision Detection**: Real-time BVH-based collision warning system.
    *   **Origin & Work Geometry**: Create offset planes and axes for reference.
*   **Manipulation**: Translate, rotate, and snap (dock) objects.
*   **Patterning**: Create rectangular or circular patterns of components.
*   **History System**: Full Undo/Redo support for geometric modifications.
*   **Session Management**: Save and restore your design session (JSON format).
*   **Reporting**: Generate HTML-based engineering data sheets with snapshots.

![Design Assistant UI](ssycad.png)

## Getting Started

Because this project uses ES6 Modules (`import`/`export`), you cannot open `index.html` directly from the file system (`file://` protocol). You must serve it via a local web server.

### Prerequisites

*   A modern web browser (Chrome, Firefox, Edge, Safari).
*   **Node.js** (optional, for running a simple server).

### Running Locally

**Option 1: Using Python**
If you have Python installed, navigate to the project folder and run:
```bash
# Python 3
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Option 2: Using Node.js (npx)**
```bash
npx serve .
```

**Option 3: VS Code Live Server**
If you use Visual Studio Code, install the "Live Server" extension, right-click `index.html`, and choose "Open with Live Server".

## File Structure

*   **index.html**: Main entry point and layout.
*   **main.js**: Application bootstrapper.
*   **viewer.js**: Three.js scene setup (renderer, camera, controls).
*   **loader.js**: Handles GLB/GLTF loading.
*   **commands/**: Logic for chat commands (move, rotate, pattern, kbe, etc.).
*   **ui.js**: DOM manipulation for the chat and panels.
*   **state.js**: Centralized state management.

## Interactive Demos

The application includes a suite of automated demos to showcase capabilities. You can run these via the chat command line.

**Command:** `/tg_test_ui build [demo_name]`

**Available Demos:**
*   `table` - Builds a simple wooden table.
*   `chair` - Constructs a basic chair.
*   `house` - Demonstrates boolean operations to build a house.
*   `mug` - Creates a coffee mug using subtraction and union.
*   `sketch` - Showcases advanced 2D sketching and extrusion.
*   `profiles` - Demos various shapes (V-Block, Slotted Plate, Parametric Cam).
*   `bridge` - Builds a bridge with patterned pillars.
*   `car` - Assembles a simple vehicle.
*   `ship` - Constructs a cargo ship.

**UI Test Suite:**
To run a full UI validation test with text-to-speech narration, simply type:
`/tg_test_ui` (defaults to English)
`/tg_test_ui hindi` (for Hindi narration)

## Basic Commands

Type these in the chat box:

*   `/help`: List all available commands.
*   `/sketch_on XY`: Start sketching on the XY plane.
*   `/extrude @SketchName 5`: Extrude a sketch by 5 units.
*   `/subtract @Target @Tool`: Subtract Tool from Target.
*   `/add [url]`: Load a GLB model from a URL.
*   `/kbe_model @Name`: Load a standard part (e.g., `/kbe_model @HelicalGear`).
*   `/move x y z`: Move the selected object.
*   `/rotate x y z`: Rotate the selected object.
*   `/pattern rect 3 3 10 10`: Create a rectangular pattern.
*   `/undo`: Undo the last action.

## License

Copyright (c) TrueGeometry.
Individual use is free. Corporate use requires a license. See `LICENSE.md` for details.