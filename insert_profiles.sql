INSERT INTO profiles (id, full_name, onboarding_complete)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Dummy Vendor 1', true),
  ('22222222-2222-2222-2222-222222222222', 'Dummy Vendor 2', true),
  ('33333333-3333-3333-3333-333333333333', 'Dummy Vendor 3', true),
  ('44444444-4444-4444-4444-444444444444', 'Dummy Vendor 4', true),
  ('55555555-5555-5555-5555-555555555555', 'Dummy Vendor 5', true),
  ('5afb93b1-0049-492b-8832-b1850e31a5dc', 'Dummy Vendor 6', true),
  ('f653b9c1-a1fe-4ccf-bb8c-f5d5fe553284', 'Dummy Vendor 7', true),
  ('1c6630a0-59fc-4fe4-abaf-b68e671676ba', 'Dummy Vendor 8', true)
ON CONFLICT (id) DO NOTHING;
