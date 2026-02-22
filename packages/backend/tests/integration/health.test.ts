import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('Health Check', () => {
  it('GET /api/v1/health should return ok status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.version).toBe('0.1.0');
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
