# Command Reference

This document lists all available commands in the Design Assistant application. Commands can be typed directly into the chat interface.

## General Syntax
*   **Targeting**: Most commands accept an object name prefixed with `@` (e.g., `/delete @Cube_1`). If no target is specified, the command applies to the currently **selected** or **most recently created** object.
*   **Coordinates**: Parameters like `x y z` are usually space-separated numbers.
*   **Case Sensitivity**: Commands are case-insensitive (e.g., `/MOVE` works same as `/move`). Object names are generally case-insensitive during lookup.

---

## 1. Primitive Creation (`/parametric`)
Create parametric 3D shapes. These remain editable until boolean operations are applied.

**Syntax:** `/parametric [shape_type] [args...]`

| Shape | Arguments | Example |
| :--- | :--- | :--- |
| **box** | width, height, depth, fillet | `/parametric box 10 5 2 0.5` |
| **cube** | size, fillet | `/parametric cube 10 1` |
| **cylinder** | radiusTop, radiusBottom, height | `/parametric cylinder 5 5 10` |
| **sphere** | radius | `/parametric sphere 5` |
| **cone** | radius, height | `/parametric cone 5 10` |
| **torus** | radius, tube_radius | `/parametric torus 5 1` |
| **plane** | width, height | `/parametric plane 20 20` |
| **circle** | radius | `/parametric circle 5` |

---

## 2. Sketching
Create 2D profiles on planes to be extruded into 3D.

| Command | Description | Example |
| :--- | :--- | :--- |
| `/sketch_on [Plane]` | Enters sketch mode on a plane (XY, YZ, XZ or WorkPlane). | `/sketch_on XY`<br>`/sketch_on MyOffsetPlane` |
| `/sketch_draw [type] [args]` | Draws a shape in the active sketch. | See **Sketch Shapes** below. |
| `/sketch_off` | Exits sketch mode. | `/sketch_off` |

### Sketch Shapes
| Type | Arguments | Example |
| :--- | :--- | :--- |
| **line** | x1 y1 x2 y2 | `/sketch_draw line -5 0 5 0` |
| **rect** | width height | `/sketch_draw rect 10 5` |
| **rounded_rect** | width height radius | `/sketch_draw rounded_rect 10 5 1` |
| **circle** | radius | `/sketch_draw circle 3` |
| **ellipse** | xRadius yRadius | `/sketch_draw ellipse 4 2` |
| **equation** | x(t) y(t) min max | `/sketch_draw equation 10*sin(t) 10*cos(t) 0 6.28` |
| **composite** | JSON Array of segments | `/sketch_draw composite [{"type":"line","x":-6,"y":-2},{"type":"line","x":6,"y":-2},{"type":"line","x":6,"y":2.5},{"type":"line","x":3,"y":2.5},{"type":"line","x":0,"y":0},{"type":"line","x":-3,"y":2.5},{"type":"line","x":-6,"y":2.5},{"type":"line","x":-6,"y":-2}]` |

---

## 3. Modeling Operations (CSG & Extrusion)
Transform 2D sketches into 3D and modify solids.

| Command | Description | Example |
| :--- | :--- | :--- |
| `/extrude [@Sketch] [height]` | Extrudes a sketch into a solid. | `/extrude @SketchRect 10` |
| `/revolve @Profile @Axis [angle]` | Revolves a profile around an axis line. | `/revolve @Circle @Line 360` |
| `/subtract @Target @Tool` | Boolean Cut: Removes Tool from Target. | `/subtract @Box @Cylinder` |
| `/union @Obj1 @Obj2` | Boolean Join: Merges objects. | `/union @Handle @Cup` |
| `/intersect @Obj1 @Obj2` | Boolean Intersect: Keeps overlap. | `/intersect @A @B` |
| `/union_all` | Merges all visible meshes in the scene. | `/union_all` |
| `/sweep` | Sweeps profiles along a path. | See **Sweep Commands** below. |

### Sweep Commands
*   `/sweep_uniform @Profile @Path [options]` (1 Profile)
*   `/sweep_variable @Start @End @Path [options]` (2 Profiles)
*   `/sweep_variable_section @P1 @P2 ... @Path` (N Profiles)

**Options:** `solid` (cap ends), `rot:[deg]` (rotation), `twist:[deg]`, `thick:[val]` (hollow).

---

## 4. Editing & Manipulation
Modify existing objects in the scene.

| Command | Alias | Description | Example |
| :--- | :--- | :--- | :--- |
| `/move x y z` | `/translate` | Moves object to absolute coordinates. | `/move 10 0 5` |
| `/rotate x y z` | `/rot` | Rotates object (degrees). | `/rotate 0 90 0` |
| `/scale x y z` | | Scales object. | `/scale 2 2 2` |
| `/duplicate [@Obj]` | `/clone` | Duplicates object (offset +2). | `/duplicate @Box_1` |
| `/delete [@Obj]` | `/del` | Deletes object. | `/delete @Box_1` |
| `/rename [@Obj] Name` | | Renames object. | `/rename @Box_1 MyContainer` |
| `/tag_last Name` | | Renames the last active object. | `/tag_last Flange` |
| `/fillet [@Obj] r` | `/round` | Rounds edges (Parametric objects only). | `/fillet @MyCube 0.5` |
| `/dock @Src @Tgt` | | Moves Source adjacent to Target. | `/dock @Chair @Table` |
| `/setprop` | | Sets custom metadata `key value`. | `/setprop @Part material steel`<br>`/setprop @Part color red` |
| `/undo` | | Undoes last action. | `/undo` |
| `/redo` | | Redoes last action. | `/redo` |

