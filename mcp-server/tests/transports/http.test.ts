import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { Server } from 'node:http';
import express, { type Express } from 'express';
import supertest from 'supertest';
import { VikunjaClient } from '../../src/vikunja/client.js';
import { VikunjaMCPServer } from '../../src/server.js';
import { TokenValidator } from '../../src/auth/token-validator.js';
import { SessionManager } from '../../src/transports/http/session-manager.js';
import { RateLimiter } from '../../src/ratelimit/limiter.js';
import { Authenticator } from '../../src/auth/authenticator.js';
import { HTTPStreamableTransport } from '../../src/transports/http/http-streamable.js';
import type { UserContext } from '../../src/auth/types.js';

/**
 * HTTP Streamable Transport Tests (US7 - T111, T113)
 * 
 * Tests the HTTP Streamable transport with focus on JSON mode:
 * - POST /mcp: JSON-RPC 2.0 messages (client → server)
 * - MCP_HTTP_JSON_RESPONSE: n8n compatibility mode
 * - Error handling with JSON format
 * - Session management
 * 
 * Per Constitution: TDD approach - these tests MUST fail until implementation is complete.
 */

// Mock ioredis
vi.mock('ioredis', () => {
	const mockRedis = {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue('OK'),
		setex: vi.fn().mockResolvedValue('OK'),
		del: vi.fn().mockResolvedValue(1),
		expire: vi.fn().mockResolvedValue(1),
		ttl: vi.fn().mockResolvedValue(300),
		exists: vi.fn().mockResolvedValue(0),
		incr: vi.fn().mockResolvedValue(1),
		ping: vi.fn().mockResolvedValue('PONG'),
		quit: vi.fn().mockResolvedValue('OK'),
		disconnect: vi.fn(),
		on: vi.fn(),
		zadd: vi.fn().mockResolvedValue(1),
		zremrangebyscore: vi.fn().mockResolvedValue(0),
		zcard: vi.fn().mockResolvedValue(0),
	};

	return {
		default: vi.fn(() => mockRedis),
	};
});

// Mock axios
vi.mock('axios', () => {
	const mockAxios = {
		create: vi.fn(() => mockAxios),
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		interceptors: {
			request: { use: vi.fn(), eject: vi.fn() },
			response: { use: vi.fn(), eject: vi.fn() },
		},
	};
	return { default: mockAxios };
});

