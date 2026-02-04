# Visual DB Designer

A web-based visual database designer with Supabase integration.

## Cloud Storage & Database Setup

This project uses Supabase for cloud persistence. To set up your own database, you need to create two tables: `bdd_users` and `projects`.

You can find the necessary SQL in the following files:
- `setup.sql`: Complete script to initialize the database.
- `database_schema.txt`: Plain text version of the SQL schema.

### Tables

1. **bdd_users**:
    - `id`: UUID (Primary Key)
    - `username`: TEXT (Unique)
    - `password`: TEXT (Plain Text)
    - `created_at`: TIMESTAMPTZ

2. **projects**:
    - `id`: UUID (Primary Key)
    - `user_id`: UUID (Foreign Key to bdd_users.id)
    - `name`: TEXT
    - `data`: JSONB
    - `created_at`: TIMESTAMPTZ
    - `updated_at`: TIMESTAMPTZ

## Features
- Visual table creation and relationship management.
- Export to PNG.
- SQL Preview for multiple dialects (MySQL, PostgreSQL, Standard SQL).
- Cloud saving and loading.
