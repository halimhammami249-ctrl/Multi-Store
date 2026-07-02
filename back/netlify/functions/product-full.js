const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

exports.handler = async (event) => {
  try {
    const productId = event.queryStringParameters?.product_id;

    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'product_id required' }),
      };
    }

    // 1. GET PRODUCT
    const productRes = await pool.query(
      `
      SELECT p.*, b.name AS brand
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = $1
      `,
      [productId],
    );

    const product = productRes.rows[0];

    if (!product) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Product not found' }),
      };
    }

    // 2. GET VARIANTS + ATTRIBUTES
    const variantRes = await pool.query(
      `
      SELECT 
        pv.id AS variant_id,
        pv.price,
        pv.stock,
        pv.sku,

        a.name AS attribute_name,
        av.value AS attribute_value

      FROM product_variants pv

      LEFT JOIN variant_attribute_values vav
        ON vav.variant_id = pv.id

      LEFT JOIN attribute_values av
        ON av.id = vav.attribute_value_id

      LEFT JOIN attributes a
        ON a.id = av.attribute_id

      WHERE pv.product_id = $1
      `,
      [productId],
    );

    // 3. GROUP DATA
    const variantsMap = {};

    for (const row of variantRes.rows) {
      if (!variantsMap[row.variant_id]) {
        variantsMap[row.variant_id] = {
          id: row.variant_id,
          price: row.price,
          stock: row.stock,
          sku: row.sku,
          attributes: {},
        };
      }

      if (row.attribute_name) {
        variantsMap[row.variant_id].attributes[row.attribute_name] =
          row.attribute_value;
      }
    }

    // 4. FINAL RESPONSE
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: product.id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        variants: Object.values(variantsMap),
      }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'server error' }),
    };
  }
};
