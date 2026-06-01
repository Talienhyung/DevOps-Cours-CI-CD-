const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/db', () => ({
  query: jest.fn()
}));

describe('GET /about', () => {
  it('should return project information', async () => {
    const response = await request(app).get('/about');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      project: 'TrainShop Starter',
      module: 'DevOps',
      objective: 'Créer une CI GitHub Actions'
    });
  });
});
