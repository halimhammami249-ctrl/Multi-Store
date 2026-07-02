# Multi-Store E-Commerce Admin Dashboard Documentation

## 1. Project Overview

This project is a multi-store e-commerce admin dashboard for one company. It is not a SaaS where each store has separate admin users. One authenticated company administrator can manage all stores from one dashboard, and the selected store is only the active workspace.

The system includes:

- Admin dashboard built with Next.js App Router.
- Serverless backend using Netlify Functions.
- PostgreSQL database.
- JWT authentication with HttpOnly cookies.
- Store-scoped product, brand, category, variant, attribute, image, inventory, and import workflows.
- Public storefront APIs that must remain public.
- Job-based Excel catalog import with Cloudinary image URL ingestion.

## 2. Technology Stack

Frontend:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Lucide React icons
- Base UI button primitives

Backend:

- Netlify Functions
- Node.js
- PostgreSQL via `pg`
- JWT via `jsonwebtoken`
- Password hashing via `bcrypt`
- Excel parsing via `xlsx`
- Image upload via `cloudinary`

Database:

- PostgreSQL
- UUIDs generated with `pgcrypto`

## 3. Project Structure

```text
New folder (3)/
  back/
    db/
      index.js
      schema.sql
      admin-auth-migration.sql
      import-jobs-migration.sql
      strict-workflow-migration.sql
    netlify/functions/
      auth-login.js
      auth-logout.js
      auth-me.js
      stores.js
      products.js
      product.js
      brands.js
      categories.js
      variants.js
      inventory.js
      attributes.js
      attribute-values.js
      variant-attributes.js
      media.js
      import-products.js
      import-worker.js
    scripts/
      seed-first-admin.js
      fix-sample-data.js
    services/
      authService.js
      storeService.js
      productService.js
      brandService.js
      categoryService.js
      variantService.js
      inventoryService.js
      attributeService.js
      variantAttributeService.js
      mediaService.js
      dashboardService.js
    package.json

  fron/
    app/
      api/
      login/
      forgot-password/
      stores/
      products/
      inventory/
      brands/
      categories/
      attributes/
      media/
      dashboard/import/
      page.tsx
      layout.tsx
    components/
      dashboard-layout.tsx
      sidebar-nav.tsx
      top-bar.tsx
      data-table.tsx
      stat-card.tsx
    lib/
      store-context.tsx
    proxy.ts
    package.json
```

## 4. Architecture

The application has three main layers:

1. Frontend dashboard
   - Runs on Next.js.
   - Uses App Router pages.
   - Uses `StoreContext` to track the selected store workspace.
   - Calls local Next API routes under `/api/*`.

2. Next API proxy layer
   - Routes inside `fron/app/api`.
   - Proxies requests to Netlify Functions at `http://localhost:8888/.netlify/functions/*`.
   - Parses Excel uploads for imports, then forwards compact normalized row JSON to Netlify.

3. Netlify backend
   - Functions inside `back/netlify/functions`.
   - Calls service modules in `back/services`.
   - Services use PostgreSQL through `back/db/index.js`.

## 5. Important Business Rules

- Stores are not users.
- Admin users do not belong to stores.
- One admin can manage all stores.
- Products belong to stores.
- Every admin CRUD operation must be scoped by `store_id`.
- Public storefront APIs remain public.
- Authentication protects admin pages and admin APIs only.
- Store selection is workspace context, not authorization.

## 6. Database Schema

Main tables:

- `admin_users`
- `stores`
- `brands`
- `categories`
- `products`
- `product_variants`
- `product_images`
- `attributes`
- `attribute_values`
- `variant_attribute_values`
- `import_jobs`
- `import_job_rows`

### admin_users

Stores company admin accounts.

Important fields:

- `id`
- `email`
- `password_hash`
- `full_name`
- `role`
- `is_active`
- `last_login`
- `created_at`
- `updated_at`

Passwords are hashed with bcrypt. Plaintext passwords are never stored.

### stores

Stores managed storefronts.

Important fields:

- `id`
- `name`
- `domain`
- `status`
- `created_at`
- `updated_at`

### products

Products are store-scoped and must belong to a brand and category.

Important fields:

- `store_id`
- `brand_id`
- `category_id`
- `name`
- `slug`
- `description`
- `status`

### product_variants

