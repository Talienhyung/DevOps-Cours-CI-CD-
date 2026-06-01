const request = require('supertest');
const app = require('../src/app');

// On simule la base : le test cible le comportement de l'API, pas PostgreSQL.
jest.mock('../src/db', () => ({
  query: jest.fn().mockResolvedValue({
    rows: [
      {
        id: 1,
        name: 'Billet Lyon → Paris',
        description: 'Trajet direct pour découvrir Docker.',
        price_cents: 4500,
        stock: 20
      }
    ]
  })
}));

describe('Products endpoint', () => {
  test('GET /products retourne le catalogue', async () => {
    const response = await request(app).get('/products');

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    // Le catalogue doit être une liste non vide.
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('name');
  });
});
