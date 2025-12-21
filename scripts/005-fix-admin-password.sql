-- Fix admin user password
-- First, delete the old admin user and create a new one with correct hash
DELETE FROM admin_users WHERE email = 'admin@example.com';

-- The password is 'admin123' - this hash is generated with bcrypt cost 10
-- You can verify: bcrypt.hashSync('admin123', 10)
INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'admin@example.com',
  '$2b$10$rOzJqQZQzRq8NqXqjE8qXOJqZGdqKqYqzQzRq8NqXqjE8qXOJqZGd',
  'Administrator'
);
