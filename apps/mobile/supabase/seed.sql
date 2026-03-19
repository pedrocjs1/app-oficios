-- ============================================
-- SEED: Categorías y Zonas del Gran Mendoza
-- ============================================

-- Categorías de servicios
INSERT INTO categories (name, slug, common_problems, is_licensed, sort_order) VALUES
(
  'Electricista',
  'electricista',
  '[
    "Se corta la luz en una zona de la casa",
    "Enchufe no funciona o hace chispas",
    "Instalación de luces/ventiladores",
    "Tablero eléctrico salta seguido",
    "Instalación eléctrica nueva"
  ]'::jsonb,
  TRUE,
  1
),
(
  'Gasista',
  'gasista',
  '[
    "Olor a gas",
    "Calefón no enciende",
    "Instalación de garrafa/gas natural",
    "Estufa no funciona bien",
    "Revisión anual obligatoria"
  ]'::jsonb,
  TRUE,
  2
),
(
  'Plomero',
  'plomero',
  '[
    "Canilla gotea o pierde",
    "Caño roto o pérdida de agua",
    "Inodoro tapado o no funciona",
    "Instalación de termotanque",
    "Baja presión de agua"
  ]'::jsonb,
  FALSE,
  3
),
(
  'Limpieza y mantenimiento',
  'limpieza',
  '[
    "Corte de pasto y jardinería",
    "Limpieza profunda del hogar",
    "Limpieza de tanque de agua",
    "Mantenimiento general",
    "Pintura interior/exterior"
  ]'::jsonb,
  FALSE,
  4
);

-- Zonas del Gran Mendoza
-- NOTA: Los polígonos boundary deben agregarse luego con coordenadas reales.
-- Por ahora se insertan sin boundary para que la app funcione.
-- Para producción: obtener polígonos de datos.gob.ar o OpenStreetMap.
INSERT INTO service_zones (name, city, province, country) VALUES
('Ciudad de Mendoza', 'Mendoza', 'Mendoza', 'AR'),
('Godoy Cruz', 'Godoy Cruz', 'Mendoza', 'AR'),
('Guaymallén', 'Guaymallén', 'Mendoza', 'AR'),
('Las Heras', 'Las Heras', 'Mendoza', 'AR'),
('Luján de Cuyo', 'Luján de Cuyo', 'Mendoza', 'AR'),
('Maipú', 'Maipú', 'Mendoza', 'AR');
