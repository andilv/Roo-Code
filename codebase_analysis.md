# Codebase Analysis: Roo Code

## 1. Project Overview
## Project Overview

Roo Code (formerly Roo Cline) is an AI-powered autonomous coding agent designed to operate within a developer's editor, primarily VS Code. It aims to enhance software development efficiency by assisting with a variety of coding tasks.

**Core Capabilities:**

*   **Natural Language Interaction:** Roo Code can understand and respond to instructions given in natural language.
*   **Workspace Interaction:** It has the ability to read and write files directly within the user's workspace.
*   **Command Execution:** The agent can run terminal commands.
*   **Browser Automation:** Roo Code is capable of automating actions in a web browser.
*   **API Integration:** It supports integration with any OpenAI-compatible API or custom AI models.
*   **Customizable Modes:** Users can define "Custom Modes" to tailor Roo Code's personality and capabilities for specific roles, such as a QA engineer, system architect, or product manager. This allows for specialized assistance depending on the task at hand.

**Key Features:**

*   **Code Generation:** Generates code from natural language descriptions.
*   **Refactoring and Debugging:** Assists in refactoring existing code and debugging issues.
*   **Documentation:** Can write and update documentation.
*   **Q&A:** Answers questions about the codebase.
*   **Task Automation:** Automates repetitive coding tasks.
*   **File and Project Creation:** Capable of creating new files and projects.
*   **Smart Tools:** Roo Code utilizes a set of tools for file operations, terminal execution, browser control, and extensibility via the Model Context Protocol (MCP). MCP allows users to add custom tools and integrate with external APIs or databases.
*   **Customization:** Offers various customization options, including custom instructions, custom modes, support for local models, and auto-approval settings for actions.

**Technology Stack (based on gathered information):**

*   **Language:** TypeScript
*   **Framework:** VS Code Extension
*   **Testing:** Likely Jest (presence of `jest.config.mjs` and `__tests__` directories)
*   **Formatting:** Likely Prettier (presence of `.prettierignore`)

**Development and Community:**

*   The project is actively developed, with a `CHANGELOG.md` tracking updates.
*   It has a community presence on Discord and Reddit.
*   Contributions are welcome, with guidelines provided in `CONTRIBUTING.md`.
*   The project uses `pnpm` for package management and `changesets` for versioning and publishing.

Overall, Roo Code positions itself as a versatile and extensible AI coding assistant integrated directly into the development environment. The codebase appears to be well-maintained, with no immediate signs of legacy TODOs or FIXMEs in the `src` directory. The project structure is typical of a VS Code extension, utilizing TypeScript and common development tools.

---

## 2. Architecture Summary
## Architecture Summary

The Roo Code application appears to follow a typical architecture for a VS Code extension that provides rich AI-powered functionality. It comprises several key components that interact to deliver its features.

**High-Level Architecture:**

The system can be broadly divided into the following layers:

1.  **VS Code Extension Host:** This is the main process running within VS Code. It manages the extension's lifecycle, commands, and integration with the VS Code API.
2.  **Webview UI (Cline):** A significant portion of the user interaction happens through a webview interface. This is where users input tasks, see responses, and manage the AI agent's actions. The `src/core/webview` directory, with files like `ClineProvider.ts` and `webviewMessageHandler.ts`, suggests this component.
3.  **Core Logic / Task Management:** This layer is responsible for managing the AI tasks, processing user input, interacting with the AI models, and orchestrating the various tools and services. The large `src/core/task/Task.ts` file is a central piece of this layer, handling task lifecycle, API communication, message handling, and tool usage.
4.  **AI Interaction Layer:** This component handles communication with AI models. It likely includes building API requests, sending them to configured AI providers (OpenAI-compatible, Anthropic, Bedrock, etc.), and processing the responses. The `src/api` directory, with its various provider implementations (`anthropic.ts`, `openai.ts`, `bedrock.ts`) and transformation logic (`openai-format.ts`, `gemini-format.ts`), points to this.
5.  **Services Layer:** Provides various functionalities supporting the core operations, such as file system access, code indexing, search, browser automation, and checkpoint management. Directories like `src/services/code-index`, `src/services/browser`, `src/services/checkpoints`, and `src/services/ripgrep` indicate these components.
6.  **Integrations Layer:** Manages interactions with the editor (e.g., diff views, decorations), terminal, and potentially other external tools or protocols like MCP (Model Context Protocol). The `src/integrations` directory with subdirectories for `editor`, `terminal`, and `misc` supports this.

