import { vi, describe, it, expect, beforeEach, afterEach, Mock } from "vitest"
import { execa } from "execa"
import { RooCodeEventName, type Task, type Run } from "@roo-code/types"

import * as db from "../../db/index.js"
import * as redis from "../redis.js"
import * as runTaskModule from "../runTask.js"
import * as runUnitTestModule from "../runUnitTest.js"
import { FileLogger } from "../FileLogger.js"
import { processTask, processTaskInContainer } from "../processTask.js"

// Mock dependencies
vi.mock("execa")
vi.mock("../../db/index.js")
vi.mock("../redis.js")
vi.mock("../runTask.js")
vi.mock("../runUnitTest.js")
vi.mock("../FileLogger.js")

const mockTask: Task = {
	id: 1,
	runId: 1,
	exercise: "test-exercise",
	language: "javascript",
	goal: "Test goal",
	source: "provided",
	instructions: "Do this",
	startingCode: "// Start here",
	solution: "// Solution here",
	type: "code",
	status: "pending",
	createdAt: new Date(),
	updatedAt: new Date(),
}

const mockRun: Run = {
	id: 1,
	evalId: "eval-1",
	providerId: "provider-1",
	modelId: "model-1",
	promptId: "prompt-1",
	status: "running",
	createdAt: new Date(),
	updatedAt: new Date(),
}