Variants belong to products and hold SKU, price, stock, and status.

### product_images

Images belong to variants. Import images are read from public image URLs, uploaded to Cloudinary by the worker, and only the Cloudinary URL is saved here.

### attributes and values

Attributes belong to stores. Attribute values belong to attributes. Variants are linked to values through `variant_attribute_values`.

### import_jobs

Stores async catalog import metadata.

Important fields:

- `id`
- `store_id`
- `status`
- `total_rows`
- `processed_rows`
- `imported`
- `updated`
- `failed`
- `error`
- `completed_at`

### import_job_rows

Stores normalized Excel rows for chunked worker processing.

Important fields:

- `job_id`
- `row_number`
- `payload`
- `status`
- `product_id`
- `variant_id`
- `error`

## 7. Setup

### Backend Install

```powershell
cd back
npm install
```

### Frontend Install

```powershell
cd fron
npm install
```

## 8. Environment Variables

Backend `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/final
JWT_SECRET=change-this-to-a-long-secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Cloudinary can also be configured with:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Frontend `.env.local`:

```env
JWT_SECRET=change-this-to-a-long-secret
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Important: `JWT_SECRET` must match between the backend and frontend proxy/middleware. If it does not match, login can set a cookie but protected pages will still reject the user.

## 9. Database Initialization

Create tables:

```powershell
psql -d final -f back\db\schema.sql
```

For an existing database, run the migrations:

```powershell
psql -d final -f back\db\admin-auth-migration.sql
psql -d final -f back\db\import-jobs-migration.sql
psql -d final -f back\db\strict-workflow-migration.sql
```

`strict-workflow-migration.sql` will fail clearly if existing products are missing brand/category or have cross-store relationships.

## 10. First Admin Seed

There is no signup page and no register endpoint. Create the first admin with the seed script.

Default credentials:

```text
Email: admin@example.com
Password: Admin123!
```

Seed with defaults:

```powershell
cd back
npm run seed:admin
```

Seed with custom credentials:

```powershell
cd back
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="YourStrongPassword"
$env:ADMIN_FULL_NAME="Super Admin"
npm run seed:admin
```

## 11. Running Locally

Backend Netlify Functions:

```powershell
cd back
netlify dev
```

Frontend:

```powershell
cd fron
npm run dev
```

The frontend expects Netlify Functions at:

```text
http://localhost:8888/.netlify/functions
```

The frontend usually runs at:

```text
http://localhost:3000
```

## 12. Authentication

Authentication is only for admin dashboard and admin APIs.

### Login

Frontend route:

```text
POST /api/auth/login
```

Backend function:

```text
auth-login.js
```

Request:

```json
{
  "email": "admin@example.com",
  "password": "Admin123!",
  "remember": true
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "full_name": "Super Admin",
    "role": "SUPER_ADMIN"
  }
}
```

The JWT is stored in the `admin_token` HttpOnly cookie.

Cookie settings:

- `HttpOnly`
- `SameSite=Lax`
- `Secure` in production
- `Path=/`
- `Max-Age`

### Logout

```text
POST /api/auth/logout
```

Clears the auth cookie.

### Current User

```text
GET /api/auth/me
```

Returns:

```json
{
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "full_name": "Super Admin",
    "role": "SUPER_ADMIN"
  }
}
```

Never returns `password_hash`.

### Protected Routes

Protected dashboard pages:

- `/`
- `/stores`
- `/products`
- `/inventory`
- `/brands`
- `/categories`
- `/attributes`
- `/media`
- `/dashboard/**`

Protected admin API routes include:

- `/api/stores`
- `/api/products`
- `/api/brands`
- `/api/categories`
- `/api/inventory`
- `/api/media`
- `/api/import-products`

Public routes:

- `/login`
- `/forgot-password`
- `/api/auth/**`
- `/api/public/**`

## 13. Store Workspace

The active store is held in `StoreContext`.

File:

```text
fron/lib/store-context.tsx
```

The selected store:

- Is chosen using the top bar store selector.
- Is persisted in `localStorage`.
- Is used to scope admin API calls with `storeId`.
- Does not determine authentication.

Example:

```tsx
const { selectedStore } = useStore()

const response = await fetch(`/api/products?storeId=${selectedStore.id}`)
```

## 14. Admin Pages

### Dashboard

Path:

