# SyncCanvas 🎨⚡

**SyncCanvas** is a high-performance, real-time collaborative whiteboarding platform built to handle massive concurrency. Designed with enterprise-grade architecture, it acts as a lightweight clone of Figma's multiplayer rendering engine.

## 🚀 Key Features

- **Real-Time Multiplayer & Presence:** Instant synchronization of shapes, paths, and live user cursors across multiple clients. Connected users are displayed in a Figma-style Presence UI.
- **CRDT State Management:** Utilizes Conflict-Free Replicated Data Types (Yjs) over WebSockets, eliminating the need for a central authoritative resolution server and allowing for seamless conflict resolution.
- **Local Undo/Redo Stack:** Leverages `Y.UndoManager` to maintain local action history without interfering with remote users' changes. (Use `Ctrl+Z` and `Ctrl+Y`).
- **Locked 60 FPS Engine:** Capable of rendering 1,000+ interactive vector elements simultaneously without frame drops.
- **Fluid Physics Integrator:** Dragging and dropping elements utilizes a custom implicit Euler spring physics engine, making remote interactions feel incredibly smooth and masking any network latency.
- **Infinite Canvas:** Supports middle-click panning and scroll-wheel zooming via Affine transformation matrices.

## 🏗️ System Architecture

To achieve extreme performance in a browser environment, SyncCanvas employs advanced Computer Science algorithms and rendering techniques:

### 1. Dual-Layer Canvas Rendering Pipeline
Instead of forcing the browser DOM to repaint SVG nodes or clearing a single giant `<canvas>` every frame, the architecture splits the DOM into two physical layers:
*   **Static Layer (`z-index: 1`)**: Renders idle shapes. This layer is *only* repainted when a shape permanently settles into a new coordinate.
*   **Active Layer (`z-index: 2`)**: A transparent overlay that repaints at 60Hz, handling live cursors, selection bounds, and actively animating shapes. 

*Result:* If 10,000 shapes exist but only 1 is being dragged, the engine only executes draw commands for 1 shape per frame.

### 2. Spatial Hashing via QuadTrees `O(log N)`
Iterating over thousands of elements to check if they are within the camera viewport or if the user clicked on them requires `O(N)` time complexity, which leads to main-thread blocking.
SyncCanvas partitions the 2D coordinate space using a **QuadTree**. 
*   **Insertions:** `O(log N)`
*   **Viewport Querying:** `O(log N + K)` (where K is the number of visible shapes).
When the Static Layer repaints, it queries the QuadTree using the Camera's bounding box, instantly culling off-screen elements.

### 3. Kinematic vs. Dynamic Spring Physics
Network latency often causes multiplayer objects to "teleport" or jitter. 
*   **Kinematic State:** When a local user drags an item, it strictly follows the mouse pointer (`1:1` mapping).
*   **Dynamic State:** When remote clients receive the CRDT coordinate updates via WebSockets, the engine does *not* snap the item to the new coordinates. Instead, the shape's "Render State" chases its "Logical State" using a custom spring physics loop.

## 📂 Code Structure (MVC Pattern)

```text
src/
├── components/    # React UI (Toolbar, CanvasArea)
├── engine/        # The Antigravity Rendering Engine (QuadTree, Physics, Canvas Contexts)
├── sync/          # Yjs CRDT integration and WebSocket Providers
├── types/         # Strict TypeScript Interfaces
```

## 🧪 Testing & CI/CD

This project utilizes **Vitest** for unit testing critical algorithmic infrastructure.
Run the test suite locally:
```bash
npm run test
```

A **GitHub Actions** CI/CD pipeline is configured in `.github/workflows/ci.yml` to automatically lint, test, and build the project on every push to the `main` branch, ensuring enterprise-grade code quality.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, TypeScript, Vanilla CSS
- **State Sync:** Yjs, y-websocket
- **Rendering:** HTML5 Canvas API (2D Context)
- **Tooling:** Vitest (Testing), ESLint

## 🚀 Getting Started

1. Clone the repository.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Open the app in multiple browser windows side-by-side to experience the real-time Antigravity sync engine!
