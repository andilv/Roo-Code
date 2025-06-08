import { vi, describe, it, expect, beforeEach, afterEach, Mock, SpyInstance } from "vitest"
import { createClient, type RedisClientType } from "redis" // Actual import for type, mock below
import { EVALS_TIMEOUT } from "@roo-code/types"

// Import functions to be tested AND the reset function
import {
	redisClient,
	getPubSubKey,
	getRunnersKey,
	getHeartbeatKey,
	registerRunner,
	deregisterRunner,
	startHeartbeat,
	stopHeartbeat,
	resetRedisClientForTest, // Import the reset function
} from "../redis"

// Mock the 'redis' library itself
vi.mock("redis", async () => {
	const actualRedis = await vi.importActual<typeof import("redis")>("redis")
	// IMPORTANT: This mockClient is a SHARED object.
	const mockClient = {
		on: vi.fn(),
		connect: vi.fn().mockResolvedValue(undefined),
		sAdd: vi.fn().mockResolvedValue(0),
		expire: vi.fn().mockResolvedValue(true),
		sRem: vi.fn().mockResolvedValue(0),
		setEx: vi.fn().mockResolvedValue("OK"),
		del: vi.fn().mockResolvedValue(0),
		publish: vi.fn().mockResolvedValue(0),
		isReady: true,
		isOpen: true,
	}
	return {
		...actualRedis,
		createClient: vi.fn(() => mockClient), // createClient always returns the same mockClient
	}
})

// Hold a reference to the mocked client instance methods for assertions
let mockRedisClientInstance: ReturnType<typeof createClient>

