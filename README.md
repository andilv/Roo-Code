# Roo CLI

Roo CLI is a powerful command-line interface designed to streamline your development workflow with a variety of tools, including file system operations, command execution, codebase searching, and AI provider integration.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
  - [AI Providers](#ai-providers)
  - [Custom Modes](#custom-modes)
- [Usage](#usage)
  - [Global Options](#global-options)
  - [Available Commands](#available-commands)
    - [File System Commands](#file-system-commands)
    - [Execution Commands](#execution-commands)
    - [Search Commands](#search-commands)
    - [AI Commands](#ai-commands)
    - [Configuration Commands](#configuration-commands)
    - [Mode Commands](#mode-commands)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Introduction

Roo CLI provides a suite of utilities accessible from your terminal, aiming to simplify common development tasks and integrate cutting-edge AI capabilities to assist with coding, debugging, and more.

## Features

- **File System Utilities**: Read, write, list files, and apply diffs.
- **Command Execution**: Run arbitrary terminal commands.
- **Codebase Search**: Search for files by name/pattern and search within file contents using ripgrep.
- **AI Integration**: Interact with various AI providers (e.g., OpenAI) for chat, code generation, and debugging.
- **Customizable Modes**: Define pre-set configurations (provider, model, system prompt) for specific AI tasks.
- **Configuration Management**: Easily manage API keys and settings for AI providers.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://<your-git-repo-url>/roo-cli.git # Replace with actual URL
    cd roo-cli
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the CLI:**
    Roo CLI is written in TypeScript. You'll need to compile it to JavaScript.
    ```bash
    npm run build # Assuming you have a build script in package.json, e.g., "build": "tsc"
    ```
    If no build script exists, you can compile using `tsc` directly if you have it installed globally, or set one up:
    ```bash
    npx tsc # This will compile based on tsconfig.json
    ```
    (Ensure your `tsconfig.json` has an `outDir` like `./dist` and `rootDir` like `./src`)

4.  **Make the CLI accessible (Optional, Recommended):**
    You can run the CLI using `node dist/index.js <command>` (assuming your `outDir` in `tsconfig.json` is `dist`).
    For easier global access, you can link the package:
    First, ensure `dist/index.js` has a shebang at the top:
    ```javascript
    #!/usr/bin/env node
    ```
    Then, add a `bin` field to your `package.json`:
    ```json
    // package.json
    {
      "name": "roo-cli",
      "version": "1.0.0",
      "bin": {
        "roo-cli": "./dist/index.js" // Adjust path if your output is different
      },
      // ... other configurations
    }
    ```
    Finally, run:
    ```bash
    npm link
    ```
    This will allow you to run `roo-cli` directly from any directory.

## Configuration

Roo CLI stores its configuration in the `~/.roo-cli/` directory.
-   `config.json`: For AI provider settings.
-   `modes.json`: For custom mode definitions.

These files are created automatically when you first run a relevant command.

### AI Providers

To use AI-powered commands, you need to configure at least one AI provider.

**Add a provider:**
```bash
roo-cli config add-provider <providerName> <apiKey> [options]
```
-   `<providerName>`: A name you choose for this provider (e.g., `openai`, `myOpenAI`).
-   `<apiKey>`: Your API key for the provider.
-   `[options]`:
    -   `-e, --endpoint <url>`: Specify a custom API endpoint.
    -   `-m, --model <modelName>`: Set a default model for this provider.
    -   `--custom <key=value...>`: Add provider-specific custom parameters (e.g., `apiVersion=2023-12-01-preview`).

**Example:**
```bash
roo-cli config add-provider openai YOUR_OPENAI_API_KEY -m gpt-4-turbo
roo-cli config add-provider azureOpenAI YOUR_AZURE_OAI_KEY -e https://your-resource.openai.azure.com/ --custom apiVersion=2023-07-01-preview deploymentName=gpt-35-turbo
```

**List configured providers:**
```bash
roo-cli config list-providers
```

**Remove a provider:**
```bash
roo-cli config remove-provider <providerName>
```

API keys can also be sourced from environment variables (e.g., `OPENAI_API_KEY`) if a provider is used without being explicitly added to the configuration file, though managing them via `config add-provider` is recommended for clarity.

### Custom Modes

Custom modes allow you to define presets for AI interactions, including the system prompt, provider, and model.

**Add a custom mode:**
```bash
roo-cli mode add <modeName> "<systemPrompt>" <providerName> [options]
```
-   `<modeName>`: A name for your mode (e.g., `code-reviewer`, `git-commit-generator`).
-   `"<systemPrompt>"`: The system prompt or instructions for the AI, enclosed in quotes.
-   `<providerName>`: The name of a configured AI provider to use for this mode.
-   `[options]`:
    -   `-m, --model <modelName>`: Specify a model for this mode, overriding the provider's default.

**Example:**
```bash
roo-cli mode add commit-gen "Generate a concise git commit message based on the following diff." openai -m gpt-3.5-turbo
roo-cli mode add python-dev "You are a senior Python developer. Provide expert advice and code examples." openai -m gpt-4
```

**List custom modes:**
```bash
roo-cli mode list
```

**Remove a custom mode:**
```bash
roo-cli mode remove <modeName>
```

## Usage

### Global Options
- `-v, --verbose`: Enable verbose output for more details (currently logs when enabled).
- `-h, --help`: Display help for a command.

### Available Commands

Below is a summary of commands. For detailed options for each command, use `roo-cli <command> --help` or `roo-cli <command> <subcommand> --help`.

(Note: The `hello` command is a placeholder and may be removed or changed.)

#### File System Commands
(Module: `src/commands/fileCommands.ts`)
-   `roo-cli read <filePath>`: Reads a file and prints its content.
-   `roo-cli write <filePath> <content>`: Writes content to a file.
-   `roo-cli list <dirPath>`: Lists files in a directory.
-   `roo-cli diff <filePath> <diffContent>`: Applies a diff (patch content) to a file. *(Note: The diff content should be in a standard diff format recognized by the `diff` library's `applyPatch`.)*

#### Execution Commands
(Module: `src/commands/execCommands.ts`)
-   `roo-cli exec "<command>"`: Executes a terminal command and prints its output. Ensure the command is enclosed in quotes if it contains spaces or special characters.

#### Search Commands
(Module: `src/commands/searchCommands.ts`)
-   `roo-cli search-files <query>`: Searches for files based on a glob pattern (e.g., `"src/**/*.ts"`).
-   `roo-cli search-code <query> [-p, --path <searchPath>]`: Searches for text query within files in the specified path (defaults to current directory) using ripgrep.

#### AI Commands
(Module: `src/commands/aiCommands.ts`)
-   `roo-cli chat [provider] <prompt>`:
    -   If `provider` is omitted, lists available configured providers.
    -   If `provider` and `prompt` are given, sends the prompt to the specified AI provider.
    -   Options: `-m, --model <modelName>`, `-mt, --max-tokens <maxTokens>`.
-   `roo-cli generate <prompt>`:
    -   Sends a prompt to an AI provider for code generation. Uses a default system prompt for code generation.
    -   Options: `-p, --provider <providerName>`, `-m, --model <modelName>`, `-mt, --max-tokens <maxTokens>`, `-sp, --system-prompt <customSystemPrompt>`.
-   `roo-cli debug <prompt>`:
    -   Sends a prompt (e.g., code snippet or problem description) to an AI provider for debugging help. Uses a default system prompt for debugging.
    -   Options: (similar to `generate`) `-p, --provider <providerName>`, `-m, --model <modelName>`, `-mt, --max-tokens <maxTokens>`, `-sp, --system-prompt <customSystemPrompt>`.

#### Configuration Commands
(Module: `src/commands/configCommands.ts`)
-   `roo-cli config list-providers` (alias `lp`): Lists all configured AI providers.
-   `roo-cli config add-provider <name> <apiKey> [options]`: Adds or updates an AI provider configuration.
    -   Options: `-e, --endpoint <url>`, `-m, --model <modelName>`, `--custom <key=value...>`.
-   `roo-cli config remove-provider <name>` (alias `rp`): Removes an AI provider.

#### Mode Commands
(Module: `src/commands/modeCommands.ts`)
-   `roo-cli mode list` (alias `ls`): Lists all available custom modes.
-   `roo-cli mode add <name> "<prompt>" <provider> [options]`: Adds a new custom mode.
    -   Option: `-m, --model <modelName>`.
-   `roo-cli mode remove <name>` (alias `rm`): Removes a custom mode.
-   `roo-cli mode use <name> <userPrompt>`: Activates a custom mode and sends the user's prompt to the AI.
    -   Option: `-mt, --max-tokens <maxTokens>`.

## Examples

**1. Configure an OpenAI provider:**
```bash
roo-cli config add-provider myOpenAI YOUR_OPENAI_API_KEY -m gpt-4
```

**2. Chat with your configured provider:**
```bash
roo-cli chat myOpenAI "What is the capital of France?"
```

**3. Add a custom mode for Python code generation:**
```bash
roo-cli mode add py-gen "You are an expert Python code generator. Only output valid Python code based on the user's request. Do not include any explanations unless asked." myOpenAI -m gpt-4-turbo
```

**4. Use the custom mode:**
```bash
roo-cli mode use py-gen "Create a Python function that takes a list of integers and returns the sum of even numbers."
```

**5. Generate code directly:**
```bash
roo-cli generate "Write a JavaScript function to fetch data from an API and handle errors." -p myOpenAI
```

**6. Search for all TypeScript files in `src`:**
```bash
roo-cli search-files "src/**/*.ts"
```

**7. Search for the term "TODO" in your codebase:**
```bash
roo-cli search-code "TODO" -p ./
```

**8. Write "hello" to a file:**
```bash
roo-cli write greeting.txt "Hello from Roo CLI!"
cat greeting.txt
```

## Contributing

Contributions are welcome! Please refer to the `CONTRIBUTING.md` file (if available) or open an issue/pull request on the repository.

## License

This project is licensed under the ISC License. (Or your chosen license)
```
