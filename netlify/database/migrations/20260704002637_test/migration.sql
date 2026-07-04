ALTER TABLE product_images
  ADD CONSTRAINT uq_product_images_variant_position UNIQUE (variant_id, position);