-- Create admin user with password: admin123
-- The hash below is generated with bcrypt for 'admin123'
INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'admin@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye1xUHEfN0T4Nd6qBE9tO1qHr8X7K7yKm',
  'Administrator'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMye1xUHEfN0T4Nd6qBE9tO1qHr8X7K7yKm';