```text
/
```

Shows platform/store statistics depending on current store context.

### Stores

Path:

```text
/stores
```

Features:

- List stores.
- Create store.
- Delete store.
- Open store workspace.
- Display store stats.
- Developer API section for each store.

### Products

Path:

```text
/products
```

Features:

- Product table.
- Strict product creation wizard:
  - Brand
  - Category
  - Product details
  - Variants
  - Attributes
- Product edit.
- Product delete.

### Inventory

Path:

```text
/inventory
```

Features:

- Variant inventory table.
- Filter by all, low stock, out of stock.
- Update stock.
- Edit variant SKU, price, stock.

### Brands

Path:

```text
/brands
```

Features:

- Create brand.
- Edit brand.
- Delete brand if unused.

### Categories

Path:

```text
/categories
```

Features:

- Create category.
- Edit category.
- Delete category if unused and no child categories depend on it.

### Attributes

Path:

```text
/attributes
```

Features:

- Create store-level attribute definitions.
- Delete attributes.
- Edit existing attribute values.

### Media

Path:

```text
/media
```

Features:

- List product images.
- Add image URL by SKU/variant.
- Delete image.

### Import Catalog

Path:

```text
/dashboard/import
```

Features:

- Select active store.
- Upload `.xlsx` file.
- Create an import job.
- Process rows through short worker chunk calls.
- Show progress, summary, and row errors.
- Images are not uploaded as local folders. Use public image URLs in the Excel file.

## 15. Strict Catalog Workflow

The product model enforces:

```text
Store -> Brand -> Category -> Product -> Variant -> Attributes -> Values -> Images
```

Rules:

- Product creation requires brand and category.
- Brand/category must belong to the same store.
- Variant creation requires a product.
- Variant must belong to the selected store through its product.
- Attribute value must belong to an attribute in the selected store.
- Variant attribute links must be same-store safe.
- Brand/category deletion is blocked if products still use them.
- Product deletion cascades to variants, images, and attribute links.

## 16. Excel Import And Image URL Processing

Frontend page:

```text
/dashboard/import
```

Frontend API:

```text
POST /api/import-products?storeId=STORE_ID
```

Backend function:

```text
back/netlify/functions/import-products.js
```

Worker function:

```text
back/netlify/functions/import-worker.js
```

Job tables:

```text
import_jobs
import_job_rows
```

Supported Excel columns:

- `name`
- `product`
- `product_name`
- `title`
- `brand`
- `brand_name`
- `category`
- `category_name`
- `price`
- `variant_price`
- `sku`
- `variant_sku`
- `stock`
- `quantity`
- `qty`
- `inventory`
- `description`
- `desc`
- `image_url`
- `image_url_cloudinary`
- `image`
- `url`

Import behavior:

- Ignores any store ID in Excel.
- Uses selected dashboard store only.
- The Next.js API route parses the Excel file first.
- The Netlify `import-products.js` function creates an import job and stores normalized rows.
- The initial request returns immediately with a job ID.
- The frontend calls the worker endpoint repeatedly in short requests.
- `import-worker.js` processes pending rows in chunks of 20.
- Rows are locked with `FOR UPDATE SKIP LOCKED` so retries or overlapping worker calls do not process the same row twice.
- DB writes use a chunk transaction with per-row savepoints.
- Auto-creates missing brands/categories in the selected store.
- Upserts products by `store_id + slug`.
- Creates or updates variants by `product_id + sku`.
- Generates SKU if missing.
- Accepts public image URLs from Excel.
- Uploads image URLs to Cloudinary with 3 retries.
- Cloudinary upload happens after DB commit, not inside the database transaction.
- Saves Cloudinary `secure_url` in `product_images`.
- Per-row failures are recorded and do not stop the job.

Why image files are not uploaded directly:

- Netlify Functions have request body and execution time limits.
- Sending Excel plus many base64 images causes `Stream body too big`, `ECONNRESET`, and timeout failures.
- Production-safe imports should use public image URLs in Excel, then Cloudinary pulls those URLs in worker chunks.

Initial response:

```json
{
  "success": true,
  "jobId": "uuid",
  "status": "processing",
  "totalRows": 1000,
  "processedRows": 0,
  "imported": 0,
  "updated": 0,
  "failed": 0,
  "errors": []
}
```

