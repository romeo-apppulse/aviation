-- Aviation Ape Manager Database Initialization Script
-- Run this script to set up the database for the first time

-- Create database (run as postgres superuser)
-- CREATE DATABASE aviation_ape_db;

-- Create user and grant permissions (run as postgres superuser)
-- CREATE USER aviation_ape_user WITH ENCRYPTED PASSWORD 'your-secure-password';
-- GRANT ALL PRIVILEGES ON DATABASE aviation_ape_db TO aviation_ape_user;

-- Connect to the aviation_ape_db database
\c aviation_ape_db;

-- Grant schema permissions to the user
GRANT ALL ON SCHEMA public TO aviation_ape_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aviation_ape_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aviation_ape_user;

-- Create extension for UUID generation (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: The actual table schema will be created by Drizzle ORM
-- when you run: npm run db:push

-- Sample data insertion (optional, run after schema creation)
-- You can uncomment and modify these after running db:push

/*
-- Insert sample aircraft owners
INSERT INTO owners (name, email, phone, address) VALUES
('John Smith Aviation LLC', 'john@smithaviation.com', '+1-555-0123', '123 Airport Dr, Aviation City, AC 12345'),
('Wings & Props Inc', 'contact@wingsandprops.com', '+1-555-0456', '456 Hangar Rd, Sky Harbor, SH 67890');

-- Insert sample lessees (flight schools)
INSERT INTO lessees (name, email, phone, address, contact_person) VALUES
('Elite Flight Training', 'admin@eliteflighttraining.com', '+1-555-0789', '789 Runway Ave, Flight City, FC 13579', 'Sarah Johnson'),
('Sky High Academy', 'info@skyhighacademy.com', '+1-555-0321', '321 Pilot St, Aviator Town, AT 24680', 'Mike Davis');

-- Insert sample aircraft
INSERT INTO aircraft (registration, make, model, year, owner_id, status, image) VALUES
('N123AB', 'Cessna', '172', 2020, 1, 'available', 'https://example.com/cessna172.jpg'),
('N456CD', 'Piper', 'Cherokee', 2019, 2, 'leased', 'https://example.com/piper-cherokee.jpg');
*/

-- Create indexes for better performance
-- (These will be created automatically by Drizzle, but you can add custom ones here)

-- Performance indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aircraft_registration ON aircraft(registration);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aircraft_status ON aircraft(status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_status ON leases(status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_due_date ON payments(due_date);

COMMIT;