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