**Major Components and Interactions:**

*   **Extension Entry Point (`src/extension.ts`):** This is likely the main activation point for the extension. It registers commands, initializes providers, and sets up the extension environment. The `src/activate` directory seems to handle parts of this activation logic.
*   **`ClineProvider` (`src/core/webview/ClineProvider.ts`):** Manages the webview panel where users interact with Roo Code. It handles message passing between the extension host and the webview.
*   **`webviewMessageHandler` (`src/core/webview/webviewMessageHandler.ts`):** Processes messages received from the webview UI, likely translating user actions into tasks for the core logic.
*   **`Task` (`src/core/task/Task.ts`):** This is a central class orchestrating individual AI tasks. It:
    *   Receives user input (tasks, commands).
    *   Manages conversation history with the AI.
    *   Interacts with the `ApiHandler` to communicate with the selected AI model.
    *   Parses AI responses, including tool usage requests.
    *   Invokes appropriate tools (file I/O, terminal commands, browser actions) via service and integration components.
    *   Updates the webview UI with progress and results via `ClineProvider`.
    *   Handles task lifecycle events (start, pause, resume, abort).
*   **`ApiHandler` (constructed by `src/api/index.ts` and `buildApiHandler`):** Abstracts the communication with different AI providers. It formats requests according to the provider's specifications and parses their responses. It utilizes specific provider implementations from `src/api/providers`.
*   **Tool Implementations (e.g., `src/core/tools/readFileTool.ts`, `src/core/tools/executeCommandTool.ts`):** These modules contain the logic for the specific actions Roo Code can perform. They are invoked by the `Task` class based on the AI's output.
*   **Service Modules (e.g., `UrlContentFetcher`, `BrowserSession`, `McpHub`, `RepoPerTaskCheckpointService`):** Provide underlying capabilities used by the tools and core task logic. For instance, `BrowserSession` would manage the lifecycle of an automated browser instance.
*   **Integration Modules (e.g., `DiffViewProvider`, `TerminalRegistry`):** Handle specific integrations with VS Code features (like showing diffs) or managing resources (like terminal processes).
*   **Persistence (`src/core/task-persistence`):** Handles saving and loading task-related data, such as conversation history and metadata, allowing tasks to be resumed.

**Data Flow (Simplified Example - User initiates a task):**

1.  User types a task into the Webview UI.
2.  `webviewMessageHandler` receives the task.
3.  A `Task` instance is created or assigned the new input.
4.  The `Task` instance, using `ApiHandler`, sends the processed user input and relevant context (system prompt, conversation history) to the configured AI model.
5.  The AI model responds, potentially including instructions to use a tool.
6.  The `Task` instance parses the AI's response.
    *   If it's a textual response, it's displayed in the Webview UI.
    *   If it's a tool request, the `Task` invokes the corresponding tool (e.g., `readFileTool`).
7.  The tool executes (e.g., reads a file from the workspace).
8.  The result of the tool execution is sent back to the AI model (again via `Task` and `ApiHandler`) as context for the next step.
9.  This loop continues until the task is completed or interrupted.
10. Throughout the process, the `Task` updates the Webview UI via `ClineProvider` with messages, progress, and results.

This architecture allows for a separation of concerns, with the UI, core task orchestration, AI communication, and specific tool/service functionalities handled by different components. The extensive use of TypeScript suggests a focus on type safety and maintainability within this complex system.

---

## 3. Module Index
## Module Index

This section provides a brief overview of the main modules (top-level directories within the `src` directory) and their likely responsibilities within the Roo Code VS Code extension.

