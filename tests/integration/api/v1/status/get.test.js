test("GET to /api/v1/status should return 200", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);

  const responseBody = await response.json();
  expect(responseBody.updated_at).toBeDefined();

  const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
  expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

  // database version test
  expect(responseBody.dependecies.database.version).toEqual("16.0");

  // max connections test
  expect(responseBody.dependecies.database.max_connections).toEqual(100);

  // opened connections test
  expect(responseBody.dependecies.database.opened_connections).toBe(1);
});