---

## 5. Patterning
Create arrays of objects.

| Command | Description | Example |
| :--- | :--- | :--- |
| `/pattern rect` | Rectangular grid `cols rows dx dz`. | `/pattern rect 3 3 10 10` |
| `/pattern circ` | Circular array `count angle axis`. | `/pattern circ 6 360 Y` |

---

## 6. Work Geometry
Create reference planes and axes for sketching.

| Command | Description | Example |
| :--- | :--- | :--- |
| `/origin` | Toggle origin visibility (auto-scales to model). | `/origin` |
| `/workplane offset` | Offset plane from base. | `/workplane offset XY 10` |
| `/workplane angle` | Rotated plane around axis. | `/workplane angle XY X 45` |
| `/workaxis offset` | Offset axis. | `/workaxis offset X Y 5` |

---

## 7. Knowledge Based Engineering (KBE)
Load standard engineering components.

*   `/kbe_model @[ComponentName]`
    *   Example: `/kbe_model @HelicalGear`
    *   Example: `/kbe_model @PistonRing`

---

## 8. View & Analysis
Visualize and measure the model.

| Command | Description | Example |
| :--- | :--- | :--- |
| `/view [orientation]` | Set view to `front`, `back`, `top`, `bottom`, `left`, `right`, or `iso`. | `/view top` |
| `/view fit [size]` | Fit camera to all objects. Optional `size` forces specific zoom range. | `/view fit`<br>`/view fit 500` |
| `/wireframe` | Toggle wireframe mode. | `/wireframe` |
| `/bounds` | Toggle bounding boxes. | `/bounds` |
| `/section [x/y/z/off]` | Activate cross-section slice. | `/section x` |
| `/measure [dist/angle]` | Activate measurement tool. | `/measure dist` |
| `/props` | Calculate mass/volume properties. | `/props` |
| `/report_gen` | Generate HTML/PDF Data Sheet. | `/report_gen` |
| `/annotate @Obj Text` | Add 3D label to object. | `/annotate @Cube Front_Face` |
| `/tree` | Toggle Feature Tree panel. | `/tree` |

---

## 9. File I/O
Import and Export.

| Command | Description |
| :--- | :--- |
| `/add [url]` | Import GLB model. |
| `/open` | Open file dialog to replace scene. |
| `/save` | Save session JSON. |
| `/load` | Restore session JSON. |
| `/export_obj` | Export scene as OBJ. |
| `/export_glb` | Export scene as GLB. |
| `/export_stl` | Export scene as STL. |

---

## 10. Testing & Demos
Run automated scripts.

*   `/tg_test_ui`: Runs the full UI validation test suite.
*   `/tg_test_ui build [demo_name]`: Builds a specific demo.
    *   Available: `table`, `chair`, `house`, `mug`, `car`, `ship`, `bridge`, `flange`, `sensor`, `corner` etc.

---

## 11. Creative Example: Complex Housing Shell

This example recreates the specific geometry of a corner housing block with internal fillets (spherical and cylindrical faces), using boolean operations with rounded primitives.

**Runnable Demo:** Type `/tg_test_ui build corner` in the app.

**Step-by-Step Command Sequence:**

1.  **Create Solid Stock**  
    Create a 12x12x12 cube.
    ```
    /parametric box 12 12 12
    /tag_last Stock
    ```

2.  **Create Pocket Tool (with Fillets)**  
    Create a slightly smaller box (10x10x12) with a fillet radius of 2. This rounded box will act as the "void" creator. The rounded corners of this tool will form the "Spherical Faces" (corners) and "Cylindrical Faces" (vertical edges) inside the target.
    ```
    /parametric box 10 10 12 2
    /tag_last PocketTool
    ```

3.  **Position Tool**  
    Move the tool so it creates a "blind" pocket (does not cut through the bottom).
    ```
    /move 0 8 0
    ```

4.  **Subtract (Machine the Pocket)**  
    Subtract the rounded tool from the square stock.
    ```
    /subtract @Stock @PocketTool
    /tag_last Housing
    ```

5.  **Section Cut**  
    To visualize the internal geometry (as shown in the reference image), we cut away one quarter of the housing.
    ```
    /parametric box 6.1 13 6.1
    /move 3.05 6 3.05
    /subtract @Housing @Box_6.1x13x6.1
    ```

6.  **Annotate**  
    Identify the specific features created by the rounded boolean operation.
    ```
    /parametric sphere 0.2
    /move -3 2.5 -3
    /annotate @Sphere_0.2 Spherical_Face
    ```

**Result:** A block with a rounded internal cavity, sectioned to show the complex face transitions.