*   **`activate`**: Contains code related to the activation and registration of the extension's commands and features within VS Code.
*   **`api`**: Manages interactions with various AI language models and providers, including request/response formatting and provider-specific implementations.
*   **`assets`**: Stores static assets used by the extension, such as icons, images, and documentation files.
*   **`core`**: Implements the central logic of the Roo Code agent, including task management, conversation handling, tool invocation, and webview communication.
*   **`extension`**: Likely contains the main extension entry point (`extension.ts`) and related setup for the VS Code extension environment.
*   **`i18n`**: Handles internationalization and localization, providing support for multiple languages in the UI.
*   **`integrations`**: Provides modules for integrating Roo Code with various parts of the VS Code editor and external tools, such as the terminal, editor features (diff views), and potentially the Model Context Protocol (MCP).
*   **`services`**: Contains various services that support the core functionality, such as file system operations, code indexing, search capabilities, browser automation, and task checkpointing.
*   **`shared`**: Includes utility functions, type definitions, and constants that are shared across different modules of the extension.
*   **`utils`**: Provides general utility functions and helper modules used throughout the codebase, potentially for logging, path manipulation, and configuration management.
*   **`workers`**: May contain code for background tasks or worker threads, possibly for performance-intensive operations like token counting.
*   **`__mocks__`**: Contains mock implementations used for testing purposes, particularly for external dependencies or VS Code APIs.
*   **`__tests__`**: Houses unit and integration tests for various modules within the codebase.

