ALTER TABLE clientes_gc ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE clientes_gc ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE clientes_gc ADD COLUMN IF NOT EXISTS geocodificado BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_clientes_geo ON clientes_gc(latitude, longitude) WHERE geocodificado = true;