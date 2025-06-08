import { vi, describe, it, expect, beforeEach, afterEach, Mock, SpyInstance } from "vitest"
import PQueue from "p-queue"

// Mock PQueue first
const mockQueueAddAll = vi.fn().mockResolvedValue(undefined)
const mockQueueOnIdle = vi.fn().mockResolvedValue(undefined) // Or whatever onIdle returns
vi.mock("p-queue", () => {
	// Default export mock
	return {
		default: vi.fn().mockImplementation(() => ({
			addAll: mockQueueAddAll,
			onIdle: mockQueueOnIdle, // Or just a vi.fn() if it's event-based
			// Add other PQueue methods/properties if used by runEvals
		})),
	}
})

import * as db from "../../db/index.js"
import * as utils from "../utils.js"
import * as processTaskModule from "../processTask.js"
import * as redis from "../redis.js"
import { FileLogger } from "../FileLogger.js"
import { runEvals } from "../runEvals.js" // Function to test
import { type Run, type Task } from "@roo-code/types"

// Mock other dependencies
vi.mock("../../db/index.js")
vi.mock("../utils.js")
vi.mock("../processTask.js")
vi.mock("../redis.js")
vi.mock("../FileLogger.js")


const mockRun: Run = {
	id: 1,
	evalId: "eval-1",
	providerId: "provider-1",
	modelId: "model-1",
	promptId: "prompt-1",
	status: "running",
	concurrency: 2,
	createdAt: new Date(),
	updatedAt: new Date(),
	taskMetricsId: null, // Default to not finished
}

const mockTasks: Task[] = [
	{ id: 1, runId: 1, exercise: "ex1", language: "js", status: "pending", finishedAt: null } as Task,
	{ id: 2, runId: 1, exercise: "ex2", language: "ts", status: "pending", finishedAt: null } as Task,
	{ id: 3, runId: 1, exercise: "ex3", language: "py", status: "completed", finishedAt: new Date() } as Task, // Already finished
]