*(Note: There isn't a top-level directory explicitly named `webview-ui`. The webview UI components seem to be primarily managed within `src/core/webview` and potentially utilize assets from `src/assets`.)*

---

## 4. Key Classes and Functions
## Key Classes and Functions

This section highlights some of the key classes and functions within the Roo Code codebase that are central to its functionality.

**Key Classes:**

*   **`Task` (`src/core/task/Task.ts`)**
    *   **Purpose:** Orchestrates an individual AI-driven task from user initiation to completion. It manages the conversation lifecycle, interacts with AI models, invokes tools, handles state (pausing, resuming, aborting), and communicates with the webview.
    *   **Key Inputs:** Task description (text, images), API configuration, user interactions (e.g., approving tool use), history items (for resuming tasks), references to providers (like `ClineProvider`).
    *   **Key Outputs:** Updates to the webview UI (via `ClineProvider`), messages to the AI model, tool execution requests, and lifecycle events (e.g., task completed, aborted).

*   **`ClineProvider` (`src/core/webview/ClineProvider.ts`)**
    *   **Purpose:** Manages the VS Code webview panel that serves as the primary user interface (chat interface) for Roo Code. It handles the creation of the webview, message passing between the extension host and the webview, and state synchronization.
    *   **Key Inputs:** VS Code extension context, webview HTML content, messages from the `Task` or other components destined for the UI.
    *   **Key Outputs:** Messages sent to the webview (e.g., display new messages, update UI elements), messages received from the webview (user input, UI events).

*   **`ApiHandler` (interface, implementations in `src/api/providers/`)**
    *   **Purpose:** Abstract class/interface for interacting with different AI language model providers (e.g., Anthropic, OpenAI, Bedrock). Specific implementations handle provider-specific request formatting, authentication, and response parsing. `buildApiHandler` likely constructs the appropriate handler based on configuration.
    *   **Key Inputs:** System prompt, conversation history, API configuration (model details, credentials), metadata (task ID, mode).
    *   **Key Outputs:** Streams or promises of AI model responses (text, tool usage requests), token usage information.

*   **`ProviderSettingsManager` (`src/core/config/ProviderSettingsManager.ts`)**
    *   **Purpose:** Manages the configuration and settings for different AI providers, allowing users to define and switch between various API configurations.
    *   **Key Inputs:** User-defined provider settings, requests to retrieve or update configurations.
    *   **Key Outputs:** Provider settings objects, lists of available configurations.

*   **`McpHub` (`src/services/mcp/McpHub.ts`)**
    *   **Purpose:** Manages connections and communication with external tools or services via the Model Context Protocol (MCP). It allows Roo Code to extend its capabilities by integrating with custom tools.
    *   **Key Inputs:** MCP server configurations, requests from the `Task` to use an MCP tool.
    *   **Key Outputs:** Communication with MCP servers, results from MCP tool executions.

*   **`RooIgnoreController` (`src/core/ignore/RooIgnoreController.ts`)**
    *   **Purpose:** Manages `.rooignore` files, which specify files and directories that Roo Code should ignore when accessing the workspace, similar to `.gitignore`.
    *   **Key Inputs:** Workspace path, content of `.rooignore` files.
    *   **Key Outputs:** Instructions for other components (like file search or context gathering) on whether a file should be ignored.

*   **`FileContextTracker` (`src/core/context-tracking/FileContextTracker.ts`)**
    *   **Purpose:** Tracks files that are part of the current task's context, potentially managing which files are "active" or have been mentioned or edited.
    *   **Key Inputs:** Task ID, file paths that are interacted with or mentioned.
    *   **Key Outputs:** Information about the current file context for a task.

*   **`DiffViewProvider` (`src/integrations/editor/DiffViewProvider.ts`)**
    *   **Purpose:** Manages the display of diff views within VS Code, allowing users to see changes proposed by Roo Code before applying them.
    *   **Key Inputs:** Original file content, modified file content from AI suggestions.
    *   **Key Outputs:** Presentation of a diff view in the editor.

**Key Functions:**

*   **`activate` (likely in `src/extension.ts` or `src/activate/index.ts`)**
    *   **Purpose:** The main entry point for the VS Code extension. It's called when the extension is activated and is responsible for initializing resources, registering commands, and setting up providers.
    *   **Key Inputs:** VS Code `ExtensionContext`.
    *   **Key Outputs:** None directly, but sets up the extension's runtime environment.

*   **`SYSTEM_PROMPT` (function in `src/core/prompts/system.ts`)**
    *   **Purpose:** Generates the detailed system prompt that is sent to the AI model. This prompt defines Roo Code's persona, capabilities, constraints, and available tools.
    *   **Key Inputs:** Extension context, current working directory, information about enabled tools (browser, MCP), custom instructions, current mode, diff strategy, etc.
    *   **Key Outputs:** A string representing the complete system prompt.

*   **Tool Functions (e.g., `readFileTool`, `writeToFileTool`, `executeCommandTool` in `src/core/tools/`)**
    *   **Purpose:** Implement the specific actions (tools) that the AI model can request Roo Code to perform. Each tool function handles the execution of that action.
    *   **Key Inputs:** Parameters provided by the AI model for the specific tool (e.g., file path for `readFileTool`, command for `executeCommandTool`).
    *   **Key Outputs:** A result object or string representing the outcome of the tool's execution (e.g., file content, command output, success/error status).

*   **`parseAssistantMessage` (`src/core/assistant-message/parseAssistantMessage.ts`)**
    *   **Purpose:** Parses the raw text response from the AI assistant into structured content blocks, distinguishing between text, tool usage requests, and other elements.
    *   **Key Inputs:** The raw string response from the AI model.
    *   **Key Outputs:** An array of `AssistantMessageContent` blocks.

*   **`presentAssistantMessage` (`src/core/assistant-message/presentAssistantMessage.ts`)**
    *   **Purpose:** Processes the parsed assistant message blocks and interacts with the `Task` instance to display information to the user, execute tools, or handle other actions based on the assistant's output.
    *   **Key Inputs:** The `Task` instance, parsed `AssistantMessageContent` blocks.
    *   **Key Outputs:** Updates to the UI (via `Task.say` or `Task.ask`), initiation of tool execution.

*   **`summarizeConversation` (`src/core/condense/index.ts`)**
    *   **Purpose:** Implements the logic for condensing the conversation history to manage context window limits, creating a summary of older messages.
    *   **Key Inputs:** Current API conversation history, API handler, system prompt, task ID, token counts.
    *   **Key Outputs:** Modified conversation history with a summary, cost of summarization, new token counts.

This list is not exhaustive but covers many of the core components responsible for the extension's complex behavior. Understanding these pieces is crucial for comprehending the overall data flow and control logic within Roo Code.

---

## 5. External Dependencies
## External Dependencies

This section lists the key third-party libraries and frameworks used by Roo Code, as identified from its `src/package.json` file. These dependencies provide a wide range of functionalities, from AI model interaction to UI components and development utilities.

**Core Functionality & AI Interaction:**

*   **`@anthropic-ai/sdk`**: Official SDK for interacting with Anthropic's AI models (e.g., Claude).
*   **`@anthropic-ai/bedrock-sdk`**: SDK for Anthropic models via AWS Bedrock.
*   **`@anthropic-ai/vertex-sdk`**: SDK for Anthropic models via Google Vertex AI.
*   **`@aws-sdk/client-bedrock-runtime`**: AWS SDK for Bedrock runtime, used for AI model invocation.
*   **`@aws-sdk/credential-providers`**: Handles AWS credential providing for services like Bedrock.
*   **`@google/genai`**: Google AI SDK, likely for Gemini models.
*   **`@mistralai/mistralai`**: SDK for interacting with Mistral AI models.
*   **`openai`**: Official OpenAI SDK for models like GPT-3.5/4.
*   **`@modelcontextprotocol/sdk`**: SDK for the Model Context Protocol, enabling extensible tool use.
*   **`@qdrant/js-client-rest`**: Client for Qdrant vector database, likely used for code indexing and semantic search features.
*   **`tiktoken`**: Used for counting tokens in text, essential for managing context windows with LLMs.
*   **`axios`**: Promise-based HTTP client for making API requests.
*   **`cheerio`**: Fast, flexible, and lean implementation of core jQuery designed specifically for the server, likely used for parsing HTML content (e.g., from web browsing tools).
*   **`turndown`**: Converts HTML to Markdown.

**VS Code Integration & UI:**

*   **`@vscode/codicons`**: Provides the official VS Code icons.
*   **`monaco-vscode-textmate-theme-converter`**: Likely used for theme conversion or compatibility related to the editor.
*   **`vscode-material-icons`**: Provides Material Design icons for VS Code.

**Development Utilities & Tooling:**

*   **`esbuild`**: A very fast JavaScript bundler and minifier, used for building the extension.
*   **`typescript`**: The programming language used for the project.
*   **`eslint`**, **`prettier`**: For linting and code formatting.
*   **`jest`**, **`vitest`**: Testing frameworks used for unit and integration tests.
*   **`ts-jest`**: A TypeScript preprocessor for Jest.
*   **`rimraf`**: For deep deletion of files and directories (like `rm -rf`).
*   **`glob`**: For matching files using patterns.
*   **`chokidar`**: A file watching library, likely used for live reloading or recompiling during development.
*   **`simple-git`**: A lightweight interface for running git commands in Node.js.
*   **`zod`**: TypeScript-first schema declaration and validation library.
*   **`zod-to-ts`**: Generates TypeScript types from Zod schemas.

**General Purpose Libraries:**

*   **`delay`**: For adding delays in asynchronous operations.
*   **`p-limit`**: For limiting concurrency of promises.
*   **`p-wait-for`**: For waiting for a condition to become true.
*   **`serialize-error`**: Serializes errors into plain objects.
*   **`lodash.debounce`**: Provides debouncing functionality to limit the rate at which a function is called.
*   **`async-mutex`**: Provides mutex and semaphore implementations for synchronizing async operations.
*   **`diff`, `diff-match-patch`**: Libraries for computing differences between texts, used for features like code diffing.
*   **`fast-deep-equal`**: Fast deep equality checking.
*   **`fast-xml-parser`**: XML parser.
*   **`fastest-levenshtein`**: Efficient Levenshtein distance calculation (string similarity).
*   **`fzf`**: Command-line fuzzy finder, potentially used for filtering or searching lists.
*   **`get-folder-size`**: Calculates folder sizes.
*   **`google-auth-library`**: Google Auth Library for Node.js.
*   **`i18next`**: Internationalization framework.
*   **`ignore`**: Filters files based on ignore rules (like `.gitignore`).
*   **`isbinaryfile`**: Detects if a file is binary.
*   **`mammoth`**: Converts .docx files to HTML/markdown.
*   **`node-cache`**: In-memory caching.
*   **`node-ipc`**: Inter-process communication module for Node.js.
*   **`os-name`**: Gets the name of the current operating system.
*   **`pdf-parse`**: Parses PDF files.
*   **`pkce-challenge`**: Generates PKCE code challenge and verifier.
*   **`pretty-bytes`**: Converts bytes to a human-readable string.
*   **`ps-tree`**: Lists process trees.
*   **`puppeteer-chromium-resolver`**, **`puppeteer-core`**: For browser automation and control.
*   **`reconnecting-eventsource`**: EventSource client that reconnects automatically.
*   **`sanitize-filename`**: Sanitizes filenames.
*   **`say`**: Text-to-speech library.
*   **`sound-play`**: Plays sound files.
*   **`string-similarity`**: Finds similarity between two strings.
*   **`strip-ansi`**: Removes ANSI escape codes from strings.
*   **`strip-bom`**: Removes UTF-8 byte order mark (BOM) from strings.
*   **`tmp`**: Temporary file and directory creation.
*   **`tree-sitter-wasms`**, **`web-tree-sitter`**: Parser generator tool and incremental parsing library, likely used for code analysis and understanding.
*   **`uuid`**: Generates UUIDs.
*   **`workerpool`**: Offloads tasks to a pool of worker threads.
*   **`yaml`**: YAML parser and serializer.

**Workspace Dependencies (Monorepo Packages):**

*   **`@roo-code/cloud`**: Internal package, likely for cloud-related services.
*   **`@roo-code/telemetry`**: Internal package for telemetry data collection.
*   **`@roo-code/types`**: Internal package defining shared TypeScript types.
*   **`@roo-code/build`**: Internal package for build scripts and configurations.
*   **`@roo-code/config-eslint`**: Internal ESLint configurations.
*   **`@roo-code/config-typescript`**: Internal TypeScript configurations.

This extensive list of dependencies reflects the rich feature set of Roo Code, covering everything from core AI interactions and VS Code integration to various utility functions and development tools. The use of workspace dependencies indicates a monorepo structure for managing internal packages.

---

## 6. Known Limitations or TODOs
## Known Limitations or TODOs

This section outlines identified limitations, areas for future improvement, and general considerations for the Roo Code project.

**Codebase Observations:**

*   **No Explicit TODOs/FIXMEs:** Initial scans of the `src` directory using `grep` for "TODO" and "FIXME" comments did not yield any results. This suggests a relatively clean codebase in terms of explicitly marked pending tasks or known issues within comments. However, this does not preclude the existence of areas needing improvement or refactoring that are not explicitly tagged.
*   **Complexity of `src/core/task/Task.ts`**:
    *   The file `src/core/task/Task.ts` has been identified as a significantly large and complex module (over 1800 lines of code).
    *   It handles a wide range of responsibilities, including task lifecycle management, API communication, webview interaction, tool invocation, state management (pausing, resuming), and checkpointing.
    *   **Potential TODO/Refactoring Area:** Due to its size and multifaceted role, `Task.ts` represents a piece of technical debt. Future refactoring efforts could focus on breaking down this class into smaller, more specialized modules to improve maintainability, testability, and overall code clarity. For example, aspects like API message handling, Cline message handling, or specific task state transitions could potentially be encapsulated in separate classes or modules.

**General Considerations (from README.md and nature of the project):**

*   **AI Output Reliability (Inherent Limitation):**
    *   The README.md includes a standard disclaimer stating that "Roo Code, Inc does not make any representations or warranties regarding any code, models, or other tools... You assume all risks associated with the use of any such tools or outputs."
    *   This is an inherent limitation of any AI-powered coding tool. The generated code, suggestions, and actions taken by the AI agent may contain inaccuracies, errors, defects, or biases.
    *   Users are responsible for reviewing and validating all outputs and actions performed by Roo Code.
*   **Context Management:**
    *   While Roo Code 3.19 introduced "Intelligent Context Condensing," managing the context window effectively for large projects or long conversations remains a complex challenge for all LLM-based agents. There might be ongoing efforts or future needs to further refine context handling strategies.
*   **Tool Capabilities and Safety:**
    *   The ability to execute terminal commands and automate browser actions is powerful but also carries risks if not managed carefully. While there are settings like `roo-cline.allowedCommands`, ensuring robust safety and security around these tools is an ongoing concern for autonomous agents.
*   **Evolving AI Models:** The capabilities and limitations of Roo Code are tied to the underlying AI models it uses. As these models evolve, the extension may need updates to adapt to new APIs, token limits, or output formats.

**Future Work (Implied):**

*   **Continuous Improvement of AI Agent Behavior:** Enhancing the reasoning, planning, and tool-use capabilities of the AI agent is likely an ongoing effort.
*   **Expansion of Tools and Integrations:** The Model Context Protocol (MCP) suggests a framework for adding more tools. Expanding the set of available tools and integrations could be a future direction.
*   **User Experience Refinements:** As with any software, ongoing improvements to the user interface and overall user experience are expected.

While no explicit "TODO" comments were found, the complexity of certain core modules like `Task.ts` and the inherent challenges of AI-driven development suggest that there will always be areas for refactoring, enhancement, and careful consideration of limitations.

---

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
   (Relays message to extension host,
