import * as fs from "fs"
import * as path from "path"
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileLogger, LogLevel, LoggerOptions } from "../FileLogger"

// Mock the fs module
vi.mock("fs")

describe("FileLogger", () => {
	let logger: FileLogger
	const mockLogDir = "/tmp/test-logs"
	const mockLogFilename = "test.log"
	const mockLogFilePath = path.join(mockLogDir, mockLogFilename)
	const mockTag = "TestLogger"

	const loggerOptions: LoggerOptions = {
		logDir: mockLogDir,
		filename: mockLogFilename,
		tag: mockTag,
	}

	let mockWriteStream: vi.Mocked<fs.WriteStream>

	beforeEach(() => {
		// Reset mocks for fs
		vi.clearAllMocks()

		// Mock fs.mkdirSync
		vi.mocked(fs.mkdirSync).mockReturnValue(undefined)

		// Mock fs.createWriteStream
		mockWriteStream = {
			write: vi.fn(),
			end: vi.fn(),
		} as unknown as vi.Mocked<fs.WriteStream>
		vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream)

		// Spy on console.log
		vi.spyOn(console, "log").mockImplementation(() => {})
		vi.spyOn(console, "error").mockImplementation(() => {})

		logger = new FileLogger(loggerOptions)
	})

	afterEach(() => {
		if (logger) {
			logger.close()
		}
		vi.restoreAllMocks()
	})

	it("should initialize and create log directory and file", () => {
		expect(fs.mkdirSync).toHaveBeenCalledWith(mockLogDir, { recursive: true })
		expect(fs.createWriteStream).toHaveBeenCalledWith(mockLogFilePath, {
			flags: "a",
		})
	})

	it("should handle error when creating log directory", () => {
		vi.mocked(fs.mkdirSync).mockImplementation(() => {
			throw new Error("Test mkdir error")
		})
		new FileLogger(loggerOptions) // Initialize again to trigger error
		expect(console.error).toHaveBeenCalledWith(
			`Failed to create log directory ${mockLogDir}:`,
			expect.any(Error),
		)
	})

	it("should handle error when creating log file stream", () => {
		vi.mocked(fs.createWriteStream).mockImplementation(() => {
			throw new Error("Test createWriteStream error")
		})
		new FileLogger(loggerOptions) // Initialize again to trigger error
		expect(console.error).toHaveBeenCalledWith(
			`Failed to create log file ${mockLogFilePath}:`,
			expect.any(Error),
		)
	})

	const testCases = [
		{ level: LogLevel.INFO, method: "info" as keyof FileLogger },
		{ level: LogLevel.ERROR, method: "error" as keyof FileLogger },
		{ level: LogLevel.WARN, method: "warn" as keyof FileLogger },
		{ level: LogLevel.DEBUG, method: "debug" as keyof FileLogger },
	]

	testCases.forEach(({ level, method }) => {
		it(`should write ${level} message to log stream and console`, () => {
			const message = `This is a ${level} message`
			const arg1 = { data: "test" }
			const arg2 = 123
			;(logger[method] as (message: string, ...args: unknown[]) => void)(
				message,
				arg1,
				arg2,
			)

			expect(mockWriteStream.write).toHaveBeenCalledTimes(1)
			const logLine = vi.mocked(mockWriteStream.write).mock.calls[0][0]

			expect(logLine).toContain(`| ${level} | ${mockTag}] ${message}`)
			expect(logLine).toContain(JSON.stringify([arg1, arg2]))
			expect(logLine).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) // ISO timestamp

			expect(console.log).toHaveBeenCalledWith(logLine.trim())
		})

		it(`should write ${level} message without additional args`, () => {
			const message = `Another ${level} message`
			;(logger[method] as (message: string, ...args: unknown[]) => void)(message)

			expect(mockWriteStream.write).toHaveBeenCalledTimes(1)
			const logLine = vi.mocked(mockWriteStream.write).mock.calls[0][0]

			expect(logLine).toContain(`| ${level} | ${mockTag}] ${message}
`) // Note the space and newline
			expect(logLine).not.toContain("[]") // Should not include empty args array string
		})
	})

	it("should use INFO level for log() method", () => {
		const message = "This is a log message"
		logger.log(message, "extra")

		expect(mockWriteStream.write).toHaveBeenCalledTimes(1)
		const logLine = vi.mocked(mockWriteStream.write).mock.calls[0][0]

		expect(logLine).toContain(`| ${LogLevel.INFO} | ${mockTag}] ${message}`)
		expect(logLine).toContain(JSON.stringify(["extra"]))
	})

	it("should close the log stream", () => {
		logger.close()
		expect(mockWriteStream.end).toHaveBeenCalledTimes(1)
		// Try logging after close
		logger.info("Test after close")
		// Write should not be called again on the original stream
		expect(mockWriteStream.write).not.toHaveBeenCalled()
		// Console.log will still be called
		expect(console.log).toHaveBeenCalled()
	})

	it("should not throw if logStream is undefined when writing", () => {
		// Simulate logStream failing to initialize
		vi.mocked(fs.createWriteStream).mockImplementation(() => {
			throw new Error("failed to create stream")
		})
		const errorLogger = new FileLogger({...loggerOptions, filename: "error.log"})

		// Ensure console.error was called during initialization due to the mocked error
		expect(console.error).toHaveBeenCalledWith(
			`Failed to create log file ${path.join(mockLogDir, "error.log")}:`,
			expect.any(Error),
		)

		// Clear console.error mock calls from initialization
		vi.mocked(console.error).mockClear()

		expect(() => errorLogger.info("Test message")).not.toThrow()
		expect(console.error).not.toHaveBeenCalledWith( // Should not log "Failed to write to log file"
			`Failed to write to log file ${path.join(mockLogDir, "error.log")}:`,
			expect.any(Error)
		)
	})

	it("should handle error during write operation", () => {
		const writeError = new Error("Test write error");
		vi.mocked(mockWriteStream.write).mockImplementation(() => {
			throw writeError
		})

		logger.info("A message that will fail to write")

		expect(console.error).toHaveBeenCalledWith(
			`Failed to write to log file ${mockLogFilePath}:`,
			writeError,
		)
	})
})
