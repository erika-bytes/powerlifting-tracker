CREATE DATABASE powerlifting_db;

CREATE TABLE entries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    sex VARCHAR(1),
    event VARCHAR(50),
    equipment VARCHAR(50),
    age NUMERIC,
    division VARCHAR(50),
    bodyweight NUMERIC,
    weight_class VARCHAR(50),
    best_squat NUMERIC,
    best_bench NUMERIC,
    best_deadlift NUMERIC,
    total NUMERIC,
    place VARCHAR(10),
    date DATE,
    meet_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

