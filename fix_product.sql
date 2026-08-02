INSERT INTO vendor_profiles (id, business_name, verification_status, physical_address)
VALUES ('2a4c2399-869d-48fa-bfd6-e455b28081e3', 'TechHub Kenya', 'approved', 'Nairobi, Kenya')
ON CONFLICT (id) DO NOTHING;

UPDATE products
SET vendor_id = '2a4c2399-869d-48fa-bfd6-e455b28081e3'
WHERE id = '5bb64b55-fc2f-4ef3-9496-c66608e5f334';