describe("processTask", () => {
	let mockLogger: FileLogger
	let mockRedisClient: { publish: Mock }

	beforeEach(() => {
		vi.clearAllMocks()

		mockLogger = new FileLogger({
			logDir: "/test",
			filename: "test.log",
			tag: "test",
		}) as jest.Mocked<FileLogger>
		vi.spyOn(mockLogger, "info")
		vi.spyOn(mockLogger, "error")

		// Mock DB functions
		;(db.findTask as Mock).mockResolvedValue(mockTask)
		;(db.findRun as Mock).mockResolvedValue(mockRun)
		;(db.updateTask as Mock).mockResolvedValue(undefined)

		// Mock Redis functions
		mockRedisClient = { publish: vi.fn().mockResolvedValue(undefined) }
		;(redis.redisClient as Mock).mockResolvedValue(mockRedisClient)
		;(redis.registerRunner as Mock).mockResolvedValue(undefined)
		;(redis.deregisterRunner as Mock).mockResolvedValue(undefined)
		;(redis.getPubSubKey as Mock).mockReturnValue("test-pubsub-key")

		// Mock task execution modules
		;(runTaskModule.runTask as Mock).mockResolvedValue(undefined)
		;(runUnitTestModule.runUnitTest as Mock).mockResolvedValue(true) // Default to tests passing
	})

	it("should process a task successfully when tests pass", async () => {
		await processTask({ taskId: mockTask.id, logger: mockLogger })

		expect(db.findTask).toHaveBeenCalledWith(mockTask.id)
		expect(db.findRun).toHaveBeenCalledWith(mockTask.runId)
		expect(redis.registerRunner).toHaveBeenCalledWith({ runId: mockRun.id, taskId: mockTask.id })
		expect(mockLogger.info).toHaveBeenCalledWith(
			`running task ${mockTask.id} (${mockTask.language}/${mockTask.exercise})...`,
		)
		expect(runTaskModule.runTask).toHaveBeenCalledWith({
			run: mockRun,
			task: mockTask,
			publish: expect.any(Function),
			logger: mockLogger,
		})
		expect(mockLogger.info).toHaveBeenCalledWith(
			`testing task ${mockTask.id} (${mockTask.language}/${mockTask.exercise})...`,
		)
		expect(runUnitTestModule.runUnitTest).toHaveBeenCalledWith({ run: mockRun, task: mockTask })
		expect(mockLogger.info).toHaveBeenCalledWith(
			`task ${mockTask.id} (${mockTask.language}/${mockTask.exercise}) -> true`,
		)
		expect(db.updateTask).toHaveBeenCalledWith(mockTask.id, { passed: true })
		expect(mockRedisClient.publish).toHaveBeenCalledWith(
			"test-pubsub-key",
			JSON.stringify({ eventName: RooCodeEventName.EvalPass, taskId: mockTask.id }),
		)
		expect(redis.deregisterRunner).toHaveBeenCalledWith({ runId: mockRun.id, taskId: mockTask.id })
	})

	it("should process a task successfully when tests fail", async () => {
		;(runUnitTestModule.runUnitTest as Mock).mockResolvedValue(false) // Tests fail

		await processTask({ taskId: mockTask.id, logger: mockLogger })

		expect(db.updateTask).toHaveBeenCalledWith(mockTask.id, { passed: false })
		expect(mockRedisClient.publish).toHaveBeenCalledWith(
			"test-pubsub-key",
			JSON.stringify({ eventName: RooCodeEventName.EvalFail, taskId: mockTask.id }),
		)
		expect(mockLogger.info).toHaveBeenCalledWith(
			`task ${mockTask.id} (${mockTask.language}/${mockTask.exercise}) -> false`,
		)
		expect(redis.deregisterRunner).toHaveBeenCalledWith({ runId: mockRun.id, taskId: mockTask.id })
	})

	it("should use provided logger if available", async () => {
		const providedLogger = new FileLogger({ logDir: "/provided", filename: "provided.log", tag: "provided"}) as jest.Mocked<FileLogger>;
		vi.spyOn(providedLogger, "info");
		await processTask({ taskId: mockTask.id, logger: providedLogger });
		expect(providedLogger.info).toHaveBeenCalled();
		expect(FileLogger).not.toHaveBeenCalledWith(expect.objectContaining({ tag: expect.stringContaining("runTask")}));
	});

	it("should initialize FileLogger if not provided", async () => {
		await processTask({ taskId: mockTask.id /* logger not provided */ })
		expect(FileLogger).toHaveBeenCalledWith({
			logDir: `/var/log/evals/runs/${mockRun.id}`,
			filename: `${mockTask.language}-${mockTask.exercise}.log`,
			tag: expect.stringContaining("runTask"),
		})
	})

	it("should deregister runner even if runTask throws an error", async () => {
		const testError = new Error("runTask failed")
		;(runTaskModule.runTask as Mock).mockRejectedValue(testError)

		await expect(processTask({ taskId: mockTask.id, logger: mockLogger })).rejects.toThrow(testError)

		expect(redis.deregisterRunner).toHaveBeenCalledWith({ runId: mockRun.id, taskId: mockTask.id })
	})

	it("should deregister runner even if runUnitTest throws an error", async () => {
		const testError = new Error("runUnitTest failed")
		;(runUnitTestModule.runUnitTest as Mock).mockRejectedValue(testError)

		await expect(processTask({ taskId: mockTask.id, logger: mockLogger })).rejects.toThrow(testError)

		expect(redis.deregisterRunner).toHaveBeenCalledWith({ runId: mockRun.id, taskId: mockTask.id })
	})

	it("should deregister runner even if updateTask throws an error", async () => {
		const testError = new Error("updateTask failed");
		(db.updateTask as Mock).mockRejectedValue(testError);

		await expect(processTask({ taskId: mockTask.id, logger: mockLogger })).rejects.toThrow(testError);

		expect(redis.deregisterRunner).toHaveBeenCalledWith({ runId: mockRun.id, taskId: mockTask.id });
	});
})

