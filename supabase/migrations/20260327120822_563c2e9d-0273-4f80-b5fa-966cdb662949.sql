ALTER TABLE public.propostas
ADD COLUMN IF NOT EXISTS forma_pagamento text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS num_parcelas integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS entrada_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS condicoes_pagamento text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prazo_entrega text DEFAULT NULL;