## 7. Diagrams

### Component Diagram
This diagram shows the major components of the Roo Code system and their primary relationships.

```
+---------------------+      +---------------------+      +-----------------------+
|   VS Code Editor    |<---->|  Roo Code Extension |      | External AI Providers |
| (UI, API, Terminal) |      |        (Host)       |<---->|  (OpenAI, Anthropic,  |
+---------------------+      +---------------------+      |   Bedrock, Gemini)    |
                                     ^  |                  +-----------------------+
                                     |  |
                                     |  v
                             +------------------+          +---------------------+
                             |  Webview UI      |<-------->|   Task Orchestration  |
                             |  (Cline Panel)   |          |   (core/task/Task.ts) |
                             +------------------+          +---------------------+
                                                                  |  ^  ^  |
                                                                  |  |  |  |
                                     +----------------------------+  |  |  +------------------------------+
                                     |                               |  |                                 |
                                     v                               v  |                                 v
                             +---------------------+     +-------------------------+     +-------------------------+
                             |   Editor Services   |<--->|   Workspace Services    |<--->|  Browser/Web Services   |
                             | (Diff, Decorations) |     | (Files, Search, Ignore) |     | (Puppeteer, Fetcher)    |
                             +---------------------+     +-------------------------+     +-------------------------+
                                                                  ^  ^
                                                                  |  |
                                                          +---------------------+
                                                          |   MCP Hub/Services  |
                                                          | (External Tools)    |
                                                          +---------------------+

Relationships:
- `<-->`: Bidirectional communication or strong interaction.
- `-->` : Unidirectional communication or dependency.
- `^ / v`: Indicate primary flow or control.

**Key Components in Diagram:**

*   **VS Code Editor:** The host environment providing UI elements, APIs (for files, terminal, editor actions), and the extension lifecycle.
*   **Roo Code Extension (Host):** The main extension process running in VS Code.
    *   Manages activation, command registration.
    *   Interfaces with VS Code APIs.
    *   Hosts the Webview UI.
    *   Contains the core task orchestration logic.
*   **Webview UI (Cline Panel):** The primary user interface for chat, task initiation, and viewing results. Runs in a separate webview process.
*   **Task Orchestration (`core/task/Task.ts`):** The central brain that manages a single AI task, including history, AI communication, tool calls, and state.
*   **External AI Providers:** Third-party LLM services (OpenAI, Anthropic, etc.) that the extension communicates with via their APIs.
*   **Editor Services:** Modules interacting with VS Code's editor features (e.g., showing diffs, managing text decorations).
*   **Workspace Services:** Modules for interacting with the user's workspace (reading/writing files, searching, respecting `.rooignore`).
*   **Browser/Web Services:** Modules for automating browser actions or fetching content from URLs.
*   **MCP Hub/Services:** Manages communication with external tools via the Model Context Protocol.
```

### Call or Data Flow Diagram
This diagram illustrates the sequence of events and data flow when a user types a message/task and the AI responds.

```
1. [User Input (Webview UI)]
   "Write a Python function to calculate factorial"
    |
    v
2. [Webview Message Handler (`core/webview/webviewMessageHandler.ts`)]
   (Receives message from UI)
    |
    v
3. [ClineProvider (`core/webview/ClineProvider.ts`)]
   (Relays message to extension host, may initiate a new `Task` or pass to existing one)
    |
    v
4. [Task Object (`core/task/Task.ts`)]
   (Processes input, manages history, prepares AI request)
    |
    v
5. [ApiHandler (`src/api/index.ts` & `src/api/providers/`)]
   (Formats request for the specific AI provider)
    |
    v
6. [External LLM API (e.g., OpenAI, Anthropic)]
   (AI model processes the request)
    |
    v
7. [ApiHandler]
   (Receives AI response, parses it)
    |
    v
8. [Task Object (`core/task/Task.ts`)]
   (Parses AI response: text, tool calls. If tool call: invokes tool, gets result, may loop back to step 4/5 with tool result. If text: proceeds to step 9)
    |
    v
9. [ClineProvider (`core/webview/ClineProvider.ts`)]
   (Receives processed response/result from Task)
    |
    v
10. [Webview UI]
    (Displays AI response/tool output to the user)
```
