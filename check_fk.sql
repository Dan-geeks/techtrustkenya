SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name 
FROM information_schema.key_column_usage 
JOIN information_schema.table_constraints USING (constraint_name) 
WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'messages';