describe("runEvals", () => {
	let mockLoggerInstance: FileLogger
	let mockHeartbeatInterval: NodeJS.Timeout

	beforeEach(() => {
		vi.clearAllMocks()

		// Reset PQueue mocks for each test
		mockQueueAddAll.mockClear().mockResolvedValue(undefined);
		(PQueue as Mock).mockClear().mockImplementation(() => ({
			addAll: mockQueueAddAll,
			onIdle: vi.fn().mockResolvedValue(undefined) // Fresh onIdle for each PQueue instance
		}));


		mockLoggerInstance = new FileLogger({logDir: "test", filename: "test.log", tag: "test"}) as jest.Mocked<FileLogger>
		vi.spyOn(mockLoggerInstance, "info")
		vi.spyOn(mockLoggerInstance, "error")
		vi.spyOn(mockLoggerInstance, "close")
		;(FileLogger as Mock).mockReturnValue(mockLoggerInstance)

		;(db.findRun as Mock).mockResolvedValue(mockRun)
		;(db.getTasks as Mock).mockResolvedValue(mockTasks)
		;(db.finishRun as Mock).mockResolvedValue({ runId: mockRun.id, totalTasks: 2, passedTasks: 1, successRate: 0.5 })


		;(utils.isDockerContainer as Mock).mockReturnValue(false) // Default to not containerized
		;(utils.resetEvalsRepo as Mock).mockResolvedValue(undefined)
		;(utils.commitEvalsRepoChanges as Mock).mockResolvedValue(undefined)
		;(utils.getTag as Mock).mockReturnValue("test-tag")

		mockHeartbeatInterval = setTimeout(() => {}, 1000) as unknown as NodeJS.Timeout // Mock timeout object
		;(redis.startHeartbeat as Mock).mockResolvedValue(mockHeartbeatInterval)
		;(redis.stopHeartbeat as Mock).mockResolvedValue(undefined)

		;(processTaskModule.processTask as Mock).mockResolvedValue(undefined)
		;(processTaskModule.processTaskInContainer as Mock).mockResolvedValue(undefined)
	})

	it("should throw an error if the run is already finished", async () => {
		(db.findRun as Mock).mockResolvedValue({ ...mockRun, taskMetricsId: 123 })
		await expect(runEvals(mockRun.id)).rejects.toThrow(`Run ${mockRun.id} already finished.`)
	})

	it("should throw an error if the run has no tasks", async () => {
		(db.getTasks as Mock).mockResolvedValue([])
		await expect(runEvals(mockRun.id)).rejects.toThrow(`Run ${mockRun.id} has no tasks.`)
	})

	it("should initialize logger, reset repo (if not containerized), and start heartbeat", async () => {
		await runEvals(mockRun.id)
		expect(FileLogger).toHaveBeenCalledWith({
			logDir: `/var/log/evals/runs/${mockRun.id}`,
			filename: "controller.log",
			tag: "test-tag",
		})
		expect(utils.isDockerContainer).toHaveBeenCalled()
		expect(utils.resetEvalsRepo).toHaveBeenCalledWith({ run: mockRun, cwd: "/evals" })
		expect(redis.startHeartbeat).toHaveBeenCalledWith(mockRun.id)
	})

	it("should NOT reset repo if containerized", async () => {
		(utils.isDockerContainer as Mock).mockReturnValue(true)
		await runEvals(mockRun.id)
		expect(utils.resetEvalsRepo).not.toHaveBeenCalled()
	})

	it("should create a PQueue with correct concurrency", async () => {
		await runEvals(mockRun.id)
		expect(PQueue).toHaveBeenCalledWith({ concurrency: mockRun.concurrency })
	})

	it("should add unfinished tasks to the queue and process them (non-containerized)", async () => {
		await runEvals(mockRun.id)

		const unfinishedTasks = mockTasks.filter(t => t.finishedAt === null)
		expect(mockQueueAddAll).toHaveBeenCalledTimes(1)
		const addedFunctions = mockQueueAddAll.mock.calls[0][0] as (() => Promise<void>)[]
		expect(addedFunctions).toHaveLength(unfinishedTasks.length)

		// Simulate PQueue executing a task
		await addedFunctions[0]() // Execute the first task function
		expect(processTaskModule.processTask).toHaveBeenCalledWith({ taskId: unfinishedTasks[0].id, logger: mockLoggerInstance })
		expect(processTaskModule.processTaskInContainer).not.toHaveBeenCalled()
	})

	it("should add unfinished tasks to the queue and process them (containerized)", async () => {
		(utils.isDockerContainer as Mock).mockReturnValue(true)
		await runEvals(mockRun.id)

		const unfinishedTasks = mockTasks.filter(t => t.finishedAt === null)
		expect(mockQueueAddAll).toHaveBeenCalledTimes(1)
		const addedFunctions = mockQueueAddAll.mock.calls[0][0] as (() => Promise<void>)[]
		expect(addedFunctions).toHaveLength(unfinishedTasks.length)

		await addedFunctions[0]()
		expect(processTaskModule.processTaskInContainer).toHaveBeenCalledWith({ taskId: unfinishedTasks[0].id, logger: mockLoggerInstance })
		expect(processTaskModule.processTask).not.toHaveBeenCalled()
	})

	it("should log error if processTask fails and continue", async () => {
		const taskError = new Error("Task processing failed")
		;(processTaskModule.processTask as Mock).mockRejectedValueOnce(taskError) // First task fails
		;(processTaskModule.processTask as Mock).mockResolvedValueOnce(undefined) // Second task succeeds

		await runEvals(mockRun.id)
		const addedFunctions = mockQueueAddAll.mock.calls[0][0] as (() => Promise<void>)[]

		// Simulate execution of all tasks by PQueue
		for(const fn of addedFunctions) {
			await fn()
		}

		expect(mockLoggerInstance.error).toHaveBeenCalledWith("error processing task", taskError)
		expect(processTaskModule.processTask).toHaveBeenCalledTimes(2) // Both unfinished tasks attempted
	})


	it("should call finishRun and commit changes (if not containerized) after queue processing", async () => {
		// To ensure queue processing completes for this test, we can assume onIdle is used or addAll completes
		mockQueueAddAll.mockImplementation(async (tasksToAdd) => {
			for (const taskFn of tasksToAdd) {
				await taskFn();
			}
		});

		await runEvals(mockRun.id)

		expect(mockLoggerInstance.info).toHaveBeenCalledWith("finishRun")
		expect(db.finishRun).toHaveBeenCalledWith(mockRun.id)
		expect(mockLoggerInstance.info).toHaveBeenCalledWith("result ->", { runId: mockRun.id, totalTasks: 2, passedTasks: 1, successRate: 0.5 })
		expect(utils.commitEvalsRepoChanges).toHaveBeenCalledWith({ run: mockRun, cwd: "/evals" })
	})

	it("should NOT commit changes if containerized", async () => {
		(utils.isDockerContainer as Mock).mockReturnValue(true)
		mockQueueAddAll.mockImplementation(async (tasksToAdd) => {
			for (const taskFn of tasksToAdd) {
				await taskFn();
			}
		});
		await runEvals(mockRun.id)
		expect(utils.commitEvalsRepoChanges).not.toHaveBeenCalled()
	})

	it("should stop heartbeat and close logger in finally block on success", async () => {
		mockQueueAddAll.mockImplementation(async (tasksToAdd) => {
			for (const taskFn of tasksToAdd) {
				await taskFn();
			}
		});
		await runEvals(mockRun.id)
		expect(mockLoggerInstance.info).toHaveBeenCalledWith("cleaning up")
		expect(redis.stopHeartbeat).toHaveBeenCalledWith(mockRun.id, mockHeartbeatInterval)
		expect(mockLoggerInstance.close).toHaveBeenCalled()
	})

	it("should stop heartbeat and close logger in finally block on error (e.g., finishRun fails)", async () => {
		const finishRunError = new Error("finishRun failed")
		;(db.finishRun as Mock).mockRejectedValue(finishRunError)

		mockQueueAddAll.mockImplementation(async (tasksToAdd) => {
			for (const taskFn of tasksToAdd) {
				await taskFn();
			}
		});

		await expect(runEvals(mockRun.id)).rejects.toThrow(finishRunError)

		expect(mockLoggerInstance.info).toHaveBeenCalledWith("cleaning up")
		expect(redis.stopHeartbeat).toHaveBeenCalledWith(mockRun.id, mockHeartbeatInterval)
		expect(mockLoggerInstance.close).toHaveBeenCalled()
	})

	it("should handle empty list of tasks to add to queue gracefully", async () => {
		(db.getTasks as Mock).mockResolvedValue([
			{ id: 3, runId: 1, exercise: "ex3", language: "py", status: "completed", finishedAt: new Date() } as Task, // All tasks already finished
		]);

		mockQueueAddAll.mockImplementation(async (tasksToAdd) => {
			expect(tasksToAdd).toHaveLength(0); // Assert that PQueue.addAll is called with an empty array
			for (const taskFn of tasksToAdd) { // Loop won't run
				await taskFn();
			}
		});

		await runEvals(mockRun.id);

		expect(mockQueueAddAll).toHaveBeenCalledWith([]); // Explicitly check it was called with empty array
		expect(processTaskModule.processTask).not.toHaveBeenCalled();
		expect(processTaskModule.processTaskInContainer).not.toHaveBeenCalled();
		expect(db.finishRun).toHaveBeenCalled(); // Should still try to finish the run
	});

})