describe("Redis Functions", () => {
	let consoleErrorSpy: SpyInstance

	beforeEach(() => {
		vi.useFakeTimers();
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		resetRedisClientForTest(); // Reset SUT's singleton state

		// Get the shared mock client. This call to createClient will be cleared by clearAllMocks.
		// We get the reference *before* clearAllMocks so we have the correct object.
		mockRedisClientInstance = (createClient as Mock)();

		vi.clearAllMocks(); // Clears history for ALL mocks, including createClient and methods on mockClient.
                            // After this, createClient has effectively been called 0 times for assertion purposes in tests.
                            // Methods like mockClient.on are reset vi.fn()s.

		// Re-establish default behaviors for the methods on the (shared) mockRedisClientInstance
		(mockRedisClientInstance.on as Mock).mockImplementation(() => mockRedisClientInstance); // Chainable
		(mockRedisClientInstance.connect as Mock).mockResolvedValue(undefined);
		(mockRedisClientInstance.sAdd as Mock).mockResolvedValue(0);
		(mockRedisClientInstance.expire as Mock).mockResolvedValue(true);
		(mockRedisClientInstance.sRem as Mock).mockResolvedValue(0);
		(mockRedisClientInstance.setEx as Mock).mockResolvedValue("OK");
		(mockRedisClientInstance.del as Mock).mockResolvedValue(0);
		(mockRedisClientInstance.publish as Mock).mockResolvedValue(0);
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks() // This will restore console.error and clear mock call history for spies
	})

	describe("redisClient", () => {
		it("should create, connect, and return a Redis client instance on first call", async () => {
			const client = await redisClient()
			expect(createClient).toHaveBeenCalledTimes(1)
			expect(createClient).toHaveBeenCalledWith({ url: "redis://localhost:6379" }) // Default URL
			expect(mockRedisClientInstance.on).toHaveBeenCalledWith("error", expect.any(Function))
			expect(mockRedisClientInstance.connect).toHaveBeenCalledTimes(1)
			expect(client).toBe(mockRedisClientInstance)
		})

		it("should use REDIS_URL from environment if available", async () => {
			process.env.REDIS_URL = "redis://custom:1234"
			const client = await redisClient()
			expect(createClient).toHaveBeenCalledWith({ url: "redis://custom:1234" })
			delete process.env.REDIS_URL // Clean up env var
		})

		it("should return the same client instance on subsequent calls (singleton)", async () => {
			const client1 = await redisClient() // First call, creates and connects
			const client2 = await redisClient() // Second call, should return existing
			expect(createClient).toHaveBeenCalledTimes(1) // Still only 1 createClient call
			expect(mockRedisClientInstance.connect).toHaveBeenCalledTimes(1) // Still only 1 connect call
			expect(client1).toBe(client2)
			expect(client1).toBe(mockRedisClientInstance)
		})

		it("should log an error if client.on receives an error", async () => {
			const testError = new Error("Redis connection error")
			await redisClient() // Initializes client and attaches 'on' handler

			const onErrorCallback = (mockRedisClientInstance.on as Mock).mock.calls.find(call => call[0] === 'error')?.[1]
			expect(onErrorCallback).toBeDefined()

			if (onErrorCallback) {
				onErrorCallback(testError)
				expect(consoleErrorSpy).toHaveBeenCalledWith("redis error:", testError)
			}
		})
	})

	describe("Key Generation Functions", () => {
		it("getPubSubKey should return correct format", () => {
			expect(getPubSubKey(123)).toBe("evals:123")
		})

		it("getRunnersKey should return correct format", () => {
			expect(getRunnersKey(123)).toBe("runners:123")
		})

		it("getHeartbeatKey should return correct format", () => {
			expect(getHeartbeatKey(123)).toBe("heartbeat:123")
		})
	})

	describe("registerRunner", () => {
		const runId = 1
		const taskId = 101
		let expectedHostname: string
		const originalEnvHostname = process.env.HOSTNAME

		beforeEach(() => {
			// Ensure a clean slate for HOSTNAME testing
			delete process.env.HOSTNAME
		})

		afterEach(() => {
			// Restore original HOSTNAME state
			if (originalEnvHostname === undefined) {
				delete process.env.HOSTNAME
			} else {
				process.env.HOSTNAME = originalEnvHostname
			}
		})


		it("should add runner to set and set expiry using HOSTNAME if available", async () => {
			process.env.HOSTNAME = "test-host-specific"
			expectedHostname = "test-host-specific"
			await registerRunner({ runId, taskId })
			expect(mockRedisClientInstance.sAdd).toHaveBeenCalledWith(
				getRunnersKey(runId),
				`task-${taskId}:${expectedHostname}`,
			)
			expect(mockRedisClientInstance.expire).toHaveBeenCalledWith(
				getRunnersKey(runId),
				EVALS_TIMEOUT / 1000,
			)
		})

		it("should use process.pid if HOSTNAME is undefined", async () => {
			// process.env.HOSTNAME is already deleted in beforeEach
			expectedHostname = process.pid.toString()
			await registerRunner({ runId, taskId })
			expect(mockRedisClientInstance.sAdd).toHaveBeenCalledWith(
				getRunnersKey(runId),
				`task-${taskId}:${expectedHostname}`,
			)
		})
	})

	describe("deregisterRunner", () => {
		const runId = 1
		const taskId = 101
		let expectedHostname: string
		const originalEnvHostname = process.env.HOSTNAME

		beforeEach(() => {
			delete process.env.HOSTNAME
		})

		afterEach(() => {
			if (originalEnvHostname === undefined) {
				delete process.env.HOSTNAME
			} else {
				process.env.HOSTNAME = originalEnvHostname
			}
		})

		it("should remove runner from set using HOSTNAME if available", async () => {
			process.env.HOSTNAME = "test-host-deregister"
			expectedHostname = "test-host-deregister"
			await deregisterRunner({ runId, taskId })
			expect(mockRedisClientInstance.sRem).toHaveBeenCalledWith(
				getRunnersKey(runId),
				`task-${taskId}:${expectedHostname}`,
			)
		})

		it("should remove runner using process.pid if HOSTNAME is undefined", async () => {
			expectedHostname = process.pid.toString()
			await deregisterRunner({ runId, taskId })
			expect(mockRedisClientInstance.sRem).toHaveBeenCalledWith(
				getRunnersKey(runId),
				`task-${taskId}:${expectedHostname}`,
			)
		})
	})

	describe("startHeartbeat", () => {
		const runId = 1
		const seconds = 15
		let setIntervalSpy: SpyInstance;

		beforeEach(() => {
			// Spy on setInterval to track calls, but let it use Vitest's fake timer implementation.
			setIntervalSpy = vi.spyOn(global, 'setInterval');
		})

		const pid = process.pid.toString()

		it("should set initial heartbeat key and start interval", async () => {
			const intervalId = await startHeartbeat(runId, seconds)
			expect(mockRedisClientInstance.setEx).toHaveBeenCalledWith(getHeartbeatKey(runId), seconds, pid)
			expect(setIntervalSpy).toHaveBeenCalledTimes(1)
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), (seconds * 1000) / 2)

			vi.advanceTimersByTime((seconds * 1000) / 2)
			await vi.runOnlyPendingTimersAsync(); // Ensure the interval callback executes
			expect(mockRedisClientInstance.expire).toHaveBeenCalledWith(getHeartbeatKey(runId), seconds)

			clearInterval(intervalId)
		})

		it("should log error if expire fails in interval", async () => {
			const expireError = new Error("Expire failed")
			// Ensure the specific instance's expire method is the one being modified
			;(mockRedisClientInstance.expire as Mock).mockRejectedValueOnce(expireError)

			const intervalId = await startHeartbeat(runId, seconds) // This will use the fresh mockRedisClientInstance

			vi.advanceTimersByTime((seconds * 1000) / 2)
			await vi.runOnlyPendingTimersAsync() // Execute the interval callback

			expect(consoleErrorSpy).toHaveBeenCalledWith("heartbeat error:", expireError)
			clearInterval(intervalId)
		})
	})

	describe("stopHeartbeat", () => {
		const runId = 1
		// mockIntervalId will be whatever setInterval returns (a real NodeJS.Timeout or Vitest's fake)
		let mockIntervalId: NodeJS.Timeout;
		let clearIntervalSpy: SpyInstance;

		beforeEach(() => {
			// Make setInterval return a specific mock ID if needed for other tests,
			// but for stopHeartbeat, we'll use the actual ID returned by the spied setInterval.
			// For simplicity here, we assume startHeartbeat was called and returned an ID.
			// A more robust test might call startHeartbeat and use its returned ID.
			mockIntervalId = 12345 as any; // Keep a placeholder if direct call to stopHeartbeat
			clearIntervalSpy = vi.spyOn(global, "clearInterval")
		})

		it("should clear interval and delete heartbeat key", async () => {
			await stopHeartbeat(runId, mockIntervalId)
			expect(clearInterval).toHaveBeenCalledWith(mockIntervalId)
			expect(mockRedisClientInstance.del).toHaveBeenCalledWith(getHeartbeatKey(runId))
		})

		it("should log error if redis.del fails", async () => {
			const delError = new Error("DEL failed")
			;(mockRedisClientInstance.del as Mock).mockRejectedValueOnce(delError)

			await stopHeartbeat(runId, mockIntervalId)

			expect(clearInterval).toHaveBeenCalledWith(mockIntervalId)
			expect(consoleErrorSpy).toHaveBeenCalledWith("redis.del failed:", delError)
		})
	})
})