describe("processTaskInContainer", () => {
	let mockLogger: FileLogger
	const taskId = 123
	const maxRetries = 2 // For faster tests

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers() // For controlling setTimeout

		mockLogger = new FileLogger({
			logDir: "/test-container",
			filename: "container.log",
			tag: "container-test",
		}) as jest.Mocked<FileLogger>
		vi.spyOn(mockLogger, "info")
		vi.spyOn(mockLogger, "error")
		vi.spyOn(mockLogger, "warn") // If you add warnings

		;(execa as unknown as Mock).mockResolvedValue({ exitCode: 0 }) // Default to success
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("should execute task in container successfully on the first attempt", async () => {
		await processTaskInContainer({ taskId, logger: mockLogger, maxRetries })

		const expectedCommand = `pnpm --filter @roo-code/evals cli --taskId ${taskId}`
		expect(mockLogger.info).toHaveBeenCalledWith(expectedCommand)
		expect(mockLogger.info).toHaveBeenCalledWith(
			`executing container command (attempt 1/${maxRetries + 1})`,
		)
		expect(execa).toHaveBeenCalledWith(
			expect.stringContaining(`docker run --name evals-task-${taskId}.0`),
			{ shell: true },
		)
		expect(execa).toHaveBeenCalledWith(
			expect.stringContaining(expectedCommand),
			{ shell: true },
		)
		expect(mockLogger.info).toHaveBeenCalledWith("container process completed with exit code: 0")
		expect(mockLogger.error).not.toHaveBeenCalled()
	})

	it("should retry on failure and succeed", async () => {
		(execa as unknown as Mock)
			.mockRejectedValueOnce({ exitCode: 1, message: "Docker error" }) // First attempt fails
			.mockResolvedValueOnce({ exitCode: 0 }) // Second attempt succeeds

		const promise = processTaskInContainer({ taskId, logger: mockLogger, maxRetries })

		// Advance timers for the first delay
		await vi.runOnlyPendingTimersAsync()


		await promise

		expect(mockLogger.info).toHaveBeenCalledWith(
			`executing container command (attempt 1/${maxRetries + 1})`,
		)
		expect(mockLogger.error).toHaveBeenCalledWith(
			`container process failed with exit code: 1 (attempt 1/${maxRetries + 1})`,
		)

		// Manually check for the specific log message due to potential issues with stringMatching in complex scenarios
		const infoCalls = mockLogger.info.mock.calls;
		const expectedPattern = /retrying in \d+(\.\d+)?ms \(attempt 2\//; // Account for float
		const matchFound = infoCalls.some(callArgs =>
			typeof callArgs[0] === 'string' && expectedPattern.test(callArgs[0])
		);
		expect(matchFound).toBe(true);

		expect(mockLogger.info).toHaveBeenCalledWith(
			`retrying container command (attempt 2/${maxRetries + 1})`,
		)
		expect(execa).toHaveBeenCalledTimes(2)
		expect(mockLogger.info).toHaveBeenCalledWith("container process completed with exit code: 0")
	})

	it("should fail after all retries are exhausted", async () => {
		(execa as unknown as Mock).mockRejectedValue({ exitCode: 1, message: "Persistent Docker error" })

		const promise = processTaskInContainer({ taskId, logger: mockLogger, maxRetries })

		// Advance timers for all retry delays
		for (let i = 0; i < maxRetries; i++) {
			await vi.runOnlyPendingTimersAsync()
		}

		await promise


		expect(execa).toHaveBeenCalledTimes(maxRetries + 1)
		// Each attempt logs an error, plus one "giving up" error.
		expect(mockLogger.error).toHaveBeenCalledTimes(maxRetries + 1 + 1)
		// Check that one of the error calls was the final attempt's failure message
		expect(mockLogger.error).toHaveBeenCalledWith(
			`container process failed with exit code: 1 (attempt ${maxRetries + 1}/${maxRetries + 1})`
		)
		// Check that the actual last call was the "giving up" message
		expect(mockLogger.error).toHaveBeenLastCalledWith(
			`all ${maxRetries + 1} attempts failed, giving up`
		)
	})

	it("should handle non-object errors from execa", async () => {
		(execa as unknown as Mock).mockRejectedValue("Some string error")

		await processTaskInContainer({ taskId, logger: mockLogger, maxRetries: 0 }); // Only one attempt

		expect(mockLogger.error).toHaveBeenCalledWith(
			`container process failed with error: Some string error (attempt 1/1)`
		);
		expect(mockLogger.error).toHaveBeenCalledWith(`all 1 attempts failed, giving up`);
	});

	it("should construct docker command correctly", async () => {
		await processTaskInContainer({ taskId, logger: mockLogger, maxRetries: 0 })
		const command = (execa as unknown as Mock).mock.calls[0][0] as string

		expect(command).toContain("docker run")
		expect(command).toContain("--rm")
		expect(command).toContain("--network evals_default")
		expect(command).toContain("-v /var/run/docker.sock:/var/run/docker.sock")
		expect(command).toContain("-v /tmp/evals:/var/log/evals")
		expect(command).toContain("-e HOST_EXECUTION_METHOD=docker")
		expect(command).toContain(`--name evals-task-${taskId}.0`)
		expect(command).toContain("evals-runner sh -c")
		expect(command).toContain(`pnpm --filter @roo-code/evals cli --taskId ${taskId}`)
	})
})
