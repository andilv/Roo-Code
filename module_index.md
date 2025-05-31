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