describe('HTTP Streamable Transport Tests', () => {
	let app: Express;
	let server: Server;
	let tokenValidator: TokenValidator;
	let sessionManager: SessionManager;
	let rateLimiter: RateLimiter;
	let mcpServer: VikunjaMCPServer;
	let vikunjaClient: VikunjaClient;
	let httpTransport: HTTPStreamableTransport;
	let httpTransportJsonMode: HTTPStreamableTransport;

	const mockUserContext: UserContext = {
		userId: 1,
		username: 'testuser',
		email: 'test@example.com',
		token: 'valid-http-token',
		permissions: ['task:read', 'task:write', 'project:read'],
		validatedAt: new Date(),
	};

	beforeAll(async () => {
		// Create Express app for testing
		app = express();
		app.use(express.json());

		// Create dependencies
		vikunjaClient = new VikunjaClient();
		const authenticator = new Authenticator();
		
		// Create mock Redis and rate limiter
		const { default: Redis } = await import('ioredis');
		const redis = new Redis();
		rateLimiter = new RateLimiter({
			get: redis.get.bind(redis),
			set: redis.set.bind(redis),
			setex: redis.setex.bind(redis),
			del: redis.del.bind(redis),
			expire: redis.expire.bind(redis),
			ttl: redis.ttl.bind(redis),
			exists: redis.exists.bind(redis),
			incr: redis.incr.bind(redis),
			ping: redis.ping.bind(redis),
			zadd: redis.zadd.bind(redis),
			zremrangebyscore: redis.zremrangebyscore.bind(redis),
			zcard: redis.zcard.bind(redis),
		} as any);
		
		mcpServer = new VikunjaMCPServer(authenticator, rateLimiter, vikunjaClient);

		// Create session manager
		sessionManager = new SessionManager();

		// Create token validator with mock
		tokenValidator = new TokenValidator();
		vi.spyOn(tokenValidator, 'validateToken').mockResolvedValue(mockUserContext);

		// Create HTTP transport without JSON mode
		httpTransport = new HTTPStreamableTransport({
			mcpServer,
			sessionManager,
			tokenValidator,
			rateLimiter,
			enableJsonResponse: false,
		});

		// Create HTTP transport WITH JSON mode (T111)
		httpTransportJsonMode = new HTTPStreamableTransport({
			mcpServer,
			sessionManager,
			tokenValidator,
			rateLimiter,
			enableJsonResponse: true, // n8n compatibility
		});

		// Register routes
		app.post('/mcp', (req, res) => {
			void httpTransport.handleRequest(req, res);
		});

		app.post('/mcp-json', (req, res) => {
			void httpTransportJsonMode.handleRequest(req, res);
		});

		// Start server
		server = app.listen(0);
	});

	afterAll(async () => {
		await httpTransport.close();
		await httpTransportJsonMode.close();
		server.close();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('T111: JSON Mode with MCP_HTTP_JSON_RESPONSE=true', () => {
		it('should return valid JSON response when JSON mode is enabled', async () => {
			// Per FR-041: MCP_HTTP_JSON_RESPONSE=true enables JSON responses for n8n
			// Per MCP protocol: First request must be initialize
			const initResponse = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.send({
					jsonrpc: '2.0',
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
					id: 1,
				});

			// Initialize should succeed and return session ID
			expect(initResponse.status).toBe(200);
			expect(initResponse.type).toBe('application/json');
			const sessionId = initResponse.headers['mcp-session-id'] || initResponse.headers['Mcp-Session-Id'];
			expect(sessionId).toBeTruthy();

			// Now make a tools/list request with the session ID
			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.set('mcp-session-id', sessionId as string)
				.set('mcp-protocol-version', '2024-11-05')
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 2,
				});

			// Response should be valid JSON
			expect(response.type).toBe('application/json');
			expect(response.status).toBe(200);

			// Should have valid JSON-RPC structure
			const body = response.body;
			expect(body).toHaveProperty('jsonrpc', '2.0');
			expect(body).toHaveProperty('id', 2);
			expect(body).toHaveProperty('result');
		});

		it('should handle Accept header injection for n8n compatibility', async () => {
			// n8n cannot set Accept: text/event-stream
			// When JSON mode is on, server should accept requests without this header
			
			// First, initialize the session
			const initResponse = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				// Deliberately NOT setting Accept header
				.send({
					jsonrpc: '2.0',
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
					id: 1,
				});

			expect(initResponse.status).toBe(200);
			const sessionId = initResponse.headers['mcp-session-id'] || initResponse.headers['Mcp-Session-Id'];
			expect(sessionId).toBeTruthy();

			// Now make a request without Accept header
			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.set('mcp-session-id', sessionId as string)
				.set('mcp-protocol-version', '2024-11-05')
				// Deliberately NOT setting Accept header
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 2,
				});

			// Should succeed even without Accept: text/event-stream header
			expect(response.status).toBe(200);
			expect(response.type).toBe('application/json');
		});

		it('should work with proper Accept header when provided', async () => {
			// First, initialize the session
			const initResponse = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json, text/event-stream')
				.send({
					jsonrpc: '2.0',
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
					id: 1,
				});

			expect(initResponse.status).toBe(200);
			const sessionId = initResponse.headers['mcp-session-id'] || initResponse.headers['Mcp-Session-Id'];
			expect(sessionId).toBeTruthy();

			// Now make a request with Accept header
			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json, text/event-stream')
				.set('mcp-session-id', sessionId as string)
				.set('mcp-protocol-version', '2024-11-05')
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 2,
				});

			expect(response.status).toBe(200);
			expect(response.type).toBe('application/json');
		});
	});

	describe('T113: Error Format Test - Errors Maintain JSON Format', () => {
		it('should return JSON error for missing authentication token', async () => {
			// Per FR-043: Error messages include resource type context
			const response = await supertest(app)
				.post('/mcp-json')
				.set('Content-Type', 'application/json')
				// No Authorization header
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 4,
				});

			expect(response.status).toBe(401);
			expect(response.type).toBe('application/json');
			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toHaveProperty('code', -32001);
			expect(response.body.error).toHaveProperty('message');
			expect(response.body.error.message).toContain('Authentication required');
		});

		it('should return JSON error for invalid authentication token', async () => {
			// Mock validator to reject token
			vi.spyOn(tokenValidator, 'validateToken').mockRejectedValueOnce(
				new Error('Invalid token')
			);

			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer invalid-token')
				.set('Content-Type', 'application/json')
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 5,
				});

			expect(response.status).toBe(401);
			expect(response.type).toBe('application/json');
			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toHaveProperty('code', -32001);
			expect(response.body.error.message).toContain('Authentication failed');

			// Restore mock
			vi.spyOn(tokenValidator, 'validateToken').mockResolvedValue(mockUserContext);
		});

		it('should return JSON error for rate limit exceeded', async () => {
			// Mock rate limiter to reject
			vi.spyOn(rateLimiter, 'checkLimit').mockRejectedValueOnce(
				new Error('Rate limit exceeded')
			);

			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 6,
				});

			expect(response.status).toBe(429);
			expect(response.type).toBe('application/json');
			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toHaveProperty('code', -32003);
			expect(response.body.error.message).toContain('Rate limit exceeded');

			// Restore mock
			vi.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(undefined);
		});

		it('should return JSON error for invalid JSON-RPC request', async () => {
			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.send({
					// Invalid: missing jsonrpc and method
					id: 7,
				});

			expect(response.status).toBe(400);
			expect(response.type).toBe('application/json');
			expect(response.body).toHaveProperty('error');
		});

		it('should return JSON error for internal server errors', async () => {
			// Mock server to throw error
			const mockMcpServer = mcpServer as any;
			const originalSetContext = mockMcpServer.setUserContext;
			mockMcpServer.setUserContext = vi.fn().mockImplementation(() => {
				throw new Error('Internal error');
			});

			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 8,
				});

			expect(response.status).toBe(500);
			expect(response.type).toBe('application/json');
			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toHaveProperty('code', -32000);
			expect(response.body.error.message).toContain('Internal server error');

			// Restore
			mockMcpServer.setUserContext = originalSetContext;
		});
	});

	describe('Session Management', () => {
		it('should create new session on first request', async () => {
			// MCP protocol: First request must be initialize
			const response = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.send({
					jsonrpc: '2.0',
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
					id: 1,
				});

			expect(response.status).toBe(200);
			expect(response.type).toBe('application/json');
			// Note: SDK sets 'Mcp-Session-Id' header (capital M)
			const sessionId = response.headers['mcp-session-id'] || response.headers['Mcp-Session-Id'];
			expect(sessionId).toBeTruthy();
			expect(typeof sessionId).toBe('string');
		});

		it('should reuse existing session with mcp-session-id header', async () => {
			// First request to get session ID (initialize)
			const firstResponse = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('Content-Type', 'application/json')
				.send({
					jsonrpc: '2.0',
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
					id: 1,
				});

			const sessionId = firstResponse.headers['mcp-session-id'] || firstResponse.headers['Mcp-Session-Id'];
			expect(sessionId).toBeTruthy();

			// Second request with same session ID (tools/list)
			const secondResponse = await supertest(app)
				.post('/mcp-json')
				.set('Authorization', 'Bearer valid-http-token')
				.set('mcp-session-id', sessionId as string)
				.set('mcp-protocol-version', '2024-11-05')
				.set('Content-Type', 'application/json')
				.send({
					jsonrpc: '2.0',
					method: 'tools/list',
					id: 2,
				});

			expect(secondResponse.status).toBe(200);
			expect(secondResponse.type).toBe('application/json');
			const secondSessionId = secondResponse.headers['mcp-session-id'] || secondResponse.headers['Mcp-Session-Id'];
			expect(secondSessionId).toBe(sessionId);
		});
	});
});
