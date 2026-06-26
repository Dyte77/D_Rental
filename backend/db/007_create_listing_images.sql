-- LISTING IMAGES TABLE
CREATE TABLE listing_images (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP DEFAULT NOW()
);