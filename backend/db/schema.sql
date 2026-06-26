-- USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('tenant', 'landlord', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- LISTINGS TABLE
CREATE TABLE listings (
    id SERIAL PRIMARY KEY,
    landlord_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price_per_month NUMERIC(12,2) NOT NULL CHECK (price_per_month > 0),
    room_type VARCHAR(20) CHECK (room_type IN ('single', 'double', 'self-contained', 'apartment')),
    bedrooms INTEGER DEFAULT 1,
    has_kitchen BOOLEAN DEFAULT FALSE,
    bathroom_type VARCHAR(20) CHECK (bathroom_type IN ('indoor', 'outdoor')),
    has_water BOOLEAN DEFAULT FALSE,
    has_electricity BOOLEAN DEFAULT FALSE,
    is_gated BOOLEAN DEFAULT FALSE,
    district VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
    created_at TIMESTAMP DEFAULT NOW()
);