Worker/status response:

```json
{
  "success": true,
  "jobId": "uuid",
  "status": "completed",
  "totalRows": 1000,
  "processedRows": 1000,
  "imported": 800,
  "updated": 190,
  "failed": 10,
  "errors": [
    {
      "row": 42,
      "product": "Example Product",
      "error": "Price must be a non-negative number"
    }
  ]
}
```

## 17. Developer Public API Section

The Stores page includes a read-only Developer API section.

It displays a base URL derived from:

- `NEXT_PUBLIC_API_BASE_URL`
- Store domain or name slug

Displayed endpoints:

- `GET /products`
- `GET /products/:slug`
- `GET /categories`
- `GET /brands`
- `GET /store`

Each endpoint includes:

- Full URL.
- Example `fetch(...)` request.
- Copy button.
- Open API button for the store endpoint.

## 18. Frontend API Proxy Routes

Next.js routes in `fron/app/api` proxy browser requests to Netlify Functions.

Examples:

```text
GET /api/stores
GET /api/products?storeId=...
POST /api/products?storeId=...
PUT /api/products?storeId=...&id=...
DELETE /api/products?storeId=...&id=...
```

Most frontend routes call:

```text
http://localhost:8888/.netlify/functions/*
```

## 19. Netlify Functions

Important functions:

```text
auth-login.js
auth-logout.js
auth-me.js
stores.js
products.js
product.js
brands.js
categories.js
variants.js
inventory.js
attributes.js
attribute-values.js
variant-attributes.js
media.js
dashboard.js
import-products.js
import-worker.js
```

## 20. Service Layer

Backend services contain database logic.

Examples:

- `productService.js` validates product store, brand, and category relationships.
- `variantService.js` validates product ownership before variant changes.
- `attributeService.js` validates attribute ownership before value changes.
- `mediaService.js` validates variant/store ownership for image changes.
- `authService.js` validates credentials, creates JWTs, and reads auth cookies.

## 21. Public Storefront APIs

Public storefront APIs are intentionally not protected by authentication.

Expected public paths:

```text
/api/public/products
/api/public/products/:slug
/api/public/categories
/api/public/brands
/api/public/store
```

These should continue working without admin login.

## 22. Common Commands

Install backend:

```powershell
cd back
npm install
```

Install frontend:

```powershell
cd fron
npm install
```

Run backend:

```powershell
cd back
netlify dev
```

Run frontend:

```powershell
cd fron
npm run dev
```

Build frontend:

```powershell
cd fron
npm run build
```

TypeScript check:

```powershell
cd fron
npx tsc --noEmit
```

Seed admin:

```powershell
cd back
npm run seed:admin
```

## 23. Known Notes

- `npm run lint` in the frontend references `eslint`, but `eslint` is not currently installed in `fron/package.json`.
- `xlsx` currently reports an npm audit warning. Review before production deployment.
- Frontend API routes currently hardcode the local Netlify Functions URL (`http://localhost:8888`). For production, this should be moved to an environment variable.
- Public storefront APIs are documented and shown in the Developer API UI, but the project should confirm matching public route implementations before production use.

## 24. Deployment Checklist

Before production:

1. Set `DATABASE_URL`.
2. Set a strong `JWT_SECRET`.
3. Set Cloudinary credentials.
4. Run schema/migrations.
5. Seed the first admin.
6. Replace local Netlify Function proxy URLs with configured production backend URLs.
7. Verify public storefront APIs remain unauthenticated.
8. Verify admin routes redirect to `/login` when logged out.
9. Verify `/api/auth/me` returns user data after login.
10. Run `back\db\import-jobs-migration.sql` if the database existed before the import queue was added.
11. Verify product import with a small Excel file before importing a full catalog.
12. For image imports, use public image URLs in Excel instead of local image folder uploads.

## 25. Security Summary

Implemented:

- No public signup.
- No registration endpoint.
- Bcrypt password hashing.
- JWT authentication.
- JWT stored in HttpOnly cookie.
- Secure cookie flag in production.
- SameSite=Lax.
- Admin dashboard route protection.
- Public API paths left open.
- Password hashes never returned.

Important:

- Keep `JWT_SECRET` private and consistent between frontend proxy and backend functions.
- Never expose `.env` files.
- Use HTTPS in production so Secure cookies work correctly.
