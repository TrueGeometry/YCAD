# Adding New Demos

This directory contains the scripted demos used by the `/tg_test_ui build` command. Follow these steps to add a new demo.

## 1. Create a Demo File

Create a new JavaScript file in this directory (e.g., `my_demo.js`). Export a constant array containing the sequence of commands.

**Format:**
```javascript
export const MY_DEMO = [
    { 
        cmd: '/view iso',       // The chat command to execute
        delay: 1000,            // Time in ms to wait after execution
        narration: "Starting..." // Text read aloud by TTS and shown in chat
    },
    { cmd: '/parametric box 10 1 10', delay: 2000 },
    // ... more steps
];
```

## 2. Register the Demo

Open `registry.js` in this directory:

1.  **Import** your new constant.
2.  **Add** it to the `DEMO_REGISTRY` object. The key you choose will be the argument used in the chat command.

```javascript
// registry.js
import { MY_DEMO } from './my_demo.js';

export const DEMO_REGISTRY = {
    // ... existing demos
    'my_demo': MY_DEMO,
    'alias_name': MY_DEMO // You can add aliases too
};
```

## 3. Run the Demo

1.  Start the application.
2.  Open the chat panel.
3.  Type: `/tg_test_ui build my_demo`

## Available Commands for Demos

You can use any command available in the application. Common ones for demos include:

*   **Creation**: `/parametric [shape] [args]`, `/add [url]`
*   **Manipulation**: `/move [x] [y] [z]`, `/rotate [x] [y] [z]`, `/scale [x] [y] [z]`
*   **Patterning**: `/pattern rect [cols] [rows]`, `/pattern circ [count]`
*   **Boolean**: `/subtract @Target @Tool`, `/union @A @B`
*   **Visuals**: `/setprop @Obj [key] [val]`, `/annotate @Obj [text]`, `/view [iso|top|front]`
*   **Sketching**: `/sketch_on`, `/sketch_draw composite`, `/revolve`, `/sweep`

## Best Practices

*   **Delays**: Add sufficient delays (1000ms - 3000ms) after commands that create objects or perform complex operations to allow the user to see what happened.
*   **Narration**: Use the `narration` field to explain *what* is being built or *why* a specific command is used.
*   **Cleanup**: The demo runner automatically clears the scene before starting, so you don't need to add delete commands at the start of your script.

## Demo List
*   `table`
*   `chair`
*   `house`
*   `mug`
*   `sketch`
*   `profiles`
*   `bridge`
*   `car`
*   `ship`
*   `bottle`
*   ... and more in `registry.js`