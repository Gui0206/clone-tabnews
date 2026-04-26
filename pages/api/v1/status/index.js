import database from "infra/database.js";

async function status(request, response) {
  const updatedAt = new Date().toISOString();

  const dbVersionQuery = await database.query("SHOW server_version;");
  const dbVersion = dbVersionQuery.rows[0].server_version

  const maxConnectionsQuery = await database.query("SHOW max_connections;")
  const maxConnections = maxConnectionsQuery.rows[0].max_connections
  
  const openConnectionsQuery = await database.query("SELECT count(*) FROM pg_stat_activity WHERE datname = 'local_db';")
  const openConnections = openConnectionsQuery.rows[0].count

  response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
          version: dbVersion,
          max_connections: parseInt(maxConnections),
          openConnections: parseInt(openConnections),
      }
    }
  });
}

export default status;
